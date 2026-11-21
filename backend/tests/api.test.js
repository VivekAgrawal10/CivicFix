/**
 * api.test.js
 * In-memory integration and unit tests for the CivicFix Backend.
 * Run with: npm test
 */

require('dotenv').config();
const assert = require('assert');
const { generateToken, verifyToken } = require('../src/utils/jwt');
const { authorize } = require('../src/middleware/rbac');
const { computeSafeRoute } = require('../src/utils/googleMaps');

console.log('🧪 Starting CivicFix Backend Automated Test Suite...\n');

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc} — ${err.message}`);
    failed++;
  }
}

async function itAsync(desc, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc} — ${err.message}`);
    failed++;
  }
}

(async () => {
  // The server connects to MySQL on load; the suite runs against tests/helpers/testDb (SQLite adapter, or TEST_DB=mysql).
  await require('./helpers/testDb').setup();

  // 1. JWT Tests
  it('JWT generateToken and verifyToken round-trip', () => {
    const payload = { _id: '507f1f77bcf86cd799439011', role: 'citizen', language: 'pa' };
    const token = generateToken(payload);
    assert(typeof token === 'string' && token.length > 20, 'Token must be non-empty string');

    const decoded = verifyToken(token);
    assert.strictEqual(decoded._id, payload._id);
    assert.strictEqual(decoded.role, payload.role);
    assert.strictEqual(decoded.language, payload.language);
  });

  it('JWT verifyToken throws error on malformed token', () => {
    assert.throws(() => verifyToken('invalid.jwt.token'), /invalid token|jwt malformed/i);
  });

  // 2. RBAC Middleware Tests
  it('RBAC allows matching role and calls next()', () => {
    const middleware = authorize('admin', 'contractor');
    const req = { user: { role: 'admin' } };
    let nextCalled = false;
    const res = { status: () => res, json: () => {} };

    middleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true, 'next() must be called for authorized role');
  });

  it('RBAC denies non-matching role with 403 Forbidden', () => {
    const middleware = authorize('admin');
    const req = { user: { role: 'citizen' } };
    let statusSet = null;
    let jsonBody = null;
    const res = {
      status: (code) => {
        statusSet = code;
        return res;
      },
      json: (body) => {
        jsonBody = body;
      },
    };

    middleware(req, res, () => {});

    assert.strictEqual(statusSet, 403, 'Must return 403 status code');
    assert.strictEqual(jsonBody.success, false);
  });

  // 3. Multilingual Dictionary & Languages
  it('Languages module includes English, Punjabi (pa), and Hindi (hi)', () => {
    const { getLanguages } = require('../src/controllers/language.controller');
    let jsonResult = null;
    const res = { json: (data) => (jsonResult = data) };

    getLanguages({}, res);

    assert(jsonResult && jsonResult.success === true);
    const codes = jsonResult.data.map((l) => l.code);
    assert(codes.includes('en'), 'Must support en');
    assert(codes.includes('pa'), 'Must support pa');
    assert(codes.includes('hi'), 'Must support hi');
  });

  // 4. Safe Route Google Maps fallback
  await itAsync('computeSafeRoute returns valid structure with fallback', async () => {
    const origin = { lat: 30.7333, lng: 76.7794 };
    const destination = { lat: 30.75, lng: 76.746 };
    const route = await computeSafeRoute(origin, destination);

    assert(route !== null, 'Route must not be null');
    assert(typeof route.distanceMeters === 'number', 'distanceMeters must be number');
    assert(typeof route.duration === 'string', 'duration must be string');
  });

  // 5. Express Router Stack Check
  it('Express Server mounts all 10 API route branches', () => {
    const { app } = require('../server');
    const mountedRegExps = app._router.stack
      .filter((r) => r.name === 'router')
      .map((r) => r.regexp.toString());

    assert(mountedRegExps.some((r) => r.includes('auth')), 'auth routes mounted');
    assert(mountedRegExps.some((r) => r.includes('users')), 'users routes mounted');
    assert(mountedRegExps.some((r) => r.includes('reports')), 'reports routes mounted');
    assert(mountedRegExps.some((r) => r.includes('workorders')), 'workorders routes mounted');
    assert(mountedRegExps.some((r) => r.includes('notifications')), 'notifications routes mounted');
    assert(mountedRegExps.some((r) => r.includes('dashboard')), 'dashboard routes mounted');
    assert(mountedRegExps.some((r) => r.includes('upload')), 'upload routes mounted');
    assert(mountedRegExps.some((r) => r.includes('ai')), 'ai routes mounted');
    assert(mountedRegExps.some((r) => r.includes('roadhealth')), 'roadhealth routes mounted');
    assert(mountedRegExps.some((r) => r.includes('maps')), 'maps routes mounted');
  });

  // 6. Google Maps Platform & Polyline Decoding Algorithm
  it('decodePolyline decodes standard Google encoded polyline string', () => {
    const { decodePolyline, checkProximityToPolyline } = require('../src/utils/googleMaps');
    // Encoded polyline for points: (38.5, -120.2), (40.7, -120.95), (43.252, -126.453)
    const encoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
    const decoded = decodePolyline(encoded);

    assert(Array.isArray(decoded) && decoded.length === 3, 'Must decode into 3 points');
    assert(Math.abs(decoded[0][0] - 38.5) < 0.001, 'Latitude of point 1 match');
    assert(Math.abs(decoded[0][1] - (-120.2)) < 0.001, 'Longitude of point 1 match');

    // Test proximity detection
    const nearResult = checkProximityToPolyline(38.5001, -120.2001, decoded, 50);
    assert.strictEqual(nearResult.isNear, true, 'Point within 50m must be detected as near polyline');

    const farResult = checkProximityToPolyline(30.0, -100.0, decoded, 50);
    assert.strictEqual(farResult.isNear, false, 'Far point must not be near polyline');
  });

  // 7. Database Schema & Teammate Artifacts
  it('Teammate SQL schema and test queries are stored in backend/database/', () => {
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const queriesPath = path.join(__dirname, '../database/test_queries.sql');
    const docPath = path.join(__dirname, '../database/DATABASE_README.md');

    assert(fs.existsSync(schemaPath), 'schema.sql must exist');
    assert(fs.existsSync(queriesPath), 'test_queries.sql must exist');
    assert(fs.existsSync(docPath), 'DATABASE_README.md must exist');
  });

  // 7. MySQL Service safe fallback
  await itAsync('mysqlService handles offline database without crashing', async () => {
    const mysqlService = require('../src/services/mysqlService');
    const unresolved = await mysqlService.getUnresolvedIssuesFromView();
    const roadHealth = await mysqlService.getRoadHealthMetricsFromView();
    assert(unresolved === null || Array.isArray(unresolved));
    assert(roadHealth === null || Array.isArray(roadHealth));
  });

  // 8. Gamification, CivicCreds & Anti-Spam Verification
  it('CivicCreds tier calculation and reward configuration are valid', () => {
    const { calculateTier, REWARDS } = require('../src/utils/civicCreds');

    assert.strictEqual(calculateTier(50), 'Bronze Citizen');
    assert.strictEqual(calculateTier(150), 'Silver Guardian');
    assert.strictEqual(calculateTier(350), 'Gold Civic Champion');
    assert.strictEqual(calculateTier(800), 'Platinum City Hero');

    assert(REWARDS.SUBMIT_REPORT.amount === 25, 'Report submission earns +25 CC');
    assert(REWARDS.CONFIRM_ISSUE.amount === 15, 'Community vouch earns +15 CC');
    assert(REWARDS.REPORT_RESOLVED.amount === 50, 'Resolved repair earns +50 CC');
    assert(REWARDS.PENALTY_FAKE_CALL.amount === -40, 'Fake report incurs penalty');
  });

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  process.exit(failed > 0 ? 1 : 0);
})();
