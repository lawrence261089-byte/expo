/**
 * HELP command handler.
 *
 * Forwards the user's message to the support WhatsApp number and
 * sends an acknowledgement back to the user.
 */

import { sendTextMessage, forwardToSupport } from "../utils/whatsapp.js";
import type { HelpCommand } from "../types/index.js";

export async function handleHelp(
  senderPhone: string,
  cmd: HelpCommand
): Promise<void> {
  const supportPhone = process.env.SUPPORT_PHONE ?? "1800-XXX-XXXX";

  // Acknowledge to user
  await sendTextMessage(
    senderPhone,
    `🤝 *Thappa Support*\n\n` +
      `Your message has been forwarded to our support team.\n\n` +
      `⏱️ We typically reply within *2 hours*.\n` +
      `📞 For urgent issues: *${supportPhone}*\n\n` +
      `Your message:\n_"${cmd.message}"_\n\n` +
      `_Thank you for using Thappa!_`
  );

  // Forward to support
  await forwardToSupport(senderPhone, cmd.message);
}

// ─── Welcome / onboarding message ────────────────────────────────────────────

export async function sendWelcomeMessage(senderPhone: string): Promise<void> {
  const freeLimit = process.env.FREE_CHECKS_LIMIT ?? "10";
  const checkPrice = process.env.CHECK_PRICE_INR ?? "10";
  const subPrice = process.env.SUBSCRIPTION_PRICE_INR ?? "99";

  await sendTextMessage(
    senderPhone,
    `🙏 *Welcome to Thappa!*\n` +
      `_Trust for India's Informal Economy_\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `*What can I do?*\n\n` +
      `🔍 *CHECK* — Verify someone's trust score\n` +
      `Format: *CHECK <Name> <Phone Last 4>*\n` +
      `Example: *CHECK Rajesh Kumar 9823*\n\n` +
      `📝 *REPORT* — Log a transaction\n` +
      `Format: *REPORT <Name> <Phone Last 4> <Amount> <Status> <Rating>*\n` +
      `Example: *REPORT Rani Devi 9876 500 PAID GOOD*\n\n` +
      `🤝 *HELP* — Talk to our support team\n` +
      `Example: *HELP I have a dispute*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `💡 *Pricing*\n` +
      `• First *${freeLimit} checks* are FREE\n` +
      `• ₹${checkPrice} per check after that\n` +
      `• ₹${subPrice}/month for unlimited checks\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `_Every report you make protects your community. 🇮🇳_`
  );
}

// ─── Unknown command response ─────────────────────────────────────────────────

export async function sendUnknownCommandResponse(
  senderPhone: string,
  raw: string
): Promise<void> {
  await sendTextMessage(
    senderPhone,
    `❓ I didn't understand: _"${raw}"_\n\n` +
      `*Available commands:*\n\n` +
      `🔍 *CHECK <Name> <Phone Last 4>*\n` +
      `📝 *REPORT <Name> <Phone Last 4> <Amount> <Status> <Rating>*\n` +
      `🤝 *HELP <your question>*\n\n` +
      `_Reply *HELP* to talk to our support team._`
  );
}
