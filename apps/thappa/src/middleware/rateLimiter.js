/**
 * Rate limiter middleware factory
 */

const rateLimit = require('express-rate-limit');

const rateLimiter = ({ windowMs = 60_000, max = 100, message } = {}) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: message || {
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil(windowMs / 1000),
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health';
    },
  });
};

module.exports = { rateLimiter };
