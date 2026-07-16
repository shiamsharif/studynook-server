const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

const errorHandler = (error, req, res, next) => {
  let statusCode = error.status || (res.statusCode >= 400 ? res.statusCode : 500);
  let message = error.message || 'Internal server error';
  let errors;

  if (error.name === 'ValidationError') {
    statusCode = 400;
    errors = Object.values(error.errors).map((item) => item.message);
    message = 'Validation failed';
  } 
  else if (error.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${error.path}`;
  } 
  else if (error.code === 11000) {
    statusCode = 409;
    const field = Object.keys(error.keyValue || {})[0] || 'value';
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
  }

  const payload = { message };
  if (errors) payload.errors = errors;
  if (process.env.NODE_ENV !== 'production') payload.stack = error.stack;

  res.status(statusCode).json(payload);
};

module.exports = { notFound, errorHandler };
