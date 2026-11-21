/**
 * googleMaps.js
 * Comprehensive Google Maps Platform & Google Routes API Integration.
 *
 * Capabilities:
 *  1. Google Routes API v2: computeRoutes with alternative route calculation
 *  2. Encoded polyline decoding algorithm (no external dependencies)
 *  3. Spatial corridor hazard matching (detects potholes/flooding along driving path)
 *  4. Route safety scoring & comparison (Fastest Route vs Safest Route)
 *  5. Geocoding & Reverse Geocoding via Google Geocoding API
 *  6. Places Autocomplete search helper
 */

const axios = require('axios');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

/**
 * Decode an encoded polyline string into an array of [lat, lng] points.
 * Standard Google Maps Polyline Decoding Algorithm.
 * @param {string} encoded
 * @returns {Array<[number, number]>}
 */
const decodePolyline = (encoded) => {
  if (!encoded || typeof encoded !== 'string') return [];
  const poly = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    poly.push([lat / 1e5, lng / 1e5]);
  }
  return poly;
};

/**
 * Calculate distance in meters between two lat/lng points using Haversine formula.
 */
const haversineDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Check if a point is within threshold distance (meters) of any point on a route polyline.
 * @param {number} lat
 * @param {number} lng
 * @param {Array<[number, number]>} routeCoordinates
 * @param {number} thresholdMeters
 * @returns {{ isNear: boolean, minDistance: number }}
 */
const checkProximityToPolyline = (lat, lng, routeCoordinates, thresholdMeters = 60) => {
  let minDistance = Infinity;
  for (const [rLat, rLng] of routeCoordinates) {
    const dist = haversineDistanceMeters(lat, lng, rLat, rLng);
    if (dist < minDistance) minDistance = dist;
    if (dist <= thresholdMeters) {
      return { isNear: true, minDistance: Math.round(dist) };
    }
  }
  return { isNear: minDistance <= thresholdMeters, minDistance: Math.round(minDistance) };
};

/**
 * Geocode a human-readable address into lat/lng coordinates.
 * @param {string} address
 * @returns {Promise<{ lat: number, lng: number, formattedAddress: string } | null>}
 */
const geocodeAddress = async (address) => {
  if (!GOOGLE_MAPS_API_KEY) {
    return { lat: 30.7333, lng: 76.7794, formattedAddress: address, fallback: true };
  }

  try {
    const url = 'https://maps.googleapis.com/maps/api/geocode/json';
    const response = await axios.get(url, {
      params: { address, key: GOOGLE_MAPS_API_KEY },
      timeout: 5000,
    });

    if (response.data.results && response.data.results.length > 0) {
      const result = response.data.results[0];
      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        formattedAddress: result.formatted_address,
        placeId: result.place_id,
        fallback: false,
      };
    }
    return null;
  } catch (err) {
    console.error('[GoogleMaps] geocodeAddress error:', err.message);
    return { lat: 30.7333, lng: 76.7794, formattedAddress: address, fallback: true };
  }
};

/**
 * Reverse geocode lat/lng into a human-readable street address.
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<string>}
 */
const reverseGeocode = async (lat, lng) => {
  if (!GOOGLE_MAPS_API_KEY) {
    return `Location (${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)})`;
  }

  try {
    const url = 'https://maps.googleapis.com/maps/api/geocode/json';
    const response = await axios.get(url, {
      params: { latlng: `${lat},${lng}`, key: GOOGLE_MAPS_API_KEY },
      timeout: 5000,
    });

    if (response.data.results && response.data.results.length > 0) {
      return response.data.results[0].formatted_address;
    }
    return `Location (${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)})`;
  } catch (err) {
    console.error('[GoogleMaps] reverseGeocode error:', err.message);
    return `Location (${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)})`;
  }
};

/**
 * Autocomplete address or locality suggestions.
 */
const getAutocompleteSuggestions = async (input) => {
  if (!input || input.trim().length === 0) return [];

  if (!GOOGLE_MAPS_API_KEY) {
    // Fallback predefined common municipal localities
    const commonLocalities = [
      'Sector 17, Chandigarh',
      'Sector 22 B, Chandigarh',
      'Sector 15, Chandigarh',
      'Sector 35 D, Chandigarh',
      'Indiranagar, Bengaluru',
      'Koramangala, Bengaluru',
      'Whitefield, Bengaluru',
      'Connaught Place, New Delhi',
      'Rohini Sector 10, New Delhi',
    ];
    return commonLocalities
      .filter((loc) => loc.toLowerCase().includes(input.toLowerCase()))
      .map((loc) => ({ description: loc, placeId: `mock_${loc}` }));
  }

  try {
    const url = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
    const response = await axios.get(url, {
      params: { input, key: GOOGLE_MAPS_API_KEY, components: 'country:in' },
      timeout: 4000,
    });

    if (response.data.predictions) {
      return response.data.predictions.map((p) => ({
        description: p.description,
        placeId: p.place_id,
      }));
    }
    return [];
  } catch (err) {
    console.error('[GoogleMaps] autocomplete error:', err.message);
    return [];
  }
};

