const express = require('express');
const {
  createRoom,
  getRooms,
  getLatestRooms,
  getRoomById,
  getMyListings,
  updateRoom,
  deleteRoom,
} = require('../controllers/room.controller');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').post(authMiddleware, createRoom).get(getRooms);
router.get('/latest', getLatestRooms);
router.get('/my-listings', authMiddleware, getMyListings);
router.route('/:id').get(getRoomById).patch(authMiddleware, updateRoom).delete(authMiddleware, deleteRoom);

module.exports = router;
