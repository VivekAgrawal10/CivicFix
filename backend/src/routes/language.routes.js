const express = require('express');
const router = express.Router();
const { getLanguages, translate } = require('../controllers/language.controller');
const auth = require('../middleware/auth');

router.get('/languages', getLanguages);
router.post('/translations/translate', auth, translate);

module.exports = router;
