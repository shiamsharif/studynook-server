// src/config/db.js
const mongoose = require('mongoose');

// Connect to MongoDB
const connectDB = async () => {
  const { MONGODB_URI } = process.env;

  // Check if MONGODB_URI is defined
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured');
  }

  // Connect to the database
  await mongoose.connect(MONGODB_URI);
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
};

// Disconnect from MongoDB
module.exports = connectDB;
