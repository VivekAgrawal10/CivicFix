/**
 * User — MySQL data access (tables: users, user_badges, creds_history).
 * Returns objects shaped like the former Mongoose documents (`_id` as string, badges/credsHistory arrays)
 * so API responses are unchanged.  The password hash is only returned with { withPassword: true }.
 */
const bcrypt = require('bcryptjs');
const db = require('../config/mysql');
const { parseId, tryId, idStr, toDate, toBool, now, validationError, oneOf } = require('../db/util');

const ROLES = ['citizen', 'admin', 'contractor'];
const LANGS = ['en', 'pa', 'hi'];
const HISTORY_LIMIT = 50;

function toUser(row, badges = [], history = [], withPassword = false) {
  const u = {
    _id: idStr(row.id),
    name: row.name,
    email: row.email,
    role: row.role,
    language: row.language,
    fcmToken: row.fcm_token || null,
    avatar: row.avatar || null,
    civicCreds: Number(row.civic_creds),
    civicScore: Number(row.civic_score),
    citizenTier: row.citizen_tier,
    badges,
    credsHistory: history,
    isActive: toBool(row.is_active),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  };
  if (row.phone) u.phone = row.phone;
  if (withPassword) u.password = row.password;
  return u;
}

/** Batch-load badges + latest credit history for a set of user rows. */
async function hydrate(rows, withPassword = false) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [badgeRows, historyRows] = await Promise.all([
    db.query('SELECT user_id, badge FROM user_badges WHERE user_id IN (?) ORDER BY sort_order ASC', [ids]),
    db.query('SELECT user_id, action, amount, details, created_at FROM creds_history WHERE user_id IN (?) ORDER BY created_at DESC, id DESC', [ids]),
  ]);
  const badges = new Map();
  badgeRows.forEach((b) => (badges.get(b.user_id) || badges.set(b.user_id, []).get(b.user_id)).push(b.badge));
  const history = new Map();
  historyRows.forEach((h) => {
    const list = history.get(h.user_id) || history.set(h.user_id, []).get(h.user_id);
    if (list.length < HISTORY_LIMIT) list.push({ action: h.action, amount: Number(h.amount), date: toDate(h.created_at), details: h.details });
  });
  // Newest 50 entries, returned oldest → newest like the former embedded array
  return rows.map((r) => toUser(r, badges.get(r.id) || [], (history.get(r.id) || []).slice().reverse(), withPassword));
}

function validate(d, { creating }) {
  const errs = [];
  if (creating || d.name !== undefined) {
    if (!d.name || !String(d.name).trim()) errs.push('Name is required');
    else if (String(d.name).trim().length > 100) errs.push('Name cannot exceed 100 characters');
  }
  if (creating || d.email !== undefined) {
    if (!d.email || !String(d.email).trim()) errs.push('Email is required');
    else if (!/^\S+@\S+\.\S+$/.test(String(d.email).trim())) errs.push('Please enter a valid email address');
  }
  if (creating) {
    if (!d.password) errs.push('Password is required');
    else if (String(d.password).length < 6) errs.push('Password must be at least 6 characters');
  }
  if (d.role !== undefined && !oneOf(d.role, ROLES)) errs.push(`\`${d.role}\` is not a valid enum value for path \`role\`.`);
  if (d.language !== undefined && !oneOf(d.language, LANGS)) errs.push(`\`${d.language}\` is not a valid enum value for path \`language\`.`);
  if (errs.length) throw validationError(errs);
}

