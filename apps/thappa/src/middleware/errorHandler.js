/**
 * Global error handler middleware
 */

const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack, path: req.path });

  const status = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(status).json({
    error: isProduction && status === 500 ? 'An internal error occurred' : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
};

module.exports = { errorHandler };
