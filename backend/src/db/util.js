/** Small helpers shared by the MySQL data-access modules (src/models/*). */

/** Parse a route/body id. Throws a CastError-shaped error (handled as HTTP 400, like Mongoose did). */
function parseId(value, field = '_id') {
  const s = value === undefined || value === null ? '' : String(value);
  if (!/^[1-9]\d{0,18}$/.test(s)) {
    const err = new Error(`Invalid value for field: ${field}`);
    err.name = 'CastError';
    err.path = field;
    throw err;
  }
  return Number(s);
}

/** Like parseId but returns null instead of throwing (for "not found" style lookups). */
function tryId(value) {
  const s = value === undefined || value === null ? '' : String(value);
  return /^[1-9]\d{0,18}$/.test(s) ? Number(s) : null;
}

const idStr = (v) => (v === null || v === undefined ? null : String(v));

/** DATETIME -> Date (mysql2 already returns Date; the test adapter returns 'YYYY-MM-DD HH:MM:SS[.fff]' UTC strings). */
function toDate(v) {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  return new Date(String(v).replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(String(v)) ? '' : 'Z'));
}

const toBool = (v) => v === true || v === 1 || v === '1';
const num = (v) => (v === null || v === undefined ? null : Number(v));
const now = () => new Date();

/** Haversine distance in metres. */
function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dPhi = toRad(lat2 - lat1);
  const dLam = toRad(lon2 - lon1);
  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLam / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Bounding box (degrees) around a point that fully contains `radiusM` metres. */
function boundingBox(lat, lng, radiusM) {
  const dLat = radiusM / 111320;
  const dLng = radiusM / (111320 * Math.max(0.01, Math.cos((lat * Math.PI) / 180)));
  return { minLat: lat - dLat, maxLat: lat + dLat, minLng: lng - dLng, maxLng: lng + dLng };
}

const jsonOrValue = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { return v; }
  }
  return v;
};

module.exports = { parseId, tryId, idStr, toDate, toBool, num, now, haversineM, boundingBox, jsonOrValue };

/** Mongoose-style ValidationError so middleware/errorHandler answers 400 with the same messages. */
function validationError(messages) {
  const err = new Error(messages.join('. '));
  err.name = 'ValidationError';
  err.errors = Object.fromEntries(messages.map((m, i) => [`f${i}`, { message: m }]));
  return err;
}

const oneOf = (value, allowed) => allowed.includes(value);

module.exports.validationError = validationError;
module.exports.oneOf = oneOf;
