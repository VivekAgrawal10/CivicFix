/**
 * admin.controller.js — the admin portal API (mounted at /api/v1/admin, admin role only).
 * Every state-changing action writes a row to admin_activity (the audit log).
 */
const Report = require('../models/Report');
const WorkOrder = require('../models/WorkOrder');
const User = require('../models/User');
const Admin = require('../models/Admin');
const { getPaginationParams } = require('../utils/pagination');
const { adjustCivicCreds } = require('../utils/civicCreds');
const { notifyUser } = require('../services/notify');
const { resolveReport, verifyReport, rejectReportAsFake, finalizeSubmitReward, assignClusterMates } = require('../services/resolution');
const { listClusters, clusterMates, memberCounts, CLUSTER_RADIUS_M } = require('../services/clusters');
const { parseId, tryId } = require('../db/util');

const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const bad = (res, message, code = 400) => res.status(code).json({ success: false, message });
const ok = (res, data, extra = {}) => res.json({ success: true, data, ...extra });

// GET /admin/analytics
const getAnalytics = async (req, res, next) => {
  try {
    const [analytics, hotspots, contractors, groups, priority] = await Promise.all([
      Admin.analytics(), Report.hotspots(5), Admin.contractorStats(), listClusters(),
      Report.list({ filter: { statusIn: Report.ACTIVE, priorityZone: true }, skip: 0, limit: 8, order: "CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at ASC" }),
    ]);
    await Report.populate(priority, { submittedBy: ['name'] });
    ok(res, {
      ...analytics, hotspots, contractors: contractors.filter((c) => c.isActive),
      clusterCount: groups.length, clusteredReports: groups.reduce((s, g) => s + g.count, 0),
      priorityReports: priority.map((r) => ({ _id: r._id, title: r.title, address: r.address, category: r.category, status: r.status, priority: r.priority, priorityZone: r.priorityZone, createdAt: r.createdAt, reporter: r.submittedBy ? r.submittedBy.name : 'Citizen' })),
    });
  } catch (e) { next(e); }
};

// GET /admin/reports?status&category&priority&q&needsReview&page&limit
const listReports = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams({ ...req.query, limit: req.query.limit || 15 });
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.q) filter.q = req.query.q;
    if (req.query.priorityZone === 'true') filter.priorityZone = true;
    if (req.query.needsReview === 'true') { filter.manualReview = true; filter.statusIn = ['pending']; }
    const order = req.query.sort === 'severity'
      ? "CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at DESC, id DESC"
      : undefined;
    const [reports, total, groups] = await Promise.all([Report.list({ filter, skip, limit, ...(order ? { order } : {}) }), Report.count(filter), listClusters()]);
    const mates = memberCounts(groups);
    await Report.populate(reports, { submittedBy: ['name', 'email'] });
    const ids = reports.map((r) => r._id);
    const [orders, moderation] = await Promise.all([Admin.workOrdersForReports(ids), Admin.moderationFor(ids)]);
    const data = reports.map((r) => ({ ...r, workOrder: orders.get(r._id) || null, moderation: moderation.get(r._id) || null, sameProblemCount: mates.get(r._id) || 0 }));
    res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
  } catch (e) { next(e); }
};

// GET /admin/reports/:id
const getReportDetail = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return bad(res, 'Report not found.', 404);
    await Report.populate(report, { submittedBy: ['name', 'email', 'avatar'], duplicateOf: ['title', 'status'] });
    const [history, orders, moderation] = await Promise.all([Report.statusHistory(report._id), Admin.workOrdersForReports([report._id]), Admin.getModeration(report._id)]);
    const confirmerIds = [...new Set(report.confirmations.map((c) => tryId(c.user)).filter(Boolean))];
    const confirmers = [];
    for (const id of confirmerIds) { const u = await User.findById(id); if (u) confirmers.push({ _id: u._id, name: u.name }); }
    const mates = (await clusterMates(report)).map((m) => ({ _id: m._id, title: m.title, status: m.status, submittedBy: m.submittedBy, createdAt: m.createdAt }));
    await Report.populate(mates, { submittedBy: ['name'] });
    ok(res, { ...report, statusHistory: history, workOrder: orders.get(report._id) || null, moderation, confirmers, sameProblem: mates, clusterRadiusM: CLUSTER_RADIUS_M });
  } catch (e) { next(e); }
};

