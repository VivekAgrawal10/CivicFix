/**
 * Report — MySQL data access (tables: reports, report_images, report_upvotes, report_confirmations,
 * report_status_history).  Returned objects mirror the former Mongoose documents:
 *   { _id, title, ..., location: { type:'Point', coordinates:[lng,lat] }, images:[url], submittedBy,
 *     aiAnalysis:{...}, upvotes:[userId], confirmations:[{user,confirmedAt,remarks}], createdAt, updatedAt }
 * `submittedBy` is the user id string unless populated with Report.populate().
 */
const db = require('../config/mysql');
const { parseId, tryId, idStr, toDate, toBool, num, now, haversineM, boundingBox, validationError, oneOf } = require('../db/util');

const CATEGORIES = ['pothole', 'streetlight', 'garbage', 'drainage', 'waterlogging', 'road_damage', 'other'];
const STATUSES = ['pending', 'assigned', 'in_progress', 'resolved', 'closed'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const LANGS = ['en', 'pa', 'hi'];
const PRIORITY_ZONES = ['school', 'hospital'];
const ACTIVE = ['pending', 'assigned', 'in_progress'];

function toReport(row, extra = {}) {
  return {
    _id: idStr(row.id),
    title: row.title,
    description: row.description,
    originalLanguage: row.original_language,
    translatedDescription: row.translated_description || null,
    category: row.category,
    status: row.status,
    priority: row.priority,
    location: { type: 'Point', coordinates: [Number(row.longitude), Number(row.latitude)] },
    address: row.address || '',
    images: extra.images || [],
    submittedBy: idStr(row.submitted_by),
    assignedTo: extra.assignedTo === undefined ? null : extra.assignedTo,
    aiAnalysis: {
      severity: row.ai_severity || null,
      category: row.ai_category || null,
      confidence: num(row.ai_confidence),
      outcome: row.ai_outcome || null,
      manualReviewRequired: toBool(row.ai_manual_review),
      relevanceStatus: row.ai_relevance_status || null,
      method: row.ai_method || null,
      message: row.ai_message || null,
      imageHash: row.ai_image_hash || null,
      analyzedAt: toDate(row.ai_analyzed_at),
      isDuplicate: toBool(row.ai_is_duplicate),
      duplicateOf: idStr(row.ai_duplicate_of),
    },
    upvotes: extra.upvotes || [],
    confirmations: extra.confirmations || [],
    confirmationCount: Number(row.confirmation_count),
    priorityScore: Number(row.priority_score),
    rewardPending: toBool(row.reward_pending),
    rewardGranted: toBool(row.reward_granted),
    isVerifiedByCommunity: toBool(row.is_verified_by_community),
    priorityZone: row.priority_zone || null,
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  };
}

/** Batch-load images / upvotes / confirmations and the latest work-order id for report rows. */
async function hydrate(rows) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [imgs, ups, confs, wos] = await Promise.all([
    db.query('SELECT report_id, url FROM report_images WHERE report_id IN (?) ORDER BY sort_order ASC, id ASC', [ids]),
    db.query('SELECT report_id, user_id FROM report_upvotes WHERE report_id IN (?) ORDER BY created_at ASC', [ids]),
    db.query('SELECT id, report_id, user_id, confirmed_at, remarks FROM report_confirmations WHERE report_id IN (?) ORDER BY id ASC', [ids]),
    db.query('SELECT report_id, MAX(id) AS wo_id FROM work_orders WHERE report_id IN (?) GROUP BY report_id', [ids]),
  ]);
  const group = (list, key, fn) => {
    const m = new Map();
    list.forEach((x) => (m.get(x[key]) || m.set(x[key], []).get(x[key])).push(fn(x)));
    return m;
  };
  const images = group(imgs, 'report_id', (x) => x.url);
  const upvotes = group(ups, 'report_id', (x) => idStr(x.user_id));
  const confirmations = group(confs, 'report_id', (x) => ({ _id: idStr(x.id), user: idStr(x.user_id), confirmedAt: toDate(x.confirmed_at), remarks: x.remarks }));
  const wo = new Map(wos.map((w) => [w.report_id, idStr(w.wo_id)]));
  return rows.map((r) => toReport(r, { images: images.get(r.id), upvotes: upvotes.get(r.id), confirmations: confirmations.get(r.id), assignedTo: wo.get(r.id) || null }));
}

