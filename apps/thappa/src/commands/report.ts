/**
 * REPORT command handler — multi-step conversational flow.
 *
 * Full one-shot format:
 *   REPORT <Name> <Phone Last 4> <Amount> <PAID|NOT PAID|PARTIAL> <GOOD|BAD|NEUTRAL>
 *
 * If fields are missing the bot asks follow-up questions step by step.
 */

import {
  findPerson,
  createPerson,
  addTransaction,
  getTransactionsForPerson,
  upsertScoreRecord,
  updatePersonScore,
} from "../db/sheets.js";
import { calculateScore, formatScoreDropAlert } from "../utils/scoring.js";
import {
  normalisePaymentStatus,
  normaliseRating,
  isValidPhoneLast4,
  isValidAmount,
  parseAmount,
} from "../utils/parser.js";
import { sendTextMessage } from "../utils/whatsapp.js";
import {
  getSession,
  setStep,
  setSessionData,
  clearSession,
} from "../utils/session.js";
import type { ReportCommand, PaymentStatus, QualityRating } from "../types/index.js";

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function handleReport(
  senderPhone: string,
  cmd: ReportCommand
): Promise<void> {
  const session = getSession(senderPhone);

  // If we already have a full command, process immediately
  if (
    cmd.name &&
    cmd.phoneLast4 &&
    cmd.amount !== undefined &&
    cmd.paymentStatus &&
    cmd.qualityRating
  ) {
    await processFullReport(senderPhone, {
      name: cmd.name,
      phoneLast4: cmd.phoneLast4,
      amount: cmd.amount,
      paymentStatus: cmd.paymentStatus,
      qualityRating: cmd.qualityRating,
    });
    return;
  }

  // Partial command — seed what we have and start the guided flow
  if (cmd.name) setSessionData(senderPhone, { name: cmd.name });
  if (cmd.phoneLast4) setSessionData(senderPhone, { phoneLast4: cmd.phoneLast4 });
  if (cmd.amount !== undefined) setSessionData(senderPhone, { amount: cmd.amount });
  if (cmd.paymentStatus) setSessionData(senderPhone, { paymentStatus: cmd.paymentStatus });
  if (cmd.qualityRating) setSessionData(senderPhone, { qualityRating: cmd.qualityRating });

  await continueReportFlow(senderPhone);
}

// ─── Guided step-by-step flow ─────────────────────────────────────────────────

export async function continueReportFlow(senderPhone: string): Promise<void> {
  const session = getSession(senderPhone);
  const { data } = session;

  if (!data.name) {
    setStep(senderPhone, "report_name");
    await sendTextMessage(
      senderPhone,
      `📝 *New Report*\n\nWhat is the *full name* of the person you want to report?\n\n_Example: Rajesh Kumar_`
    );
    return;
  }

  if (!data.phoneLast4 || !isValidPhoneLast4(data.phoneLast4)) {
    setStep(senderPhone, "report_phone");
    await sendTextMessage(
      senderPhone,
      `📱 What are the *last 4 digits* of ${data.name}'s phone number?\n\n_Example: 9823_`
    );
    return;
  }

  if (data.amount === undefined) {
    setStep(senderPhone, "report_amount");
    await sendTextMessage(
      senderPhone,
      `💰 What was the *transaction amount* (in ₹)?\n\n_Example: 500_`
    );
    return;
  }

  if (!data.paymentStatus) {
    setStep(senderPhone, "report_status");
    await sendTextMessage(
      senderPhone,
      `💳 What is the *payment status*?\n\nReply with:\n` +
        `• *PAID* — Payment received ✅\n` +
        `• *NOT PAID* — Payment not received ❌\n` +
        `• *PARTIAL* — Partial payment received ⚠️`
    );
    return;
  }

  if (!data.qualityRating) {
    setStep(senderPhone, "report_rating");
    await sendTextMessage(
      senderPhone,
      `⭐ How would you *rate* this person's overall behaviour?\n\nReply with:\n` +
        `• *GOOD* — Reliable, honest, professional 👍\n` +
        `• *BAD* — Unreliable, dishonest, problematic 👎\n` +
        `• *NEUTRAL* — Average, no strong opinion 😐`
    );
    return;
  }

  // All data collected — process
  await processFullReport(senderPhone, {
    name: data.name,
    phoneLast4: data.phoneLast4,
    amount: data.amount,
    paymentStatus: data.paymentStatus,
    qualityRating: data.qualityRating,
  });
}

// ─── Handle step responses ────────────────────────────────────────────────────

