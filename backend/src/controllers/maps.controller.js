/**
 * maps.controller.js
 * Controller handling Google Maps Platform, Google Routes API, and geospatial visualizers.
 */

const Report = require('../models/Report');
const {
  geocodeAddress,
  reverseGeocode,
  getAutocompleteSuggestions,
  fetchGoogleRoutes,
  evaluateRouteSafety,
} = require('../utils/googleMaps');

/**
 * @desc    Compute safe route options using Google Routes API + active civic hazards
 * @route   POST /api/v1/maps/safe-route
 * @access  Private
 * @body    { origin: { lat, lng } | string, destination: { lat, lng } | string }
 */
const planSafeRoute = async (req, res, next) => {
  try {
    let { origin, destination } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Origin and destination are required (either coordinates or address string).',
      });
    }

    // Geocode address strings if text is provided
    if (typeof origin === 'string') {
      const geo = await geocodeAddress(origin);
      if (!geo) return res.status(400).json({ success: false, message: `Could not geocode origin: ${origin}` });
      origin = { lat: geo.lat, lng: geo.lng, address: geo.formattedAddress };
    }

    if (typeof destination === 'string') {
      const geo = await geocodeAddress(destination);
      if (!geo) return res.status(400).json({ success: false, message: `Could not geocode destination: ${destination}` });
      destination = { lat: geo.lat, lng: geo.lng, address: geo.formattedAddress };
    }

    // Fetch driving routes from Google Routes API
    const rawRoutes = await fetchGoogleRoutes(origin, destination);

    if (rawRoutes.length === 0) {
      return res.status(404).json({ success: false, message: 'No viable driving routes found between coordinates.' });
    }

    // Query active civic hazards in the bounding box corridor
    const minLat = Math.min(origin.lat, destination.lat) - 0.03;
    const maxLat = Math.max(origin.lat, destination.lat) + 0.03;
    const minLng = Math.min(origin.lng, destination.lng) - 0.03;
    const maxLng = Math.max(origin.lng, destination.lng) + 0.03;

    const hazards = await Report.list({
      filter: { statusIn: Report.ACTIVE, box: { minLat, maxLat, minLng, maxLng } },
      limit: 1000,
      select: ['title', 'category', 'priority', 'location', 'address', 'description', 'aiAnalysis'],
    });

    // Evaluate each route's safety against active hazards
    const scoredRoutes = rawRoutes.map((r) => evaluateRouteSafety(r, hazards));

    // Determine the safest route (highest safety score) vs fastest route (lowest duration)
    let safestRouteIndex = 0;
    let fastestRouteIndex = 0;
    let highestSafety = -1;
    let lowestDuration = Infinity;

    scoredRoutes.forEach((route, idx) => {
      if (route.safetyScore > highestSafety) {
        highestSafety = route.safetyScore;
        safestRouteIndex = idx;
      }
      if (route.durationSeconds < lowestDuration) {
        lowestDuration = route.durationSeconds;
        fastestRouteIndex = idx;
      }
    });

    const safestRoute = scoredRoutes[safestRouteIndex];
    const fastestRoute = scoredRoutes[fastestRouteIndex];

    let safetyAdvice = 'All routes are in good condition.';
    if (safestRouteIndex !== fastestRouteIndex) {
      safetyAdvice = `Recommended: Take ${safestRoute.routeLabel} (Score: ${safestRoute.safetyScore}/100, ${safestRoute.hazardCount} hazard(s)), avoiding ${fastestRoute.hazardCount} hazard(s) on the fastest route.`;
    } else if (safestRoute.safetyScore < 70) {
      safetyAdvice = `Caution: Selected route passes near ${safestRoute.hazardCount} reported road hazard(s). Drive cautiously.`;
    }

    res.json({
      success: true,
      data: {
        origin,
        destination,
        totalRoutesEvaluated: scoredRoutes.length,
        safestRouteIndex,
        fastestRouteIndex,
        safetyAdvice,
        routes: scoredRoutes,
        corridorHazardsTotal: hazards.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Geocode address
 * @route   GET /api/v1/maps/geocode?address=...
 * @access  Private
 */
const geocode = async (req, res, next) => {
  try {
    const { address } = req.query;
    if (!address) {
      return res.status(400).json({ success: false, message: 'address query parameter is required.' });
    }

    const result = await geocodeAddress(address);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Reverse geocode coordinates into address
 * @route   GET /api/v1/maps/reverse-geocode?lat=...&lng=...
 * @access  Private
 */
const reverseGeocodeEndpoint = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'lat and lng query parameters are required.' });
    }

    const address = await reverseGeocode(parseFloat(lat), parseFloat(lng));
    res.json({ success: true, data: { address, lat: parseFloat(lat), lng: parseFloat(lng) } });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Locality and street autocomplete
 * @route   GET /api/v1/maps/autocomplete?query=...
 * @access  Private
 */
const autocomplete = async (req, res, next) => {
  try {
    const { query } = req.query;
    const suggestions = await getAutocompleteSuggestions(query || '');
    res.json({ success: true, count: suggestions.length, data: suggestions });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Formatted markers for Google Maps Live Map & Monitoring
 * @route   GET /api/v1/maps/live-markers
 * @access  Private
 */
const getLiveMarkers = async (req, res, next) => {
  try {
    const { category, priority, status } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (status) {
      filter.status = status;
    } else {
      filter.statusIn = Report.ACTIVE;
    }

    const reports = await Report.list({
      filter,
      limit: 300,
      select: ['title', 'description', 'category', 'priority', 'status', 'location', 'address', 'images', 'createdAt', 'upvotes'],
    });

    // Color and icon mapping for Google Maps custom markers
    const markerColors = {
      pothole: '#EF4444', // Red
      waterlogging: '#3B82F6', // Blue
      garbage: '#10B981', // Green
      streetlight: '#F59E0B', // Yellow/Amber
      drainage: '#8B5CF6', // Purple
      road_damage: '#EC4899', // Pink
      other: '#6B7280', // Gray
    };

    const markers = reports.map((rep) => {
      const [lng, lat] = rep.location?.coordinates || [76.7794, 30.7333];
      return {
        id: rep._id,
        title: rep.title,
        description: rep.description,
        category: rep.category,
        priority: rep.priority,
        status: rep.status,
        position: { lat, lng },
        address: rep.address,
        imageUrl: rep.images && rep.images.length > 0 ? rep.images[0] : null,
        markerColor: markerColors[rep.category] || '#6B7280',
        upvoteCount: rep.upvotes ? rep.upvotes.length : 0,
        createdAt: rep.createdAt,
      };
    });

    res.json({ success: true, count: markers.length, data: markers });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Google Maps HeatmapLayer points
 * @route   GET /api/v1/maps/heatmap
 * @access  Private
 */
const getHeatmapLayer = async (req, res, next) => {
  try {
    const reports = await Report.list({
      filter: { statusIn: Report.ACTIVE },
      limit: 5000,
      select: ['location', 'priority', 'category'],
    });

    const weightMap = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    const heatmapData = reports.map((r) => {
      const [lng, lat] = r.location?.coordinates || [76.7794, 30.7333];
      return {
        lat,
        lng,
        weight: weightMap[r.priority] || 2,
        category: r.category,
      };
    });

    res.json({ success: true, count: heatmapData.length, data: heatmapData });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Google Maps client configuration
 * @route   GET /api/v1/maps/config
 * @access  Private
 */
const getMapsConfig = async (req, res) => {
  res.json({
    success: true,
    data: {
      hasGoogleMapsKey: Boolean(process.env.GOOGLE_MAPS_API_KEY),
      defaultCenter: { lat: 30.7333, lng: 76.7794 }, // Chandigarh region
      defaultZoom: 13,
      supportedModes: ['DRIVE', 'TWO_WHEELER', 'WALK'],
    },
  });
};

module.exports = {
  planSafeRoute,
  geocode,
  reverseGeocodeEndpoint,
  autocomplete,
  getLiveMarkers,
  getHeatmapLayer,
  getMapsConfig,
};
