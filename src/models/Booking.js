const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    date: {
      type: String,
      required: [true, 'Date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format'],
    },

    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Start time must use HH:mm format'],
    },

    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'End time must use HH:mm format'],
    },

    totalCost: {
      type: Number,
      required: true,
      min: 0,
    },

    specialNote: {
      type: String,
      trim: true,
      maxlength: [1000, 'Special note cannot exceed 1000 characters'],
      default: '',
    },

    status: {
      type: String,
      enum: ['confirmed', 'cancelled'],
      default: 'confirmed',
    },
  },
  { timestamps: true }
);

bookingSchema.index({ room: 1, date: 1, status: 1, startTime: 1, endTime: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
