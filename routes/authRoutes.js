// routes/authRoutes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const fs = require('fs')
const Image = require('../model/GalleryImage.js');

const {
  register,
  loginUser,
  getMe,
  logoutUser,
  getUserById,
  uploadProfileImage,
  removeImage,
  updateBio,
  updateUserName,
} = require('../controllers/autoControllers.js');



const { protect } = require('../middleware/authMiddleware');

// — Profile image storage —
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const uploadProfile = multer({ storage: profileStorage });

const galleryStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/gallery/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const uploadGallery = multer({ storage: galleryStorage });

// img storage setup


// Multer storage for images
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/img/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});

const upload = multer({ storage });

router.post('/upload', protect, upload.single('image'), async (req, res) => {
  const { title, description } = req.body;
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  try {
    const newImage = await Image.create({
      userId: req.user._id,
      title,
      description,
      imageUrl: `/uploads/img/${req.file.filename}`, // relative path
    });
    res.status(201).json(newImage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Upload failed' });
  }
});

// Get current user's images
router.get('/my-images', protect, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

    const images = await Image.find({ userId: req.user._id });
    res.json(images);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching images' });
  }
});

module.exports = router;




// — Auth routes —
router.post( '/register',           register);
router.post( '/login',              loginUser);
router.post( '/logout',             logoutUser);
router.get(  '/me',      protect,   getMe);

// — Profile routes —
router.get(    '/user/:id',                       getUserById);
router.post(   '/user/:id/upload-img',  uploadProfile.single('profileImg'), uploadProfileImage);
router.delete( '/user/:id/remove-img',            removeImage);
router.put(    '/user/:id/bio',                   updateBio);
router.put(    '/user/:id/update-name',                  updateUserName);

module.exports = router;
