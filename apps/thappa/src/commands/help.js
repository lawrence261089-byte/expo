/**
 * HELP Command Handler
 *
 * Provides usage instructions and connects users to human support.
 */

const logger = require('../utils/logger');

const SUPPORT_PHONE = process.env.SUPPORT_PHONE || ''; // Founder's WhatsApp (set in .env)
const SUPPORT_HOURS = process.env.SUPPORT_HOURS || '9 AM – 9 PM IST';
const SUPPORT_TOLL_FREE = process.env.SUPPORT_TOLL_FREE || '1800-XXX-XXXX';

/**
 * General HELP menu
 */
function getHelpMenu() {
  return `━━━━━━━━━━━━━━━━━━━━━━
🏷️ *THAPPA HELP*
Trust Scoring for India's Informal Economy
━━━━━━━━━━━━━━━━━━━━━━

📌 *COMMANDS:*

🔍 *CHECK* – Verify someone's trust score
Format: CHECK [Name] [Last 4 digits]
Example: CHECK Rajesh Kumar 9823

📝 *REPORT* – Log a transaction
Format: REPORT [Name] [Last 4] [Amount] [Status] [Rating]
Example: REPORT Rani Devi 9876 200 PAID GOOD

❓ *HELP* – Show this menu
Format: HELP [your question]

━━━━━━━━━━━━━━━━━━━━━━
📊 *SCORE GUIDE:*
🌟 800–1000 → EXCELLENT (Very Low Risk)
✅ 600–799  → GOOD (Low Risk)
⚡ 300–599  → MODERATE (Caution)
⚠️ 0–299   → RISKY (High Risk)

━━━━━━━━━━━━━━━━━━━━━━
📞 *SUPPORT:*
Hours: ${SUPPORT_HOURS}
Toll-free: ${SUPPORT_TOLL_FREE}
━━━━━━━━━━━━━━━━━━━━━━`;
}

/**
 * Support escalation message
 */
function getSupportEscalationMessage(question) {
  return `✅ *Support Request Received*

Your message has been forwarded to the Thappa team.

📋 Your query: "${question}"

⏱️ We typically reply within 2 hours.
📞 For urgent help: ${SUPPORT_TOLL_FREE}
🕐 Support hours: ${SUPPORT_HOURS}

━━━━━━━━━━━━━━━━━━━━━━
Reply HELP to see all commands`;
}

/**
 * Main HELP command executor
 */
async function executeHelp(text, senderPhone) {
  const question = text.replace(/^HELP\s*/i, '').trim();
  logger.info(`HELP request from ${senderPhone}: ${question || '(menu)'}`);

  if (!question) {
    return getHelpMenu();
  }

  // Log support request (in production, forward to founder's WhatsApp via API)
  logger.info(`SUPPORT ESCALATION from ${senderPhone}: ${question}`);

  // TODO: In production, send this to founder's WhatsApp via the API
  // await sendWhatsAppMessage(SUPPORT_PHONE, `Support request from ${senderPhone}:\n${question}`);

  return getSupportEscalationMessage(question);
}

module.exports = { executeHelp, getHelpMenu };
