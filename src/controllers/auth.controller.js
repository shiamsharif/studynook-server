const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

const COOKIE_NAME = 'token';
const TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const googleClient = new OAuth2Client();

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: TOKEN_MAX_AGE,
  path: "/",
});

const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  photoURL: user.photoURL,
  bookings: user.bookings,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const issueToken = (res, user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

  res.cookie(COOKIE_NAME, token, cookieOptions());
};

const register = async (req, res, next) => {
  try {
    const { name, email, password, photoURL = '' } = req.body;

    // Validate input
    if (
      typeof name !== 'string' ||
      !name.trim() ||
      typeof email !== 'string' ||
      !email.trim() ||
      typeof password !== 'string' ||
      !password
    ) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    // Normalize email and check for existing user
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    // Check if the email already exists
    if (existingUser) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    // Hash the password and create the user
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      photoURL,
    });

    // Issue JWT token and respond with the public user data
    issueToken(res, user);
    return res.status(201).json({ message: 'Registration successful', user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (
      typeof email !== 'string' ||
      !email.trim() ||
      typeof password !== 'string' ||
      !password
    ) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find the user by email and compare the password
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
    const passwordMatches = user?.password
      ? await bcrypt.compare(password, user.password)
      : false;

    // If user not found or password does not match, return an error
    if (!user || !passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Issue JWT token and respond with the public user data
    issueToken(res, user);
    return res.status(200).json({ message: 'Login successful', user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
};

// Google login function
const googleLogin = async (req, res, next) => {
  try {
    const credential = req.body.credential || req.body.idToken;

    if (typeof credential !== 'string' || !credential) {
      return res.status(400).json({ message: 'Google ID token is required' });
    }

    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch (verificationError) {
      return res.status(401).json({ message: 'Invalid or expired Google ID token' });
    }
    const payload = ticket.getPayload();

    if (!payload?.email || !payload.email_verified) {
      return res.status(401).json({ message: 'Google email is not verified' });
    }

    const name = payload.name?.trim() || payload.email.split('@')[0];
    const photoURL = payload.picture || '';
    const email = payload.email;
    const normalizedEmail = email.trim().toLowerCase();
    let user = await User.findOne({ email: normalizedEmail });
    let created = false;

    if (!user) {
      user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        photoURL,
      });
      created = true;
    } else {
      const updates = {};
      if (!user.name && name) updates.name = name;
      if (photoURL && user.photoURL !== photoURL) updates.photoURL = photoURL;
      if (Object.keys(updates).length) {
        user = await User.findByIdAndUpdate(user._id, updates, {
          new: true,
          runValidators: true,
        });
      }
    }

    issueToken(res, user);
    return res.status(created ? 201 : 200).json({
      message: 'Google login successful',
      user: publicUser(user),
    });
  } catch (error) {
    return next(error);
  }
};


// Logout function
const logout = (req, res) => {
  const options = cookieOptions();
  delete options.maxAge;
  res.clearCookie(COOKIE_NAME, options);
  return res.status(200).json({ message: 'Logout successful' });
};

// Get current user function
const getMe = (req, res) => res.status(200).json({ user: publicUser(req.user) });

module.exports = { register, login, googleLogin, logout, getMe };
