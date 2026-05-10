/**
 * Message Dispatcher
 *
 * Routes incoming WhatsApp messages to the correct command handler
 * based on the first keyword in the message.
 */

const { executeCheck } = require('../commands/check');
const { executeReport } = require('../commands/report');
const { executeHelp } = require('../commands/help');
const { executeMyStats } = require('../commands/mystats');
const logger = require('./logger');

// ─── User subscription/quota tracking (in-memory, replace with DB in prod) ───
const userQuotas = new Map();
const FREE_CHECKS = parseInt(process.env.FREE_CHECKS_PER_USER || '10', 10);

function getUserQuota(phone) {
  if (!userQuotas.has(phone)) {
    userQuotas.set(phone, { checks: 0, subscribed: false, lastReset: new Date() });
  }
  return userQuotas.get(phone);
}

function incrementCheckCount(phone) {
  const quota = getUserQuota(phone);
  quota.checks += 1;
  userQuotas.set(phone, quota);
}

function getPaymentPrompt() {
  const upiId = process.env.UPI_ID || 'thappa@upi';
  return `━━━━━━━━━━━━━━━━━━━━━━
💳 *FREE CHECKS USED*

You've used your ${FREE_CHECKS} free checks.

To continue:
• Single check: ₹10
• Monthly unlimited: ₹99

💰 Pay via UPI:
*${upiId}*

After payment, reply:
PAID [UTR number]

Or subscribe monthly:
SUBSCRIBE
━━━━━━━━━━━━━━━━━━━━━━`;
}

/**
 * Detect command type from message text
 */
function detectCommand(text) {
  const upper = text.trim().toUpperCase();

  if (upper.startsWith('CHECK')) return 'CHECK';
  if (upper.startsWith('REPORT')) return 'REPORT';
  if (upper.startsWith('HELP')) return 'HELP';
  if (upper.startsWith('SUBSCRIBE')) return 'SUBSCRIBE';
  if (upper.startsWith('PAID')) return 'PAYMENT';
  if (upper === 'MYSTATS' || upper === 'MY STATS' || upper === 'STATS') return 'MYSTATS';
  if (upper === 'HI' || upper === 'HELLO' || upper === 'START') return 'GREETING';

  // Check if user is in a REPORT session (any text could be a step response)
  return 'UNKNOWN';
}

/**
 * Handle greeting messages
 */
function handleGreeting(senderName) {
  return `🙏 *Namaste ${senderName || 'there'}!*

Welcome to *Thappa* – India's Trust Platform.

I help you verify payment history before giving credit or hiring.

━━━━━━━━━━━━━━━━━━━━━━
📌 *Quick Commands:*

🔍 CHECK [Name] [Last 4 digits]
📝 REPORT [Name] [Last 4] [Amount] [Status] [Rating]
📊 MYSTATS – See your reporting activity
❓ HELP

━━━━━━━━━━━━━━━━━━━━━━
Example:
CHECK Rajesh Kumar 9823`;
}

/**
 * Handle unknown messages
 */
function handleUnknown() {
  return `❓ I didn't understand that.

Try:
• CHECK [Name] [Last 4 digits]
• REPORT [Name] [Last 4] [Amount] [Status] [Rating]
• HELP

Example: CHECK Rajesh Kumar 9823`;
}

/**
 * Main dispatcher
 */
async function dispatch(messageData) {
  const { from, text, senderName, type } = messageData;

  // Only handle text messages
  if (type !== 'text' || !text) {
    return `I can only process text messages. Please type your command.`;
  }

  const command = detectCommand(text);
  logger.info(`Dispatching command: ${command} from ${from}`);

  switch (command) {
    case 'GREETING':
      return handleGreeting(senderName);

    case 'CHECK': {
      const quota = getUserQuota(from);
      if (!quota.subscribed && quota.checks >= FREE_CHECKS) {
        return getPaymentPrompt();
      }
      incrementCheckCount(from);
      return await executeCheck(text, from);
    }

    case 'REPORT':
      return await executeReport(text, from);

    case 'HELP':
      return await executeHelp(text, from);

    case 'MYSTATS':
      return await executeMyStats(from);

    case 'SUBSCRIBE':
      return `━━━━━━━━━━━━━━━━━━━━━━
📦 *THAPPA SUBSCRIPTION*

Monthly Plan: ₹99
• Unlimited checks
• Priority support
• Transaction history

💰 Pay via UPI:
*${process.env.UPI_ID || 'thappa@upi'}*

After payment, reply:
PAID [UTR number]
━━━━━━━━━━━━━━━━━━━━━━`;

    case 'PAYMENT': {
      // Basic payment acknowledgment (in production, verify via UPI webhook)
      const utr = text.replace(/^PAID\s*/i, '').trim();
      if (!utr) {
        return `Please include your UTR number.\nExample: PAID 123456789012`;
      }
      logger.info(`Payment claim from ${from}: UTR ${utr}`);
      // Activate subscription for this user (pending real UTR verification)
      const quota = getUserQuota(from);
      quota.subscribed = true;
      userQuotas.set(from, quota);
      // TODO: Verify UTR via payment gateway API before activating in production
      return `✅ Payment received! (UTR: ${utr})

Your account has been activated.
You now have unlimited checks for this month.

Reply CHECK [Name] [Last 4] to start verifying.`;
    }

    case 'UNKNOWN':
    default:
      return handleUnknown();
  }
}

module.exports = { dispatch };