// POST /admin/reports/:id/verify — the report is genuine; releases the reporter's pending +25
const verify = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return bad(res, 'Report not found.', 404);
    const existing = await Admin.getModeration(report._id);
    if (existing && existing.verdict === 'fake') return bad(res, 'This report was already rejected as fake.', 409);
    const award = await verifyReport(report, req.user._id);
    await Admin.log({ adminId: req.user._id, action: 'verify_report', entityType: 'report', entityId: report._id, details: report.title });
    ok(res, { verified: true, rewardReleased: Boolean(award && award.success) });
  } catch (e) { next(e); }
};

// POST /admin/reports/:id/reject  { reason }
const reject = async (req, res, next) => {
  try {
    const reason = String(req.body.reason || '').trim();
    if (reason.length < 3) return bad(res, 'Please give a short reason (it is shown to the citizen).');
    const report = await Report.findById(req.params.id);
    if (!report) return bad(res, 'Report not found.', 404);
    if (report.status === 'resolved') return bad(res, 'A resolved report cannot be rejected.', 409);
    const out = await rejectReportAsFake(report, req.user._id, reason);
    if (!out.ok) return bad(res, out.message, out.code);
    await Admin.log({ adminId: req.user._id, action: 'reject_fake', entityType: 'report', entityId: report._id, details: `${report.title} — ${reason}` });
    ok(res, { rejected: true, penaltyApplied: Boolean(out.penalty && out.penalty.success) });
  } catch (e) { next(e); }
};

// POST /admin/reports/:id/assign  { contractorId, dueDate?, priority?, notes? }
const assign = async (req, res, next) => {
  try {
    const { contractorId, dueDate, priority, notes } = req.body;
    const contractor = tryId(contractorId) ? await User.findById(contractorId) : null;
    if (!contractor || contractor.role !== 'contractor' || !contractor.isActive) return bad(res, 'Choose an active contractor.');
    if (priority && !PRIORITIES.includes(priority)) return bad(res, 'Invalid priority.');
    if (dueDate && Number.isNaN(new Date(dueDate).getTime())) return bad(res, 'Invalid due date.');

    const report = await Report.findById(req.params.id);
    if (!report) return bad(res, 'Report not found.', 404);
    if (['resolved', 'closed'].includes(report.status)) return bad(res, `A ${report.status} report cannot be assigned.`, 409);

    const current = (await Admin.workOrdersForReports([report._id])).get(report._id);
    let orderId;
    let reassigned = false;
    if (current && ['open', 'in_progress'].includes(current.status)) {
      await WorkOrder.update(current._id, { assignedContractor: contractor._id, scheduledDate: dueDate || null, priority: priority || report.priority, notes: notes !== undefined ? notes : current.notes });
      orderId = current._id;
      reassigned = true;
    } else {
      const wo = await WorkOrder.create({ report: report._id, assignedContractor: contractor._id, priority: priority || report.priority, scheduledDate: dueDate || null, notes: notes || '', createdBy: req.user._id });
      orderId = wo._id;
    }
    const updated = await Report.update(report._id, { status: report.status === 'in_progress' ? 'in_progress' : 'assigned', ...(priority ? { priority } : {}) }, { changedBy: req.user._id, remarks: `${reassigned ? 'Reassigned' : 'Assigned'} to ${contractor.name}` });

    await Admin.setModeration(report._id, 'valid', null, req.user._id); // triage = the admin has looked at it and it is genuine
    await finalizeSubmitReward(updated);
    await notifyUser(contractor._id, 'work_order', 'New job assigned', `${report.title}${dueDate ? ` — due ${new Date(dueDate).toDateString()}` : ''}`, report._id);
    await notifyUser(report.submittedBy, 'report_update', 'Your report is assigned', `"${report.title}" was assigned to a repair crew.`, report._id);
    const alsoAssigned = await assignClusterMates(updated, req.user._id);
    await Admin.log({ adminId: req.user._id, action: reassigned ? 'reassign_job' : 'assign_job', entityType: 'report', entityId: report._id, details: `${report.title} → ${contractor.name}${alsoAssigned ? ` (+${alsoAssigned} duplicate report(s))` : ''}` });
    ok(res, { workOrderId: orderId, reassigned, clusterAssigned: alsoAssigned });
  } catch (e) { next(e); }
};

