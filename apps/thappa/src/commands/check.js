/**
 * CHECK Command Handler
 *
 * Usage: CHECK [Name] [Phone Last 4]
 * Example: CHECK Rajesh Kumar 9823
 *
 * Returns formatted trust score report for the queried person.
 */

const db = require('../db/sheets');
const { getRiskBand, getScoreSummary } = require('../scoring/algorithm');
const logger = require('../utils/logger');
const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
dayjs.extend(relativeTime);

/**
 * Parse CHECK command from message text
 * Supports: CHECK Rajesh Kumar 9823
 */
function parseCheckCommand(text) {
  const cleaned = text.replace(/^CHECK\s+/i, '').trim();
  // Last token that is 4 digits = phone
  const parts = cleaned.split(/\s+/);
  const phoneLast4 = parts[parts.length - 1];

  if (!/^\d{4}$/.test(phoneLast4)) {
    return null; // Invalid format
  }

  const name = parts.slice(0, -1).join(' ');
  if (!name) return null;

  return { name, phoneLast4 };
}

/**
 * Format the CHECK response message
 */
function formatCheckResponse(person, scoreData, recentTxns) {
  const band = getRiskBand(person.score);
  const summary = getScoreSummary(person.score, scoreData);

  const paymentRate = summary.paymentRate;
  const totalTxn = scoreData.totalTxn || 0;

  // Build recent history line
  let recentLine = '';
  if (recentTxns.length > 0) {
    const latest = recentTxns[0];
    const when = dayjs(latest.date).fromNow();
    const statusEmoji = latest.status === 'PAID' ? '✅' : latest.status === 'PARTIAL' ? '⚠️' : '❌';
    recentLine = `\n📋 Recent: ₹${latest.amount} ${latest.status} ${statusEmoji} ${when}`;
  }

  // Build transaction breakdown
  const paymentRateLine = totalTxn > 0 ? ` | 💸 ${paymentRate}% paid` : '';
  const txnBreakdown = totalTxn > 0
    ? `\n📊 ${totalTxn} transactions | ${scoreData.paid} PAID ✅ | ${scoreData.defaults} NOT PAID ❌ | ${scoreData.partial} PARTIAL ⚠️${paymentRateLine}`
    : '\n📊 No transactions recorded yet';

  // Build rating line
  const ratingLine = (scoreData.goodRatings + scoreData.badRatings) > 0
    ? `\n⭐ Ratings: ${scoreData.goodRatings} GOOD | ${scoreData.badRatings} BAD`
    : '';

  const statusLine = person.status !== 'Active'
    ? `\n🚫 Account Status: ${person.status}`
    : '';

  return `━━━━━━━━━━━━━━━━━━━━━━
🔍 THAPPA CHECK RESULT
━━━━━━━━━━━━━━━━━━━━━━
👤 ${person.name} | ****${person.phoneLast4}
📍 ${person.location || 'Location not set'}
🏷️ ${person.userType || 'Worker'}

🎯 Thappa Score: *${person.score}/1000*
${band.emoji} *${band.label}*${statusLine}
${txnBreakdown}${ratingLine}${recentLine}

💡 RECOMMENDATION: *${band.recommendation}*
⚡ Risk Level: *${band.risk}*
━━━━━━━━━━━━━━━━━━━━━━
Reply HELP for support`;
}

/**
 * Format "not found" response
 */
function formatNotFoundResponse(name, phoneLast4) {
  return `━━━━━━━━━━━━━━━━━━━━━━
🔍 THAPPA CHECK RESULT
━━━━━━━━━━━━━━━━━━━━━━
❓ *${name.toUpperCase()} | ****${phoneLast4}*

No record found in Thappa database.

This could mean:
• First time in the system
• Name/number mismatch

💡 To add this person, use:
REPORT ${name} ${phoneLast4} [Amount] [PAID/NOT_PAID/PARTIAL] [GOOD/BAD/NEUTRAL]
━━━━━━━━━━━━━━━━━━━━━━`;
}

/**
 * Main CHECK command executor
 */
async function executeCheck(text, senderPhone) {
  const parsed = parseCheckCommand(text);

  if (!parsed) {
    return `❌ Invalid CHECK format.

Correct format:
CHECK [Name] [Last 4 digits]

Example:
CHECK Rajesh Kumar 9823
CHECK Rani Devi 9876`;
  }

  const { name, phoneLast4 } = parsed;
  logger.info(`CHECK request: ${name} ${phoneLast4} from ${senderPhone}`);

  try {
    const result = await db.findPerson(name, phoneLast4);

    if (!result) {
      return formatNotFoundResponse(name, phoneLast4);
    }

    const { person } = result;

    // Get score data and recent transactions in parallel
    const [scoreResult, recentTxns] = await Promise.all([
      db.getScoreRecord(person.id),
      db.getRecentTransactions(person.id, 3),
    ]);

    const scoreData = scoreResult
      ? scoreResult.record
      : { totalTxn: 0, paid: 0, defaults: 0, partial: 0, goodRatings: 0, badRatings: 0 };

    return formatCheckResponse(person, scoreData, recentTxns);
  } catch (err) {
    logger.error(`CHECK error: ${err.message}`);
    return `⚠️ System error while checking. Please try again in a moment.\n\nReply HELP if this persists.`;
  }
}

module.exports = { executeCheck, parseCheckCommand };
