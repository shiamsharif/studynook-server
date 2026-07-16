const Booking = require('../models/Booking');
const Room = require('../models/Room');
const User = require('../models/User');

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const localDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isRealDate = (date) => {
  if (!DATE_PATTERN.test(date)) return false;
  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

const minutesFromTime = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const createBooking = async (req, res, next) => {
  try {
    const roomId = req.body.room || req.body.roomId;
    const { date, startTime, endTime, specialNote = '' } = req.body;

    if (
      !roomId ||
      typeof date !== 'string' ||
      typeof startTime !== 'string' ||
      typeof endTime !== 'string' ||
      !date ||
      !startTime ||
      !endTime
    ) {
      return res.status(400).json({
        message: 'Room, date, start time, and end time are required',
      });
    }

    if (!isRealDate(date)) {
      return res.status(400).json({ message: 'Date must be a valid YYYY-MM-DD date' });
    }

    if (date < localDateString()) {
      return res.status(400).json({ message: 'Booking date must be today or in the future' });
    }

    if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
      return res.status(400).json({ message: 'Times must use valid HH:mm format' });
    }

    const startMinutes = minutesFromTime(startTime);
    const endMinutes = minutesFromTime(endTime);
    if (endMinutes <= startMinutes) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const conflict = await Booking.exists({
      room: room._id,
      date,
      status: 'confirmed',
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    });

    if (conflict) {
      return res.status(409).json({ message: 'The room is already booked for this time' });
    }

    const durationHours = (endMinutes - startMinutes) / 60;
    const totalCost = Math.round(durationHours * room.hourlyRate * 100) / 100;
    const booking = await Booking.create({
      room: room._id,
      user: req.user._id,
      userEmail: req.user.email,
      date,
      startTime,
      endTime,
      totalCost,
      specialNote,
    });

    try {
      await User.findByIdAndUpdate(req.user._id, { $push: { bookings: booking._id } });
      await Room.findByIdAndUpdate(room._id, { $inc: { bookingCount: 1 } });
    } catch (updateError) {
      await Booking.findByIdAndDelete(booking._id);
      await User.findByIdAndUpdate(req.user._id, { $pull: { bookings: booking._id } });
      throw updateError;
    }

    await booking.populate('room');
    return res.status(201).json({ message: 'Booking confirmed', booking });
  } catch (error) {
    return next(error);
  }
};

const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('room')
      .sort({ date: 1, startTime: 1 });

    return res.status(200).json({ count: bookings.length, bookings });
  } catch (error) {
    return next(error);
  }
};

const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (!booking.user.equals(req.user._id)) {
      return res.status(403).json({ message: 'You can only cancel your own bookings' });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ message: 'Only confirmed bookings can be cancelled' });
    }

    const cancelledBooking = await Booking.findOneAndUpdate(
      { _id: booking._id, user: req.user._id, status: 'confirmed' },
      { $set: { status: 'cancelled' } },
      { new: true, runValidators: true }
    );

    if (!cancelledBooking) {
      return res.status(400).json({ message: 'Only confirmed bookings can be cancelled' });
    }

    await User.findByIdAndUpdate(req.user._id, { $pull: { bookings: cancelledBooking._id } });
    await Room.updateOne(
      { _id: cancelledBooking.room, bookingCount: { $gt: 0 } },
      { $inc: { bookingCount: -1 } }
    );

    return res.status(200).json({
      message: 'Booking cancelled successfully',
      booking: cancelledBooking,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { createBooking, getMyBookings, cancelBooking };
