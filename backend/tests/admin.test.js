/**
 * Admin portal flows on real models + real SQL (in-memory SQLite adapter, or real MySQL with TEST_DB=mysql).
 * Covers: assign -> contractor works -> evidence -> admin verifies -> points paid ONCE; fake rejection penalty;
 * role limits; manual points; suspension; analytics; audit log.
 */
const assert = require('assert');
const path = require('path');
const stub = (rel, exports) => { const id = require.resolve(path.join(__dirname, '..', rel)); require.cache[id] = { id, filename: id, loaded: true, exports }; };
stub('src/config/socket.js', { emitToUser: () => {} });
stub('src/utils/fcm.js', { sendPushNotification: async () => {} });
const testDb = require('./helpers/testDb');
const mockRes = () => { const r = { code: 200, body: null }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; r.setHeader = () => {}; r.send = (b) => { r.body = b; return r; }; return r; };

(async () => {
  console.log(`Backend under test: ${testDb.label()}`);
  await testDb.setup();
  const User = require('../src/models/User');
  const Report = require('../src/models/Report');
  const WorkOrder = require('../src/models/WorkOrder');
  const admin = require('../src/controllers/admin.controller');
  const wo = require('../src/controllers/workorder.controller');
  const { updateReportStatus } = require('../src/controllers/report.controller');
  const mk = (name, role = 'citizen') => User.create({ name, email: `${name}@t.io`, password: 'Passw0rd!', role });
  const adminU = await mk('boss', 'admin');
  const alice = await mk('alice'); const bob = await mk('bob');
  const crew = await mk('crew', 'contractor');
  const creds = async (u) => (await User.findById(u._id)).civicCreds;
  const START = 50;
  const newReport = async (who, title = 'Pothole on Mall Road') => Report.create({ title, description: 'deep', category: 'pothole', location: { type: 'Point', coordinates: [76.36, 30.35] }, submittedBy: who._id, rewardPending: true, priority: 'high' });
  const call = async (fn, req) => { const res = mockRes(); await fn({ user: { _id: adminU._id, role: 'admin' }, query: {}, body: {}, params: {}, ...req }, res, (e) => { throw e; }); return res; };
  let passed = 0;
  const t = async (name, fn) => { try { await fn(); console.log(`  ✅ ${name}`); passed++; } catch (e) { console.error(`  ❌ ${name}: ${e.stack}`); process.exitCode = 1; } };

  let r1, order;
  await t('assign creates a work order, moves report to assigned, releases pending +25 once', async () => {
    r1 = await newReport(alice);
    const res = await call(admin.assign, { params: { id: r1._id }, body: { contractorId: crew._id, dueDate: new Date(Date.now() + 864e5).toISOString(), notes: 'bring cold mix' } });
    assert.strictEqual(res.body.success, true, JSON.stringify(res.body));
    order = await WorkOrder.findById(res.body.data.workOrderId);
    assert.strictEqual(order.assignedContractor, crew._id);
    assert.strictEqual((await Report.findById(r1._id)).status, 'assigned');
    assert.strictEqual(await creds(alice), START + 25);
    const again = await call(admin.assign, { params: { id: r1._id }, body: { contractorId: crew._id } });
    assert.strictEqual(again.body.data.reassigned, true);
    assert.strictEqual(await creds(alice), START + 25, 'reassigning must not pay again');
  });

  await t('assign rejects non-contractors and unknown reports', async () => {
    assert.strictEqual((await call(admin.assign, { params: { id: r1._id }, body: { contractorId: bob._id } })).code, 400);
    assert.strictEqual((await call(admin.assign, { params: { id: 99999 }, body: { contractorId: crew._id } })).code, 404);
  });

  const asCrew = (id, body) => ({ params: { id }, body, user: { _id: crew._id, role: 'contractor' } });
  await t('contractor cannot finish without an "after" photo, can start the job', async () => {
    assert.strictEqual((await call(wo.updateWorkOrderStatus, asCrew(order._id, { status: 'in_progress' }))).code, 200);
    assert.strictEqual((await Report.findById(r1._id)).status, 'in_progress');
    const res = await call(wo.updateWorkOrderStatus, asCrew(order._id, { status: 'completed' }));
    assert.strictEqual(res.code, 400); assert.ok(/photo/i.test(res.body.message));
  });

  await t('contractor cannot verify their own work (so cannot pay out rewards)', async () => {
    await WorkOrder.addEvidence(order._id, ['/uploads/after.jpg']);
    assert.strictEqual((await call(wo.updateWorkOrderStatus, asCrew(order._id, { status: 'completed' }))).code, 200);
    const res = await call(wo.updateWorkOrderStatus, asCrew(order._id, { status: 'verified' }));
    assert.strictEqual(res.code, 403);
    assert.strictEqual((await Report.findById(r1._id)).status, 'in_progress', 'report not resolved by a contractor');
    assert.strictEqual(await creds(alice), START + 25);
  });

  await t('another contractor cannot touch the job', async () => {
    const other = await mk('other', 'contractor');
    const res = await call(wo.updateWorkOrderStatus, { params: { id: order._id }, body: { status: 'in_progress' }, user: { _id: other._id, role: 'contractor' } });
    assert.strictEqual(res.code, 403);
  });

  await t('admin verifies -> report resolved, reporter +50 exactly once, repeats are refused', async () => {
    const res = await call(wo.updateWorkOrderStatus, { params: { id: order._id }, body: { status: 'verified', note: 'checked on site' } });
    assert.strictEqual(res.body.pointsAwarded, 50, JSON.stringify(res.body));
    assert.strictEqual((await Report.findById(r1._id)).status, 'resolved');
    assert.strictEqual(await creds(alice), START + 25 + 50);
    const dup = await call(wo.updateWorkOrderStatus, { params: { id: order._id }, body: { status: 'verified' } });
    assert.strictEqual(dup.code, 409);
    assert.strictEqual(await creds(alice), START + 25 + 50, 'no double payout');
    assert.ok((await WorkOrder.findById(order._id)).notes.includes('checked on site'));
  });

  await t('admin can send a finished job back for rework', async () => {
    const r = await newReport(bob, 'Garbage heap'); const a = await call(admin.assign, { params: { id: r._id }, body: { contractorId: crew._id } });
    const id = a.body.data.workOrderId; await WorkOrder.addEvidence(id, ['/uploads/x.jpg']);
    await call(wo.updateWorkOrderStatus, asCrew(id, { status: 'completed' }));
    const back = await call(wo.updateWorkOrderStatus, { params: { id }, body: { status: 'in_progress', note: 'still messy' } });
    assert.strictEqual(back.code, 200); assert.strictEqual((await WorkOrder.findById(id)).status, 'in_progress');
  });

  await t('resolving directly (status = resolved) pays the same +50 once', async () => {
    const r = await newReport(bob, 'Quick fix'); const before = await creds(bob);
    const res = await call(updateReportStatus, { params: { id: r._id }, body: { status: 'resolved' } });
    assert.strictEqual(res.body.pointsAwarded, 50);
    assert.strictEqual(await creds(bob), before + 25 + 50);
    const res2 = await call(updateReportStatus, { params: { id: r._id }, body: { status: 'resolved' } });
    assert.strictEqual(res2.body.pointsAwarded, 0);
    assert.strictEqual(await creds(bob), before + 25 + 50, 'second resolve pays nothing');
  });

  await t('reject as fake: -40, report closed, pending reward cancelled, one decision only', async () => {
    const r = await newReport(bob, 'Not a pothole'); const before = await creds(bob);
    assert.strictEqual((await call(admin.reject, { params: { id: r._id }, body: { reason: '' } })).code, 400);
    const res = await call(admin.reject, { params: { id: r._id }, body: { reason: 'photo is of a driveway' } });
    assert.strictEqual(res.body.success, true, JSON.stringify(res.body));
    assert.strictEqual(await creds(bob), before - 40);
    const rep = await Report.findById(r._id);
    assert.strictEqual(rep.status, 'closed'); assert.strictEqual(rep.rewardPending, false);
    assert.strictEqual((await call(admin.reject, { params: { id: r._id }, body: { reason: 'again' } })).code, 409);
    assert.strictEqual(await creds(bob), before - 40, 'penalty only once');
    assert.strictEqual((await call(admin.assign, { params: { id: r._id }, body: { contractorId: crew._id } })).code, 409, 'closed reports cannot be assigned');
    assert.strictEqual((await call(admin.resolveDirect, { params: { id: r._id } })).code, 409, 'a fake report cannot be resolved for rewards');
    assert.strictEqual((await call(admin.verify, { params: { id: r._id } })).code, 409, 'a rejected report cannot be verified');
  });

  await t('verify releases the reporter reward once', async () => {
    const r = await newReport(alice, 'Streetlight out'); const before = await creds(alice);
    const v = await call(admin.verify, { params: { id: r._id } });
    assert.strictEqual(v.body.data.rewardReleased, true); assert.strictEqual(await creds(alice), before + 25);
    assert.strictEqual((await call(admin.verify, { params: { id: r._id } })).body.data.rewardReleased, false);
    assert.strictEqual(await creds(alice), before + 25);
  });

  await t('manual points: validated, applied, floored at 0, logged', async () => {
    assert.strictEqual((await call(admin.adjustCreds, { params: { id: alice._id }, body: { amount: 9999, reason: 'x yz' } })).code, 400);
    assert.strictEqual((await call(admin.adjustCreds, { params: { id: alice._id }, body: { amount: 10 } })).code, 400);
    const before = await creds(alice);
    assert.strictEqual((await call(admin.adjustCreds, { params: { id: alice._id }, body: { amount: 30, reason: 'cleanup drive volunteer' } })).code, 200);
    assert.strictEqual(await creds(alice), before + 30);
    await call(admin.adjustCreds, { params: { id: alice._id }, body: { amount: -500, reason: 'reset after abuse' } });
    assert.strictEqual(await creds(alice), 0, 'balance never negative');
    assert.strictEqual((await call(admin.adjustCreds, { params: { id: crew._id }, body: { amount: 5, reason: 'nope' } })).code, 404, 'contractors have no CivicCreds');
    const hist = (await call(admin.userCreds, { params: { id: alice._id } })).body.data;
    assert.ok(hist.some((h) => h.action === 'Admin Adjustment' && h.details === 'cleanup drive volunteer'));
  });

  await t('suspend a citizen (not yourself, not an admin); suspended users cannot authenticate', async () => {
    assert.strictEqual((await call(admin.setActive, { params: { id: adminU._id }, body: { isActive: false } })).code, 409);
    assert.strictEqual((await call(admin.setActive, { params: { id: bob._id }, body: { isActive: false } })).code, 200);
    assert.strictEqual((await User.findAuthById(bob._id)).isActive, false);
    await call(admin.setActive, { params: { id: bob._id }, body: { isActive: true } });
  });

  await t('create contractor: validation, duplicate email, role is contractor', async () => {
    assert.strictEqual((await call(admin.createContractor, { body: { name: 'N', email: 'n@t.io', password: 'short' } })).code, 400);
    const ok = await call(admin.createContractor, { body: { name: 'New Crew', email: 'newcrew@t.io', password: 'Passw0rd!' } });
    assert.strictEqual(ok.code, 201); assert.strictEqual((await User.findById(ok.body.data._id)).role, 'contractor');
    assert.strictEqual((await call(admin.createContractor, { body: { name: 'N', email: 'newcrew@t.io', password: 'Passw0rd!' } })).code, 409);
  });

  await t('admin report list: search, status filter, needs-review, joined work order + moderation', async () => {
    const all = await call(admin.listReports, { query: {} });
    assert.ok(all.body.data.length >= 5);
    const q = await call(admin.listReports, { query: { q: 'Mall Road' } });
    assert.strictEqual(q.body.data.length, 1); assert.strictEqual(q.body.data[0].submittedBy.name, 'alice'); assert.strictEqual(q.body.data[0].workOrder.status, 'verified');
    const closed = await call(admin.listReports, { query: { status: 'closed' } });
    assert.strictEqual(closed.body.data[0].moderation.verdict, 'fake');
    const detail = await call(admin.getReportDetail, { params: { id: r1._id } });
    assert.ok(detail.body.data.statusHistory.length >= 3 && detail.body.data.workOrder);
  });

  await t('analytics + contractor stats + audit log + CSV export', async () => {
    const a = (await call(admin.getAnalytics, {})).body.data;
    assert.ok(a.totals.reports >= 5 && a.totals.resolved >= 2 && a.totals.fake === 1);
    assert.strictEqual(a.trend.length, 14); assert.ok(a.contractors.find((c) => c.name === 'crew').verifiedOrders >= 1);
    assert.ok(a.totals.avgResolutionHours !== null && a.byCategory[0].category === 'pothole');
    const log = (await call(admin.activity, {})).body.data;
    for (const act of ['assign_job', 'workorder_verified', 'reject_fake', 'adjust_creds', 'suspend_user', 'create_contractor']) assert.ok(log.some((l) => l.action === act), `audit has ${act}`);
    const csv = await call(admin.exportReports, {});
    assert.ok(String(csv.body).split('\n')[0].startsWith('id,title') && String(csv.body).includes('Pothole on Mall Road'));
  });

  console.log(`\n${passed} checks passed — backend: ${testDb.label()}`);
  await testDb.teardown();
})().catch((e) => { console.error(e); process.exit(1); });
