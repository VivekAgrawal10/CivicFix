/** RoadSegment — MySQL data access (tables: road_segments, road_segment_points). location is a GeoJSON LineString. */
const db = require('../config/mysql');
const { parseId, idStr, toDate, now, validationError, oneOf } = require('../db/util');

const STATUSES = ['good', 'fair', 'poor', 'critical'];

function toSegment(row, points = []) {
  return {
    _id: idStr(row.id),
    name: row.name,
    location: { type: 'LineString', coordinates: points },
    healthScore: Number(row.health_score),
    lastInspected: toDate(row.last_inspected),
    reportCount: Number(row.report_count),
    dominantIssue: row.dominant_issue || undefined,
    status: row.status,
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  };
}

async function hydrate(rows) {
  if (!rows.length) return [];
  const pts = await db.query('SELECT segment_id, latitude, longitude FROM road_segment_points WHERE segment_id IN (?) ORDER BY segment_id, seq ASC', [rows.map((r) => r.id)]);
  const m = new Map();
  pts.forEach((p) => (m.get(p.segment_id) || m.set(p.segment_id, []).get(p.segment_id)).push([Number(p.longitude), Number(p.latitude)]));
  return rows.map((r) => toSegment(r, m.get(r.id) || []));
}

function validate(d) {
  const errs = [];
  if (!d.name || !String(d.name).trim()) errs.push('Segment name is required');
  const c = d.location && d.location.coordinates;
  if (!Array.isArray(c) || !c.length || !c.every((p) => Array.isArray(p) && p.length >= 2 && p.every((n) => Number.isFinite(Number(n))))) errs.push('Path `location.coordinates` is required.');
  if (d.healthScore !== undefined && (Number(d.healthScore) < 0 || Number(d.healthScore) > 100)) errs.push(`Path \`healthScore\` (${d.healthScore}) is out of range (0-100).`);
  if (d.status !== undefined && !oneOf(d.status, STATUSES)) errs.push(`\`${d.status}\` is not a valid enum value for path \`status\`.`);
  if (d.lastInspected && Number.isNaN(new Date(d.lastInspected).getTime())) errs.push('lastInspected is not a valid date');
  if (errs.length) throw validationError(errs);
}

const RoadSegment = {
  async list({ status, skip = 0, limit = 20 } = {}) {
    const where = status ? 'WHERE status = ?' : '';
    const rows = await db.query(`SELECT * FROM road_segments ${where} ORDER BY health_score ASC, id ASC LIMIT ? OFFSET ?`, status ? [status, limit, skip] : [limit, skip]);
    return hydrate(rows);
  },

  async count({ status } = {}) {
    const [r] = await db.query(`SELECT COUNT(*) AS c FROM road_segments ${status ? 'WHERE status = ?' : ''}`, status ? [status] : []);
    return Number(r.c);
  },

  async findByName(name) {
    const rows = await db.query('SELECT * FROM road_segments WHERE name = ? LIMIT 1', [name]);
    return rows.length ? (await hydrate(rows))[0] : null;
  },

  /** Insert or update by name (findOneAndUpdate upsert). */
  async upsertByName(d) {
    validate(d);
    const t = now();
    const id = await db.transaction(async (tx) => {
      const [existing] = await tx.query('SELECT id FROM road_segments WHERE name = ? LIMIT 1 FOR UPDATE', [String(d.name).trim()]);
      let sid;
      if (existing) {
        sid = existing.id;
        const sets = ['updated_at = ?'];
        const params = [t];
        if (d.healthScore !== undefined) { sets.push('health_score = ?'); params.push(Number(d.healthScore)); }
        if (d.lastInspected !== undefined) { sets.push('last_inspected = ?'); params.push(d.lastInspected ? new Date(d.lastInspected) : null); }
        if (d.dominantIssue !== undefined) { sets.push('dominant_issue = ?'); params.push(d.dominantIssue); }
        if (d.status !== undefined) { sets.push('status = ?'); params.push(d.status); }
        await tx.query(`UPDATE road_segments SET ${sets.join(', ')} WHERE id = ?`, [...params, sid]);
        await tx.query('DELETE FROM road_segment_points WHERE segment_id = ?', [sid]);
      } else {
        const r = await tx.query(
          `INSERT INTO road_segments (name, health_score, last_inspected, report_count, dominant_issue, status, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?, ?, ?)`,
          [String(d.name).trim(), d.healthScore !== undefined ? Number(d.healthScore) : 100, d.lastInspected ? new Date(d.lastInspected) : null, d.dominantIssue || null, d.status || 'good', t, t]);
        sid = r.insertId;
      }
      const coords = d.location.coordinates;
      for (let i = 0; i < coords.length; i++) {
        await tx.query('INSERT INTO road_segment_points (segment_id, seq, latitude, longitude) VALUES (?, ?, ?, ?)', [sid, i, Number(coords[i][1]), Number(coords[i][0])]);
      }
      return sid;
    });
    const rows = await db.query('SELECT * FROM road_segments WHERE id = ?', [parseId(id)]);
    return (await hydrate(rows))[0];
  },

  async statusGroups() {
    const rows = await db.query(
      `SELECT status, COUNT(*) AS c, AVG(health_score) AS avg_health, SUM(report_count) AS total_reports FROM road_segments GROUP BY status ORDER BY avg_health ASC`);
    return rows.map((r) => ({ _id: r.status, count: Number(r.c), avgHealthScore: Number(r.avg_health), totalReports: Number(r.total_reports || 0) }));
  },

  async overall() {
    const [r] = await db.query('SELECT AVG(health_score) AS avg_health, COUNT(*) AS total, SUM(report_count) AS total_reports FROM road_segments');
    return r && Number(r.total) > 0 ? { _id: null, avgHealthScore: Number(r.avg_health), totalSegments: Number(r.total), totalReports: Number(r.total_reports || 0) } : null;
  },

  async dominantIssues(limit = 5) {
    const rows = await db.query('SELECT dominant_issue, COUNT(*) AS c FROM road_segments WHERE dominant_issue IS NOT NULL GROUP BY dominant_issue ORDER BY c DESC, dominant_issue ASC LIMIT ?', [limit]);
    return rows.map((r) => ({ _id: r.dominant_issue, count: Number(r.c) }));
  },
};

module.exports = RoadSegment;
