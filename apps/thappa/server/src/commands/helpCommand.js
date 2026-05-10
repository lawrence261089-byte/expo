'use strict';

/**
 * helpCommand.js
 * Handles: HELP [optional question]
 *
 * Flow:
 *  1. Acknowledge the user immediately
 *  2. Forward the message to the support WhatsApp number
 *  3. Log the escalation
 */

const wa = require('../services/whatsappService');
const config = require('../config');
const logger = require('../logger');

// ─── Static help menu ─────────────────────────────────────────────────────────

const HELP_MENU =
  `━━━━━━━━━━━━━━━━━━━━━━\n` +
  `🤝 THAPPA HELP CENTRE\n` +
  `━━━━━━━━━━━━━━━━━━━━━━\n` +
  `*Available commands:*\n\n` +
  `🔍 *CHECK* — Verify someone's trust score\n` +
  `Format: CHECK [Name] [Phone Last 4]\n` +
  `Example: CHECK Rajesh Kumar 9823\n\n` +
  `📝 *REPORT* — Report a transaction\n` +
  `Format: REPORT [Name] [Phone Last 4] [Amount] [Status] [Rating]\n` +
  `Example: REPORT Rani Devi 9876 500 PAID GOOD\n` +
  `(Or just type REPORT and we'll guide you step by step)\n\n` +
  `❓ *HELP* — Get support\n` +
  `Format: HELP [your question]\n` +
  `Example: HELP How do I dispute a wrong report?\n\n` +
  `━━━━━━━━━━━━━━━━━━━━━━\n` +
  `*Score Guide:*\n` +
  `🔴 0–299   → HIGH RISK\n` +
  `🟡 300–599 → MODERATE\n` +
  `🟢 600–799 → GOOD\n` +
  `✅ 800–1000 → EXCELLENT\n` +
  `━━━━━━━━━━━━━━━━━━━━━━\n` +
  `*Pricing:*\n` +
  `• First 10 checks FREE\n` +
  `• ₹10 per check after that\n` +
  `• ₹99/month unlimited subscription\n` +
  `━━━━━━━━━━━━━━━━━━━━━━\n` +
  `Powered by Thappa 🤝`;

// ─── Main handler ─────────────────────────────────────────────────────────────

async function handleHelp(from, messageText) {
  const body = messageText.replace(/^HELP\s*/i, '').trim();

  if (!body) {
    // No question — send the help menu
    await wa.sendText(from, HELP_MENU);
    return;
  }

  // User has a specific question — acknowledge and escalate
  const hours = config.support.replyHours;
  const ackMsg =
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🤝 THAPPA SUPPORT\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Your message has been received.\n\n` +
    `*Your query:* "${body}"\n\n` +
    `⏱️ We typically reply within *${hours} hours*.\n\n` +
    `For urgent issues, type *HELP* to see all commands.\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`;

  await wa.sendText(from, ackMsg);

  // Forward to support number
  await escalateToSupport(from, body);
}

// ─── Escalation ───────────────────────────────────────────────────────────────

async function escalateToSupport(userPhone, query) {
  const supportNumber = config.support.whatsappNumber;

  if (!supportNumber || supportNumber === '91XXXXXXXXXX') {
    logger.warn('Support WhatsApp number not configured — escalation skipped', { userPhone });
    return;
  }

  const supportMsg =
    `🆘 *THAPPA SUPPORT ESCALATION*\n\n` +
    `From: ${userPhone}\n` +
    `Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n` +
    `Query: ${query}`;

  try {
    await wa.sendText(supportNumber, supportMsg);
    logger.info('Support escalation sent', { userPhone, supportNumber });
  } catch (err) {
    logger.error('Failed to escalate to support', { userPhone, error: err.message });
  }
}

module.exports = { handleHelp, HELP_MENU };
