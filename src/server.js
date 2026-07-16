require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const roomRoutes = require('./routes/room.routes');
const bookingRoutes = require('./routes/booking.routes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const requiredEnvironmentVariables = [
  'MONGODB_URI',
  'JWT_SECRET',
  'GOOGLE_CLIENT_ID',
  'CLIENT_URL',
  'NODE_ENV',
  'PORT',
];
const missingEnvironmentVariables = requiredEnvironmentVariables.filter(
  (key) => !process.env[key]
);

if (missingEnvironmentVariables.length) {
  console.error(`Missing environment variables: ${missingEnvironmentVariables.join(', ')}`);
  process.exit(1);
}

const app = express();

app.disable('x-powered-by');
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);

app.use(notFound);
app.use(errorHandler);

const port = Number(process.env.PORT);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('PORT must be an integer between 1 and 65535');
  process.exit(1);
}

let server;

const startServer = async () => {
  try {
    await connectDB();
    server = app.listen(port, () => {
      console.log(`StudyNook API listening on port ${port} in ${process.env.NODE_ENV} mode`);
    });
  } catch (error) {
    console.error(`Unable to start server: ${error.message}`);
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  console.log(`${signal} received. Shutting down gracefully.`);

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await mongoose.connection.close();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
  if (server) server.close(() => process.exit(1));
  else process.exit(1);
});

startServer();

module.exports = app;
