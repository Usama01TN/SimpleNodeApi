//user.controller.js
const User = require("../models/User");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
// to generate JWT_SECRET:
// open cmd
// wrote node
// then paste this line of code: require('crypto').randomBytes(64).toString('hex')
const { Types } = require('mongoose');
const RevokedToken = require('../models/RevokedToken');
const { validatePassword, validateEmail } = require('../utils/validateUser');

exports.getAll = async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Administrator access is required.' });
  }
  const users = await User.find().select('-password');
  res.json(users);
};

exports.getById = async (req, res) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid user ID' });
  if (req.user?.role !== 'admin' && String(req.user?.userId) !== id) {
    return res.status(403).json({ message: 'You can only view your own profile.' });
  }
  const user = await User.findById(id).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
};

exports.getUserByEmail = async (req, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Administrator access is required.' });
  const user = await User.findOne({ email: req.params.email }).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
};

exports.update = async (req, res) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid user ID' });
  if (req.user?.role !== 'admin' && String(req.user?.userId) !== id) {
    return res.status(403).json({ message: 'You can only update your own profile.' });
  }

  const allowedFields = ['name', 'phone', 'image'];
  const updates = {};
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) updates[field] = req.body[field];
  }
  const user = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid user ID' });
  if (req.user?.role !== 'admin' && String(req.user?.userId) !== id) {
    return res.status(403).json({ message: 'You can only delete your own account.' });
  }
  const user = await User.findByIdAndDelete(id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ message: 'Deleted' });
};

exports.signUp = async (req, res) => {
  try {
    const { password, image } = req.body;
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    // Store emails in lowercase so login is not case-sensitive.
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (name.length < 3) {
      return res.status(400).json({ message: 'Name must be at least 3 characters long' });
    }
    // Remove spaces, dashes, dots and parentheses: "+216 22 333 444" -> "+21622333444"
    const phone = typeof req.body.phone === "string"
      ? req.body.phone.replace(/[\s\-().]/g, "")
      : req.body.phone;

    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }
    if (!validatePassword(password)) {
      return res.status(400).json({ message: "Password must be at least 8 characters long and contain only letters, numbers, and special characters @$!%*?&" });
    }

    const existingUser = await User.findOne({ email }).collation({ locale: "en", strength: 2 });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      // role is NOT taken from req.body: otherwise anyone could sign up as "admin"
      image: image || null // Set image to null if not provided
    });
    res.status(201).json({ message: "User created successfully", userId: user._id });
  } catch (error) {
    // Bad data sent by the client -> 400 with a readable message
    if (error.name === "ValidationError") {
      const message = Object.values(error.errors).map((e) => e.message).join(", ");
      return res.status(400).json({ message });
    }
    // Duplicate email (unique index)
    if (error.code === 11000) {
      return res.status(400).json({ message: "User already exists" });
    }
    console.error("Signup error:", error); // shows the real cause in the server terminal
    res.status(500).json({ message: error.message });
  }
};


exports.signIn = async (req, res) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Case-insensitive search, so "Sami@Mail.com" and "sami@mail.com" are the same account
    const user = await User.findOne({ email }).collation({ locale: "en", strength: 2 });

    // Same message for "unknown email" and "wrong password" so attackers
    // can't use the login form to discover which emails are registered
    const isMatch = user ? await bcrypt.compare(password, user.password) : false;
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role }, //payload
      JWT_SECRET, //signature
      { algorithm: 'HS256', expiresIn: '24h' }  //optional parameters for the sign function 
    );

    res.json({ message: "Sign in successful", token, userId: user._id, name: user.name, email: user.email, role: user.role, user: { _id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, image: user.image || null } });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ message: error.message });
  }
};

// logout
exports.logout = async (req, res) => {
  try {
    const token = req.token;
    if (token) {
      const payload = jwt.decode(token);
      const expiresAt = payload?.exp ? new Date(payload.exp * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000);
      await RevokedToken.updateOne({ token }, { $setOnInsert: { token, expiresAt } }, { upsert: true });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Could not complete logout.' });
  }
};
