/**
 * Parses raw WhatsApp message text into structured Thappa commands.
 *
 * Supported formats:
 *   CHECK <Name> <Phone Last 4>
 *   REPORT <Name> <Phone Last 4> <Amount> <PAID|NOT PAID|PARTIAL> <GOOD|BAD|NEUTRAL>
 *   HELP [optional message]
 */

import type {
  ParsedCommand,
  PaymentStatus,
  QualityRating,
} from "../types/index.js";

const PAYMENT_STATUSES: PaymentStatus[] = ["PAID", "NOT PAID", "PARTIAL"];
const QUALITY_RATINGS: QualityRating[] = ["GOOD", "BAD", "NEUTRAL"];

export function parseCommand(raw: string): ParsedCommand {
  const text = raw.trim();
  const upper = text.toUpperCase();

  // ── HELP ──────────────────────────────────────────────────────────────────
  if (upper.startsWith("HELP")) {
    return {
      type: "HELP",
      message: text.slice(4).trim() || "General support request",
    };
  }

  // ── CHECK ─────────────────────────────────────────────────────────────────
  if (upper.startsWith("CHECK")) {
    const parts = text.slice(5).trim().split(/\s+/);
    // Last token should be 4-digit phone suffix
    const phoneLast4 = parts[parts.length - 1];
    const name = parts.slice(0, -1).join(" ");

    if (name && /^\d{4}$/.test(phoneLast4)) {
      return { type: "CHECK", name, phoneLast4 };
    }
    // Partial — return with what we have so the handler can prompt
    return { type: "CHECK", name: name || "", phoneLast4: phoneLast4 || "" };
  }

  // ── REPORT ────────────────────────────────────────────────────────────────
  if (upper.startsWith("REPORT")) {
    const body = text.slice(6).trim();

    // Try to parse "NOT PAID" as a two-word token before splitting
    const normalised = body.replace(/NOT\s+PAID/gi, "NOT_PAID");
    const parts = normalised.split(/\s+/);

    // Restore NOT PAID
    const restored = parts.map((p) =>
      p.toUpperCase() === "NOT_PAID" ? "NOT PAID" : p
    );

    // Attempt full parse: Name... Phone4 Amount Status Rating
    // We scan from the right for known tokens
    let qualityRating: QualityRating | undefined;
    let paymentStatus: PaymentStatus | undefined;
    let amount: number | undefined;
    let phoneLast4: string | undefined;
    const nameTokens: string[] = [];

    const remaining = [...restored];

    // Rating (last)
    const lastToken = remaining[remaining.length - 1]?.toUpperCase() as QualityRating;
    if (QUALITY_RATINGS.includes(lastToken)) {
      qualityRating = lastToken;
      remaining.pop();
    }

    // Payment status (could be 1 or 2 words)
    const last2 = remaining.slice(-2).join(" ").toUpperCase() as PaymentStatus;
    const last1 = remaining[remaining.length - 1]?.toUpperCase() as PaymentStatus;
    if (PAYMENT_STATUSES.includes(last2)) {
      paymentStatus = last2;
      remaining.splice(-2);
    } else if (PAYMENT_STATUSES.includes(last1)) {
      paymentStatus = last1;
      remaining.pop();
    }

    // Amount
    const possibleAmount = Number(remaining[remaining.length - 1]);
    if (!isNaN(possibleAmount) && possibleAmount > 0) {
      amount = possibleAmount;
      remaining.pop();
    }

    // Phone last 4
    const possiblePhone = remaining[remaining.length - 1];
    if (/^\d{4}$/.test(possiblePhone ?? "")) {
      phoneLast4 = possiblePhone;
      remaining.pop();
    }

    // Everything left is the name
    nameTokens.push(...remaining);

    return {
      type: "REPORT",
      name: nameTokens.join(" ") || undefined,
      phoneLast4,
      amount,
      paymentStatus,
      qualityRating,
    };
  }

  return { type: "UNKNOWN", raw: text };
}

// ─── Validation helpers ───────────────────────────────────────────────────────

export function isValidPhoneLast4(value: string): boolean {
  return /^\d{4}$/.test(value.trim());
}

export function isValidAmount(value: string): boolean {
  const n = Number(value.replace(/[₹,\s]/g, ""));
  return !isNaN(n) && n > 0;
}

export function parseAmount(value: string): number {
  return Number(value.replace(/[₹,\s]/g, ""));
}

export function normalisePaymentStatus(value: string): PaymentStatus | null {
  const v = value.toUpperCase().trim();
  if (v === "PAID" || v === "P") return "PAID";
  if (v === "NOT PAID" || v === "NOT_PAID" || v === "NP" || v === "DEFAULT") return "NOT PAID";
  if (v === "PARTIAL" || v === "PART") return "PARTIAL";
  return null;
}

export function normaliseRating(value: string): QualityRating | null {
  const v = value.toUpperCase().trim();
  if (v === "GOOD" || v === "G" || v === "1") return "GOOD";
  if (v === "BAD" || v === "B" || v === "0") return "BAD";
  if (v === "NEUTRAL" || v === "N" || v === "OK") return "NEUTRAL";
  return null;
}
