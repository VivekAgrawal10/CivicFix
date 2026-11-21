const express = require('express');
const router = express.Router();
const { uploadImages } = require('../controllers/upload.controller');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/images', auth, upload.array('images', 5), uploadImages);

module.exports = router;
