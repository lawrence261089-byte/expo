/**
 * Scoring configuration
 * Centralised so it can be adjusted without touching algorithm logic
 */

module.exports = {
  BASE_SCORE: 500,
  WEIGHTS: {
    PAID: +50,
    DEFAULT: -100,
    PARTIAL: -30,
    GOOD_RATING: +20,
    BAD_RATING: -50,
  },
  SCORE_MIN: 0,
  SCORE_MAX: 1000,
  RISK_BANDS: [
    { min: 800, max: 1000, label: 'EXCELLENT', emoji: '🌟', recommendation: 'TRUST',     risk: 'VERY LOW' },
    { min: 600, max: 799,  label: 'GOOD',      emoji: '✅', recommendation: 'TRUST',     risk: 'LOW' },
    { min: 300, max: 599,  label: 'MODERATE',  emoji: '⚡', recommendation: 'CAUTION',   risk: 'MODERATE' },
    { min: 0,   max: 299,  label: 'RISKY',     emoji: '⚠️', recommendation: 'NO CREDIT', risk: 'HIGH' },
  ],
  // Auto-block threshold
  BLOCK_THRESHOLD: 100,
  // Under-review trigger: flag when person has 2+ defaults AND 2+ bad ratings
  REVIEW_MIN_DEFAULTS: 2,
  REVIEW_MIN_BAD_RATINGS: 2,
};
