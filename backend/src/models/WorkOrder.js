/** WorkOrder — MySQL data access (tables: work_orders, work_order_evidence). */
const db = require('../config/mysql');
const { parseId, tryId, idStr, toDate, now, validationError, oneOf } = require('../db/util');

const STATUSES = ['open', 'in_progress', 'completed', 'verified'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

function toWorkOrder(row, evidence = []) {
  return {
    _id: idStr(row.id),
    report: idStr(row.report_id),
    assignedContractor: idStr(row.assigned_contractor),
    status: row.status,
    priority: row.priority,
    scheduledDate: toDate(row.scheduled_date),
    completedDate: toDate(row.completed_date),
    repairEvidence: evidence,
    notes: row.notes || '',
    createdBy: idStr(row.created_by),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  };
}

async function hydrate(rows) {
  if (!rows.length) return [];
  const ev = await db.query('SELECT work_order_id, url FROM work_order_evidence WHERE work_order_id IN (?) ORDER BY sort_order ASC, id ASC', [rows.map((r) => r.id)]);
  const m = new Map();
  ev.forEach((e) => (m.get(e.work_order_id) || m.set(e.work_order_id, []).get(e.work_order_id)).push(e.url));
  return rows.map((r) => toWorkOrder(r, m.get(r.id) || []));
}

/** filter: assignedContractor, status, statusIn, report, completedWithoutEvidence */
function buildWhere(f = {}) {
  const cond = [];
  const params = [];
  if (f.assignedContractor) { cond.push('assigned_contractor = ?'); params.push(parseId(f.assignedContractor, 'assignedContractor')); }
  if (f.status) { cond.push('status = ?'); params.push(f.status); }
  if (f.statusIn) { cond.push('status IN (?)'); params.push(f.statusIn); }
  if (f.report) { cond.push('report_id = ?'); params.push(parseId(f.report, 'report')); }
  if (f.withoutEvidence) cond.push('NOT EXISTS (SELECT 1 FROM work_order_evidence e WHERE e.work_order_id = work_orders.id)');
  return { where: cond.length ? `WHERE ${cond.join(' AND ')}` : '', params };
}

const WorkOrder = {
  STATUSES,

  async create(d) {
    const errs = [];
    if (!d.report) errs.push('Report reference is required');
    if (!d.createdBy) errs.push('Created by is required');
    if (d.status !== undefined && !oneOf(d.status, STATUSES)) errs.push(`\`${d.status}\` is not a valid enum value for path \`status\`.`);
    if (d.priority !== undefined && !oneOf(d.priority, PRIORITIES)) errs.push(`\`${d.priority}\` is not a valid enum value for path \`priority\`.`);
    if (d.scheduledDate && Number.isNaN(new Date(d.scheduledDate).getTime())) errs.push('Scheduled date is invalid');
    if (errs.length) throw validationError(errs);
    const t = now();
    const r = await db.query(
      `INSERT INTO work_orders (report_id, assigned_contractor, status, priority, scheduled_date, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [parseId(d.report, 'report'), d.assignedContractor ? parseId(d.assignedContractor, 'assignedContractor') : null, d.status || 'open', d.priority || 'medium',
        d.scheduledDate ? new Date(d.scheduledDate) : null, d.notes ? String(d.notes).trim() : '', parseId(d.createdBy, 'createdBy'), t, t]);
    return WorkOrder.findById(r.insertId);
  },

  async findById(id) {
    const rows = await db.query('SELECT * FROM work_orders WHERE id = ? LIMIT 1', [parseId(id)]);
    return rows.length ? (await hydrate(rows))[0] : null;
  },

  async list({ filter = {}, skip = 0, limit = 10 } = {}) {
    const { where, params } = buildWhere(filter);
    const rows = await db.query(`SELECT * FROM work_orders ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`, [...params, limit, skip]);
    return hydrate(rows);
  },

  async count(filter = {}) {
    const { where, params } = buildWhere(filter);
    const [r] = await db.query(`SELECT COUNT(*) AS c FROM work_orders ${where}`, params);
    return Number(r.c);
  },

  async update(id, patch) {
    const wid = parseId(id);
    if (patch.status !== undefined && !oneOf(patch.status, STATUSES)) throw validationError([`\`${patch.status}\` is not a valid enum value for path \`status\`.`]);
    const sets = [];
    const params = [];
    if (patch.status !== undefined) { sets.push('status = ?'); params.push(patch.status); }
    if (patch.completedDate !== undefined) { sets.push('completed_date = ?'); params.push(patch.completedDate); }
    if (patch.notes !== undefined) { sets.push('notes = ?'); params.push(patch.notes); }
    if (patch.assignedContractor !== undefined) { sets.push('assigned_contractor = ?'); params.push(patch.assignedContractor ? parseId(patch.assignedContractor, 'assignedContractor') : null); }
    if (patch.scheduledDate !== undefined) { sets.push('scheduled_date = ?'); params.push(patch.scheduledDate ? new Date(patch.scheduledDate) : null); }
    if (patch.priority !== undefined) { sets.push('priority = ?'); params.push(patch.priority); }
    if (sets.length) await db.query(`UPDATE work_orders SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, [...params, now(), wid]);
    return WorkOrder.findById(wid);
  },

  async addEvidence(id, urls) {
    const wid = parseId(id);
    return db.transaction(async (tx) => {
      const [m] = await tx.query('SELECT COALESCE(MAX(sort_order), -1) AS p FROM work_order_evidence WHERE work_order_id = ?', [wid]);
      let pos = Number(m.p) + 1;
      for (const url of urls) {
        await tx.query('INSERT INTO work_order_evidence (work_order_id, url, sort_order, created_at) VALUES (?, ?, ?, ?)', [wid, url, pos++, now()]);
      }
      await tx.query('UPDATE work_orders SET updated_at = ? WHERE id = ?', [now(), wid]);
    }).then(() => WorkOrder.findById(wid));
  },

  /**
   * Populate references. options: { report: true | [fields], assignedContractor: [fields] | true, createdBy: [fields] | true }
   * `true` = the full object; a field list = those fields + _id.
   */
  async populate(target, options = {}) {
    const list = Array.isArray(target) ? target : [target];
    const Report = require('./Report');
    const User = require('./User');
    const subset = (obj, fields) => (obj ? Object.fromEntries([['_id', obj._id], ...fields.map((f) => [f, obj[f]])]) : null);
    for (const wo of list) {
      if (options.report && wo.report && typeof wo.report !== 'object') {
        const rep = tryId(wo.report) ? await Report.findById(wo.report) : null;
        wo.report = rep ? (options.report === true ? rep : subset(rep, options.report)) : null;
      }
      for (const key of ['assignedContractor', 'createdBy']) {
        if (options[key] && wo[key] && typeof wo[key] !== 'object') {
          const u = await User.findById(wo[key]);
          wo[key] = u ? (options[key] === true ? u : subset(u, options[key])) : null;
        }
      }
    }
    return target;
  },
};

module.exports = WorkOrder;
