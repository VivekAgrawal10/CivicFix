const express = require('express');
const multer = require('multer');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { analyzeImage, analyzeUpload, chat, getInsights, checkDuplicate } = require('../controllers/ai.controller');

// In-memory upload used only for the live AI pre-check (the file is not stored)
const precheckUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype) ? cb(null, true) : cb(new Error('Only JPG, PNG and WEBP images are allowed.')),
});

router.post('/analyze-image', protect, analyzeImage);
router.post('/analyze-upload', protect, precheckUpload.single('image'), analyzeUpload);
router.post('/chat', protect, chat);
router.get('/insights', protect, authorize('admin'), getInsights);
router.post('/check-duplicate', protect, checkDuplicate);

module.exports = router;