// POST /admin/reports/:id/resolve  { note? } — small fixes closed by the admin directly (no contractor)
const resolveDirect = async (req, res, next) => {
  try {
    const out = await resolveReport(req.params.id, { adminId: req.user._id, remarks: req.body.note ? `Resolved by admin: ${req.body.note}` : 'Resolved by admin' });
    if (!out.ok) return bad(res, out.message, out.code);
    if (out.already) return bad(res, 'This report is already resolved.', 409);
    await Admin.log({ adminId: req.user._id, action: 'resolve_report', entityType: 'report', entityId: req.params.id, details: `${out.report.title} (+${out.points} CivicCreds paid to reporter${out.clusterResolved ? `, ${out.clusterResolved} duplicate report(s) resolved too` : ''})` });
    ok(res, { resolved: true, pointsAwarded: out.points, clusterResolved: out.clusterResolved || 0 });
  } catch (e) { next(e); }
};

// GET /admin/clusters — the same problem reported several times at the same spot
const clusters = async (req, res, next) => {
  try { ok(res, await listClusters(), { radiusM: CLUSTER_RADIUS_M }); } catch (e) { next(e); }
};

// POST /admin/reports/:id/priority-zone  { zone: 'school' | 'hospital' | null }  — confirm or remove the school/hospital flag
const setPriorityZone = async (req, res, next) => {
  try {
    const zone = req.body.zone || null;
    if (zone && !Report.PRIORITY_ZONES.includes(zone)) return bad(res, 'zone must be "school", "hospital" or null.');
    const report = await Report.findById(req.params.id);
    if (!report) return bad(res, 'Report not found.', 404);
    const patch = { priorityZone: zone };
    if (!zone) { patch.priority = report.aiAnalysis.severity || 'medium'; patch.priorityScore = 15; } // the flag was wrong: back to the normal queue
    else { patch.priority = report.priority === 'critical' ? 'critical' : 'high'; patch.priorityScore = 40; }
    const updated = await Report.update(report._id, patch, { changedBy: req.user._id, remarks: zone ? `Marked as near a ${zone}` : 'School/hospital flag removed' });
    await Admin.log({ adminId: req.user._id, action: zone ? 'set_priority_zone' : 'clear_priority_zone', entityType: 'report', entityId: report._id, details: `${report.title}${zone ? ` → near a ${zone}` : ''}` });
    ok(res, { priorityZone: updated.priorityZone, priority: updated.priority });
  } catch (e) { next(e); }
};

// POST /admin/reports/:id/severity  { priority: 'low'|'medium'|'high'|'critical' }
const setSeverity = async (req, res, next) => {
  try {
    const { priority } = req.body;
    if (!PRIORITIES.includes(priority)) return bad(res, 'priority must be low, medium, high or critical.');
    const report = await Report.findById(req.params.id);
    if (!report) return bad(res, 'Report not found.', 404);
    const updated = await Report.update(report._id, { priority }, { changedBy: req.user._id, remarks: `Severity set to ${priority} by admin` });
    await Admin.log({ adminId: req.user._id, action: 'set_severity', entityType: 'report', entityId: report._id, details: `${report.title}: ${report.priority} → ${priority}` });
    ok(res, { priority: updated.priority });
  } catch (e) { next(e); }
};

// GET /admin/workorders?status=  (with report + contractor details)
const listWorkOrders = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.contractor) filter.assignedContractor = req.query.contractor;
    const orders = await WorkOrder.list({ filter, skip: 0, limit: 200 });
    await WorkOrder.populate(orders, { report: ['title', 'category', 'status', 'priority', 'address', 'images', 'location', 'submittedBy'], assignedContractor: ['name', 'email', 'phone'] });
    const nowMs = Date.now();
    ok(res, orders.map((o) => ({ ...o, overdue: Boolean(o.scheduledDate && ['open', 'in_progress'].includes(o.status) && new Date(o.scheduledDate).getTime() < nowMs) })));
  } catch (e) { next(e); }
};

// GET /admin/contractors   POST /admin/contractors
const listContractors = async (req, res, next) => { try { ok(res, await Admin.contractorStats()); } catch (e) { next(e); } };
const createContractor = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) return bad(res, 'Name, email and password are required.');
    if (String(password).length < 8) return bad(res, 'Password must be at least 8 characters.');
    if (await User.findByEmail(email)) return bad(res, 'That email is already registered.', 409);
    const user = await User.create({ name, email, password, phone, role: 'contractor' });
    await Admin.log({ adminId: req.user._id, action: 'create_contractor', entityType: 'user', entityId: user._id, details: `${user.name} (${user.email})` });
    res.status(201).json({ success: true, data: { _id: user._id, name: user.name, email: user.email } });
  } catch (e) { next(e); }
};