/**
 * Call Google Routes API v2 with alternative routes support.
 * @param {{ lat: number, lng: number }} origin
 * @param {{ lat: number, lng: number }} destination
 * @returns {Promise<Array<Object>>}
 */
const fetchGoogleRoutes = async (origin, destination) => {
  if (!GOOGLE_MAPS_API_KEY) {
    // Generate realistic simulated driving route coordinates between origin and destination
    const steps = 15;
    const simulatedPoints = [];
    for (let i = 0; i <= steps; i++) {
      const frac = i / steps;
      const lat = origin.lat + (destination.lat - origin.lat) * frac + (Math.sin(frac * Math.PI) * 0.003);
      const lng = origin.lng + (destination.lng - origin.lng) * frac;
      simulatedPoints.push([lat, lng]);
    }

    return [
      {
        routeLabel: 'Primary Route',
        distanceMeters: Math.round(haversineDistanceMeters(origin.lat, origin.lng, destination.lat, destination.lng) * 1.3),
        durationFormatted: '14 mins',
        durationSeconds: 840,
        polyline: '',
        coordinates: simulatedPoints,
        isFallback: true,
      },
    ];
  }

  try {
    const response = await axios.post(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      {
        origin: {
          location: {
            latLng: { latitude: Number(origin.lat), longitude: Number(origin.lng) },
          },
        },
        destination: {
          location: {
            latLng: { latitude: Number(destination.lat), longitude: Number(destination.lng) },
          },
        },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        computeAlternativeRoutes: true,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask':
            'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.description',
        },
        timeout: 10000,
      }
    );

    if (response.data.routes && response.data.routes.length > 0) {
      return response.data.routes.map((r, index) => {
        const encoded = r.polyline?.encodedPolyline || '';
        const coords = decodePolyline(encoded);
        const durationSec = parseInt(r.duration?.replace('s', '') || '600', 10);
        const minutes = Math.round(durationSec / 60);

        return {
          routeLabel: r.description || `Route Option ${index + 1}`,
          distanceMeters: r.distanceMeters,
          durationFormatted: `${minutes} mins`,
          durationSeconds: durationSec,
          polyline: encoded,
          coordinates: coords,
          isFallback: false,
        };
      });
    }
    return [];
  } catch (err) {
    console.warn('[GoogleMaps] fetchGoogleRoutes failed:', err.message);
    return [];
  }
};

/**
 * Score a single route against active reported civic hazards.
 * @param {Object} route
 * @param {Array<Object>} activeHazards
 * @returns {Object} enriched route with safety score and hazards along path
 */
const evaluateRouteSafety = (route, activeHazards) => {
  const hazardsOnRoute = [];
  let deduction = 0;

  for (const hazard of activeHazards) {
    const coords = hazard.location?.coordinates;
    if (!coords || coords.length < 2) continue;

    const [hLng, hLat] = coords;
    const { isNear, minDistance } = checkProximityToPolyline(hLat, hLng, route.coordinates, 60);

    if (isNear) {
      hazardsOnRoute.push({
        _id: hazard._id,
        title: hazard.title,
        category: hazard.category,
        priority: hazard.priority,
        severity: hazard.aiAnalysis?.severity || hazard.priority || 'medium',
        location: { lat: hLat, lng: hLng },
        address: hazard.address,
        distanceFromRouteMeters: minDistance,
      });

      if (hazard.priority === 'critical') deduction += 25;
      else if (hazard.priority === 'high') deduction += 15;
      else if (hazard.priority === 'medium') deduction += 8;
      else deduction += 3;
    }
  }

  const safetyScore = Math.max(10, Math.min(100, 100 - deduction));
  let safetyGrade = 'A - Safe';
  let badgeColor = '#10B981'; // Green

  if (safetyScore < 50) {
    safetyGrade = 'C - Hazardous';
    badgeColor = '#EF4444'; // Red
  } else if (safetyScore < 80) {
    safetyGrade = 'B - Moderate Caution';
    badgeColor = '#F59E0B'; // Amber
  }

  return {
    ...route,
    safetyScore,
    safetyGrade,
    badgeColor,
    hazardCount: hazardsOnRoute.length,
    hazardsOnRoute,
  };
};

/**
 * Backward compatibility helper for computeSafeRoute.
 */
const computeSafeRoute = async (origin, destination) => {
  const routes = await fetchGoogleRoutes(origin, destination);
  if (routes.length > 0) {
    return {
      distanceMeters: routes[0].distanceMeters,
      duration: routes[0].durationFormatted || `${Math.round(routes[0].durationSeconds / 60)} mins`,
      polyline: routes[0].polyline,
      fallback: routes[0].isFallback,
    };
  }
  return {
    distanceMeters: 5200,
    duration: '720s',
    polyline: '',
    fallback: true,
  };
};

module.exports = {
  decodePolyline,
  haversineDistanceMeters,
  checkProximityToPolyline,
  geocodeAddress,
  reverseGeocode,
  getAutocompleteSuggestions,
  fetchGoogleRoutes,
  evaluateRouteSafety,
  computeSafeRoute,
};
