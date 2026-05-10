/**
 * REPORT Command Handler
 *
 * Usage: REPORT [Name] [Phone Last 4] [Amount] [Status] [Rating]
 * Example: REPORT Rajesh Kumar 9823 500 NOT_PAID BAD
 *
 * Supports multi-step guided flow for incomplete commands.
 */

const db = require('../db/sheets');
const { recalculateScore } = require('../scoring/algorithm');
const logger = require('../utils/logger');

// ─── In-memory session store for multi-step flow ──────────────────────────────
// In production, replace with Redis or a persistent store
const sessions = new Map();

const SESSION_TTL = 10 * 60 * 1000; // 10 minutes

function getSession(phone) {
  const session = sessions.get(phone);
  if (!session) return null;
  if (Date.now() - session.createdAt > SESSION_TTL) {
    sessions.delete(phone);
    return null;
  }
  return session;
}

function setSession(phone, data) {
  sessions.set(phone, { ...data, createdAt: Date.now() });
}

function clearSession(phone) {
  sessions.delete(phone);
}

// ─── Validation ───────────────────────────────────────────────────────────────
const VALID_STATUSES = ['PAID', 'NOT_PAID', 'PARTIAL'];
const VALID_RATINGS = ['GOOD', 'BAD', 'NEUTRAL'];

function normalizeStatus(s) {
  const map = {
    'PAID': 'PAID', 'PAY': 'PAID', 'P': 'PAID',
    'NOT_PAID': 'NOT_PAID', 'NOTPAID': 'NOT_PAID', 'NO': 'NOT_PAID', 'N': 'NOT_PAID', 'DEFAULT': 'NOT_PAID',
    'PARTIAL': 'PARTIAL', 'PART': 'PARTIAL',
  };
  return map[s.toUpperCase()] || null;
}

function normalizeRating(r) {
  const map = {
    'GOOD': 'GOOD', 'G': 'GOOD', 'GREAT': 'GOOD', 'EXCELLENT': 'GOOD',
    'BAD': 'BAD', 'B': 'BAD', 'POOR': 'BAD', 'TERRIBLE': 'BAD',
    'NEUTRAL': 'NEUTRAL', 'OK': 'NEUTRAL', 'AVERAGE': 'NEUTRAL', 'N': 'NEUTRAL',
  };
  return map[r.toUpperCase()] || null;
}

/**
 * Parse full REPORT command
 * REPORT Rajesh Kumar 9823 500 NOT_PAID BAD
 */
function parseReportCommand(text) {
  const cleaned = text.replace(/^REPORT\s+/i, '').trim();
  const parts = cleaned.split(/\s+/);

  if (parts.length < 5) return null;

  // Last 3 tokens: rating, status, amount
  const rating = normalizeRating(parts[parts.length - 1]);
  const status = normalizeStatus(parts[parts.length - 2]);
  const amount = parseFloat(parts[parts.length - 3]);
  const phoneLast4 = parts[parts.length - 4];
  const name = parts.slice(0, -4).join(' ');

  if (!rating || !status || isNaN(amount) || !/^\d{4}$/.test(phoneLast4) || !name) {
    return null;
  }

  return { name, phoneLast4, amount, status, rating };
}

/**
 * Format confirmation message after successful report
 */
function formatReportConfirmation(person, txn, oldScore, newScore) {
  const delta = newScore - oldScore;
  const deltaStr = delta >= 0 ? `+${delta}` : `${delta}`;
  const statusEmoji = txn.status === 'PAID' ? '✅' : txn.status === 'PARTIAL' ? '⚠️' : '❌';
  const ratingEmoji = txn.rating === 'GOOD' ? '👍' : txn.rating === 'BAD' ? '👎' : '👌';

  return `━━━━━━━━━━━━━━━━━━━━━━
✅ THAPPA REPORT RECORDED
━━━━━━━━━━━━━━━━━━━━━━
👤 ${person.name} | ****${person.phoneLast4}
💰 Amount: ₹${txn.amount}
📋 Status: ${txn.status} ${statusEmoji}
⭐ Rating: ${txn.rating} ${ratingEmoji}

📊 Score Updated:
   ${oldScore} → *${newScore}* (${deltaStr})

🙏 Thank you for protecting your community!
━━━━━━━━━━━━━━━━━━━━━━
Reply CHECK ${person.name} ${person.phoneLast4} to verify`;
}

/**
 * Execute a complete REPORT in one shot
 */
