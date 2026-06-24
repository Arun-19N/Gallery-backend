// routes/authRoutes.js
const express = require('express');
const multer = require('multer');
const router = express.Router();

const Image = require('../model/GalleryImage.js');
const cloudinary = require('../config/cloudinery.js'); // ✅ correct filename, correct export
const { CloudinaryStorage } = require('multer-storage-cloudinary'); // ✅ comes from the package, not your config file

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

// ──────────────────────────────────────────
// ✅ Cloudinary storage for PROFILE images
// (replaces the old local diskStorage version)
// ──────────────────────────────────────────
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'profile-images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});
const uploadProfile = multer({ storage: profileStorage });

// ──────────────────────────────────────────
// ✅ Cloudinary storage for GALLERY images
// ──────────────────────────────────────────
const galleryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'gallery',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});
const uploadGallery = multer({ storage: galleryStorage });

// — Gallery upload route —
router.post('/upload', protect, uploadGallery.single('image'), async (req, res) => {
  const { title, description } = req.body;
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  try {
    const newImage = await Image.create({
      userId: req.user._id,
      title,
      description,
      imageUrl: req.file.path, // ✅ this is now the real Cloudinary URL, not a fake local path
    });
    res.status(201).json(newImage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Upload failed' });
  }
});

// — Get current user's gallery images —
router.get('/my-images', protect, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

    const images = await Image.find({ userId: req.user._id });
    res.json(images);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching images' });
  }
});

// — Auth routes —
router.post('/register', register);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/me', protect, getMe);

// — Profile routes —
router.get('/user/:id', getUserById);
router.post('/user/:id/upload-img', protect, uploadProfile.single('profileImg'), uploadProfileImage); // ✅ now uses Cloudinary + protect added
router.delete('/user/:id/remove-img', removeImage);
router.put('/user/:id/bio', updateBio);
router.put('/user/:id/update-name', updateUserName);

// ✅ only one export, at the very end
module.exports = router;