export async function handleReportStep(
  senderPhone: string,
  text: string
): Promise<void> {
  const session = getSession(senderPhone);

  switch (session.step) {
    case "report_name": {
      const name = text.trim();
      if (name.length < 2) {
        await sendTextMessage(senderPhone, `❌ Please enter a valid full name.`);
        return;
      }
      setSessionData(senderPhone, { name });
      await continueReportFlow(senderPhone);
      break;
    }

    case "report_phone": {
      if (!isValidPhoneLast4(text.trim())) {
        await sendTextMessage(
          senderPhone,
          `❌ Please enter exactly *4 digits*.\n_Example: 9823_`
        );
        return;
      }
      setSessionData(senderPhone, { phoneLast4: text.trim() });
      await continueReportFlow(senderPhone);
      break;
    }

    case "report_amount": {
      if (!isValidAmount(text)) {
        await sendTextMessage(
          senderPhone,
          `❌ Please enter a valid amount in ₹.\n_Example: 500_`
        );
        return;
      }
      setSessionData(senderPhone, { amount: parseAmount(text) });
      await continueReportFlow(senderPhone);
      break;
    }

    case "report_status": {
      const status = normalisePaymentStatus(text);
      if (!status) {
        await sendTextMessage(
          senderPhone,
          `❌ Please reply with *PAID*, *NOT PAID*, or *PARTIAL*.`
        );
        return;
      }
      setSessionData(senderPhone, { paymentStatus: status });
      await continueReportFlow(senderPhone);
      break;
    }

    case "report_rating": {
      const rating = normaliseRating(text);
      if (!rating) {
        await sendTextMessage(
          senderPhone,
          `❌ Please reply with *GOOD*, *BAD*, or *NEUTRAL*.`
        );
        return;
      }
      setSessionData(senderPhone, { qualityRating: rating });
      await continueReportFlow(senderPhone);
      break;
    }

    default:
      break;
  }
}

// ─── Core report processing ───────────────────────────────────────────────────

async function processFullReport(
  senderPhone: string,
  data: {
    name: string;
    phoneLast4: string;
    amount: number;
    paymentStatus: PaymentStatus;
    qualityRating: QualityRating;
  }
): Promise<void> {
  const { name, phoneLast4, amount, paymentStatus, qualityRating } = data;

  // Find or create person
  let person = await findPerson(name, phoneLast4);
  if (!person) {
    person = await createPerson({
      name: name.toUpperCase(),
      phoneLast4,
      location: "",
      userType: "other",
      score: 500,
      status: "Active",
    });
  }

  const oldScore = person.score;

  // Add transaction
  await addTransaction({
    personId: person.id,
    reporterPhone: senderPhone.slice(-4), // store only last 4 of reporter too
    amount,
    paymentStatus,
    qualityRating,
    reportedAt: new Date().toISOString(),
  });

  // Recalculate score
  const allTransactions = await getTransactionsForPerson(person.id);
  const newScoreRecord = calculateScore(allTransactions);
  newScoreRecord.personId = person.id;

  await upsertScoreRecord(newScoreRecord);
  await updatePersonScore(person.id, newScoreRecord.compositeScore);

  const newScore = newScoreRecord.compositeScore;
  const scoreDelta = newScore - oldScore;
  const deltaStr =
    scoreDelta >= 0 ? `+${scoreDelta}` : `${scoreDelta}`;

  const statusEmoji =
    paymentStatus === "PAID" ? "✅" : paymentStatus === "NOT PAID" ? "❌" : "⚠️";
  const ratingEmoji =
    qualityRating === "GOOD" ? "👍" : qualityRating === "BAD" ? "👎" : "😐";

  // Confirmation to reporter
  await sendTextMessage(
    senderPhone,
    `✅ *REPORT RECORDED*\n\n` +
      `👤 *${person.name} | ${person.phoneLast4}*\n` +
      `💰 Amount: ₹${amount}\n` +
      `${statusEmoji} Status: ${paymentStatus}\n` +
      `${ratingEmoji} Rating: ${qualityRating}\n\n` +
      `📊 *Score Updated*\n` +
      `${oldScore} → *${newScore}/1000* (${deltaStr})\n\n` +
      `Thank you for protecting your community! 🙏\n\n` +
      `_Powered by Thappa_`
  );

  // Alert the reported person if score dropped significantly
  if (scoreDelta <= -80) {
    // In production: look up the person's WhatsApp number and send alert
    // For now we log — full phone number is never stored
    console.log(
      `[Thappa] Score drop alert for ${person.id}: ${oldScore} → ${newScore}`
    );
  }

  clearSession(senderPhone);
}
