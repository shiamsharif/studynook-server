const Room = require('../models/Room');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const createRoom = async (req, res, next) => {
  try {
    const room = await Room.create({
      ...req.body,
      owner: req.user._id,
      ownerEmail: req.user.email,
      bookingCount: 0,
    });

    return res.status(201).json({ message: 'Room created successfully', room });
  } catch (error) {
    return next(error);
  }
};

const getRooms = async (req, res, next) => {
  try {
    const filter = {};

    const roomNameSearch = req.query.search || req.query.roomName;
    if (typeof roomNameSearch === 'string' && roomNameSearch.trim()) {
      filter.roomName = { $regex: escapeRegex(roomNameSearch.trim()), $options: 'i' };
    }

    if (req.query.amenities) {
      const amenities = (Array.isArray(req.query.amenities)
        ? req.query.amenities
        : req.query.amenities.split(','))
        .map((amenity) => amenity.trim())
        .filter(Boolean);

      if (amenities.length) filter.amenities = { $in: amenities };
    }

    const rooms = await Room.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ count: rooms.length, rooms });
  } catch (error) {
    return next(error);
  }
};

const getLatestRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find().sort({ createdAt: -1 }).limit(6);
    return res.status(200).json({ count: rooms.length, rooms });
  } catch (error) {
    return next(error);
  }
};

const getRoomById = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id).populate('owner', 'name email photoURL');

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    return res.status(200).json({ room });
  } catch (error) {
    return next(error);
  }
};

const getMyListings = async (req, res, next) => {
  try {
    const rooms = await Room.find({ owner: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ count: rooms.length, rooms });
  } catch (error) {
    return next(error);
  }
};

const updateRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (!room.owner.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only the room owner can update this room' });
    }

    const allowedFields = [
      'roomName',
      'description',
      'image',
      'floor',
      'capacity',
      'hourlyRate',
      'amenities',
    ];

    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) room[field] = req.body[field];
    });

    await room.save();
    return res.status(200).json({ message: 'Room updated successfully', room });
  } catch (error) {
    return next(error);
  }
};

const deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (!room.owner.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only the room owner can delete this room' });
    }

    await room.deleteOne();
    return res.status(200).json({ message: 'Room deleted successfully' });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createRoom,
  getRooms,
  getLatestRooms,
  getRoomById,
  getMyListings,
  updateRoom,
  deleteRoom,
};