const User = {
  ROLES,
  LANGS,

  async create(data) {
    validate(data, { creating: true });
    const hash = await bcrypt.hash(data.password, 12);
    const t = now();
    const result = await db.query(
      `INSERT INTO users (name, email, password, role, language, phone, avatar, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [String(data.name).trim(), String(data.email).trim().toLowerCase(), hash, data.role || 'citizen', data.language || 'en',
        data.phone ? String(data.phone).trim() : null, data.avatar || null, data.isActive === false ? 0 : 1, t, t]
    );
    await db.query('INSERT INTO user_badges (user_id, badge, sort_order) VALUES (?, ?, 0)', [result.insertId, 'Welcome Citizen']);
    return User.findById(result.insertId);
  },

  async findById(id, { withPassword = false } = {}) {
    const rows = await db.query('SELECT * FROM users WHERE id = ? LIMIT 1', [parseId(id)]);
    return rows.length ? (await hydrate(rows, withPassword))[0] : null;
  },

  /** Minimal lookup used on every authenticated request. */
  async findAuthById(id) {
    const n = tryId(id);
    if (n === null) return null;
    const rows = await db.query('SELECT id, role, language, is_active FROM users WHERE id = ? LIMIT 1', [n]);
    return rows.length ? { _id: idStr(rows[0].id), role: rows[0].role, language: rows[0].language, isActive: toBool(rows[0].is_active) } : null;
  },

  async findByEmail(email, { withPassword = false } = {}) {
    const rows = await db.query('SELECT * FROM users WHERE email = ? LIMIT 1', [String(email || '').trim().toLowerCase()]);
    return rows.length ? (await hydrate(rows, withPassword))[0] : null;
  },

  async list({ role, skip = 0, limit = 10 } = {}) {
    const where = role ? 'WHERE role = ?' : '';
    const rows = await db.query(`SELECT * FROM users ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`, role ? [role, limit, skip] : [limit, skip]);
    return hydrate(rows);
  },

  async count({ role, isActive } = {}) {
    const cond = [];
    const params = [];
    if (role) { cond.push('role = ?'); params.push(role); }
    if (isActive !== undefined) { cond.push('is_active = ?'); params.push(isActive ? 1 : 0); }
    const [r] = await db.query(`SELECT COUNT(*) AS c FROM users ${cond.length ? 'WHERE ' + cond.join(' AND ') : ''}`, params);
    return Number(r.c);
  },

  async update(id, fields) {
    validate(fields, { creating: false });
    const map = { name: 'name', phone: 'phone', avatar: 'avatar', language: 'language', fcmToken: 'fcm_token', role: 'role', isActive: 'is_active' };
    const sets = [];
    const params = [];
    for (const [k, col] of Object.entries(map)) {
      if (fields[k] !== undefined) {
        sets.push(`${col} = ?`);
        params.push(k === 'isActive' ? (fields[k] ? 1 : 0) : fields[k]);
      }
    }
    if (sets.length) {
      sets.push('updated_at = ?');
      params.push(now(), parseId(id));
      await db.query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
    }
    return User.findById(id);
  },

  async delete(id) {
    const user = await User.findById(id);
    if (!user) return null;
    await db.query('DELETE FROM users WHERE id = ?', [parseId(id)]);
    return user;
  },

  async comparePassword(user, candidate) {
    return bcrypt.compare(candidate, user.password);
  },

  /** Active users (id + fcm token) for broadcasts. */
  async activeRecipients() {
    const rows = await db.query('SELECT id, fcm_token FROM users WHERE is_active = 1');
    return rows.map((r) => ({ _id: idStr(r.id), fcmToken: r.fcm_token || null }));
  },

  async fcmToken(id) {
    const rows = await db.query('SELECT fcm_token FROM users WHERE id = ? LIMIT 1', [parseId(id)]);
    return rows.length ? rows[0].fcm_token || null : null;
  },

  async leaderboard(limit = 10) {
    const rows = await db.query(
      `SELECT * FROM users WHERE role = 'citizen' AND is_active = 1 ORDER BY civic_creds DESC, civic_score DESC, id ASC LIMIT ?`, [limit]);
    return hydrate(rows);
  },

  async contractors() {
    const rows = await db.query(`SELECT * FROM users WHERE role = 'contractor' AND is_active = 1 ORDER BY id ASC`);
    const users = await hydrate(rows);
    if (!users.length) return [];
    const stats = await db.query(
      `SELECT assigned_contractor AS cid,
              SUM(CASE WHEN status IN ('open','in_progress') THEN 1 ELSE 0 END) AS active_orders,
              SUM(CASE WHEN status IN ('completed','verified') THEN 1 ELSE 0 END) AS completed_orders
       FROM work_orders WHERE assigned_contractor IN (?) GROUP BY assigned_contractor`, [rows.map((r) => r.id)]);
    const byId = new Map(stats.map((s) => [idStr(s.cid), s]));
    return users.map((u) => {
      const s = byId.get(u._id) || {};
      return { u, activeOrders: Number(s.active_orders || 0), completedOrders: Number(s.completed_orders || 0) };
    });
  },

  /**
   * Atomically change a user's CivicCreds. `compute(user, recentHistory)` runs inside a transaction
   * (row locked with SELECT ... FOR UPDATE) and returns null to abort or
   * { amount, action, details, civicCreds, civicScore, citizenTier, badges } to apply.
   */
  async applyCredsChange(id, compute) {
    const uid = parseId(id);
    return db.transaction(async (tx) => {
      const rows = await tx.query('SELECT * FROM users WHERE id = ? LIMIT 1 FOR UPDATE', [uid]);
      if (!rows.length) return null;
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recent = await tx.query('SELECT action FROM creds_history WHERE user_id = ? AND created_at >= ?', [uid, since]);
      const badgeRows = await tx.query('SELECT badge FROM user_badges WHERE user_id = ? ORDER BY sort_order ASC', [uid]);
      const user = toUser(rows[0], badgeRows.map((b) => b.badge), []);
      const change = compute(user, recent.map((r) => r.action));
      if (!change) return null;
      const t = now();
      await tx.query('UPDATE users SET civic_creds = ?, civic_score = ?, citizen_tier = ?, updated_at = ? WHERE id = ?',
        [change.civicCreds, change.civicScore, change.citizenTier, t, uid]);
      await tx.query('INSERT INTO creds_history (user_id, action, amount, details, created_at) VALUES (?, ?, ?, ?, ?)',
        [uid, change.action, change.amount, change.details || null, t]);
      for (const badge of change.badges) {
        if (!user.badges.includes(badge)) {
          await tx.query('INSERT INTO user_badges (user_id, badge, sort_order) VALUES (?, ?, ?)', [uid, badge, user.badges.length]);
          user.badges.push(badge);
        }
      }
      return { civicCreds: change.civicCreds, civicScore: change.civicScore, citizenTier: change.citizenTier };
    });
  },
};

module.exports = User;
