'use strict';

/**
 * reportCommand.js
 * Handles: REPORT <Name> <PhoneLast4> <Amount> <Status> <Rating>
 *
 * Supported statuses : PAID | NOT PAID | PARTIAL
 * Supported ratings  : GOOD | BAD | NEUTRAL
 *
 * Flow:
 *  1. Parse all fields from message
 *  2. If incomplete, guide user step-by-step via session state
 *  3. Find or create person record
 *  4. Write transaction row
 *  5. Recalculate score
 *  6. Confirm to reporter
 *  7. Alert reported person if score drops significantly
 */

const sheets = require('../services/sheetsService');
const scoring = require('../services/scoringService');
const wa = require('../services/whatsappService');
const config = require('../config');
const logger = require('../logger');

// ─── In-memory session store (replace with Redis for production) ──────────────
// Keyed by reporter phone number
const sessions = new Map();

const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getSession(phone) {
  const s = sessions.get(phone);
  if (!s) return null;
  if (Date.now() - s.updatedAt > SESSION_TTL_MS) {
    sessions.delete(phone);
    return null;
  }
  return s;
}

function setSession(phone, data) {
  sessions.set(phone, { ...data, updatedAt: Date.now() });
}

function clearSession(phone) {
  sessions.delete(phone);
}

// ─── Parser ───────────────────────────────────────────────────────────────────

const VALID_STATUSES = ['PAID', 'NOT PAID', 'PARTIAL'];
const VALID_RATINGS = ['GOOD', 'BAD', 'NEUTRAL'];

/**
 * Try to parse a complete REPORT command from a single message.
 * "REPORT Rani Devi 9876 500 PAID GOOD"
 * Returns null if the message is incomplete.
 */
function parseReportCommand(text) {
  const body = text.replace(/^REPORT\s+/i, '').trim();
  const tokens = body.split(/\s+/);

  // Minimum: name(1+) phone(4d) amount status rating = at least 5 tokens
  if (tokens.length < 5) return null;

  // Rating is last token
  const rating = tokens[tokens.length - 1].toUpperCase();
  if (!VALID_RATINGS.includes(rating)) return null;

  // Status may be one or two words ("NOT PAID")
  let status, amountIdx;
  if (
    tokens.length >= 6 &&
    tokens[tokens.length - 3].toUpperCase() === 'NOT' &&
    tokens[tokens.length - 2].toUpperCase() === 'PAID'
  ) {
    status = 'NOT PAID';
    amountIdx = tokens.length - 4;
  } else {
    status = tokens[tokens.length - 2].toUpperCase();
    amountIdx = tokens.length - 3;
  }

  if (!VALID_STATUSES.includes(status)) return null;

  const amount = tokens[amountIdx];
  if (!/^\d+(\.\d{1,2})?$/.test(amount)) return null;

  // Phone last 4 is the token before amount
  const phoneLast4 = tokens[amountIdx - 1];
  if (!/^\d{4}$/.test(phoneLast4)) return null;

  const name = tokens.slice(0, amountIdx - 1).join(' ');
  if (!name) return null;

  return { name, phoneLast4, amount, status, rating };
}

// ─── Step-by-step guided flow ─────────────────────────────────────────────────

