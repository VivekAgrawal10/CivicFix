/**
 * Admin — data access for the admin portal (tables: report_moderation, admin_activity) plus the read-only
 * aggregate queries behind the analytics dashboard. Aggregation is done in JS over plain SELECTs, which keeps
 * the SQL portable and is plenty fast at municipal scale.
 */
const db = require('../config/mysql');
const { parseId, tryId, idStr, toDate, now, num } = require('../db/util');

const Admin = {
  async getModeration(reportId) {
    const rows = await db.query('SELECT * FROM report_moderation WHERE report_id = ? LIMIT 1', [parseId(reportId)]);
    return rows.length ? { reportId: idStr(rows[0].report_id), verdict: rows[0].verdict, reason: rows[0].reason, moderatedBy: idStr(rows[0].moderated_by), createdAt: toDate(rows[0].created_at) } : null;
  },

  async moderationFor(reportIds) {
    if (!reportIds.length) return new Map();
    const rows = await db.query('SELECT * FROM report_moderation WHERE report_id IN (?)', [reportIds.map((i) => parseId(i))]);
    return new Map(rows.map((r) => [idStr(r.report_id), { verdict: r.verdict, reason: r.reason, createdAt: toDate(r.created_at) }]));
  },

  /** true when this call recorded the decision, false when the report already had one (verdict never changes silently). */
  async setModeration(reportId, verdict, reason, adminId) {
    try {
      await db.query('INSERT INTO report_moderation (report_id, verdict, reason, moderated_by, created_at) VALUES (?, ?, ?, ?, ?)',
        [parseId(reportId), verdict, reason || null, tryId(adminId), now()]);
      return true;
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return false;
      throw err;
    }
  },

  async log({ adminId, action, entityType, entityId = null, details = null }) {
    try {
      await db.query('INSERT INTO admin_activity (admin_id, action, entity_type, entity_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [tryId(adminId), action, entityType, tryId(entityId), details ? String(details).slice(0, 480) : null, now()]);
    } catch (err) {
      console.error('admin log error:', err.message); // an audit-log failure must never break the action itself
    }
  },

  async activity({ skip = 0, limit = 30 } = {}) {
    const rows = await db.query(
      `SELECT a.*, u.name AS admin_name FROM admin_activity a LEFT JOIN users u ON u.id = a.admin_id ORDER BY a.created_at DESC, a.id DESC LIMIT ? OFFSET ?`, [limit, skip]);
    const [{ c }] = await db.query('SELECT COUNT(*) AS c FROM admin_activity');
    return {
      total: Number(c),
      items: rows.map((r) => ({ _id: idStr(r.id), admin: r.admin_name || 'Admin', action: r.action, entityType: r.entity_type, entityId: idStr(r.entity_id), details: r.details || '', createdAt: toDate(r.created_at) })),
    };
  },

  /** Latest work order per report, with contractor name and evidence count. */
  async workOrdersForReports(reportIds) {
    if (!reportIds.length) return new Map();
    const rows = await db.query(
      `SELECT w.*, u.name AS contractor_name FROM work_orders w LEFT JOIN users u ON u.id = w.assigned_contractor WHERE w.report_id IN (?) ORDER BY w.id DESC`,
      [reportIds.map((i) => parseId(i))]);
    const ev = rows.length ? await db.query('SELECT work_order_id, COUNT(*) AS c FROM work_order_evidence WHERE work_order_id IN (?) GROUP BY work_order_id', [rows.map((r) => r.id)]) : [];
    const evCount = new Map(ev.map((e) => [String(e.work_order_id), Number(e.c)]));
    const out = new Map();
    for (const r of rows) {
      const key = idStr(r.report_id);
      if (out.has(key)) continue; // newest first -> keep the newest
      out.set(key, {
        _id: idStr(r.id), status: r.status, priority: r.priority, contractorId: idStr(r.assigned_contractor), contractorName: r.contractor_name || null,
        scheduledDate: toDate(r.scheduled_date), completedDate: toDate(r.completed_date), evidenceCount: evCount.get(String(r.id)) || 0, notes: r.notes || '',
      });
    }
    return out;
  },

  async usersWithStats({ role, q, skip = 0, limit = 20 }) {
    const cond = [];
    const params = [];
    if (role) { cond.push('role = ?'); params.push(role); }
    if (q) { cond.push('(name LIKE ? OR email LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    const rows = await db.query(`SELECT id, name, email, role, phone, is_active, civic_creds, civic_score, citizen_tier, created_at FROM users ${where} ORDER BY civic_creds DESC, id ASC LIMIT ? OFFSET ?`, [...params, limit, skip]);
    const [{ c }] = await db.query(`SELECT COUNT(*) AS c FROM users ${where}`, params);
    const ids = rows.map((r) => r.id);
    const stats = ids.length
      ? await db.query(`SELECT submitted_by AS uid, COUNT(*) AS total, SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved FROM reports WHERE submitted_by IN (?) GROUP BY submitted_by`, [ids])
      : [];
    const byUser = new Map(stats.map((s) => [String(s.uid), s]));
    return {
      total: Number(c),
      items: rows.map((r) => {
        const s = byUser.get(String(r.id)) || {};
        return {
          _id: idStr(r.id), name: r.name, email: r.email, role: r.role, phone: r.phone || '', isActive: Boolean(Number(r.is_active)),
          civicCreds: Number(r.civic_creds), civicScore: Number(r.civic_score), citizenTier: r.citizen_tier, createdAt: toDate(r.created_at),
          reportCount: Number(s.total || 0), resolvedCount: Number(s.resolved || 0),
        };
      }),
    };
  },

  async credsHistory(userId, limit = 20) {
    const rows = await db.query('SELECT action, amount, details, created_at FROM creds_history WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?', [parseId(userId), limit]);
    return rows.map((r) => ({ action: r.action, amount: Number(r.amount), details: r.details || '', createdAt: toDate(r.created_at) }));
  },

  /** Contractor performance: workload, completions, average repair time, on-time rate. */
  async contractorStats() {
    const users = await db.query("SELECT id, name, email, phone, is_active, created_at FROM users WHERE role = 'contractor' ORDER BY id ASC");
    const wos = await db.query('SELECT assigned_contractor AS cid, status, scheduled_date, created_at, completed_date FROM work_orders WHERE assigned_contractor IS NOT NULL');
    const nowMs = Date.now();
    return users.map((u) => {
      const mine = wos.filter((w) => String(w.cid) === String(u.id));
      const done = mine.filter((w) => w.status === 'completed' || w.status === 'verified');
      const active = mine.filter((w) => w.status === 'open' || w.status === 'in_progress');
      const hours = done.filter((w) => w.completed_date).map((w) => (toDate(w.completed_date) - toDate(w.created_at)) / 36e5);
      const withDue = done.filter((w) => w.scheduled_date && w.completed_date);
      const onTime = withDue.filter((w) => toDate(w.completed_date) <= toDate(w.scheduled_date)).length;
      return {
        _id: idStr(u.id), name: u.name, email: u.email, phone: u.phone || '', isActive: Boolean(Number(u.is_active)),
        activeOrders: active.length, completedOrders: done.length, verifiedOrders: mine.filter((w) => w.status === 'verified').length,
        overdueOrders: active.filter((w) => w.scheduled_date && toDate(w.scheduled_date).getTime() < nowMs).length,
        avgRepairHours: hours.length ? Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) / 10 : null,
        onTimeRate: withDue.length ? Math.round((onTime / withDue.length) * 100) : null,
      };
    });
  },

  async analytics() {
    const reports = await db.query('SELECT id, status, priority, category, created_at, ai_manual_review, submitted_by, priority_zone FROM reports');
    const mod = await db.query('SELECT report_id, verdict FROM report_moderation');
    const fakeIds = new Set(mod.filter((m) => m.verdict === 'fake').map((m) => String(m.report_id)));
    const reviewedIds = new Set(mod.map((m) => String(m.report_id)));
    const resolvedHist = await db.query("SELECT report_id, created_at FROM report_status_history WHERE new_status = 'resolved'");
    const wos = await db.query('SELECT status, scheduled_date FROM work_orders');
    const people = await db.query('SELECT role, is_active FROM users');
    const creds = await db.query('SELECT amount, created_at FROM creds_history');
    const top = await db.query("SELECT id, name, civic_creds, citizen_tier FROM users WHERE role = 'citizen' AND is_active = 1 ORDER BY civic_creds DESC, id ASC LIMIT 5");

    const count = (key, rows) => { const m = {}; rows.forEach((r) => { m[r[key]] = (m[r[key]] || 0) + 1; }); return m; };
    const byStatus = count('status', reports);
    const open = reports.filter((r) => ['pending', 'assigned', 'in_progress'].includes(r.status));
    const nowMs = Date.now();
    const day = (d) => toDate(d).toISOString().slice(0, 10);

    const trend = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(nowMs - i * 864e5).toISOString().slice(0, 10);
      trend.push({
        date: d,
        reported: reports.filter((r) => day(r.created_at) === d).length,
        resolved: resolvedHist.filter((r) => day(r.created_at) === d).length,
      });
    }

    const createdById = new Map(reports.map((r) => [String(r.id), toDate(r.created_at)]));
    const hrs = resolvedHist.map((h) => (toDate(h.created_at) - createdById.get(String(h.report_id))) / 36e5).filter((h) => Number.isFinite(h) && h >= 0);
    const thirty = nowMs - 30 * 864e5;
    const issued = creds.filter((c) => Number(c.amount) > 0 && toDate(c.created_at).getTime() >= thirty).reduce((s, c) => s + Number(c.amount), 0);

    return {
      totals: {
        reports: reports.length,
        open: open.length,
        pending: byStatus.pending || 0,
        assigned: byStatus.assigned || 0,
        inProgress: byStatus.in_progress || 0,
        resolved: byStatus.resolved || 0,
        closed: byStatus.closed || 0,
        fake: fakeIds.size,
        criticalOpen: open.filter((r) => r.priority === 'critical').length,
        priorityZoneOpen: open.filter((r) => r.priority_zone).length,
        needsReview: open.filter((r) => Number(r.ai_manual_review) === 1 && !reviewedIds.has(String(r.id))).length,
        awaitingVerification: wos.filter((w) => w.status === 'completed').length,
        overdueJobs: wos.filter((w) => (w.status === 'open' || w.status === 'in_progress') && w.scheduled_date && toDate(w.scheduled_date).getTime() < nowMs).length,
        citizens: people.filter((p) => p.role === 'citizen' && Number(p.is_active)).length,
        contractors: people.filter((p) => p.role === 'contractor' && Number(p.is_active)).length,
        credsIssued30d: issued,
        resolutionRate: reports.length ? Math.round(((byStatus.resolved || 0) / reports.length) * 100) : 0,
        avgResolutionHours: hrs.length ? Math.round((hrs.reduce((a, b) => a + b, 0) / hrs.length) * 10) / 10 : null,
      },
      byCategory: Object.entries(count('category', reports)).map(([category, n]) => ({ category, count: n })).sort((a, b) => b.count - a.count),
      byPriority: ['critical', 'high', 'medium', 'low'].map((p) => ({ priority: p, count: open.filter((r) => r.priority === p).length })),
      byStatus,
      trend,
      topReporters: top.map((u) => ({ _id: idStr(u.id), name: u.name, civicCreds: Number(u.civic_creds), tier: u.citizen_tier })),
    };
  },
};

module.exports = Admin;
