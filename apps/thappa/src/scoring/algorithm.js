/**
 * Thappa Scoring Algorithm
 *
 * Score range: 0 – 1000
 *   < 300   → HIGH RISK   ⚠️
 *   300–599 → MODERATE    ⚡
 *   600–799 → GOOD        ✅
 *   800+    → EXCELLENT   🌟
 *
 * Formula (starting at 500 neutral):
 *   +50  per PAID transaction
 *   -100 per DEFAULT (NOT_PAID)
 *   -30  per PARTIAL payment
 *   +20  per GOOD rating
 *   -50  per BAD rating
 *   Capped: [0, 1000]
 */

const db = require('../db/sheets');
const logger = require('../utils/logger');

// ─── Score Weights ────────────────────────────────────────────────────────────
const WEIGHTS = {
  BASE: 500,
  PAID: +50,
  DEFAULT: -100,
  PARTIAL: -30,
  GOOD_RATING: +20,
  BAD_RATING: -50,
};

// ─── Risk Bands ───────────────────────────────────────────────────────────────
const RISK_BANDS = [
  { min: 800, max: 1000, label: 'EXCELLENT', emoji: '🌟', recommendation: 'TRUST', risk: 'VERY LOW' },
  { min: 600, max: 799,  label: 'GOOD',      emoji: '✅', recommendation: 'TRUST', risk: 'LOW' },
  { min: 300, max: 599,  label: 'MODERATE',  emoji: '⚡', recommendation: 'CAUTION', risk: 'MODERATE' },
  { min: 0,   max: 299,  label: 'RISKY',     emoji: '⚠️', recommendation: 'NO CREDIT', risk: 'HIGH' },
];

function getRiskBand(score) {
  return RISK_BANDS.find(b => score >= b.min && score <= b.max) || RISK_BANDS[3];
}

/**
 * Calculate composite score from transaction history
 */
function calculateScore(transactions) {
  let score = WEIGHTS.BASE;
  let paid = 0, defaults = 0, partial = 0, goodRatings = 0, badRatings = 0;

  for (const txn of transactions) {
    const status = (txn.status || '').toUpperCase();
    const rating = (txn.rating || '').toUpperCase();

    if (status === 'PAID') { score += WEIGHTS.PAID; paid++; }
    else if (status === 'NOT_PAID') { score += WEIGHTS.DEFAULT; defaults++; }
    else if (status === 'PARTIAL') { score += WEIGHTS.PARTIAL; partial++; }

    if (rating === 'GOOD') { score += WEIGHTS.GOOD_RATING; goodRatings++; }
    else if (rating === 'BAD') { score += WEIGHTS.BAD_RATING; badRatings++; }
  }

  const compositeScore = Math.max(0, Math.min(1000, score));

  return {
    compositeScore,
    totalTxn: transactions.length,
    paid,
    defaults,
    partial,
    goodRatings,
    badRatings,
  };
}

/**
 * Recalculate and persist score for a person
 * Returns { oldScore, newScore, scoreData }
 */
async function recalculateScore(personId) {
  const transactions = await db.getTransactionsForPerson(personId);
  const scoreData = calculateScore(transactions);

  // Get old score
  const personResult = await db.findPersonById(personId);
  const oldScore = personResult ? personResult.person.score : 500;

  // Determine status based on score
  let status = 'Active';
  if (scoreData.compositeScore < 100) status = 'Blocked';
  else if (scoreData.badRatings >= 3 && scoreData.defaults >= 2) status = 'Under Review';

  // Persist
  await db.upsertScoreRecord(personId, scoreData);
  await db.updatePersonScore(personId, scoreData.compositeScore, status);

  logger.info(`Score recalculated for ${personId}: ${oldScore} → ${scoreData.compositeScore}`);

  return { oldScore, newScore: scoreData.compositeScore, scoreData, status };
}

/**
 * Get score summary for display
 */
function getScoreSummary(score, scoreData) {
  const band = getRiskBand(score);
  const paymentRate = scoreData.totalTxn > 0
    ? Math.round((scoreData.paid / scoreData.totalTxn) * 100)
    : 0;

  return {
    score,
    band,
    paymentRate,
    ...scoreData,
  };
}

module.exports = {
  calculateScore,
  recalculateScore,
  getRiskBand,
  getScoreSummary,
  WEIGHTS,
  RISK_BANDS,
};
