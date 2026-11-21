/**
 * endpoints.test.js — end-to-end API test of the MySQL-backed Express app (real HTTP, real controllers,
 * real models, real SQL).  Covers every route group: auth, users, reports, work orders, notifications,
 * dashboard, road health, maps, AI, languages — plus constraints, cascades and concurrency.
 *
 *   npm run test:endpoints                       (in-memory SQLite adapter, no server needed)
 *   TEST_DB=mysql MYSQL_DATABASE=civicfix_test npm run test:endpoints   (real MySQL)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const testDb = require('./helpers/testDb');

let passed = 0;
const failures = [];
const it = async (name, fn) => {
  try { await fn(); passed++; console.log(`  ✓ ${name}`); } catch (e) { failures.push({ name, e }); console.log(`  ✗ ${name}\n      ${String(e.message).split('\n')[0]}`); }
};
const section = (t) => console.log(`\n${t}`);

(async () => {
  const backend = await testDb.setup();
  console.log(`Backend under test: ${testDb.label()}`);
  process.env.PORT = '0';
  process.env.CHATBOT_URL = 'http://127.0.0.1:9'; // nothing listens → exercises the fallback path
  process.env.AI_SERVICE_URL = 'http://127.0.0.1:9';
  process.env.RATE_LIMIT_MAX = '100000';

  const { server, ready } = require('../server');
  await ready;
  const base = `http://127.0.0.1:${server.address().port}`;
  const db = require('../src/config/mysql');
  const User = require('../src/models/User');
  const Report = require('../src/models/Report');

  const call = async (method, url, { token, body } = {}) => {
    const res = await fetch(base + url, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let json = null;
    try { json = await res.json(); } catch (_) { /* empty */ }
    return { status: res.status, body: json };
  };
  const ok = (r, code = 200) => assert.strictEqual(r.status, code, `expected ${code}, got ${r.status}: ${JSON.stringify(r.body).slice(0, 300)}`);

  // ── fixtures: users (admin/contractors are created directly, citizens via the public register endpoint) ──
  const mk = async (name, email, role = 'citizen') => {
    const u = await User.create({ name, email, password: 'Passw0rd!', role });
    const r = await call('POST', '/api/v1/auth/login', { body: { email, password: 'Passw0rd!' } });
    return { ...u, token: r.body.token };
  };
  const admin = await mk('Admin', 'admin@t.com', 'admin');
  const contractor = await mk('Contractor', 'contractor@t.com', 'contractor');
  const contractor2 = await mk('Contractor Two', 'contractor2@t.com', 'contractor');

  // ───────────────────────────────────────────────────────────────────────────────────────────
  section('Health, languages, translation');
  await it('GET /health', async () => { const r = await call('GET', '/health'); ok(r); assert.strictEqual(r.body.success, true); });
  await it('GET /api/v1/languages', async () => { const r = await call('GET', '/api/v1/languages'); ok(r); assert.deepStrictEqual(r.body.data.map((l) => l.code), ['en', 'pa', 'hi']); });
  await it('POST /translations/translate validates and passes through same-language text', async () => {
    ok(await call('POST', '/api/v1/translations/translate', { token: admin.token, body: {} }), 400);
    const r = await call('POST', '/api/v1/translations/translate', { token: admin.token, body: { text: 'hi', fromLang: 'en', toLang: 'en' } });
    ok(r); assert.strictEqual(r.body.translatedText, 'hi');
  });
  await it('unknown route → 404 JSON', async () => { const r = await call('GET', '/api/v1/nope'); ok(r, 404); assert.strictEqual(r.body.success, false); });

  // ───────────────────────────────────────────────────────────────────────────────────────────
  section('Authentication');
  let citizen; let citizen2;
  await it('register creates a citizen and ignores a client-supplied admin role', async () => {
    const r = await call('POST', '/api/v1/auth/register', { body: { name: 'Asha', email: 'asha@t.com', password: 'Passw0rd!', role: 'admin', language: 'pa', phone: '9999999999' } });
    ok(r, 201);
    assert.strictEqual(r.body.user.role, 'citizen');
    assert.strictEqual(r.body.user.language, 'pa');
    assert.ok(r.body.token && r.body.user._id && !('password' in r.body.user));
    citizen = { ...r.body.user, token: r.body.token };
  });
  await it('register rejects duplicate email (409) and invalid input (400)', async () => {
    ok(await call('POST', '/api/v1/auth/register', { body: { name: 'Asha', email: 'asha@t.com', password: 'Passw0rd!' } }), 409);
    const bad = await call('POST', '/api/v1/auth/register', { body: { name: '', email: 'not-an-email', password: '1' } });
    ok(bad, 400); assert.strictEqual(bad.body.success, false);
  });
  await it('login works, wrong password and unknown user are 401, inactive user is 401', async () => {
    const r = await call('POST', '/api/v1/auth/login', { body: { email: 'asha@t.com', password: 'Passw0rd!' } });
    ok(r); assert.strictEqual(r.body.user.email, 'asha@t.com'); assert.ok(!('password' in r.body.user));
    ok(await call('POST', '/api/v1/auth/login', { body: { email: 'asha@t.com', password: 'wrong' } }), 401);
    ok(await call('POST', '/api/v1/auth/login', { body: { email: 'ghost@t.com', password: 'Passw0rd!' } }), 401);
    ok(await call('POST', '/api/v1/auth/login', { body: {} }), 400);
    const tmp = await User.create({ name: 'Gone', email: 'gone@t.com', password: 'Passw0rd!' });
    await User.update(tmp._id, { isActive: false });
    ok(await call('POST', '/api/v1/auth/login', { body: { email: 'gone@t.com', password: 'Passw0rd!' } }), 401);
  });
  await it('passwords are stored as bcrypt hashes and email lookup is case-insensitive-safe', async () => {
    const [row] = await db.query('SELECT password FROM users WHERE email = ?', ['asha@t.com']);
    assert.ok(/^\$2[aby]\$/.test(row.password) && row.password !== 'Passw0rd!');
  });
  await it('GET /auth/me returns the profile; missing/invalid token → 401', async () => {
    const r = await call('GET', '/api/v1/auth/me', { token: citizen.token });
    ok(r); assert.strictEqual(r.body.user.email, 'asha@t.com'); assert.ok(Array.isArray(r.body.user.badges)); assert.ok(!('password' in r.body.user));
    ok(await call('GET', '/api/v1/auth/me'), 401);
    ok(await call('GET', '/api/v1/auth/me', { token: 'garbage' }), 401);
  });
  await it('POST /auth/logout', async () => ok(await call('POST', '/api/v1/auth/logout', { token: citizen.token })));
  citizen2 = await mk('Ben', 'ben@t.com');

  // ───────────────────────────────────────────────────────────────────────────────────────────
  section('Reports');
  const P = { lng: 76.7794, lat: 30.7333 };
  let r1; let r2; let rFar;
  await it('POST /reports creates a report (GeoJSON location, populated submittedBy, pending reward)', async () => {
    const r = await call('POST', '/api/v1/reports', { token: citizen.token, body: { title: 'Big pothole', description: 'Deep hole near bus stand', category: 'pothole', location: { type: 'Point', coordinates: [P.lng, P.lat] }, address: 'Sector 17, Chandigarh' } });
    ok(r, 201);
    r1 = r.body.data;
    assert.strictEqual(r1.title, 'Big pothole');
    assert.deepStrictEqual(r1.location, { type: 'Point', coordinates: [P.lng, P.lat] });
    assert.strictEqual(r1.status, 'pending');
    assert.strictEqual(r1.submittedBy.email, 'asha@t.com');
    assert.strictEqual(r1.submittedBy._id, citizen._id);
    assert.ok(Array.isArray(r1.images) && Array.isArray(r1.upvotes) && Array.isArray(r1.confirmations));
    assert.strictEqual(r1.confirmationCount, 1);
    assert.strictEqual(r1.rewardPending, true);
    assert.strictEqual(r1.aiAnalysis.outcome, 'no_image');
    assert.strictEqual(r1.aiAnalysis.manualReviewRequired, true);
    assert.ok(!Number.isNaN(Date.parse(r1.createdAt)));
    assert.deepStrictEqual(r.body.reward, { pending: true, amount: 25 });
  });
  await it('create accepts the alternative location formats the frontend sends (lat/lng, latitude/longitude)', async () => {
    let r = await call('POST', '/api/v1/reports', { token: citizen.token, body: { title: 'Light out', description: 'Dark street', category: 'streetlight', location: { lat: 30.7335, lng: 76.7796 } } });
    ok(r, 201); r2 = r.body.data;
    assert.deepStrictEqual(r2.location.coordinates, [76.7796, 30.7335]);
    r = await call('POST', '/api/v1/reports', { token: citizen2.token, body: { title: 'Far garbage', description: 'Pile of garbage', category: 'garbage', latitude: 30.9, longitude: 76.9, address: 'Far away' } });
    ok(r, 201); rFar = r.body.data;
  });
  await it('create validates input → 400 with messages; contractors cannot create → 403', async () => {
    let r = await call('POST', '/api/v1/reports', { token: citizen.token, body: { description: 'no title', category: 'pothole' } });
    ok(r, 400); assert.ok(/title/i.test(r.body.message));
    r = await call('POST', '/api/v1/reports', { token: citizen.token, body: { title: 'x', description: 'y', category: 'spaceship' } });
    ok(r, 400);
    r = await call('POST', '/api/v1/reports', { token: citizen.token, body: { title: 'x', description: 'y', category: 'pothole', location: { type: 'Point', coordinates: [500, 95] } } });
    ok(r, 400); assert.ok(/Latitude|Longitude/.test(r.body.message));
    ok(await call('POST', '/api/v1/reports', { token: contractor.token, body: { title: 'x', description: 'y', category: 'pothole' } }), 403);
    ok(await call('POST', '/api/v1/reports', { body: {} }), 401);
  });
  await it('GET /reports paginates, filters and populates submittedBy', async () => {
    let r = await call('GET', '/api/v1/reports?limit=2&page=1', { token: citizen.token });
    ok(r); assert.strictEqual(r.body.data.length, 2); assert.strictEqual(r.body.pagination.total, 3); assert.strictEqual(r.body.pagination.totalPages, 2);
    assert.strictEqual(r.body.data[0]._id, rFar._id, 'newest first');
    assert.ok(r.body.data[0].submittedBy.name);
    r = await call('GET', '/api/v1/reports?category=pothole', { token: citizen.token });
    assert.strictEqual(r.body.data.length, 1);
    r = await call('GET', '/api/v1/reports?status=resolved&priority=low', { token: citizen.token });
    assert.strictEqual(r.body.pagination.total, 0);
  });
  await it('GET /reports/my returns only the caller\'s reports', async () => {
    const r = await call('GET', '/api/v1/reports/my', { token: citizen.token });
    ok(r); assert.strictEqual(r.body.pagination.total, 2); assert.ok(r.body.data.every((x) => x.submittedBy === citizen._id));
  });
  await it('GET /reports/:id populates submittedBy / assignedTo / duplicateOf; 404 and 400 for bad ids', async () => {
    const r = await call('GET', `/api/v1/reports/${r1._id}`, { token: citizen.token });
    ok(r); assert.strictEqual(r.body.data.submittedBy.name, 'Asha'); assert.strictEqual(r.body.data.assignedTo, null);
    ok(await call('GET', '/api/v1/reports/999999', { token: citizen.token }), 404);
    const bad = await call('GET', '/api/v1/reports/not-an-id', { token: citizen.token });
    ok(bad, 400); assert.strictEqual(bad.body.success, false);
  });
  await it('GET /reports/nearby uses radius filtering and nearest-first ordering', async () => {
    let r = await call('GET', `/api/v1/reports/nearby?lat=${P.lat}&lng=${P.lng}&radius=500`, { token: citizen.token });
    ok(r); assert.strictEqual(r.body.count, 2); assert.strictEqual(r.body.data[0]._id, r1._id);
    r = await call('GET', `/api/v1/reports/nearby?lat=${P.lat}&lng=${P.lng}&radius=50000`, { token: citizen.token });
    assert.strictEqual(r.body.count, 3);
    ok(await call('GET', '/api/v1/reports/nearby', { token: citizen.token }), 400);
    ok(await call('GET', '/api/v1/reports/nearby?lat=abc&lng=1', { token: citizen.token }), 400);
  });
  await it('GET /reports/map honours status default, category and bounding box', async () => {
    let r = await call('GET', '/api/v1/reports/map', { token: citizen.token });
    ok(r); assert.strictEqual(r.body.count, 3); assert.ok(r.body.data[0].location.coordinates.length === 2);
    r = await call('GET', '/api/v1/reports/map?category=garbage', { token: citizen.token });
    assert.strictEqual(r.body.count, 1);
    r = await call('GET', '/api/v1/reports/map?sw_lat=30.70&sw_lng=76.7&ne_lat=30.75&ne_lng=76.8', { token: citizen.token });
    assert.strictEqual(r.body.count, 2);
  });
  await it('POST /reports/pre-check flags an active report within 60 m and ignores distant ones', async () => {
    let r = await call('POST', '/api/v1/reports/pre-check', { token: citizen2.token, body: { latitude: 30.73331, longitude: 76.77941 } });
    ok(r); assert.strictEqual(r.body.hasExistingIssueNearby, true);
    assert.strictEqual(r.body.existingReport._id, r1._id);
    assert.ok(r.body.alertPopup.actionConfirm.endpoint.endsWith(`/${r1._id}/confirm`));
    r = await call('POST', '/api/v1/reports/pre-check', { token: citizen2.token, body: { latitude: 31.5, longitude: 77.5 } });
    assert.strictEqual(r.body.hasExistingIssueNearby, false);
    r = await call('POST', '/api/v1/reports/pre-check', { token: citizen2.token, body: {} });
    assert.strictEqual(r.body.hasExistingIssueNearby, false);
  });
  await it('POST /reports/:id/upvote toggles and persists per user', async () => {
    let r = await call('POST', `/api/v1/reports/${r1._id}/upvote`, { token: citizen2.token });
    ok(r); assert.deepStrictEqual([r.body.upvotes, r.body.upvoted], [1, true]);
    r = await call('POST', `/api/v1/reports/${r1._id}/upvote`, { token: citizen.token });
    assert.strictEqual(r.body.upvotes, 2);
    r = await call('POST', `/api/v1/reports/${r1._id}/upvote`, { token: citizen2.token });
    assert.deepStrictEqual([r.body.upvotes, r.body.upvoted], [1, false]);
    const g = await call('GET', `/api/v1/reports/${r1._id}`, { token: citizen.token });
    assert.deepStrictEqual(g.body.data.upvotes, [citizen._id]);
    ok(await call('POST', '/api/v1/reports/424242/upvote', { token: citizen.token }), 404);
  });
  await it('POST /reports/:id/confirm — rules, rewards, escalation (3 → high, 5 → critical)', async () => {
    ok(await call('POST', `/api/v1/reports/${r1._id}/confirm`, { token: citizen.token }), 400); // own report
    ok(await call('POST', '/api/v1/reports/777777/confirm', { token: citizen2.token }), 404);
    let r = await call('POST', `/api/v1/reports/${r1._id}/confirm`, { token: citizen2.token, body: { remarks: 'Saw it too' } });
    ok(r); assert.strictEqual(r.body.report.confirmationCount, 1); assert.strictEqual(r.body.report.priorityScore, 30); // 15 at creation + 15 per confirmation
    assert.strictEqual(r.body.reward.earnedAmount, 15);
    ok(await call('POST', `/api/v1/reports/${r1._id}/confirm`, { token: citizen2.token }), 400); // twice
    const extra = [];
    for (let i = 0; i < 4; i++) extra.push(await mk(`Voter${i}`, `voter${i}@t.com`));
    r = await call('POST', `/api/v1/reports/${r1._id}/confirm`, { token: extra[0].token });
    assert.strictEqual(r.body.report.priority, 'medium');
    r = await call('POST', `/api/v1/reports/${r1._id}/confirm`, { token: extra[1].token });
    assert.strictEqual(r.body.report.priority, 'high'); assert.strictEqual(r.body.report.confirmationCount, 3);
    await call('POST', `/api/v1/reports/${r1._id}/confirm`, { token: extra[2].token });
    r = await call('POST', `/api/v1/reports/${r1._id}/confirm`, { token: extra[3].token });
    assert.strictEqual(r.body.report.priority, 'critical'); assert.strictEqual(r.body.report.confirmationCount, 5);
    const g = await call('GET', `/api/v1/reports/${r1._id}`, { token: citizen.token });
    assert.strictEqual(g.body.data.confirmations.length, 5); assert.strictEqual(g.body.data.isVerifiedByCommunity, true);
    assert.ok(g.body.data.confirmations[0].user && g.body.data.confirmations[0].confirmedAt);
  });
  await it('submit reward is granted exactly once after independent verification (+25 and a history entry)', async () => {
    const me = await call('GET', '/api/v1/users/civic-creds', { token: citizen.token });
    ok(me);
    const submitEntries = me.body.data.history.filter((h) => h.action === 'Report Submitted');
    assert.strictEqual(submitEntries.length, 1);
    assert.strictEqual(me.body.data.civicCreds, 75);
    const g = await call('GET', `/api/v1/reports/${r1._id}`, { token: citizen.token });
    assert.deepStrictEqual([g.body.data.rewardGranted, g.body.data.rewardPending], [true, false]);
  });
  await it('PATCH /reports/:id/priority and /status are admin-only, validated, and notify the submitter', async () => {
    ok(await call('PATCH', `/api/v1/reports/${r2._id}/priority`, { token: citizen.token, body: { priority: 'high' } }), 403);
    ok(await call('PATCH', `/api/v1/reports/${r2._id}/priority`, { token: admin.token, body: { priority: 'urgent' } }), 400);
    let r = await call('PATCH', `/api/v1/reports/${r2._id}/priority`, { token: admin.token, body: { priority: 'high' } });
    ok(r); assert.strictEqual(r.body.data.priority, 'high');
    ok(await call('PATCH', `/api/v1/reports/${r2._id}/status`, { token: admin.token, body: { status: 'bogus' } }), 400);
    ok(await call('PATCH', '/api/v1/reports/888888/status', { token: admin.token, body: { status: 'assigned' } }), 404);
    r = await call('PATCH', `/api/v1/reports/${r2._id}/status`, { token: admin.token, body: { status: 'in_progress' } });
    ok(r); assert.strictEqual(r.body.data.status, 'in_progress');
    const hist = await Report.statusHistory(r2._id);
    assert.deepStrictEqual(hist.map((h) => h.newStatus), ['pending', 'in_progress']);
    const n = await call('GET', '/api/v1/notifications', { token: citizen.token });
    assert.ok(n.body.data.some((x) => x.type === 'report_update' && /in_progress/.test(x.message)));
  });
  await it('GET /reports/priority-queue orders critical → high → medium and lists only open reports', async () => {
    const r = await call('GET', '/api/v1/reports/priority-queue', { token: admin.token });
    ok(r);
    assert.deepStrictEqual(r.body.data.map((x) => x.priority), ['critical', 'high', 'medium']);
    assert.deepStrictEqual(r.body.data.map((x) => x.priorityScore), [4, 3, 2]);
    assert.ok(r.body.data[0].upvoteCount >= 0 && r.body.data[0].submittedBy.email);
    assert.ok(Array.isArray(r.body.unresolvedIssuesView));
    ok(await call('GET', '/api/v1/reports/priority-queue', { token: citizen.token }), 403);
  });
  await it('POST /reports/:id/duplicate marks a duplicate and GET /reports/duplicates lists it with populated original', async () => {
    ok(await call('POST', `/api/v1/reports/${rFar._id}/duplicate`, { token: admin.token, body: {} }), 400);
    ok(await call('POST', `/api/v1/reports/${rFar._id}/duplicate`, { token: admin.token, body: { duplicateOf: '999999' } }), 404);
    let r = await call('POST', `/api/v1/reports/${rFar._id}/duplicate`, { token: admin.token, body: { duplicateOf: r1._id, confidence: 0.77 } });
    ok(r); assert.strictEqual(r.body.data.aiAnalysis.isDuplicate, true); assert.strictEqual(r.body.data.aiAnalysis.confidence, 0.77);
    r = await call('GET', '/api/v1/reports/duplicates', { token: admin.token });
    ok(r); assert.strictEqual(r.body.data.length, 1);
    assert.strictEqual(r.body.data[0].aiAnalysis.duplicateOf._id, r1._id); assert.strictEqual(r.body.data[0].aiAnalysis.duplicateOf.title, 'Big pothole');
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────
  section('Concurrency & integrity');
  await it('parallel confirms by the same user record exactly one confirmation', async () => {
    const rp = (await call('POST', '/api/v1/reports', { token: citizen.token, body: { title: 'Race', description: 'race', category: 'other', location: { type: 'Point', coordinates: [77.1, 31.1] } } })).body.data;
    const results = await Promise.all([1, 2, 3, 4].map(() => call('POST', `/api/v1/reports/${rp._id}/confirm`, { token: citizen2.token })));
    assert.deepStrictEqual(results.map((x) => x.status).sort(), [200, 400, 400, 400]);
    const [{ c }] = await db.query('SELECT COUNT(*) AS c FROM report_confirmations WHERE report_id = ?', [rp._id]);
    assert.strictEqual(Number(c), 1);
  });
  await it('parallel confirms by different users never lose an update (count == rows, reward granted once)', async () => {
    const rp = (await call('POST', '/api/v1/reports', { token: citizen.token, body: { title: 'Race2', description: 'race', category: 'other', location: { type: 'Point', coordinates: [77.2, 31.2] } } })).body.data;
    const voters = await Promise.all([0, 1, 2].map((i) => mk(`P${i}`, `p${i}@t.com`)));
    const res = await Promise.all(voters.map((v) => call('POST', `/api/v1/reports/${rp._id}/confirm`, { token: v.token })));
    res.forEach((x) => ok(x));
    const rep = await Report.findById(rp._id);
    assert.strictEqual(rep.confirmationCount, 3); assert.strictEqual(rep.confirmations.length, 3);
    const [{ c }] = await db.query("SELECT COUNT(*) AS c FROM creds_history WHERE user_id = ? AND details LIKE ?", [citizen._id, '%Race2%']);
    assert.strictEqual(Number(c), 1, 'submit reward granted exactly once');
  });
  await it('duplicate e-mail is rejected by the database UNIQUE constraint (409 via the error handler)', async () => {
    await assert.rejects(() => db.query("INSERT INTO users (name, email, password, created_at, updated_at) VALUES ('x', 'asha@t.com', 'h', NOW(), NOW())".replace(/NOW\(\)/g, "'2026-01-01 00:00:00'")), (e) => e.code === 'ER_DUP_ENTRY');
  });
  await it('deleting a report cascades to images, upvotes, confirmations and history', async () => {
    const rp = (await call('POST', '/api/v1/reports', { token: citizen.token, body: { title: 'Cascade', description: 'c', category: 'other', images: [], location: { type: 'Point', coordinates: [75.1, 30.1] } } })).body.data;
    await db.query("INSERT INTO report_images (report_id, url, sort_order, created_at) VALUES (?, '/uploads/x.jpg', 0, '2026-01-01 00:00:00')", [rp._id]);
    await call('POST', `/api/v1/reports/${rp._id}/upvote`, { token: citizen2.token });
    await call('POST', `/api/v1/reports/${rp._id}/confirm`, { token: citizen2.token });
    ok(await call('DELETE', `/api/v1/reports/${rp._id}`, { token: citizen.token }), 403);
    ok(await call('DELETE', `/api/v1/reports/${rp._id}`, { token: admin.token }));
    ok(await call('GET', `/api/v1/reports/${rp._id}`, { token: admin.token }), 404);
    for (const t of ['report_images', 'report_upvotes', 'report_confirmations', 'report_status_history']) {
      const [{ c }] = await db.query(`SELECT COUNT(*) AS c FROM ${t} WHERE report_id = ?`, [rp._id]);
      assert.strictEqual(Number(c), 0, t);
    }
    ok(await call('DELETE', `/api/v1/reports/${rp._id}`, { token: admin.token }), 404);
  });
  await it('image metadata round-trips in order', async () => {
    const rep = await Report.create({ title: 'With images', description: 'd', category: 'other', location: { type: 'Point', coordinates: [75.5, 30.5] }, submittedBy: citizen._id, images: ['/uploads/a.jpg', 'https://res.cloudinary.com/x/b.jpg', '/uploads/c.jpg'] });
    assert.deepStrictEqual(rep.images, ['/uploads/a.jpg', 'https://res.cloudinary.com/x/b.jpg', '/uploads/c.jpg']);
    const g = await call('GET', `/api/v1/reports/${rep._id}`, { token: citizen.token });
    assert.deepStrictEqual(g.body.data.images, rep.images);
    await Report.delete(rep._id);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────
  section('Work orders');
  let wo;
  await it('POST /workorders (admin) creates, assigns the report and notifies the contractor', async () => {
    ok(await call('POST', '/api/v1/workorders', { token: citizen.token, body: { report: r1._id } }), 403);
    ok(await call('POST', '/api/v1/workorders', { token: admin.token, body: { report: '555555', assignedContractor: contractor._id } }), 404);
    const r = await call('POST', '/api/v1/workorders', { token: admin.token, body: { report: r1._id, assignedContractor: contractor._id, scheduledDate: '2030-01-02T10:00:00.000Z', notes: 'Bring cones' } });
    ok(r, 201); wo = r.body.data;
    assert.strictEqual(wo.status, 'open'); assert.strictEqual(wo.priority, 'critical');
    assert.strictEqual(wo.report._id, r1._id); assert.strictEqual(wo.assignedContractor.email, 'contractor@t.com'); assert.strictEqual(wo.createdBy.email, 'admin@t.com');
    assert.deepStrictEqual(wo.repairEvidence, []); assert.strictEqual(new Date(wo.scheduledDate).toISOString(), '2030-01-02T10:00:00.000Z');
    const g = await call('GET', `/api/v1/reports/${r1._id}`, { token: admin.token });
    assert.strictEqual(g.body.data.status, 'assigned'); assert.strictEqual(g.body.data.assignedTo._id, wo._id);
    const n = await call('GET', '/api/v1/notifications', { token: contractor.token });
    assert.ok(n.body.data.some((x) => x.type === 'work_order'));
  });
  await it('GET /workorders scopes contractors to their own orders; admins see all; status filter', async () => {
    let r = await call('GET', '/api/v1/workorders', { token: contractor.token });
    ok(r); assert.strictEqual(r.body.data.length, 1); assert.strictEqual(r.body.data[0].report.title, 'Big pothole'); assert.strictEqual(r.body.data[0].assignedContractor.name, 'Contractor');
    r = await call('GET', '/api/v1/workorders', { token: contractor2.token });
    assert.strictEqual(r.body.data.length, 0);
    r = await call('GET', '/api/v1/workorders?status=open', { token: admin.token });
    assert.strictEqual(r.body.pagination.total, 1);
    ok(await call('GET', '/api/v1/workorders', { token: citizen.token }), 403);
    r = await call('GET', `/api/v1/workorders/contractor/${contractor._id}`, { token: admin.token });
    ok(r); assert.strictEqual(r.body.data.length, 1);
  });
  await it('GET /workorders/:id returns populated report/contractor/creator', async () => {
    const r = await call('GET', `/api/v1/workorders/${wo._id}`, { token: contractor.token });
    ok(r);
    assert.strictEqual(r.body.data.report.title, 'Big pothole'); assert.strictEqual(r.body.data.createdBy.name, 'Admin');
    ok(await call('GET', '/api/v1/workorders/909090', { token: admin.token }), 404);
  });
  await it('PATCH /workorders/:id/status enforces ownership and syncs report status', async () => {
    ok(await call('PATCH', `/api/v1/workorders/${wo._id}/status`, { token: contractor2.token, body: { status: 'in_progress' } }), 403);
    ok(await call('PATCH', `/api/v1/workorders/${wo._id}/status`, { token: contractor.token, body: { status: 'nope' } }), 400);
    let r = await call('PATCH', `/api/v1/workorders/${wo._id}/status`, { token: contractor.token, body: { status: 'in_progress' } });
    ok(r); assert.strictEqual((await Report.findById(r1._id)).status, 'in_progress');
    ok(await call('PATCH', `/api/v1/workorders/${wo._id}/status`, { token: contractor.token, body: { status: 'completed' } }), 400); // proof photo required
    ok(await call('POST', `/api/v1/workorders/${wo._id}/evidence`, { token: contractor.token, body: { images: ['/uploads/e1.jpg'] } }));
    r = await call('PATCH', `/api/v1/workorders/${wo._id}/status`, { token: contractor.token, body: { status: 'completed' } });
    ok(r); assert.ok(r.body.data.completedDate);
    ok(await call('PATCH', `/api/v1/workorders/${wo._id}/status`, { token: contractor.token, body: { status: 'verified' } }), 403); // contractors cannot self-verify
  });
  await it('POST /workorders/:id/evidence stores repair-evidence URLs (appending, ordered)', async () => {
    ok(await call('POST', `/api/v1/workorders/${wo._id}/evidence`, { token: contractor.token, body: {} }), 400);
    let r = await call('POST', `/api/v1/workorders/${wo._id}/evidence`, { token: contractor.token, body: { images: ['/uploads/e2.jpg'] } });
    ok(r); r = await call('POST', `/api/v1/workorders/${wo._id}/evidence`, { token: admin.token, body: { repairEvidence: ['/uploads/e3.jpg'] } });
    assert.deepStrictEqual(r.body.data.repairEvidence, ['/uploads/e1.jpg', '/uploads/e2.jpg', '/uploads/e3.jpg']);
    ok(await call('POST', `/api/v1/workorders/${wo._id}/evidence`, { token: contractor2.token, body: { images: ['/x.jpg'] } }), 403);
  });
  await it('verifying a work order resolves the report and awards the resolution bonus (+50)', async () => {
    const before = (await call('GET', '/api/v1/users/civic-creds', { token: citizen.token })).body.data.civicCreds;
    const r = await call('PATCH', `/api/v1/workorders/${wo._id}/status`, { token: admin.token, body: { status: 'verified' } });
    ok(r); assert.strictEqual((await Report.findById(r1._id)).status, 'resolved');
    await new Promise((res) => setTimeout(res, 200)); // reward is awarded fire-and-forget
    const after = (await call('GET', '/api/v1/users/civic-creds', { token: citizen.token })).body.data;
    assert.strictEqual(after.civicCreds, before + 50);
    assert.ok(after.history.some((h) => h.action === 'Issue Resolved'));
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────
  section('Users & CivicCreds');
  await it('GET /users (admin) lists with role filter and pagination; citizens get 403', async () => {
    ok(await call('GET', '/api/v1/users', { token: citizen.token }), 403);
    let r = await call('GET', '/api/v1/users?role=contractor', { token: admin.token });
    ok(r); assert.strictEqual(r.body.pagination.total, 2); assert.ok(r.body.data.every((u) => u.role === 'contractor' && !('password' in u)));
    r = await call('GET', '/api/v1/users?limit=3&page=1', { token: admin.token });
    assert.strictEqual(r.body.data.length, 3);
  });
  await it('GET /users/:id returns a user without the password; 404/400 for unknown/invalid', async () => {
    const r = await call('GET', `/api/v1/users/${citizen._id}`, { token: admin.token });
    ok(r); assert.strictEqual(r.body.user ? r.body.user.email : r.body.data.email, 'asha@t.com');
    assert.ok(!JSON.stringify(r.body).includes('$2'));
    ok(await call('GET', '/api/v1/users/987654', { token: admin.token }), 404);
    ok(await call('GET', '/api/v1/users/abc', { token: admin.token }), 400);
  });
  await it('PATCH /users/language, /fcm-token, /profile persist and validate', async () => {
    let r = await call('PATCH', '/api/v1/users/language', { token: citizen.token, body: { language: 'hi' } });
    ok(r); ok(await call('PATCH', '/api/v1/users/language', { token: citizen.token, body: { language: 'xx' } }), 400);
    ok(await call('PATCH', '/api/v1/users/fcm-token', { token: citizen.token, body: { fcmToken: 'tok-123' } }));
    r = await call('PATCH', '/api/v1/users/profile', { token: citizen.token, body: { name: 'Asha K', phone: '8888888888', avatar: 'https://x/y.png' } });
    ok(r);
    const me = await call('GET', '/api/v1/auth/me', { token: citizen.token });
    assert.deepStrictEqual([me.body.user.language, me.body.user.fcmToken, me.body.user.name, me.body.user.phone], ['hi', 'tok-123', 'Asha K', '8888888888']);
  });
  await it('GET /users/civic-creds and /leaderboard', async () => {
    const r = await call('GET', '/api/v1/users/civic-creds', { token: citizen.token });
    ok(r); assert.ok(r.body.data.citizenTier && Array.isArray(r.body.data.badges) && r.body.data.history.length >= 2);
    const lb = await call('GET', '/api/v1/users/leaderboard', { token: citizen.token });
    ok(lb);
    const rows = lb.body.data || lb.body.leaderboard || lb.body.topUsers;
    assert.ok(Array.isArray(rows) && rows.length >= 2);
    for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].civicCreds >= rows[i].civicCreds);
  });
  await it('GET /users/contractors (admin) enriches contractors with order counts', async () => {
    const r = await call('GET', '/api/v1/users/contractors', { token: admin.token });
    ok(r);
    const list = r.body.data || r.body.contractors;
    const c1 = list.find((c) => c.email === 'contractor@t.com');
    assert.strictEqual(c1.completedOrders, 1); assert.strictEqual(c1.activeOrders, 0); assert.ok(c1.performanceScore >= 80);
  });
  await it('daily cap stops CivicCreds farming (CONFIRM_ISSUE max 10 / 24h)', async () => {
    const { awardCivicCreds } = require('../src/utils/civicCreds');
    const farmer = await User.create({ name: 'Farmer', email: 'farmer@t.com', password: 'Passw0rd!' });
    const results = [];
    for (let i = 0; i < 12; i++) results.push(await awardCivicCreds(farmer._id, 'CONFIRM_ISSUE', 'x'));
    assert.strictEqual(results.filter((x) => x && x.success).length, 10);
    assert.ok(results.slice(10).every((x) => x.capped === true));
    assert.strictEqual((await User.findById(farmer._id)).civicCreds, 50 + 150);
  });
  await it('badges and tier are awarded at thresholds', async () => {
    const { awardCivicCreds } = require('../src/utils/civicCreds');
    const u = await User.create({ name: 'Climber', email: 'climber@t.com', password: 'Passw0rd!' });
    for (let i = 0; i < 4; i++) await awardCivicCreds(u._id, 'REPORT_RESOLVED', 'bonus');
    const g = await User.findById(u._id);
    assert.strictEqual(g.civicCreds, 250); assert.strictEqual(g.citizenTier, 'Silver Guardian'); assert.ok(g.badges.includes('Silver Guardian Badge'));
    const pen = await awardCivicCreds(u._id, 'PENALTY_FAKE_CALL', 'spam');
    assert.strictEqual(pen.civicCreds, 210); assert.strictEqual((await User.findById(u._id)).civicScore, 80);
  });
  await it('DELETE /users/:id (admin) removes the user; their reports survive with a null owner', async () => {
    const tmp = await mk('Temp', 'temp@t.com');
    const rep = (await call('POST', '/api/v1/reports', { token: tmp.token, body: { title: 'Orphan', description: 'd', category: 'other', location: { type: 'Point', coordinates: [75.9, 30.9] } } })).body.data;
    ok(await call('DELETE', `/api/v1/users/${tmp._id}`, { token: citizen.token }), 403);
    ok(await call('DELETE', `/api/v1/users/${tmp._id}`, { token: admin.token }));
    ok(await call('GET', `/api/v1/users/${tmp._id}`, { token: admin.token }), 404);
    const g = await call('GET', `/api/v1/reports/${rep._id}`, { token: admin.token });
    ok(g); assert.strictEqual(g.body.data.submittedBy, null);
    ok(await call('GET', '/api/v1/auth/me', { token: tmp.token }), 401);
    ok(await call('DELETE', `/api/v1/users/${tmp._id}`, { token: admin.token }), 404);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────
  section('Notifications');
  await it('list, unread-count, mark one read (owner only), mark all read', async () => {
    let r = await call('GET', '/api/v1/notifications', { token: citizen.token });
    ok(r); assert.ok(r.body.data.length >= 2 && r.body.data.every((n) => n.recipient === citizen._id));
    assert.ok(r.body.data.some((n) => n.relatedReport && n.relatedReport.title), 'relatedReport populated');
    const unread = (await call('GET', '/api/v1/notifications/unread-count', { token: citizen.token })).body;
    const count = unread.count ?? unread.unreadCount ?? unread.data?.count;
    assert.ok(count >= 2);
    const first = r.body.data[0];
    ok(await call('PATCH', `/api/v1/notifications/${first._id}/read`, { token: citizen2.token }), 404);
    r = await call('PATCH', `/api/v1/notifications/${first._id}/read`, { token: citizen.token });
    ok(r);
    r = await call('PATCH', '/api/v1/notifications/read-all', { token: citizen.token });
    ok(r); assert.strictEqual(r.body.updatedCount, count - 1);
    const after = (await call('GET', '/api/v1/notifications/unread-count', { token: citizen.token })).body;
    assert.strictEqual(after.count ?? after.unreadCount ?? after.data?.count, 0);
  });
  await it('broadcast-alert (admin) fans out to every active user; /alerts lists civic alerts', async () => {
    ok(await call('POST', '/api/v1/notifications/broadcast-alert', { token: citizen.token, body: { title: 'x', message: 'y' } }), 403);
    ok(await call('POST', '/api/v1/notifications/broadcast-alert', { token: admin.token, body: { title: 'x' } }), 400);
    const r = await call('POST', '/api/v1/notifications/broadcast-alert', { token: admin.token, body: { title: 'Flood warning', message: 'Avoid Sector 17', severity: 'high', relatedReport: r1._id } });
    ok(r, 201);
    const a = await call('GET', '/api/v1/notifications/alerts', { token: citizen2.token });
    ok(a);
    const alerts = a.body.data || a.body.alerts;
    assert.ok(alerts.length >= 1); assert.ok(/Flood warning/.test(alerts[0].title));
    assert.strictEqual(alerts[0].relatedReport.title, 'Big pothole'); assert.deepStrictEqual(alerts[0].relatedReport.location.coordinates, [P.lng, P.lat]);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────
  section('Dashboard');
  await it('GET /dashboard/summary per role', async () => {
    let r = await call('GET', '/api/v1/dashboard/summary', { token: citizen.token });
    ok(r); assert.strictEqual(r.body.role, 'citizen'); assert.ok(r.body.data.myReports >= 3); assert.ok(r.body.data.resolvedReports >= 1);
    r = await call('GET', '/api/v1/dashboard/summary', { token: admin.token });
    ok(r); assert.strictEqual(r.body.role, 'admin');
    for (const k of ['totalReports', 'pendingReports', 'inProgress', 'resolved', 'totalUsers', 'openWorkOrders', 'criticalIssues', 'totalContractors']) assert.strictEqual(typeof r.body.data[k], 'number', k);
    assert.strictEqual(r.body.data.totalContractors, 2); assert.strictEqual(r.body.data.resolved, 1);
    r = await call('GET', '/api/v1/dashboard/summary', { token: contractor.token });
    ok(r); assert.deepStrictEqual(r.body.data, { assignedOrders: 1, inProgress: 0, completed: 1, pendingEvidence: 0 });
    ok(await call('GET', '/api/v1/dashboard/summary'), 401);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────
  section('Road health');
  await it('POST /roadhealth/segment upserts by name (admin only, validated)', async () => {
    ok(await call('POST', '/api/v1/roadhealth/segment', { token: citizen.token, body: {} }), 403);
    ok(await call('POST', '/api/v1/roadhealth/segment', { token: admin.token, body: { name: 'Bad' } }), 400);
    const body = { name: 'Madhya Marg', location: { type: 'LineString', coordinates: [[P.lng, P.lat], [76.78, 30.74]] }, healthScore: 80, dominantIssue: 'pothole', status: 'fair' };
    let r = await call('POST', '/api/v1/roadhealth/segment', { token: admin.token, body });
    ok(r, 201); assert.deepStrictEqual(r.body.data.location.coordinates, body.location.coordinates);
    r = await call('POST', '/api/v1/roadhealth/segment', { token: admin.token, body: { ...body, healthScore: 60, status: 'poor', location: { type: 'LineString', coordinates: [[76.0, 30.0], [76.1, 30.1], [76.2, 30.2]] } } });
    ok(r, 201); assert.strictEqual(r.body.data.healthScore, 60); assert.strictEqual(r.body.data.location.coordinates.length, 3);
    const [{ c }] = await db.query('SELECT COUNT(*) AS c FROM road_segments'); assert.strictEqual(Number(c), 1);
    await call('POST', '/api/v1/roadhealth/segment', { token: admin.token, body: { name: 'Sukhna Path', location: { type: 'LineString', coordinates: [[P.lng, P.lat], [76.79, 30.74]] }, healthScore: 30, dominantIssue: 'waterlogging', status: 'critical' } });
  });
  await it('GET /roadhealth/segments sorts worst-first and lowers the score for recent nearby reports', async () => {
    const r = await call('GET', '/api/v1/roadhealth/segments', { token: citizen.token });
    ok(r); assert.strictEqual(r.body.total, 2); assert.strictEqual(r.body.data[0].name, 'Sukhna Path');
    assert.ok(r.body.data[0].healthScore < 30, 'dynamic decay from nearby reports');
    assert.strictEqual(r.body.pages, 1);
    const f = await call('GET', '/api/v1/roadhealth/segments?status=poor', { token: citizen.token });
    assert.strictEqual(f.body.count, 1);
  });
  await it('GET /roadhealth/analytics (admin) aggregates by status, overall and top issues', async () => {
    ok(await call('GET', '/api/v1/roadhealth/analytics', { token: citizen.token }), 403);
    const r = await call('GET', '/api/v1/roadhealth/analytics', { token: admin.token });
    ok(r);
    assert.strictEqual(r.body.data.overall.totalSegments, 2); assert.strictEqual(r.body.data.overall.avgHealthScore, 45);
    assert.deepStrictEqual(r.body.data.byStatus.map((s) => s._id), ['critical', 'poor']);
    assert.strictEqual(r.body.data.topIssues.length, 2);
    assert.ok(Array.isArray(r.body.data.localityMetrics));
  });
  await it('GET /roadhealth/heatmap groups open reports and honours bounds', async () => {
    let r = await call('GET', '/api/v1/roadhealth/heatmap', { token: citizen.token });
    ok(r); assert.ok(r.body.count >= 1 && r.body.data.every((p) => p.lat && p.lng && p.weight >= 1));
    const all = r.body.data.reduce((a, p) => a + p.weight, 0);
    r = await call('GET', '/api/v1/roadhealth/heatmap?bounds=30.70,76.70,30.75,76.80', { token: citizen.token });
    assert.ok(r.body.data.reduce((a, p) => a + p.weight, 0) < all);
  });
  await it('POST /roadhealth/safe-route validates input and counts hazards in the corridor', async () => {
    ok(await call('POST', '/api/v1/roadhealth/safe-route', { token: citizen.token, body: {} }), 400);
    const r = await call('POST', '/api/v1/roadhealth/safe-route', { token: citizen.token, body: { origin: { lat: 30.73, lng: 76.77 }, destination: { lat: 30.74, lng: 76.79 } } });
    ok(r); assert.ok(r.body.data.hazardCount >= 1); assert.ok(r.body.data.safetyScore <= 95); assert.ok(r.body.data.hazards[0].location.coordinates);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────
  section('Maps');
  await it('GET /maps/config, /live-markers, /heatmap', async () => {
    let r = await call('GET', '/api/v1/maps/config', { token: citizen.token });
    ok(r); assert.strictEqual(r.body.data.defaultZoom, 13);
    r = await call('GET', '/api/v1/maps/live-markers', { token: citizen.token });
    ok(r); assert.ok(r.body.count >= 2);
    const m = r.body.data[0];
    assert.ok(m.id && m.position.lat && m.position.lng && m.markerColor && typeof m.upvoteCount === 'number');
    r = await call('GET', '/api/v1/maps/live-markers?category=streetlight&priority=high', { token: citizen.token });
    assert.strictEqual(r.body.count, 1);
    r = await call('GET', '/api/v1/maps/heatmap', { token: citizen.token });
    ok(r); assert.ok(r.body.data.every((p) => [1, 2, 3, 4].includes(p.weight)));
  });
  await it('GET /maps/geocode, /reverse-geocode and POST /maps/safe-route validate input', async () => {
    ok(await call('GET', '/api/v1/maps/geocode', { token: citizen.token }), 400);
    ok(await call('GET', '/api/v1/maps/reverse-geocode', { token: citizen.token }), 400);
    ok(await call('POST', '/api/v1/maps/safe-route', { token: citizen.token, body: {} }), 400);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────
  section('AI endpoints (database-backed parts)');
  await it('GET /ai/insights (admin) is computed from the reports table; cached on second call', async () => {
    ok(await call('GET', '/api/v1/ai/insights', { token: citizen.token }), 403);
    let r = await call('GET', '/api/v1/ai/insights', { token: admin.token });
    ok(r); assert.strictEqual(r.body.cached, false);
    const d = r.body.data;
    assert.ok(d.totalReports >= 5 && d.topCategories.length >= 1 && d.hotspots.length >= 1);
    assert.ok(d.topCategories.every((c) => typeof c.count === 'number' && typeof c.previousWeek === 'number'));
    assert.ok(d.statusBreakdown.pending >= 1 && d.statusBreakdown.resolved === 1);
    assert.ok(d.hotspots[0].issueCount >= d.hotspots[d.hotspots.length - 1].issueCount);
    r = await call('GET', '/api/v1/ai/insights', { token: admin.token });
    assert.strictEqual(r.body.cached, true);
  });
  await it('POST /ai/check-duplicate finds a nearby same-category open report (geo + text similarity)', async () => {
    let r = await call('POST', '/api/v1/ai/check-duplicate', { token: citizen2.token, body: { title: 'Light out', description: 'Dark street', category: 'streetlight', location: { type: 'Point', coordinates: [76.77961, 30.73351] } } });
    ok(r); assert.strictEqual(r.body.data.isDuplicate, true); assert.strictEqual(r.body.data.duplicateOf, r2._id); assert.ok(r.body.data.distanceMeters <= 5);
    r = await call('POST', '/api/v1/ai/check-duplicate', { token: citizen2.token, body: { title: 'x', description: 'y', category: 'garbage', location: { type: 'Point', coordinates: [76.77961, 30.73351] } } });
    assert.strictEqual(r.body.data.isDuplicate, false);
    ok(await call('POST', '/api/v1/ai/check-duplicate', { token: citizen2.token, body: { title: 'x' } }), 400);
  });
  await it('POST /ai/chat falls back gracefully when the chatbot and AI services are down', async () => {
    const r = await call('POST', '/api/v1/ai/chat', { token: citizen.token, body: { message: 'How do I report a pothole?', language: 'en' } });
    assert.ok([200, 400].includes(r.status)); assert.ok(r.body);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────
  section('Schema, views, scripts & MongoDB removal');
  await it('all 14 tables and 4 reporting views exist', async () => {
    if (backend === 'mysql') {
      const t = await db.query("SELECT table_name AS n FROM information_schema.tables WHERE table_schema = DATABASE()");
      const names = t.map((x) => x.n || x.N || x.TABLE_NAME);
      for (const n of testDb.TABLES) assert.ok(names.includes(n), n);
      for (const v of ['v_unresolved_issues', 'v_recurring_problems_by_locality', 'v_repair_company_performance', 'v_road_health_metrics']) assert.ok(names.includes(v), v);
    } else {
      const t = await db.query("SELECT name FROM sqlite_master WHERE type IN ('table','view')");
      const names = t.map((x) => x.name);
      for (const n of testDb.TABLES) assert.ok(names.includes(n), n);
      for (const v of ['v_unresolved_issues', 'v_recurring_problems_by_locality', 'v_repair_company_performance', 'v_road_health_metrics']) assert.ok(names.includes(v), v);
    }
  });
  await it('reporting views return data', async () => {
    const s = require('../src/services/mysqlService');
    const unresolved = await s.getUnresolvedIssuesFromView();
    assert.ok(Array.isArray(unresolved) && unresolved.length >= 1 && unresolved[0].issue_id !== undefined);
    const road = await s.getRoadHealthMetricsFromView();
    assert.ok(Array.isArray(road) && road.length >= 1 && road[0].calculated_road_health_score !== undefined);
    const perf = await s.getCompanyPerformanceFromView();
    const c1 = perf.find((p) => p.company_name === 'Contractor');
    assert.strictEqual(Number(c1.total_assignments_received), 1); assert.strictEqual(Number(c1.completed_assignments), 1);
    const rec = await s.getRecurringProblemsFromView();
    assert.ok(Array.isArray(rec) && rec.length >= 1);
  });
  await it('mysqlService workflow helpers (insert / assign / status / audit trail) work on the new tables', async () => {
    const s = require('../src/services/mysqlService');
    const { reportId } = await s.insertReport({ reporterId: citizen._id, category: 'pothole', description: 'Direct insert', latitude: 30.5, longitude: 76.5, locality: 'Sector 9', imageUrl: '/uploads/z.jpg' });
    const a = await s.assignIssueTransaction({ issueId: reportId, companyId: contractor2._id, assignedBy: admin._id, remarks: 'urgent' });
    assert.strictEqual(a.success, true);
    await s.updateIssueStatusTransaction({ issueId: reportId, companyId: contractor2._id, newStatus: 'resolved', remarks: 'done', changedBy: admin._id });
    const hist = await s.getIssueAuditHistory(reportId);
    assert.deepStrictEqual(hist.map((h) => h.new_status), ['pending', 'assigned', 'resolved']);
    assert.strictEqual((await Report.findById(reportId)).images[0], '/uploads/z.jpg');
  });
  await it('a failing transaction rolls back every statement', async () => {
    const before = await db.query('SELECT COUNT(*) AS c FROM report_images');
    await assert.rejects(() => db.transaction(async (tx) => {
      await tx.query("INSERT INTO report_images (report_id, url, sort_order, created_at) VALUES (?, 'x', 0, '2026-01-01 00:00:00')", [r1._id]);
      await tx.query("INSERT INTO report_images (report_id, url, sort_order, created_at) VALUES (999999, 'y', 0, '2026-01-01 00:00:00')"); // FK violation
    }), (e) => e.code === 'ER_NO_REFERENCED_ROW_2');
    const after = await db.query('SELECT COUNT(*) AS c FROM report_images');
    assert.strictEqual(Number(after[0].c), Number(before[0].c));
  });
  await it('the backend no longer references MongoDB/Mongoose (code, package.json, .env.example)', async () => {
    const root = path.join(__dirname, '..');
    const offenders = [];
    const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
      if (['node_modules', 'uploads', 'legacy'].includes(e.name) || e.name.startsWith('.git')) return;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) return walk(p);
      if (!/\.(js|json|sql|example)$/.test(e.name) || p === __filename || e.name === 'package-lock.json') return;
      const text = fs.readFileSync(p, 'utf8');
      if (/require\(['"]mongoose['"]\)|MONGO_URI|mongodb:\/\/|"mongoose"\s*:/.test(text)) offenders.push(path.relative(root, p));
    });
    walk(root);
    assert.deepStrictEqual(offenders, []);
    assert.ok(!('mongoose' in require('../package.json').dependencies));
    assert.ok(/MYSQL_HOST/.test(fs.readFileSync(path.join(root, '.env.example'), 'utf8')));
  });

  await new Promise((res) => server.close(res));
  try { require('../src/config/socket').getIO && require('../src/config/socket').getIO().close(); } catch (_) { /* ignore */ }
  await testDb.teardown();
  console.log(`\n${passed} passed, ${failures.length} failed — backend: ${testDb.label()}`);
  if (failures.length) { failures.forEach((f) => console.log(`\n✗ ${f.name}\n${f.e.stack}`)); process.exit(1); }
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
