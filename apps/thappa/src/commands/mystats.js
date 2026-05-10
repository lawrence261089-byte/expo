/**
 * MYSTATS Command Handler
 *
 * Usage: MYSTATS
 *
 * Shows the user their own reporting activity:
 * - How many reports they've submitted
 * - Breakdown by status and rating
 * - Total amount reported
 * - Their most recent report
 */

const db = require('../db/sheets');
const logger = require('../utils/logger');
const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
dayjs.extend(relativeTime);

/**
 * Get all transactions reported by a specific phone number
 */
async function getReportsByReporter(reporterPhone) {
  const rows = await db.readSheet(db.SHEETS.TRANSACTIONS);
  const dataRows = rows.slice(1);

  return dataRows
    .filter(row => String(row[2] || '').trim() === String(reporterPhone).trim())
    .map(row => ({
      id: row[0],
      personId: row[1],
      reporterPhone: row[2],
      amount: parseFloat(row[3] || '0'),
      status: row[4],
      rating: row[5],
      notes: row[6],
      date: row[7],
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * Format the MYSTATS response
 */
function formatMyStats(phone, reports) {
  if (reports.length === 0) {
    return `━━━━━━━━━━━━━━━━━━━━━━
📊 *YOUR THAPPA STATS*
━━━━━━━━━━━━━━━━━━━━━━
📱 ****${String(phone).slice(-4)}

You haven't submitted any reports yet.

To report a transaction:
REPORT [Name] [Last 4] [Amount] [Status] [Rating]

Example:
REPORT Rajesh Kumar 9823 500 PAID GOOD
━━━━━━━━━━━━━━━━━━━━━━`;
  }

  // Compute stats
  const totalReports = reports.length;
  const paid = reports.filter(r => r.status === 'PAID').length;
  const notPaid = reports.filter(r => r.status === 'NOT_PAID').length;
  const partial = reports.filter(r => r.status === 'PARTIAL').length;
  const goodRatings = reports.filter(r => r.rating === 'GOOD').length;
  const badRatings = reports.filter(r => r.rating === 'BAD').length;
  const neutralRatings = reports.filter(r => r.rating === 'NEUTRAL').length;
  const totalAmount = reports.reduce((sum, r) => sum + (r.amount || 0), 0);

  // Most recent report
  const latest = reports[0];
  const latestWhen = latest.date ? dayjs(latest.date).fromNow() : 'unknown';
  const latestStatusEmoji = latest.status === 'PAID' ? '✅' : latest.status === 'PARTIAL' ? '⚠️' : '❌';

  // Unique people reported
  const uniquePeople = new Set(reports.map(r => r.personId)).size;

  return `━━━━━━━━━━━━━━━━━━━━━━
📊 *YOUR THAPPA STATS*
━━━━━━━━━━━━━━━━━━━━━━
📱 ****${String(phone).slice(-4)}

📋 *Reports Submitted:* ${totalReports}
👥 *Unique People:* ${uniquePeople}
💰 *Total Amount:* ₹${totalAmount.toLocaleString('en-IN')}

📈 *Transaction Breakdown:*
✅ PAID: ${paid}
❌ NOT PAID: ${notPaid}
⚠️ PARTIAL: ${partial}

⭐ *Rating Breakdown:*
👍 GOOD: ${goodRatings}
👎 BAD: ${badRatings}
👌 NEUTRAL: ${neutralRatings}

🕐 *Last Report:* ${latestWhen}
   ₹${latest.amount} ${latest.status} ${latestStatusEmoji}

🙏 Thank you for keeping the community safe!
━━━━━━━━━━━━━━━━━━━━━━
Reply HELP for all commands`;
}

/**
 * Main MYSTATS command executor
 */
async function executeMyStats(senderPhone) {
  logger.info(`MYSTATS request from ${senderPhone}`);

  try {
    const reports = await getReportsByReporter(senderPhone);
    return formatMyStats(senderPhone, reports);
  } catch (err) {
    logger.error(`MYSTATS error: ${err.message}`);
    return `⚠️ Could not load your stats. Please try again.\n\nReply HELP for support.`;
  }
}

module.exports = { executeMyStats };
