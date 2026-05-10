'use strict';

/**
 * paymentService.js
 * Handles UPI payment prompts and subscription management.
 *
 * Thappa uses UPI deep-links — no external payment gateway required.
 * The founder manually verifies payments and updates subscription status,
 * or an automated UPI callback can be wired in Phase 2.
 */

const config = require('../config');
const sheets = require('./sheetsService');
const wa = require('./whatsappService');
const logger = require('../logger');

// ─── UPI deep-link builder ────────────────────────────────────────────────────

/**
 * Build a UPI payment deep-link URL.
 * Compatible with Google Pay, PhonePe, Paytm, and all UPI apps.
 */
function buildUpiLink(amount, transactionNote) {
  const params = new URLSearchParams({
    pa: config.payment.upiId,
    pn: config.payment.upiName,
    am: amount.toString(),
    cu: 'INR',
    tn: transactionNote,
  });
  return `upi://pay?${params.toString()}`;
}

// ─── Payment prompt messages ──────────────────────────────────────────────────

/**
 * Build a payment prompt message for the user.
 * @param {'check'|'subscribe'} type
 * @param {string} userPhone
 */
function buildPaymentPrompt(type, userPhone) {
  if (type === 'check') {
    const amount = config.payment.checkPriceInr;
    const upiLink = buildUpiLink(amount, `Thappa-Check-${userPhone.slice(-4)}`);
    return (
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💳 THAPPA PAYMENT\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `You've used all your free checks.\n\n` +
      `*Pay ₹${amount} for this check:*\n` +
      `${upiLink}\n\n` +
      `Or subscribe for *₹${config.payment.subscriptionPriceInr}/month* for unlimited checks:\n` +
      `${buildUpiLink(config.payment.subscriptionPriceInr, `Thappa-Sub-${userPhone.slice(-4)}`)}\n\n` +
      `After payment, send:\n` +
      `*PAID [UPI Transaction ID]*\n\n` +
      `Example: PAID 123456789012\n` +
      `━━━━━━━━━━━━━━━━━━━━━━`
    );
  }

  if (type === 'subscribe') {
    const amount = config.payment.subscriptionPriceInr;
    const upiLink = buildUpiLink(amount, `Thappa-Sub-${userPhone.slice(-4)}`);
    return (
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💳 THAPPA SUBSCRIPTION\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `*₹${amount}/month* — Unlimited checks\n\n` +
      `Pay now:\n` +
      `${upiLink}\n\n` +
      `After payment, send:\n` +
      `*PAID [UPI Transaction ID]*\n\n` +
      `Example: PAID 123456789012\n` +
      `━━━━━━━━━━━━━━━━━━━━━━`
    );
  }

  return '';
}

// ─── Monthly subscription reminder ───────────────────────────────────────────

/**
 * Send renewal reminders to all users whose subscription expires within 3 days.
 * Called by a cron job on the 1st of each month.
 */
async function sendSubscriptionReminders() {
  try {
    const users = await sheets.readSheet(config.googleSheets.tabs.users);
    const today = new Date();
    const threeDaysLater = new Date(today.getTime() + 3 * 86400000);

    for (const user of users) {
      if (user.SubscriptionStatus !== 'Active') continue;
      if (!user.SubscriptionExpiry) continue;

      const expiry = new Date(user.SubscriptionExpiry);
      if (expiry <= threeDaysLater && expiry >= today) {
        const reminderMsg = buildPaymentPrompt('subscribe', user.Phone);
        const fullMsg =
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🔔 THAPPA RENEWAL REMINDER\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Your subscription expires on *${user.SubscriptionExpiry}*.\n\n` +
          reminderMsg;

        await wa.sendText(user.Phone, fullMsg);
        logger.info('Subscription reminder sent', { phone: user.Phone, expiry: user.SubscriptionExpiry });
      }
    }
  } catch (err) {
    logger.error('Failed to send subscription reminders', { error: err.message });
  }
}

// ─── Handle PAID confirmation ─────────────────────────────────────────────────

/**
 * Process a "PAID <txId>" message from a user.
 * In Phase 1 this is manual verification — the founder confirms via admin dashboard.
 * This function records the pending payment and notifies the founder.
 */
async function handlePaidConfirmation(from, upiTxId) {
  logger.info('Payment confirmation received', { from, upiTxId });

  // Record pending payment (in production, verify via UPI callback)
  const pendingMsg =
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⏳ PAYMENT UNDER REVIEW\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `UPI Ref: *${upiTxId}*\n\n` +
    `Your payment is being verified. Access will be activated within *30 minutes*.\n\n` +
    `Questions? Type *HELP*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`;

  await wa.sendText(from, pendingMsg);

  // Notify support for manual verification
  const supportNumber = config.support.whatsappNumber;
  if (supportNumber && supportNumber !== '91XXXXXXXXXX') {
    const adminMsg =
      `💰 *PAYMENT CONFIRMATION*\n\n` +
      `From: ${from}\n` +
      `UPI Ref: ${upiTxId}\n` +
      `Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n` +
      `To activate: update their subscription in the admin dashboard.`;
    await wa.sendText(supportNumber, adminMsg);
  }
}

/**
 * Activate a user's subscription (called by admin after payment verification).
 */
async function activateSubscription(phone, months = 1) {
  const expiry = new Date();
  expiry.setMonth(expiry.getMonth() + months);
  const expiryStr = expiry.toISOString().split('T')[0];

  await sheets.upsertUser(phone, {
    subscriptionStatus: 'Active',
    subscriptionExpiry: expiryStr,
  });

  const activationMsg =
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `✅ SUBSCRIPTION ACTIVATED\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Your Thappa subscription is now *ACTIVE*.\n` +
    `Valid until: *${expiryStr}*\n\n` +
    `Enjoy unlimited checks! 🎉\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`;

  await wa.sendText(phone, activationMsg);
  logger.info('Subscription activated', { phone, expiry: expiryStr });
}

module.exports = {
  buildUpiLink,
  buildPaymentPrompt,
  sendSubscriptionReminders,
  handlePaidConfirmation,
  activateSubscription,
};
