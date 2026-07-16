const express = require('express');
const {
  register,
  login,
  googleLogin,
  logout,
  getMe,
} = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google-login', googleLogin);
router.post('/logout', logout);
router.get('/me', authMiddleware, getMe);

module.exports = router;
