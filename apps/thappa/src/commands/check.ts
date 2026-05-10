/**
 * CHECK command handler.
 *
 * Usage: CHECK <Name> <Phone Last 4>
 *
 * Looks up the person in the database, retrieves their score and recent
 * transaction history, and returns a formatted trust report.
 */

import {
  findPerson,
  getTransactionsForPerson,
  getScoreRecord,
  getUser,
  updateUser,
} from "../db/sheets.js";
import { getScoreLabel } from "../utils/scoring.js";
import {
  generateCheckPayment,
  generatePaymentRef,
} from "../utils/upi.js";
import {
  sendTextMessage,
  sendImageMessage,
} from "../utils/whatsapp.js";
import {
  getSession,
  incrementChecks,
  isSubscriptionActive,
  getFreeChecksLimit,
} from "../utils/session.js";
import type { CheckCommand } from "../types/index.js";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime.js";

dayjs.extend(relativeTime);

// ─── Payment gate ─────────────────────────────────────────────────────────────

async function requiresPayment(senderPhone: string): Promise<boolean> {
  if (isSubscriptionActive(senderPhone)) return false;

  const user = await getUser(senderPhone);
  const freeLimit = getFreeChecksLimit();
  return user.checksUsed >= freeLimit;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function handleCheck(
  senderPhone: string,
  cmd: CheckCommand
): Promise<void> {
  const { name, phoneLast4 } = cmd;

  // Validate inputs
  if (!name || !/^\d{4}$/.test(phoneLast4)) {
    await sendTextMessage(
      senderPhone,
      `❌ *Invalid format*\n\n` +
        `Please use:\n*CHECK <Name> <Phone Last 4 digits>*\n\n` +
        `Example:\n*CHECK Rajesh Kumar 9823*`
    );
    return;
  }

  // Payment gate
  const needsPayment = await requiresPayment(senderPhone);
  if (needsPayment) {
    const ref = generatePaymentRef("CHK");
    const payment = generateCheckPayment(ref);

    await sendTextMessage(senderPhone, payment.displayText);
    await sendImageMessage(
      senderPhone,
      payment.qrCodeUrl,
      `Scan to pay ₹${process.env.CHECK_PRICE_INR ?? 10} for this Thappa Check`
    );
    return;
  }

  // Increment usage counter
  const user = await getUser(senderPhone);
  user.checksUsed += 1;
  await updateUser(user);
  incrementChecks(senderPhone);

  // Look up person
  const person = await findPerson(name, phoneLast4);

  if (!person) {
    await sendTextMessage(
      senderPhone,
      `🔍 *No record found*\n\n` +
        `*${name.toUpperCase()} | ${phoneLast4}*\n\n` +
        `This person has no Thappa history yet.\n\n` +
        `• They may be new to the platform\n` +
        `• Double-check the name and last 4 digits\n\n` +
        `_Tip: Be the first to report a transaction with them!_`
    );
    return;
  }

  // Blocked account
  if (person.status === "Blocked") {
    await sendTextMessage(
      senderPhone,
      `🚫 *BLOCKED ACCOUNT*\n\n` +
        `*${person.name.toUpperCase()} | ${person.phoneLast4}*\n\n` +
        `This account has been blocked due to multiple verified complaints.\n` +
        `*RECOMMENDATION: DO NOT EXTEND CREDIT*\n\n` +
        `For details, reply *HELP* and mention this name.`
    );
    return;
  }

  // Fetch transactions and score
  const [transactions, scoreRecord] = await Promise.all([
    getTransactionsForPerson(person.id),
    getScoreRecord(person.id),
  ]);

  const score = scoreRecord?.compositeScore ?? person.score;
  const label = getScoreLabel(score);
  const total = transactions.length;
  const paid = transactions.filter((t) => t.paymentStatus === "PAID").length;
  const notPaid = transactions.filter((t) => t.paymentStatus === "NOT PAID").length;
  const partial = transactions.filter((t) => t.paymentStatus === "PARTIAL").length;
  const payRate = total > 0 ? Math.round((paid / total) * 100) : 0;

  // Recent 3 transactions
  const recent = transactions.slice(0, 3);
  const recentLines = recent
    .map((tx) => {
      const statusEmoji =
        tx.paymentStatus === "PAID"
          ? "✅"
          : tx.paymentStatus === "NOT PAID"
          ? "❌"
          : "⚠️";
      const ago = dayjs(tx.reportedAt).fromNow();
      return `  ${statusEmoji} ₹${tx.amount} ${tx.paymentStatus} — ${ago}`;
    })
    .join("\n");

  const underReviewNote =
    person.status === "Under Review"
      ? `\n⚠️ _This account is currently under review._\n`
      : "";

  const reply =
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔍 *THAPPA REPORT*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `👤 *${person.name.toUpperCase()} | ${person.phoneLast4}*\n` +
    `📍 ${person.location || "Location not set"}\n\n` +
    `🏆 *Thappa Score: ${score}/1000 ${label.emoji} ${label.label}*\n\n` +
    `📊 *Transaction History*\n` +
    `Total: ${total} transactions\n` +
    `✅ Paid: ${paid}  ❌ Not Paid: ${notPaid}  ⚠️ Partial: ${partial}\n` +
    `Payment Rate: ${payRate}%\n\n` +
    (recentLines ? `📋 *Recent Activity*\n${recentLines}\n\n` : "") +
    underReviewNote +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `🎯 *RECOMMENDATION: ${label.recommendation}*\n` +
    `⚡ Risk Level: ${label.risk}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `_Powered by Thappa — Trust for India's Informal Economy_`;

  await sendTextMessage(senderPhone, reply);
}
