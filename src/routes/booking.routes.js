const express = require('express');
const {
  createBooking,
  getMyBookings,
  cancelBooking,
} = require('../controllers/booking.controller');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.post('/', createBooking);
router.get('/my-bookings', getMyBookings);
router.patch('/:id/cancel', cancelBooking);

module.exports = router;
