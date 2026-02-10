// server/middleware/errorHandler.js

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

function errorHandler(err, req, res, next) {
  if (err.isOperational) {
    return res.status(err.statusCode).json({ ok: false, error: err.message });
  }

  console.error('Unexpected error:', err);
  res.status(500).json({ ok: false, error: 'Internal server error' });
}

module.exports = { AppError, errorHandler };