/** filter keys: status, statusIn, statusNotIn, category, priority, priorityNot, submittedBy, aiDuplicate, ids, box, createdSince */
function buildWhere(f = {}) {
  const cond = [];
  const params = [];
  const eq = (col, v) => { cond.push(`${col} = ?`); params.push(v); };
  if (f.status) eq('status', f.status);
  if (f.statusIn) { cond.push('status IN (?)'); params.push(f.statusIn); }
  if (f.statusNotIn) { cond.push('status NOT IN (?)'); params.push(f.statusNotIn); }
  if (f.category) eq('category', f.category);
  if (f.priority) eq('priority', f.priority);
  if (f.submittedBy) eq('submitted_by', parseId(f.submittedBy, 'submittedBy'));
  if (f.aiDuplicate) cond.push('ai_is_duplicate = 1');
  if (f.manualReview) cond.push('ai_manual_review = 1');
  if (f.priorityZone) cond.push('priority_zone IS NOT NULL');
  if (f.q) { cond.push('(title LIKE ? OR address LIKE ? OR description LIKE ?)'); const like = `%${String(f.q).trim()}%`; params.push(like, like, like); }
  if (f.createdSince) { cond.push('created_at >= ?'); params.push(f.createdSince); }
  if (f.box) {
    cond.push('latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?');
    params.push(f.box.minLat, f.box.maxLat, f.box.minLng, f.box.maxLng);
  }
  return { where: cond.length ? `WHERE ${cond.join(' AND ')}` : '', params };
}

const pick = (obj, fields) => {
  const out = { _id: obj._id };
  fields.forEach((f) => { if (obj[f] !== undefined) out[f] = obj[f]; });
  return out;
};

function validate(d) {
  const errs = [];
  if (!d.title || !String(d.title).trim()) errs.push('Title is required');
  else if (String(d.title).trim().length > 200) errs.push('Title cannot exceed 200 characters');
  if (!d.description || !String(d.description).trim()) errs.push('Description is required');
  if (!d.category) errs.push('Category is required');
  else if (!oneOf(d.category, CATEGORIES)) errs.push(`\`${d.category}\` is not a valid enum value for path \`category\`.`);
  if (d.status !== undefined && !oneOf(d.status, STATUSES)) errs.push(`\`${d.status}\` is not a valid enum value for path \`status\`.`);
  if (d.priority !== undefined && !oneOf(d.priority, PRIORITIES)) errs.push(`\`${d.priority}\` is not a valid enum value for path \`priority\`.`);
  if (d.priorityZone && !oneOf(d.priorityZone, PRIORITY_ZONES)) errs.push('`priorityZone` must be "school" or "hospital".');
  if (d.originalLanguage !== undefined && !oneOf(d.originalLanguage, LANGS)) errs.push(`\`${d.originalLanguage}\` is not a valid enum value for path \`originalLanguage\`.`);
  const c = d.location && d.location.coordinates;
  if (!d.location || d.location.type !== 'Point') errs.push('Path `location.type` is required.');
  if (!Array.isArray(c) || c.length !== 2 || !c.every((n) => Number.isFinite(Number(n)))) errs.push('Path `location.coordinates` is required.');
  if (Array.isArray(c) && c.length === 2 && c.every((n) => Number.isFinite(Number(n)))) {
    if (Math.abs(Number(c[1])) > 90) errs.push('Latitude must be between -90 and 90');
    if (Math.abs(Number(c[0])) > 180) errs.push('Longitude must be between -180 and 180');
  }
  if (!d.submittedBy) errs.push('Submitted by is required');
  if (errs.length) throw validationError(errs);
}

