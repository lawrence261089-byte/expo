/**
 * Thappa Scoring Algorithm
 *
 * Base score : 500 (neutral)
 * +50  per PAID transaction
 * -100 per DEFAULT (NOT PAID)
 * -30  per PARTIAL payment
 * +20  per GOOD rating
 * -50  per BAD rating
 *
 * Result clamped to [0, 1000].
 */

import type { Transaction, ScoreRecord } from "../types/index.js";

const BASE_SCORE = 500;
const PAID_BONUS = 50;
const DEFAULT_PENALTY = -100;
const PARTIAL_PENALTY = -30;
const GOOD_BONUS = 20;
const BAD_PENALTY = -50;

export function calculateScore(transactions: Transaction[]): ScoreRecord {
  let score = BASE_SCORE;
  let paid = 0;
  let defaults = 0;
  let partial = 0;
  let goodRatings = 0;
  let badRatings = 0;

  for (const tx of transactions) {
    switch (tx.paymentStatus) {
      case "PAID":
        score += PAID_BONUS;
        paid++;
        break;
      case "NOT PAID":
        score += DEFAULT_PENALTY;
        defaults++;
        break;
      case "PARTIAL":
        score += PARTIAL_PENALTY;
        partial++;
        break;
    }

    switch (tx.qualityRating) {
      case "GOOD":
        score += GOOD_BONUS;
        goodRatings++;
        break;
      case "BAD":
        score += BAD_PENALTY;
        badRatings++;
        break;
      // NEUTRAL: no change
    }
  }

  const compositeScore = Math.max(0, Math.min(1000, score));
  const personId = transactions[0]?.personId ?? "";

  return {
    personId,
    totalTransactions: transactions.length,
    paid,
    defaults,
    partial,
    goodRatings,
    badRatings,
    compositeScore,
    lastUpdated: new Date().toISOString(),
  };
}

// ─── Score label helpers ──────────────────────────────────────────────────────

export type RiskLevel = "VERY LOW" | "LOW" | "MODERATE" | "HIGH" | "VERY HIGH";

export interface ScoreLabel {
  emoji: string;
  label: string;
  risk: RiskLevel;
  recommendation: string;
}

export function getScoreLabel(score: number): ScoreLabel {
  if (score >= 800) {
    return {
      emoji: "✅",
      label: "EXCELLENT",
      risk: "VERY LOW",
      recommendation: "TRUST",
    };
  }
  if (score >= 600) {
    return {
      emoji: "🟢",
      label: "GOOD",
      risk: "LOW",
      recommendation: "TRUST WITH CAUTION",
    };
  }
  if (score >= 300) {
    return {
      emoji: "⚠️",
      label: "MODERATE",
      risk: "MODERATE",
      recommendation: "PROCEED WITH CAUTION",
    };
  }
  if (score >= 150) {
    return {
      emoji: "⚠️",
      label: "RISKY",
      risk: "HIGH",
      recommendation: "NO CREDIT",
    };
  }
  return {
    emoji: "🔴",
    label: "VERY RISKY",
    risk: "VERY HIGH",
    recommendation: "AVOID",
  };
}

export function formatScoreDropAlert(
  name: string,
  oldScore: number,
  newScore: number
): string {
  const drop = oldScore - newScore;
  return (
    `⚠️ *Thappa Alert*\n\n` +
    `Hello ${name}, your Thappa score has dropped by ${drop} points.\n` +
    `New score: *${newScore}/1000*\n\n` +
    `A negative report was filed against you. If this is incorrect, ` +
    `reply *HELP* to raise a dispute. Improve your score by completing ` +
    `future payments on time. 🙏`
  );
}