async function handleReportStep(from, messageText) {
  const session = getSession(from);
  const upper = messageText.trim().toUpperCase();

  if (!session) {
    // No active session — start one
    setSession(from, { step: 'name', data: {} });
    await wa.sendText(
      from,
      `📝 *REPORT — Step 1 of 5*\n\nEnter the *full name* of the person you want to report:\n\n(Type CANCEL to stop)`
    );
    return;
  }

  if (upper === 'CANCEL') {
    clearSession(from);
    await wa.sendText(from, `❌ Report cancelled. Type HELP if you need assistance.`);
    return;
  }

  const { step, data } = session;

  if (step === 'name') {
    data.name = messageText.trim();
    setSession(from, { step: 'phone', data });
    await wa.sendText(
      from,
      `📝 *REPORT — Step 2 of 5*\n\nEnter the *last 4 digits* of their phone number:\n\nExample: 9823`
    );
    return;
  }

  if (step === 'phone') {
    if (!/^\d{4}$/.test(messageText.trim())) {
      await wa.sendText(from, `❌ Please enter exactly 4 digits.\n\nExample: 9823`);
      return;
    }
    data.phoneLast4 = messageText.trim();
    setSession(from, { step: 'amount', data });
    await wa.sendText(
      from,
      `📝 *REPORT — Step 3 of 5*\n\nEnter the *amount* (₹) involved:\n\nExample: 500`
    );
    return;
  }

  if (step === 'amount') {
    if (!/^\d+(\.\d{1,2})?$/.test(messageText.trim())) {
      await wa.sendText(from, `❌ Please enter a valid amount.\n\nExample: 500`);
      return;
    }
    data.amount = messageText.trim();
    setSession(from, { step: 'status', data });
    await wa.sendText(
      from,
      `📝 *REPORT — Step 4 of 5*\n\nWhat was the *payment status*?\n\nReply with:\n• PAID\n• NOT PAID\n• PARTIAL`
    );
    return;
  }

  if (step === 'status') {
    const status = messageText.trim().toUpperCase();
    if (!VALID_STATUSES.includes(status)) {
      await wa.sendText(from, `❌ Invalid status. Reply with PAID, NOT PAID, or PARTIAL.`);
      return;
    }
    data.status = status;
    setSession(from, { step: 'rating', data });
    await wa.sendText(
      from,
      `📝 *REPORT — Step 5 of 5*\n\nHow would you *rate* this person's behaviour?\n\nReply with:\n• GOOD\n• BAD\n• NEUTRAL`
    );
    return;
  }

  if (step === 'rating') {
    const rating = messageText.trim().toUpperCase();
    if (!VALID_RATINGS.includes(rating)) {
      await wa.sendText(from, `❌ Invalid rating. Reply with GOOD, BAD, or NEUTRAL.`);
      return;
    }
    data.rating = rating;
    clearSession(from);
    await submitReport(from, data);
    return;
  }
}

// ─── Submit report ────────────────────────────────────────────────────────────

async function submitReport(reporterPhone, { name, phoneLast4, amount, status, rating }) {
  logger.info('Submitting report', { reporterPhone, name, phoneLast4, amount, status, rating });

  // Find or create person
  let person = await sheets.findPerson(name, phoneLast4);
  let isNew = false;

  if (!person) {
    const personId = await sheets.getNextPersonId();
    await sheets.addPerson({ personId, name, phoneLast4 });
    person = await sheets.findPersonById(personId);
    isNew = true;
  }

  const personId = person.PersonID;
  const oldScore = parseInt(person.ThampaScore || '500', 10);

  // Write transaction
  const txId = await sheets.getNextTransactionId();
  await sheets.addTransaction({
    txId,
    personId,
    reporterPhone,
    amount,
    paymentStatus: status,
    rating,
  });

  // Recalculate score
  const { newScore } = await scoring.recalculateAndSave(personId);

  // Build confirmation message
  const statusIcon = status === 'PAID' ? '✅' : status === 'PARTIAL' ? '⚠️' : '❌';
  const ratingIcon = rating === 'GOOD' ? '👍' : rating === 'BAD' ? '👎' : '🤝';
  const scoreDelta = newScore - oldScore;
  const deltaStr = scoreDelta >= 0 ? `+${scoreDelta}` : `${scoreDelta}`;

  const confirmMsg =
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `✅ REPORT RECORDED\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 ${person.Name} | ${person.PhoneLast4}\n` +
    `💰 Amount: ₹${amount}\n` +
    `📋 Status: ${status} ${statusIcon}\n` +
    `⭐ Rating: ${rating} ${ratingIcon}\n` +
    `📊 Score: ${oldScore} → *${newScore}* (${deltaStr})\n` +
    `🆔 Ref: ${txId}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Thank you for protecting your community 🙏`;

  await wa.sendText(reporterPhone, confirmMsg);

  // Alert reported person if score dropped significantly
  if (scoreDelta <= -50) {
    await sendScoreAlert(person, oldScore, newScore);
  }
}

// ─── Score drop alert ─────────────────────────────────────────────────────────

async function sendScoreAlert(person, oldScore, newScore) {
  // We only have last-4 digits, so we can't send directly.
  // In production, if the person is also a registered Thappa user,
  // their full phone would be in the Users tab. This is a placeholder.
  logger.info('Score drop alert would be sent', {
    personId: person.PersonID,
    oldScore,
    newScore,
  });
}

// ─── Main handler ─────────────────────────────────────────────────────────────

async function handleReport(from, messageText) {
  // Try one-shot parse first
  const parsed = parseReportCommand(messageText);

  if (parsed) {
    await submitReport(from, parsed);
  } else {
    // Start or continue guided flow
    await handleReportStep(from, messageText);
  }
}

/**
 * Check if a message is part of an active REPORT session.
 */
function hasActiveSession(phone) {
  return getSession(phone) !== null;
}

module.exports = { handleReport, hasActiveSession, parseReportCommand };