// GET /admin/users?role&q&page
const listUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams({ ...req.query, limit: req.query.limit || 20 });
    const out = await Admin.usersWithStats({ role: req.query.role, q: req.query.q, skip, limit });
    res.json({ success: true, data: out.items, pagination: { page, limit, total: out.total, totalPages: Math.max(1, Math.ceil(out.total / limit)) } });
  } catch (e) { next(e); }
};

// GET /admin/users/:id/creds
const userCreds = async (req, res, next) => { try { ok(res, await Admin.credsHistory(req.params.id)); } catch (e) { next(e); } };

// POST /admin/users/:id/creds  { amount, reason }
const adjustCreds = async (req, res, next) => {
  try {
    const amount = Number(req.body.amount);
    const reason = String(req.body.reason || '').trim();
    if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 500) return bad(res, 'Amount must be a whole number between -500 and 500 (not 0).');
    if (reason.length < 3) return bad(res, 'A reason is required and is shown in the citizen\'s history.');
    const user = await User.findById(parseId(req.params.id));
    if (!user || user.role !== 'citizen') return bad(res, 'Only citizen accounts have CivicCreds.', 404);
    const result = await adjustCivicCreds(user._id, amount, reason);
    await Admin.log({ adminId: req.user._id, action: 'adjust_creds', entityType: 'user', entityId: user._id, details: `${user.name}: ${amount > 0 ? '+' : ''}${amount} — ${reason}` });
    await notifyUser(user._id, 'system', amount > 0 ? 'Bonus CivicCreds' : 'CivicCreds adjusted', `${amount > 0 ? '+' : ''}${amount} CivicCreds: ${reason}`);
    ok(res, result);
  } catch (e) { next(e); }
};

// PATCH /admin/users/:id/active  { isActive }
const setActive = async (req, res, next) => {
  try {
    const user = await User.findById(parseId(req.params.id));
    if (!user) return bad(res, 'User not found.', 404);
    if (String(user._id) === String(req.user._id)) return bad(res, 'You cannot suspend your own account.', 409);
    if (user.role === 'admin') return bad(res, 'Admin accounts cannot be suspended here.', 409);
    const isActive = Boolean(req.body.isActive);
    await User.update(user._id, { isActive });
    await Admin.log({ adminId: req.user._id, action: isActive ? 'activate_user' : 'suspend_user', entityType: 'user', entityId: user._id, details: `${user.name} (${user.email})` });
    ok(res, { isActive });
  } catch (e) { next(e); }
};

// GET /admin/activity
const activity = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams({ ...req.query, limit: req.query.limit || 30 });
    const out = await Admin.activity({ skip, limit });
    res.json({ success: true, data: out.items, pagination: { page, limit, total: out.total, totalPages: Math.max(1, Math.ceil(out.total / limit)) } });
  } catch (e) { next(e); }
};

// GET /admin/export/reports.csv
const csvCell = (v) => { let s = v === null || v === undefined ? '' : String(v); if (/^[=+\-@]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; };
const exportReports = async (req, res, next) => {
  try {
    const rows = await Report.list({ filter: {}, skip: 0, limit: 5000 });
    await Report.populate(rows, { submittedBy: ['name', 'email'] });
    const head = ['id', 'title', 'category', 'status', 'priority', 'address', 'latitude', 'longitude', 'reporter', 'confirmations', 'created_at'];
    const lines = [head.join(',')].concat(rows.map((r) => [r._id, r.title, r.category, r.status, r.priority, r.address, r.location.coordinates[1], r.location.coordinates[0], r.submittedBy ? r.submittedBy.name : '', r.confirmationCount, r.createdAt.toISOString()].map(csvCell).join(',')));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="civicfix-reports.csv"');
    res.send(lines.join('\n'));
  } catch (e) { next(e); }
};

module.exports = { setSeverity, clusters, setPriorityZone, getAnalytics, listReports, getReportDetail, verify, reject, assign, resolveDirect, listWorkOrders, listContractors, createContractor, listUsers, userCreds, adjustCreds, setActive, activity, exportReports };
