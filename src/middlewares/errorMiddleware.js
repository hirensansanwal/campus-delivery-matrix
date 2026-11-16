import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

export const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

// Centralised error handler - the only place error responses are built.
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = 'Internal server error';
  let details;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details || undefined;
  } else if (env.nodeEnv !== 'production') {
    message = err.message || message;
  }

  if (statusCode >= 500) console.error(err);

  const body = { success: false, message };
  if (details) body.details = details;
  if (env.nodeEnv !== 'production' && statusCode >= 500) body.stack = err.stack;

  res.status(statusCode).json(body);
};
