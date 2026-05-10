'use strict';

/**
 * checkCommand.js
 * Handles: CHECK <Name> <PhoneLast4>
 *
 * Flow:
 *  1. Parse name + phone-last-4 from message
 *  2. Verify user quota / subscription
 *  3. Look up person in People tab
 *  4. Fetch recent transactions
 *  5. Build and return formatted reply
 */

const sheets = require('../services/sheetsService');
const scoring = require('../services/scoringService');
const wa = require('../services/whatsappService');
const payment = require('../services/paymentService');
const config = require('../config');
const logger = require('../logger');

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Parse "CHECK Rajesh Kumar 9823" → { name: 'Rajesh Kumar', phoneLast4: '9823' }
 * Returns null if the message doesn't match the expected format.
 */
function parseCheckCommand(text) {
  // Remove the leading "CHECK" keyword (case-insensitive)
  const body = text.replace(/^CHECK\s+/i, '').trim();

  // Last token that is exactly 4 digits is the phone identifier
  const tokens = body.split(/\s+/);
  if (tokens.length < 2) return null;

  const last = tokens[tokens.length - 1];
  if (!/^\d{4}$/.test(last)) return null;

  const name = tokens.slice(0, -1).join(' ');
  return { name, phoneLast4: last };
}

// ─── Response builder ─────────────────────────────────────────────────────────

function buildCheckReply(person, transactions) {
  const score = parseInt(person.ThampaScore || '500', 10);
  const { label, emoji, recommendation, risk } = scoring.getRiskLabel(score);

  const total = transactions.length;
  const paid = transactions.filter((t) => (t.PaymentStatus || '').toUpperCase() === 'PAID').length;
  const notPaid = transactions.filter(
    (t) => ['NOT PAID', 'DEFAULT'].includes((t.PaymentStatus || '').toUpperCase())
  ).length;
  const partial = transactions.filter((t) => (t.PaymentStatus || '').toUpperCase() === 'PARTIAL').length;

  // Most recent transaction summary
  const sorted = [...transactions].sort((a, b) => new Date(b.Date) - new Date(a.Date));
  const recent = sorted[0];
  let recentLine = '';
  if (recent) {
    const daysAgo = Math.floor((Date.now() - new Date(recent.Date)) / 86400000);
    const timeAgo =
      daysAgo === 0
        ? 'today'
        : daysAgo < 30
        ? `${daysAgo} days ago`
        : `${Math.floor(daysAgo / 30)} months ago`;
    const statusIcon =
      (recent.PaymentStatus || '').toUpperCase() === 'PAID'
        ? '✅'
        : (recent.PaymentStatus || '').toUpperCase() === 'PARTIAL'
        ? '⚠️'
        : '❌';
    recentLine = `\nRecent: ₹${recent.Amount} ${recent.PaymentStatus} ${statusIcon} ${timeAgo}`;
  }

  const paidPct = total > 0 ? Math.round((paid / total) * 100) : 0;

  return (
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔍 THAPPA CHECK RESULT\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 ${person.Name} | ${person.PhoneLast4}\n` +
    `📊 Thappa Score: *${score}/1000* ${emoji} ${label}\n` +
    `📋 ${total} transaction${total !== 1 ? 's' : ''} reported\n` +
    `✅ PAID: ${paid}  ❌ NOT PAID: ${notPaid}  ⚠️ PARTIAL: ${partial}\n` +
    `💯 Payment rate: ${paidPct}%` +
    recentLine +
    `\n\n🏷️ RECOMMENDATION: *${recommendation}*\n` +
    `⚡ Risk: ${risk}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Powered by Thappa 🤝`
  );
}

function buildNotFoundReply(name, phoneLast4) {
  return (
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔍 THAPPA CHECK RESULT\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `❓ *${name.toUpperCase()} | ${phoneLast4}* not found in Thappa database.\n\n` +
    `This person has no reported history yet.\n` +
    `• No data = no community reports\n` +
    `• Proceed with caution for large amounts\n` +
    `• Use REPORT to add their record after a transaction\n\n` +
    `Type *HELP* if you need assistance.\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`
  );
}

// ─── Main handler ─────────────────────────────────────────────────────────────

async function handleCheck(from, messageText) {
  const parsed = parseCheckCommand(messageText);

  if (!parsed) {
    await wa.sendText(
      from,
      `❌ Invalid format.\n\nCorrect usage:\n*CHECK [Name] [Phone Last 4]*\n\nExample:\nCHECK Rajesh Kumar 9823`
    );
    return;
  }

  const { name, phoneLast4 } = parsed;

  // ── Quota check ──────────────────────────────────────────────────────────
  let user = await sheets.getUser(from);
  const freeChecks = config.payment.freeChecksPerUser;

  if (!user) {
    // First-time user — create record
    await sheets.upsertUser(from, { freeChecksUsed: 0, subscriptionStatus: 'Free' });
    user = { FreeChecksUsed: '0', SubscriptionStatus: 'Free', SubscriptionExpiry: '' };
  }

  const checksUsed = parseInt(user.FreeChecksUsed || '0', 10);
  const isSubscribed = user.SubscriptionStatus === 'Active' && isSubscriptionValid(user.SubscriptionExpiry);

  if (!isSubscribed && checksUsed >= freeChecks) {
    // Prompt payment
    const payMsg = payment.buildPaymentPrompt('check', from);
    await wa.sendText(from, payMsg);
    return;
  }

  // ── Lookup ───────────────────────────────────────────────────────────────
  logger.info('CHECK command', { from, name, phoneLast4 });

  const person = await sheets.findPerson(name, phoneLast4);

  if (!person) {
    await wa.sendText(from, buildNotFoundReply(name, phoneLast4));
  } else {
    const transactions = await sheets.getTransactionsForPerson(person.PersonID);
    const reply = buildCheckReply(person, transactions);
    await wa.sendText(from, reply);
  }

  // ── Increment usage counter ──────────────────────────────────────────────
  if (!isSubscribed) {
    await sheets.upsertUser(from, {
      freeChecksUsed: checksUsed + 1,
      subscriptionStatus: user.SubscriptionStatus,
      subscriptionExpiry: user.SubscriptionExpiry,
    });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSubscriptionValid(expiryDateStr) {
  if (!expiryDateStr) return false;
  return new Date(expiryDateStr) >= new Date();
}

module.exports = { handleCheck, parseCheckCommand };
