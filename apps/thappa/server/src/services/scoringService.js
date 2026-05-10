'use strict';

/**
 * scoringService.js
 * Implements the Thappa composite trust-score algorithm.
 *
 * Formula:
 *   Start at 500 (neutral)
 *   +50  per PAID transaction
 *   -100 per DEFAULT (not paid)
 *   -30  per PARTIAL payment
 *   +20  per GOOD rating
 *   -50  per BAD rating
 *   Result clamped to [0, 1000]
 *
 * Risk bands:
 *   0–299   → HIGH RISK   ⚠️
 *   300–599 → MODERATE    ⚠️
 *   600–799 → GOOD        ✅
 *   800–1000→ EXCELLENT   ✅
 */

const config = require('../config');
const sheets = require('./sheetsService');
const logger = require('../logger');

// ─── Core calculation ────────────────────────────────────────────────────────

/**
 * Calculate a composite score from an array of transaction objects.
 * @param {Array} transactions
 * @returns {{ compositeScore, totalTx, paid, defaults, partial, goodRatings, badRatings }}
 */
function calculateScore(transactions) {
  const { baseScore, paidBonus, defaultPenalty, partialPenalty, goodRatingBonus, badRatingPenalty, minScore, maxScore } =
    config.scoring;

  let score = baseScore;
  let paid = 0;
  let defaults = 0;
  let partial = 0;
  let goodRatings = 0;
  let badRatings = 0;

  for (const tx of transactions) {
    const status = (tx.PaymentStatus || '').toUpperCase().trim();
    const rating = (tx.Rating || '').toUpperCase().trim();

    if (status === 'PAID') {
      score += paidBonus;
      paid++;
    } else if (status === 'NOT PAID' || status === 'DEFAULT') {
      score += defaultPenalty;
      defaults++;
    } else if (status === 'PARTIAL') {
      score += partialPenalty;
      partial++;
    }

    if (rating === 'GOOD') {
      score += goodRatingBonus;
      goodRatings++;
    } else if (rating === 'BAD') {
      score += badRatingPenalty;
      badRatings++;
    }
  }

  const compositeScore = Math.min(maxScore, Math.max(minScore, score));

  return {
    compositeScore,
    totalTx: transactions.length,
    paid,
    defaults,
    partial,
    goodRatings,
    badRatings,
  };
}

// ─── Risk label helpers ──────────────────────────────────────────────────────

function getRiskLabel(score) {
  const { highRisk, moderate, good } = config.scoring.thresholds;
  if (score < highRisk) return { label: 'HIGH RISK', emoji: '🔴', recommendation: 'NO CREDIT', risk: 'HIGH' };
  if (score < moderate) return { label: 'MODERATE', emoji: '🟡', recommendation: 'CAUTION', risk: 'MODERATE' };
  if (score < good) return { label: 'GOOD', emoji: '🟢', recommendation: 'TRUST', risk: 'LOW' };
  return { label: 'EXCELLENT', emoji: '✅', recommendation: 'TRUST', risk: 'VERY LOW' };
}

function getScoreEmoji(score) {
  const { highRisk, moderate, good } = config.scoring.thresholds;
  if (score < highRisk) return '⚠️';
  if (score < moderate) return '⚠️';
  if (score < good) return '✅';
  return '✅';
}

// ─── Recalculate and persist ─────────────────────────────────────────────────

/**
 * Recalculate the score for a person from all their transactions,
 * update the Scores tab, and update the People tab.
 *
 * @param {string} personId
 * @returns {{ oldScore, newScore, stats }}
 */
async function recalculateAndSave(personId) {
  const person = await sheets.findPersonById(personId);
  const oldScore = person ? parseInt(person.ThampaScore || '500', 10) : 500;

  const transactions = await sheets.getTransactionsForPerson(personId);
  const stats = calculateScore(transactions);

  await sheets.upsertScoreRecord(personId, stats);
  await sheets.updatePersonScore(personId, stats.compositeScore);

  logger.info('Score recalculated', { personId, oldScore, newScore: stats.compositeScore });

  return { oldScore, newScore: stats.compositeScore, stats };
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  calculateScore,
  getRiskLabel,
  getScoreEmoji,
  recalculateAndSave,
};