async function executeFullReport(parsed, senderPhone) {
  const { name, phoneLast4, amount, status, rating } = parsed;

  // Find or create person
  let personResult = await db.findPerson(name, phoneLast4);
  let person;

  if (!personResult) {
    // Auto-create new person
    person = await db.createPerson({ name, phoneLast4 });
    logger.info(`Auto-created person: ${person.id} - ${name}`);
  } else {
    person = personResult.person;
  }

  // Log transaction
  const txn = await db.logTransaction({
    personId: person.id,
    reporterPhone: senderPhone,
    amount,
    status,
    rating,
    notes: '',
  });

  // Recalculate score
  const { oldScore, newScore } = await recalculateScore(person.id);

  return formatReportConfirmation(person, txn, oldScore, newScore);
}

/**
 * Multi-step guided REPORT flow
 */
async function executeGuidedReport(text, senderPhone) {
  const session = getSession(senderPhone);

  // Step 1: User sent just "REPORT" or "REPORT Name Phone"
  if (!session) {
    const partial = text.replace(/^REPORT\s*/i, '').trim();
    const parts = partial.split(/\s+/);

    // Check if we have name + phone
    if (parts.length >= 2 && /^\d{4}$/.test(parts[parts.length - 1])) {
      const phoneLast4 = parts[parts.length - 1];
      const name = parts.slice(0, -1).join(' ');
      setSession(senderPhone, { step: 'amount', name, phoneLast4 });
      return `📝 *REPORT: ${name.toUpperCase()} | ****${phoneLast4}*

💰 How much was the transaction?
Reply with the amount in ₹ (e.g., 500)`;
    }

    // No name/phone provided
    setSession(senderPhone, { step: 'name' });
    return `📝 *THAPPA REPORT*

Who do you want to report?
Reply with: [Full Name] [Last 4 digits of phone]

Example: Rajesh Kumar 9823`;
  }

  // Step 2: Collecting name + phone
  if (session.step === 'name') {
    const parts = text.trim().split(/\s+/);
    if (parts.length < 2 || !/^\d{4}$/.test(parts[parts.length - 1])) {
      return `❌ Please include the name AND last 4 digits.

Example: Rajesh Kumar 9823`;
    }
    const phoneLast4 = parts[parts.length - 1];
    const name = parts.slice(0, -1).join(' ');
    setSession(senderPhone, { ...session, step: 'amount', name, phoneLast4 });
    return `✅ Got it: *${name.toUpperCase()} | ****${phoneLast4}*

💰 How much was the transaction?
Reply with amount in ₹ (e.g., 500)`;
  }

  // Step 3: Collecting amount
  if (session.step === 'amount') {
    const amount = parseFloat(text.trim().replace(/[₹,]/g, ''));
    if (isNaN(amount) || amount <= 0) {
      return `❌ Invalid amount. Please enter a number.
Example: 500`;
    }
    setSession(senderPhone, { ...session, step: 'status', amount });
    return `✅ Amount: ₹${amount}

📋 Was this amount paid?
Reply with:
1️⃣ PAID
2️⃣ NOT_PAID
3️⃣ PARTIAL`;
  }

  // Step 4: Collecting status
  if (session.step === 'status') {
    const status = normalizeStatus(text.trim());
    if (!status) {
      return `❌ Invalid status. Reply with:
PAID, NOT_PAID, or PARTIAL`;
    }
    setSession(senderPhone, { ...session, step: 'rating', status });
    return `✅ Status: ${status}

⭐ How would you rate this person?
Reply with:
👍 GOOD
👎 BAD
👌 NEUTRAL`;
  }

  // Step 5: Collecting rating → complete
  if (session.step === 'rating') {
    const rating = normalizeRating(text.trim());
    if (!rating) {
      return `❌ Invalid rating. Reply with:
GOOD, BAD, or NEUTRAL`;
    }

    const { name, phoneLast4, amount, status } = session;
    clearSession(senderPhone);

    return await executeFullReport({ name, phoneLast4, amount, status, rating }, senderPhone);
  }

  clearSession(senderPhone);
  return `⚠️ Session expired. Please start again with REPORT`;
}

/**
 * Main REPORT command executor
 */
async function executeReport(text, senderPhone) {
  logger.info(`REPORT request from ${senderPhone}: ${text}`);

  // Try to parse as a complete one-shot command first
  const parsed = parseReportCommand(text);
  if (parsed) {
    try {
      return await executeFullReport(parsed, senderPhone);
    } catch (err) {
      logger.error(`REPORT error: ${err.message}`);
      return `⚠️ Error recording report. Please try again.\n\nReply HELP for support.`;
    }
  }

  // Fall back to guided multi-step flow
  try {
    return await executeGuidedReport(text, senderPhone);
  } catch (err) {
    logger.error(`REPORT guided error: ${err.message}`);
    clearSession(senderPhone);
    return `⚠️ Error recording report. Please try again.\n\nReply HELP for support.`;
  }
}

/**
 * Check whether a guided session is active for a given phone number
 */
function hasSession(phone) {
  return getSession(phone) !== null;
}

module.exports = { executeReport, parseReportCommand, hasSession };
