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
const scoringConfig = require('../../config/scoring');

// ─── Score Weights (from centralized config) ──────────────────────────────────
const WEIGHTS = {
  BASE: scoringConfig.BASE_SCORE,
  PAID: scoringConfig.WEIGHTS.PAID,
  DEFAULT: scoringConfig.WEIGHTS.DEFAULT,
  PARTIAL: scoringConfig.WEIGHTS.PARTIAL,
  GOOD_RATING: scoringConfig.WEIGHTS.GOOD_RATING,
  BAD_RATING: scoringConfig.WEIGHTS.BAD_RATING,
};

// ─── Risk Bands (from centralized config) ─────────────────────────────────────
const RISK_BANDS = scoringConfig.RISK_BANDS;

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

  // Determine status based on score (using centralized config thresholds)
  let status = 'Active';
  if (scoreData.compositeScore < scoringConfig.BLOCK_THRESHOLD) status = 'Blocked';
  else if (scoreData.badRatings >= scoringConfig.REVIEW_MIN_BAD_RATINGS && scoreData.defaults >= scoringConfig.REVIEW_MIN_DEFAULTS) status = 'Under Review';

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
