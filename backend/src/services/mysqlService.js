/**
 * mysqlService.js — analytical views + workflow queries on the CivicFix MySQL schema (database/schema.sql).
 *
 * The views (v_unresolved_issues, v_road_health_metrics, v_repair_company_performance,
 * v_recurring_problems_by_locality) are read-only extras used by admin dashboards. They are fail-soft:
 * if a view query errors the helpers log a warning and return null so the main endpoints keep working.
 */

const { query: rawQuery, transaction } = require('../config/mysql');
const { parseId, now } = require('../db/util');

const query = async (sql, params) => {
  try {
    return await rawQuery(sql, params);
  } catch (err) {
    console.warn('[MySQL] view query failed, returning null:', err.message);
    return null;
  }
};

/** Unresolved civic issues (v_unresolved_issues) — powers the admin priority queue. */
const getUnresolvedIssuesFromView = async () => query('SELECT * FROM v_unresolved_issues ORDER BY priority_score DESC');

/** Locality road-health metrics (v_road_health_metrics). */
const getRoadHealthMetricsFromView = async (locality = null) => {
  if (locality) return query('SELECT * FROM v_road_health_metrics WHERE locality = ?', [locality]);
  return query('SELECT * FROM v_road_health_metrics ORDER BY calculated_road_health_score ASC');
};

/** Contractor KPIs (v_repair_company_performance) — powers the admin contractors page. */
const getCompanyPerformanceFromView = async () => query('SELECT * FROM v_repair_company_performance');

/** Recurring problems by locality (v_recurring_problems_by_locality). */
const getRecurringProblemsFromView = async (locality = null) => {
  if (locality) return query('SELECT * FROM v_recurring_problems_by_locality WHERE locality = ?', [locality]);
  return query('SELECT * FROM v_recurring_problems_by_locality ORDER BY total_citizen_complaints DESC');
};

/** Insert a citizen report directly (SQL equivalent of Query 1 in database/test_queries.sql). */
const insertReport = async ({ reporterId, category, title, description, imageUrl, latitude, longitude, locality }) => {
  const t = now();
  return transaction(async (tx) => {
    const r = await tx.query(
      `INSERT INTO reports (title, description, category, status, priority, latitude, longitude, address, submitted_by, created_at, updated_at)
       VALUES (?, ?, ?, 'pending', 'medium', ?, ?, ?, ?, ?, ?)`,
      [title || String(description || category).slice(0, 80), description, category, latitude, longitude, locality || 'General', parseId(reporterId, 'reporterId'), t, t]);
    if (imageUrl) await tx.query('INSERT INTO report_images (report_id, url, sort_order, created_at) VALUES (?, ?, 0, ?)', [r.insertId, imageUrl, t]);
    await tx.query('INSERT INTO report_status_history (report_id, old_status, new_status, changed_by, remarks, created_at) VALUES (?, NULL, ?, ?, ?, ?)',
      [r.insertId, 'pending', parseId(reporterId, 'reporterId'), 'Report created', t]);
    return { reportId: r.insertId };
  });
};

/** Assign a report to a contractor: creates the work order, sets status 'assigned' and writes the audit trail atomically. */
const assignIssueTransaction = async ({ issueId, companyId, assignedBy, remarks }) => {
  const rid = parseId(issueId, 'issueId');
  const t = now();
  return transaction(async (tx) => {
    const [rep] = await tx.query('SELECT status, priority FROM reports WHERE id = ? LIMIT 1 FOR UPDATE', [rid]);
    if (!rep) return { success: false, message: 'Report not found' };
    await tx.query(
      `INSERT INTO work_orders (report_id, assigned_contractor, status, priority, notes, created_by, created_at, updated_at) VALUES (?, ?, 'open', ?, ?, ?, ?, ?)`,
      [rid, parseId(companyId, 'companyId'), rep.priority, remarks || '', parseId(assignedBy, 'assignedBy'), t, t]);
    await tx.query('UPDATE reports SET status = ?, updated_at = ? WHERE id = ?', ['assigned', t, rid]);
    await tx.query('INSERT INTO report_status_history (report_id, old_status, new_status, changed_by, remarks, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [rid, rep.status, 'assigned', parseId(assignedBy, 'assignedBy'), `Work order issued. ${remarks || ''}`.trim(), t]);
    return { success: true, message: 'Issue assigned and logged in audit trail' };
  });
};

/** Move a report (and its latest work order) to a new status and append the audit trail entry. */
const updateIssueStatusTransaction = async ({ issueId, companyId, newStatus, remarks, changedBy }) => {
  const rid = parseId(issueId, 'issueId');
  const t = now();
  const woStatus = { resolved: 'completed', in_progress: 'in_progress', assigned: 'open' }[newStatus];
  return transaction(async (tx) => {
    const [rep] = await tx.query('SELECT status FROM reports WHERE id = ? LIMIT 1 FOR UPDATE', [rid]);
    if (!rep) return { success: false, message: 'Report not found' };
    if (woStatus && companyId) {
      await tx.query(
        `UPDATE work_orders SET status = ?, completed_date = ?, updated_at = ? WHERE report_id = ? AND assigned_contractor = ?`,
        [woStatus, woStatus === 'completed' ? t : null, t, rid, parseId(companyId, 'companyId')]);
    }
    await tx.query('UPDATE reports SET status = ?, updated_at = ? WHERE id = ?', [newStatus, t, rid]);
    await tx.query('INSERT INTO report_status_history (report_id, old_status, new_status, changed_by, remarks, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [rid, rep.status, newStatus, changedBy ? parseId(changedBy, 'changedBy') : null, remarks || '', t]);
    return { success: true, message: `Status updated to ${newStatus} and logged` };
  });
};

/** Complete audit trail of status transitions for a report (oldest first). */
const getIssueAuditHistory = async (issueId) => {
  const rows = await query(
    `SELECT h.id AS log_id, h.report_id AS issue_id, h.old_status, h.new_status, h.remarks, h.created_at AS transition_timestamp,
            COALESCE(u.name, 'Municipal System / Admin') AS triggered_by
     FROM report_status_history h LEFT JOIN users u ON u.id = h.changed_by
     WHERE h.report_id = ? ORDER BY h.created_at ASC, h.id ASC`, [parseId(issueId, 'issueId')]);
  return rows;
};

module.exports = {
  getUnresolvedIssuesFromView,
  getRoadHealthMetricsFromView,
  getCompanyPerformanceFromView,
  getRecurringProblemsFromView,
  insertReport,
  assignIssueTransaction,
  updateIssueStatusTransaction,
  getIssueAuditHistory,
};