const Report = {
  CATEGORIES, STATUSES, PRIORITIES, ACTIVE, PRIORITY_ZONES,

  async create(d) {
    validate(d);
    const [lng, lat] = d.location.coordinates.map(Number);
    const ai = d.aiAnalysis || {};
    const t = now();
    const id = await db.transaction(async (tx) => {
      const r = await tx.query(
        `INSERT INTO reports (title, description, original_language, translated_description, category, status, priority,
           latitude, longitude, address, submitted_by,
           ai_severity, ai_category, ai_confidence, ai_outcome, ai_manual_review, ai_relevance_status, ai_method, ai_message,
           ai_image_hash, ai_analyzed_at, ai_is_duplicate, ai_duplicate_of,
           confirmation_count, priority_score, reward_pending, reward_granted, is_verified_by_community, priority_zone, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [String(d.title).trim(), String(d.description).trim(), d.originalLanguage || 'en', d.translatedDescription || null, d.category,
          d.status || 'pending', d.priority || 'medium', lat, lng, d.address ? String(d.address).trim() : null, parseId(d.submittedBy, 'submittedBy'),
          ai.severity || null, ai.category || null, ai.confidence ?? null, ai.outcome || null, ai.manualReviewRequired ? 1 : 0,
          ai.relevanceStatus || null, ai.method || null, ai.message || null, ai.imageHash || null, ai.analyzedAt || null,
          ai.isDuplicate ? 1 : 0, ai.duplicateOf ? tryId(ai.duplicateOf) : null,
          d.confirmationCount ?? 0, d.priorityScore ?? 10, d.rewardPending ? 1 : 0, d.rewardGranted ? 1 : 0, d.isVerifiedByCommunity ? 1 : 0, d.priorityZone || null, t, t]
      );
      const images = Array.isArray(d.images) ? d.images.filter(Boolean) : [];
      for (let i = 0; i < images.length; i++) {
        await tx.query('INSERT INTO report_images (report_id, url, sort_order, created_at) VALUES (?, ?, ?, ?)', [r.insertId, images[i], i, t]);
      }
      await tx.query('INSERT INTO report_status_history (report_id, old_status, new_status, changed_by, remarks, created_at) VALUES (?, NULL, ?, ?, ?, ?)',
        [r.insertId, d.status || 'pending', parseId(d.submittedBy, 'submittedBy'), 'Report created', t]);
      return r.insertId;
    });
    return Report.findById(id);
  },

  async findById(id) {
    const rows = await db.query('SELECT * FROM reports WHERE id = ? LIMIT 1', [parseId(id)]);
    return rows.length ? (await hydrate(rows))[0] : null;
  },

  /** { filter, skip, limit, select } -> reports newest first */
  async list({ filter = {}, skip = 0, limit = 10, select, order = 'created_at DESC, id DESC' } = {}) {
    const { where, params } = buildWhere(filter);
    const rows = await db.query(`SELECT * FROM reports ${where} ORDER BY ${order} LIMIT ? OFFSET ?`, [...params, limit, skip]);
    const list = await hydrate(rows);
    return select ? list.map((r) => pick(r, select)) : list;
  },

  async count(filter = {}) {
    const { where, params } = buildWhere(filter);
    const [r] = await db.query(`SELECT COUNT(*) AS c FROM reports ${where}`, params);
    return Number(r.c);
  },

  /** Reports within radiusM metres of a point (bounding-box prefilter in SQL, exact haversine in JS), nearest first. */
  async nearby({ lat, lng, radiusM, filter = {}, limit = 50, select }) {
    const box = boundingBox(lat, lng, radiusM);
    const { where, params } = buildWhere({ ...filter, box });
    const rows = await db.query(`SELECT * FROM reports ${where} ORDER BY created_at DESC LIMIT 1000`, params);
    const within = rows
      .map((r) => ({ r, d: haversineM(lat, lng, Number(r.latitude), Number(r.longitude)) }))
      .filter((x) => x.d <= radiusM)
      .sort((a, b) => a.d - b.d)
      .slice(0, limit);
    const list = (await hydrate(within.map((x) => x.r))).map((rep, i) => Object.assign(rep, { distanceM: Math.round(within[i].d) }));
    return select ? list.map((r) => ({ ...pick(r, select), distanceM: r.distanceM })) : list;
  },

  async countNearby({ lat, lng, radiusM, filter = {} }) {
    const box = boundingBox(lat, lng, radiusM);
    const { where, params } = buildWhere({ ...filter, box });
    const rows = await db.query(`SELECT latitude, longitude FROM reports ${where}`, params);
    return rows.filter((r) => haversineM(lat, lng, Number(r.latitude), Number(r.longitude)) <= radiusM).length;
  },

  /** Image hashes of reports near a point (duplicate detection input). */
  async hashesNear(lat, lng, radiusM, limit = 20) {
    const box = boundingBox(lat, lng, radiusM);
    const rows = await db.query(
      `SELECT ai_image_hash, latitude, longitude FROM reports
       WHERE ai_image_hash IS NOT NULL AND latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ? ORDER BY id DESC LIMIT 200`,
      [box.minLat, box.maxLat, box.minLng, box.maxLng]);
    return rows.filter((r) => haversineM(lat, lng, Number(r.latitude), Number(r.longitude)) <= radiusM).slice(0, limit).map((r) => r.ai_image_hash);
  },

  /** Admin triage queue: critical > high > medium > low, then most upvoted, then oldest. Adds priorityScore(rank) + upvoteCount like the old aggregation. */
  async priorityQueue({ skip = 0, limit = 10 }) {
    const rows = await db.query(
      `SELECT r.*,
         CASE r.priority WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 2 END AS rank_score,
         (SELECT COUNT(*) FROM report_upvotes u WHERE u.report_id = r.id) AS upvote_count
       FROM reports r WHERE r.status IN (?)
       ORDER BY rank_score DESC, upvote_count DESC, r.created_at ASC, r.id ASC LIMIT ? OFFSET ?`, [ACTIVE, limit, skip]);
    const list = await hydrate(rows);
    return list.map((rep, i) => Object.assign(rep, { priorityScore: Number(rows[i].rank_score), upvoteCount: Number(rows[i].upvote_count) }));
  },

  async heatmapGroups(box) {
    const { where, params } = buildWhere(box ? { statusIn: ACTIVE, box } : { statusIn: ACTIVE });
    const rows = await db.query(
      `SELECT ROUND(latitude, 3) AS lat, ROUND(longitude, 3) AS lng, COUNT(*) AS weight FROM reports ${where} GROUP BY ROUND(latitude, 3), ROUND(longitude, 3)`, params);
    return rows.map((r) => ({ lat: Number(r.lat), lng: Number(r.lng), weight: Number(r.weight) }));
  },

  /** Report counts per category for created_at in [from, to) — `to` optional. Most common first. */
  async categoryCounts(from, to) {
    const rows = await db.query(
      `SELECT category, COUNT(*) AS c FROM reports WHERE created_at >= ? ${to ? 'AND created_at < ?' : ''} GROUP BY category ORDER BY c DESC, category ASC`,
      to ? [from, to] : [from]);
    return rows.map((r) => ({ _id: r.category, count: Number(r.c) }));
  },

  async statusCounts() {
    const rows = await db.query('SELECT status, COUNT(*) AS c FROM reports GROUP BY status');
    return rows.map((r) => ({ _id: r.status, count: Number(r.c) }));
  },

  /** Busiest ~100 m grid cells among open reports. */
  async hotspots(limit = 5) {
    const rows = await db.query(
      `SELECT ROUND(latitude, 3) AS lat, ROUND(longitude, 3) AS lng, COUNT(*) AS issue_count, MIN(address) AS address
       FROM reports WHERE status IN (?) GROUP BY ROUND(latitude, 3), ROUND(longitude, 3) ORDER BY issue_count DESC, lat ASC, lng ASC LIMIT ?`, [ACTIVE, limit]);
    return rows.map((r) => ({ _id: { lat: Number(r.lat), lng: Number(r.lng) }, issueCount: Number(r.issue_count), address: r.address || '' }));
  },

  async update(id, patch, { changedBy = null, remarks = null } = {}) {
    const rid = parseId(id);
    if (patch.status !== undefined && !oneOf(patch.status, STATUSES)) throw validationError([`\`${patch.status}\` is not a valid enum value for path \`status\`.`]);
    if (patch.priority !== undefined && !oneOf(patch.priority, PRIORITIES)) throw validationError([`\`${patch.priority}\` is not a valid enum value for path \`priority\`.`]);
    if (patch.priorityZone && !oneOf(patch.priorityZone, PRIORITY_ZONES)) throw validationError(['`priorityZone` must be "school" or "hospital".']);
    const cols = { status: 'status', priority: 'priority', title: 'title', description: 'description', address: 'address', category: 'category',
      translatedDescription: 'translated_description', priorityScore: 'priority_score', confirmationCount: 'confirmation_count', priorityZone: 'priority_zone' };
    const bools = { rewardPending: 'reward_pending', rewardGranted: 'reward_granted', isVerifiedByCommunity: 'is_verified_by_community' };
    const aiCols = { severity: 'ai_severity', category: 'ai_category', confidence: 'ai_confidence', isDuplicate: 'ai_is_duplicate', duplicateOf: 'ai_duplicate_of', outcome: 'ai_outcome', message: 'ai_message' };
    const sets = [];
    const params = [];
    Object.entries(cols).forEach(([k, c]) => { if (patch[k] !== undefined) { sets.push(`${c} = ?`); params.push(patch[k]); } });
    Object.entries(bools).forEach(([k, c]) => { if (patch[k] !== undefined) { sets.push(`${c} = ?`); params.push(patch[k] ? 1 : 0); } });
    if (patch.aiAnalysis) {
      Object.entries(aiCols).forEach(([k, c]) => {
        if (patch.aiAnalysis[k] === undefined) return;
        sets.push(`${c} = ?`);
        const v = patch.aiAnalysis[k];
        params.push(k === 'isDuplicate' ? (v ? 1 : 0) : k === 'duplicateOf' ? tryId(v) : v);
      });
    }
    return db.transaction(async (tx) => {
      const [cur] = await tx.query('SELECT status FROM reports WHERE id = ? LIMIT 1 FOR UPDATE', [rid]);
      if (!cur) return null;
      const t = now();
      if (sets.length) {
        await tx.query(`UPDATE reports SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, [...params, t, rid]);
      }
      if (patch.status !== undefined && patch.status !== cur.status) {
        await tx.query('INSERT INTO report_status_history (report_id, old_status, new_status, changed_by, remarks, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [rid, cur.status, patch.status, changedBy ? tryId(changedBy) : null, remarks, t]);
      }
      const rows = await tx.query('SELECT * FROM reports WHERE id = ? LIMIT 1', [rid]);
      return rows[0];
    }).then(async (row) => (row ? (await hydrate([row]))[0] : null));
  },

  /**
   * Atomically move a report to 'resolved'. Returns { found, claimed, report }: only ONE concurrent caller gets
   * claimed=true, so the "issue fixed" reward can never be paid twice.
   */
  async claimResolution(id, { changedBy = null, remarks = null } = {}) {
    const rid = parseId(id);
    const outcome = await db.transaction(async (tx) => {
      const [cur] = await tx.query('SELECT status FROM reports WHERE id = ? LIMIT 1 FOR UPDATE', [rid]);
      if (!cur) return { found: false, claimed: false };
      if (cur.status === 'resolved') return { found: true, claimed: false };
      const t = now();
      await tx.query("UPDATE reports SET status = 'resolved', updated_at = ? WHERE id = ?", [t, rid]);
      await tx.query('INSERT INTO report_status_history (report_id, old_status, new_status, changed_by, remarks, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [rid, cur.status, 'resolved', changedBy ? tryId(changedBy) : null, remarks, t]);
      return { found: true, claimed: true };
    });
    return { ...outcome, report: outcome.found ? await Report.findById(rid) : null };
  },

  /** Toggle a user's upvote. Returns { upvotes: count, upvoted } or null if the report does not exist. */
  async toggleUpvote(id, userId) {
    const rid = parseId(id);
    const uid = parseId(userId, 'userId');
    return db.transaction(async (tx) => {
      const [rep] = await tx.query('SELECT id FROM reports WHERE id = ? LIMIT 1 FOR UPDATE', [rid]);
      if (!rep) return null;
      const existing = await tx.query('SELECT user_id FROM report_upvotes WHERE report_id = ? AND user_id = ?', [rid, uid]);
      if (existing.length) await tx.query('DELETE FROM report_upvotes WHERE report_id = ? AND user_id = ?', [rid, uid]);
      else await tx.query('INSERT INTO report_upvotes (report_id, user_id, created_at) VALUES (?, ?, ?)', [rid, uid, now()]);
      const [c] = await tx.query('SELECT COUNT(*) AS c FROM report_upvotes WHERE report_id = ?', [rid]);
      return { upvotes: Number(c.c), upvoted: existing.length === 0 };
    });
  },

  /**
   * Record a community confirmation and escalate priority (3 -> high, 5 -> critical), atomically.
   * Returns { status: 'ok'|'not_found'|'own'|'duplicate', report }.
   */
  async confirm(id, userId, remarks) {
    const rid = parseId(id);
    const uid = parseId(userId, 'userId');
    const outcome = await db.transaction(async (tx) => {
      const [rep] = await tx.query('SELECT * FROM reports WHERE id = ? LIMIT 1 FOR UPDATE', [rid]);
      if (!rep) return { status: 'not_found' };
      if (rep.submitted_by !== null && String(rep.submitted_by) === String(uid)) return { status: 'own' };
      const dup = await tx.query('SELECT id FROM report_confirmations WHERE report_id = ? AND user_id = ?', [rid, uid]);
      if (dup.length) return { status: 'duplicate' };
      const t = now();
      await tx.query('INSERT INTO report_confirmations (report_id, user_id, confirmed_at, remarks) VALUES (?, ?, ?, ?)',
        [rid, uid, t, remarks || 'Confirmed genuine active civic issue.']);
      const [c] = await tx.query('SELECT COUNT(*) AS c FROM report_confirmations WHERE report_id = ?', [rid]);
      const count = Number(c.c);
      const priority = count >= 5 ? 'critical' : count >= 3 ? 'high' : rep.priority;
      await tx.query('UPDATE reports SET confirmation_count = ?, priority_score = ?, priority = ?, is_verified_by_community = 1, updated_at = ? WHERE id = ?',
        [count, Number(rep.priority_score || 10) + 15, priority, t, rid]);
      return { status: 'ok' };
    });
    return { ...outcome, report: outcome.status === 'ok' ? await Report.findById(rid) : null };
  },

  /**
   * Atomically claim the one-time submit reward. Returns true only for the single caller that flips
   * reward_pending 1 -> 0, so concurrent confirms / status changes can never award it twice.
   */
  async claimSubmitReward(id) {
    const r = await db.query('UPDATE reports SET reward_granted = 1, reward_pending = 0, updated_at = ? WHERE id = ? AND reward_pending = 1 AND reward_granted = 0', [now(), parseId(id)]);
    return r.affectedRows === 1;
  },

  async delete(id) {
    const rep = await Report.findById(id);
    if (!rep) return null;
    await db.query('DELETE FROM reports WHERE id = ?', [parseId(id)]);
    return rep;
  },

  async statusHistory(id) {
    const rows = await db.query('SELECT old_status, new_status, changed_by, remarks, created_at FROM report_status_history WHERE report_id = ? ORDER BY id ASC', [parseId(id)]);
    return rows.map((r) => ({ oldStatus: r.old_status, newStatus: r.new_status, changedBy: idStr(r.changed_by), remarks: r.remarks, createdAt: toDate(r.created_at) }));
  },

  /**
   * Replace foreign-key ids with small objects (Mongoose populate equivalent).
   * options: { submittedBy: ['name','email','avatar'], assignedTo: true, duplicateOf: ['title','status'] }
   * Works on one report or an array and returns the same.
   */
  async populate(target, options = {}) {
    const list = Array.isArray(target) ? target : [target];
    if (options.submittedBy) {
      const ids = [...new Set(list.map((r) => tryId(r.submittedBy && r.submittedBy._id ? r.submittedBy._id : r.submittedBy)).filter((x) => x !== null))];
      const users = ids.length ? await db.query('SELECT id, name, email, avatar FROM users WHERE id IN (?)', [ids]) : [];
      const byId = new Map(users.map((u) => [String(u.id), u]));
      list.forEach((r) => {
        const u = byId.get(String(r.submittedBy && r.submittedBy._id ? r.submittedBy._id : r.submittedBy));
        r.submittedBy = u ? Object.fromEntries([['_id', String(u.id)], ...options.submittedBy.map((f) => [f, u[f] ?? null])]) : null;
      });
    }
    if (options.duplicateOf) {
      const ids = [...new Set(list.map((r) => tryId(r.aiAnalysis.duplicateOf)).filter((x) => x !== null))];
      const rows = ids.length ? await db.query('SELECT id, title, status, category, address FROM reports WHERE id IN (?)', [ids]) : [];
      const byId = new Map(rows.map((x) => [String(x.id), x]));
      list.forEach((r) => {
        const o = byId.get(String(r.aiAnalysis.duplicateOf));
        if (r.aiAnalysis.duplicateOf) r.aiAnalysis.duplicateOf = o ? Object.fromEntries([['_id', String(o.id)], ...options.duplicateOf.map((f) => [f, o[f] ?? null])]) : null;
      });
    }
    if (options.assignedTo) {
      const WorkOrder = require('./WorkOrder'); // lazy: WorkOrder depends on Report-shaped data too
      for (const r of list) r.assignedTo = r.assignedTo ? await WorkOrder.findById(r.assignedTo) : null;
    }
    return target;
  },

  pick,
};

module.exports = Report;
