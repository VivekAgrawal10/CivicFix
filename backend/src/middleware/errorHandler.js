const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Validation error (raised by the MySQL data layer)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const messages = Object.values(err.errors).map((e) => e.message);
    message = messages.join('. ');
  }

  // Validation errors raised by the MySQL data layer use the same shape ({ name: 'ValidationError', errors })

  // MySQL duplicate key (UNIQUE constraint)
  if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
    statusCode = 409;
    const m = /for key '(?:[^'.]+\.)?(?:uq_|idx_)?([a-z_]+?)(?:_[a-z]+)?'/i.exec(err.message || '');
    const field = /email/i.test(err.message || '') ? 'email' : (m && m[1]) || 'field';
    message = `Duplicate value for ${field}. This ${field} is already in use.`;
  }

  // Invalid foreign key (referenced user/report does not exist)
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
    statusCode = 400;
    message = 'Referenced record does not exist.';
  }

  // Invalid id (non-numeric id in a route or body) — raised by the data layer as a CastError
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for field: ${err.path}`;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired.';
  }

  const response = {
    success: false,
    message,
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
