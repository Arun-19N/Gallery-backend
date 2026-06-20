
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../model/User');
const path = require('path');
const fs = require('fs');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const originalName = name;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Please fill in all fields');
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    res.json({ message: 'User already exists' });
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    originalName,
    email,
    password: hashedPassword,
  });

  if (user) {
    sendTokenResponse(res, user, 201);
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    res.status(400).json({ message: 'User not found' });
    throw new Error('User not found');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    res.status(401).json({ message: 'Check your  password' });
    throw new Error('Invalid credentials');
  }

  sendTokenResponse(res, user, 200);
  res.status(200).json({ message: 'Login successful' , userId: user._id });
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json(req.user); // req.user is set by protect middleware
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Public or Private
const logoutUser = asyncHandler(async (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'Lax',
    secure: process.env.NODE_ENV === 'production',
  });
  res.status(200).json({ message: 'Logged out successfully' });
});

// ✅ Utility: Generate JWT and send as cookie
const sendTokenResponse = (res, user, statusCode) => {
  const token = generateToken(user._id);

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  res.status(statusCode).json({
    _id: user._id,
    // name: user.name,
    // email: user.email,
  });
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// GET /api/user/:id
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
res.status(200).json({
  name: user.name && user.name.trim().length > 0 ? user.name : user.originalName,
  originalName: user.originalName,
  imgUrl: user.imgUrl || null,
  bio: user.bio || null
});
});








/// img uploade 

const uploadProfileImage = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded');
  }

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Optional: Delete old image file
  if (user.imgUrl) {
    const oldPath = path.join(__dirname, '..', 'uploads', path.basename(user.imgUrl));
    if (fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }
  }

  // Save new image URL
  user.imgUrl = `/uploads/${req.file.filename}`;
  await user.save();

  res.status(200).json({ imgUrl: user.imgUrl });
});


// Remove profile image
const removeImage = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new Error('User not found');

  if (user.imgUrl) {
    const filePath = path.join(__dirname, '../', user.imgUrl);
    fs.unlink(filePath, (err) => {
      if (err) console.error('File deletion failed:', err);
    });
    user.imgUrl = '';
    await user.save();
  }

  res.status(200).json({ message: 'Image removed' });
});


// PUT /auth/user/:id/bio
const updateBio = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { bio } = req.body;

  const user = await User.findByIdAndUpdate(id, { bio }, { new: true });
  if (user) {
    res.status(200).json({ bio: user.bio });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});


// PUT /api/auth/user/:id/name
const updateUserName = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  // Don't allow empty or too-short names if needed.
  // if (!name ) {
  //   res.status(400);
  //   throw new Error("Name is required and must be at least 2 characters.");
  // }


  const user = await User.findByIdAndUpdate(
    id,
    { name }, // Only 'name' is updated
    { new: true }
  );
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
 res.status(200).json({
  name: user.name && user.name.trim().length > 0 ? user.name : user.originalName,
  originalName: user.originalName
});
});






module.exports = {
  register,
  loginUser,
  getMe,
  logoutUser,
  getUserById,
  uploadProfileImage,
  removeImage,
  updateBio,
  updateUserName
};
