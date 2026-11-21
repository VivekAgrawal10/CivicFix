const express = require('express');
const router = express.Router();
const { getDashboardSummary } = require('../controllers/dashboard.controller');
const auth = require('../middleware/auth');

router.get('/summary', auth, getDashboardSummary);

module.exports = router;
