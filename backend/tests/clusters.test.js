/**
 * Same-problem clusters and the school/hospital priority flag, on real models + real SQL.
 */
const assert = require('assert');
const path = require('path');
const stub = (rel, exports) => { const id = require.resolve(path.join(__dirname, '..', rel)); require.cache[id] = { id, filename: id, loaded: true, exports }; };
stub('src/config/socket.js', { emitToUser: () => {} });
stub('src/utils/fcm.js', { sendPushNotification: async () => {} });
const testDb = require('./helpers/testDb');
const mockRes = () => { const r = { code: 200, body: null }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };

(async () => {
  console.log(`Backend under test: ${testDb.label()}`);
  await testDb.setup();
  const User = require('../src/models/User');
  const Report = require('../src/models/Report');
  const Notification = require('../src/models/Notification');
  const admin = require('../src/controllers/admin.controller');
  const wo = require('../src/controllers/workorder.controller');
  const { createReport } = require('../src/controllers/report.controller');
  const { groupReports } = require('../src/services/clusters');
  const mk = (name, role = 'citizen') => User.create({ name, email: `${name}@t.io`, password: 'Passw0rd!', role });
  const boss = await mk('boss', 'admin'); const crew = await mk('crew', 'contractor');
  const a = await mk('anita'); const b = await mk('bhavna'); const c = await mk('chirag'); const d = await mk('dev'); const e = await mk('esha');
  const creds = async (u) => (await User.findById(u._id)).civicCreds;
  const LAT = 30.3560, LNG = 76.3600;
  const at = (dMeters, bearing = 'n') => (bearing === 'n' ? [LNG, LAT + dMeters / 111320] : [LNG + dMeters / (111320 * Math.cos(LAT * Math.PI / 180)), LAT]);
  const mkReport = (who, title, coordinates, extra = {}) => Report.create({ title, description: 'x', category: 'pothole', location: { type: 'Point', coordinates }, submittedBy: who._id, rewardPending: true, ...extra });
  const call = async (fn, req) => { const res = mockRes(); await fn({ user: { _id: boss._id, role: 'admin' }, query: {}, body: {}, params: {}, ...req }, res, (err) => { throw err; }); return JSON.parse(JSON.stringify(res.body)); };
  const notes = async (u) => (await Notification.list({ recipient: u._id, skip: 0, limit: 50 }));
  let passed = 0;
  const t = async (name, fn) => { try { await fn(); console.log(`  ✅ ${name}`); passed++; } catch (err) { console.error(`  ❌ ${name}: ${err.stack}`); process.exitCode = 1; } };

  // three people report the same pothole (oldest first), one more is 600 m away, one garbage report sits 5 m from the pothole
  const r1 = await mkReport(a, 'Pothole near gate', at(0));
  const r2 = await mkReport(b, 'Big hole near gate', at(18, 'e'));
  const r3 = await mkReport(c, 'Road hole at gate', at(25));
  const far = await mkReport(d, 'Pothole far away', at(600));
  const garbage = await mkReport(e, 'Garbage at gate', at(5, 'e'), { category: 'garbage' });

  await t('groupReports links reports transitively, same category only', async () => {
    const groups = groupReports(await Report.list({ filter: {}, skip: 0, limit: 50 }));
    const sizes = groups.map((g) => g.length).sort((x, y) => y - x);
    assert.deepStrictEqual(sizes, [3, 1, 1]);
  });

  await t('clusters: 100 m default radius, pothole + road damage count as one problem, long roads do not chain', async () => {
    const mkAt = (m, category = 'pothole', createdAt) => ({ _id: `x${m}${category}`, category, createdAt: createdAt || new Date(2026, 0, 1, 0, m), location: { coordinates: at(m) } });
    const g1 = groupReports([mkAt(0), mkAt(80, 'road_damage'), mkAt(150)]);
    assert.deepStrictEqual(g1.map((g) => g.length), [2, 1], '80 m joins the first report, 150 m is too far from it (no chaining)');
    assert.strictEqual(groupReports([mkAt(0, 'garbage'), mkAt(10, 'pothole')]).length, 2, 'different kinds stay apart');
    assert.strictEqual(groupReports([mkAt(0, 'waterlogging'), mkAt(30, 'drainage')]).length, 1, 'waterlogging + drain are one family');
  });

  await t('GET /admin/clusters lists one cluster of 3 with the oldest report as primary', async () => {
    const res = await call(admin.clusters, {});
    assert.strictEqual(res.data.length, 1);
    const cl = res.data[0];
    assert.strictEqual(cl.count, 3); assert.strictEqual(cl.primaryId, r1._id); assert.strictEqual(cl.category, 'pothole');
    assert.deepStrictEqual(cl.reports.map((r) => r.reporter), ['anita', 'bhavna', 'chirag']);
  });

  await t('the admin report list shows how many others reported the same problem, and can sort by severity', async () => {
    const res = await call(admin.listReports, { query: { sort: 'severity' } });
    const by = Object.fromEntries(res.data.map((r) => [r.title, r.sameProblemCount]));
    assert.strictEqual(by['Pothole near gate'], 2); assert.strictEqual(by['Road hole at gate'], 2); assert.strictEqual(by['Pothole far away'], 0); assert.strictEqual(by['Garbage at gate'], 0);
  });

  await t('admin can set the severity of a report (validated, logged)', async () => {
    assert.strictEqual((await call(admin.setSeverity, { params: { id: far._id }, body: { priority: 'urgent' } })).success, false);
    const res = await call(admin.setSeverity, { params: { id: far._id }, body: { priority: 'critical' } });
    assert.strictEqual(res.data.priority, 'critical'); assert.strictEqual((await Report.findById(far._id)).priority, 'critical');
    assert.ok((await call(admin.activity, {})).data.some((l) => l.action === 'set_severity'));
    await call(admin.setSeverity, { params: { id: far._id }, body: { priority: 'medium' } });
  });

  await t('report detail shows the other reports of the same problem', async () => {
    const res = await call(admin.getReportDetail, { params: { id: r2._id } });
    assert.deepStrictEqual(res.data.sameProblem.map((m) => m.title).sort(), ['Pothole near gate', 'Road hole at gate']);
  });

  let orderId;
  await t('assigning one report moves the pending duplicates to assigned and tells their reporters', async () => {
    const res = await call(admin.assign, { params: { id: r1._id }, body: { contractorId: crew._id } });
    assert.strictEqual(res.data.clusterAssigned, 2); orderId = res.data.workOrderId;
    assert.strictEqual((await Report.findById(r2._id)).status, 'assigned');
    assert.strictEqual((await Report.findById(r3._id)).status, 'assigned');
    assert.strictEqual((await Report.findById(far._id)).status, 'pending', 'a different pothole is untouched');
    assert.strictEqual((await Report.findById(garbage._id)).status, 'pending', 'a different category is untouched');
    assert.ok((await notes(b)).some((n) => /repair crew/i.test(n.message)));
  });

  await t('verifying the job resolves the whole cluster, notifies everyone and pays the +50 only once', async () => {
    const WorkOrder = require('../src/models/WorkOrder');
    await WorkOrder.addEvidence(orderId, ['/uploads/after.jpg']);
    const asCrew = { params: { id: orderId }, user: { _id: crew._id, role: 'contractor' } };
    await call(wo.updateWorkOrderStatus, { ...asCrew, body: { status: 'in_progress' } });
    await call(wo.updateWorkOrderStatus, { ...asCrew, body: { status: 'completed' } });
    const before = { a: await creds(a), b: await creds(b), c: await creds(c), d: await creds(d) };
    const res = await call(wo.updateWorkOrderStatus, { params: { id: orderId }, body: { status: 'verified' } });
    assert.strictEqual(res.pointsAwarded, 50);
    for (const r of [r1, r2, r3]) assert.strictEqual((await Report.findById(r._id)).status, 'resolved');
    assert.strictEqual((await Report.findById(far._id)).status, 'pending');
    assert.strictEqual((await Report.findById(garbage._id)).status, 'pending');
    assert.strictEqual(await creds(a), before.a + 50, 'first reporter: fixed bonus (the +25 was released when the job was assigned)');
    assert.strictEqual(await creds(b), before.b + 25, 'duplicate reporters: submit reward released, no extra +50');
    assert.strictEqual(await creds(c), before.c + 25);
    assert.strictEqual(await creds(d), before.d, 'unrelated reporter unchanged');
    for (const u of [b, c]) assert.ok((await notes(u)).some((n) => /fixed/i.test(n.title) && /certificate/i.test(n.message)), `${u.name} was told, with the certificate hint`);
    assert.strictEqual((await call(admin.clusters, {})).data.length, 0, 'the cluster is gone once resolved');
    const dup = await call(wo.updateWorkOrderStatus, { params: { id: orderId }, body: { status: 'verified' } });
    assert.strictEqual(dup.success, false);
    assert.strictEqual(await creds(b), before.b + 25, 'nothing paid twice');
  });

  await t('one person filing duplicates does not farm points; reports rejected as fake stay closed', async () => {
    const p1 = await mkReport(a, 'Hole A', at(2000)); const p2 = await mkReport(a, 'Hole A again', at(2010));
    const p3 = await mkReport(b, 'Fake hole', at(2005));
    await call(admin.reject, { params: { id: p3._id }, body: { reason: 'photo is not a pothole' } });
    const before = await creds(a);
    const res = await call(admin.resolveDirect, { params: { id: p1._id } });
    assert.strictEqual(res.data.clusterResolved, 1);
    assert.strictEqual((await Report.findById(p2._id)).status, 'resolved');
    assert.strictEqual((await Report.findById(p3._id)).status, 'closed', 'a rejected-as-fake report is never resolved');
    assert.strictEqual(await creds(a), before + 25 + 50, 'only one +50 and one +25 for the same person');
  });

  await t('citizen can flag a school/hospital: priority is at least high, saved, admins are told', async () => {
    const before = (await notes(boss)).length;
    const req = (body) => ({ user: { _id: a._id, role: 'citizen' }, body: { title: 'Pothole outside school', description: 'deep', category: 'pothole', location: { type: 'Point', coordinates: [76.5, 30.5] }, ...body } });
    const ok = mockRes(); await createReport(req({ priorityZone: 'school' }), ok, (err) => { throw err; });
    assert.strictEqual(ok.code, 201, JSON.stringify(ok.body));
    assert.strictEqual(ok.body.data.priorityZone, 'school'); assert.strictEqual(ok.body.data.priority, 'high');
    assert.strictEqual((await notes(boss)).length, before + 1);
    const plain = mockRes(); await createReport(req({ title: 'Plain pothole' }), plain, (err) => { throw err; });
    assert.strictEqual(plain.body.data.priorityZone, null); assert.notStrictEqual(plain.body.data.priority, 'high');
    const bad = mockRes(); await createReport(req({ priorityZone: 'mall' }), bad, (err) => { throw err; });
    assert.strictEqual(bad.code, 400);
  });

  await t('admin sees priority problems: filter, dashboard list, and can remove a wrong flag', async () => {
    const list = await call(admin.listReports, { query: { priorityZone: 'true' } });
    assert.strictEqual(list.data.length, 1); assert.strictEqual(list.data[0].priorityZone, 'school');
    const an = (await call(admin.getAnalytics, {})).data;
    assert.strictEqual(an.totals.priorityZoneOpen, 1); assert.strictEqual(an.priorityReports.length, 1);
    assert.strictEqual(an.priorityReports[0].title, 'Pothole outside school');
    const id = list.data[0]._id;
    const cleared = await call(admin.setPriorityZone, { params: { id }, body: { zone: null } });
    assert.strictEqual(cleared.data.priorityZone, null); assert.notStrictEqual(cleared.data.priority, 'high');
    assert.strictEqual((await call(admin.listReports, { query: { priorityZone: 'true' } })).data.length, 0);
    const set = await call(admin.setPriorityZone, { params: { id }, body: { zone: 'hospital' } });
    assert.strictEqual(set.data.priority, 'high');
    assert.strictEqual((await call(admin.setPriorityZone, { params: { id }, body: { zone: 'mall' } })).success, false);
  });

  console.log(`\n${passed} checks passed — backend: ${testDb.label()}`);
  await testDb.teardown();
})().catch((err) => { console.error(err); process.exit(1); });
