/**
 * Global error handler middleware
 */

const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack, path: req.path });

  const status = err.status || err.statusCode || 500;

  // Never expose stack traces to API consumers
  res.status(status).json({
    error: status === 500 ? 'An internal error occurred' : err.message,
  });
};

module.exports = { errorHandler };
