/**
 * maps.routes.js
 * API routes for Google Maps Platform and Google Routes API.
 */

const express = require('express');
const router = express.Router();
const {
  planSafeRoute,
  geocode,
  reverseGeocodeEndpoint,
  autocomplete,
  getLiveMarkers,
  getHeatmapLayer,
  getMapsConfig,
} = require('../controllers/maps.controller');
const auth = require('../middleware/auth');

router.get('/config', auth, getMapsConfig);
router.get('/geocode', auth, geocode);
router.get('/reverse-geocode', auth, reverseGeocodeEndpoint);
router.get('/autocomplete', auth, autocomplete);
router.get('/live-markers', auth, getLiveMarkers);
router.get('/heatmap', auth, getHeatmapLayer);
router.post('/safe-route', auth, planSafeRoute);

module.exports = router;
