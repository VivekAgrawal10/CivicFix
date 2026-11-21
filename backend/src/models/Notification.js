/** Notification — MySQL data access (table: notifications). */
const db = require('../config/mysql');
const { parseId, tryId, idStr, toDate, toBool, now, validationError, oneOf } = require('../db/util');

const TYPES = ['report_update', 'work_order', 'civic_alert', 'system'];

function toNotification(row) {
  return {
    _id: idStr(row.id),
    recipient: idStr(row.recipient_id),
    type: row.type,
    title: row.title,
    message: row.message,
    isRead: toBool(row.is_read),
    relatedReport: idStr(row.related_report_id),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  };
}

function check(d) {
  const errs = [];
  if (!d.recipient) errs.push('Recipient is required');
  if (!d.type) errs.push('Notification type is required');
  else if (!oneOf(d.type, TYPES)) errs.push(`\`${d.type}\` is not a valid enum value for path \`type\`.`);
  if (!d.title || !String(d.title).trim()) errs.push('Title is required');
  if (!d.message || !String(d.message).trim()) errs.push('Message is required');
  if (errs.length) throw validationError(errs);
}

const Notification = {
  async create(d) {
    check(d);
    const t = now();
    const r = await db.query(
      `INSERT INTO notifications (recipient_id, type, title, message, is_read, related_report_id, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
      [parseId(d.recipient, 'recipient'), d.type, String(d.title).trim(), String(d.message).trim(), d.relatedReport ? tryId(d.relatedReport) : null, t, t]);
    return Notification.findById(r.insertId);
  },

  /** Bulk insert (broadcast alerts) in one transaction. Returns the number inserted. */
  async insertMany(docs) {
    docs.forEach(check);
    await db.transaction(async (tx) => {
      for (const d of docs) {
        const t = now();
        await tx.query(
          `INSERT INTO notifications (recipient_id, type, title, message, is_read, related_report_id, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
          [parseId(d.recipient, 'recipient'), d.type, String(d.title).trim(), String(d.message).trim(), d.relatedReport ? tryId(d.relatedReport) : null, t, t]);
      }
    });
    return docs.length;
  },

  async findById(id) {
    const rows = await db.query('SELECT * FROM notifications WHERE id = ? LIMIT 1', [parseId(id)]);
    return rows.length ? toNotification(rows[0]) : null;
  },

  async list({ recipient, type, skip = 0, limit = 10 }) {
    const cond = ['recipient_id = ?'];
    const params = [parseId(recipient, 'recipient')];
    if (type) { cond.push('type = ?'); params.push(type); }
    const rows = await db.query(`SELECT * FROM notifications WHERE ${cond.join(' AND ')} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`, [...params, limit, skip]);
    return rows.map(toNotification);
  },

  async count({ recipient, isRead } = {}) {
    const cond = ['recipient_id = ?'];
    const params = [parseId(recipient, 'recipient')];
    if (isRead !== undefined) { cond.push('is_read = ?'); params.push(isRead ? 1 : 0); }
    const [r] = await db.query(`SELECT COUNT(*) AS c FROM notifications WHERE ${cond.join(' AND ')}`, params);
    return Number(r.c);
  },

  /** Mark one notification read (only if it belongs to `recipient`). Returns the updated notification or null. */
  async markRead(id, recipient) {
    const nid = tryId(id);
    if (nid === null) throw Object.assign(new Error('Invalid value for field: _id'), { name: 'CastError', path: '_id' });
    const res = await db.query('UPDATE notifications SET is_read = 1, updated_at = ? WHERE id = ? AND recipient_id = ?', [now(), nid, parseId(recipient, 'recipient')]);
    return res.affectedRows ? Notification.findById(nid) : null;
  },

  async markAllRead(recipient) {
    const res = await db.query('UPDATE notifications SET is_read = 1, updated_at = ? WHERE recipient_id = ? AND is_read = 0', [now(), parseId(recipient, 'recipient')]);
    return res.affectedRows;
  },

  /** Replace relatedReport ids with { _id, ...fields } (Mongoose populate equivalent). */
  async populateReport(list, fields) {
    const ids = [...new Set(list.map((n) => tryId(n.relatedReport)).filter((x) => x !== null))];
    const rows = ids.length ? await db.query('SELECT * FROM reports WHERE id IN (?)', [ids]) : [];
    const Report = require('./Report');
    const reports = new Map((await Promise.all(rows.map((r) => Report.findById(r.id)))).map((r) => [r._id, r]));
    list.forEach((n) => {
      if (!n.relatedReport) return;
      const rep = reports.get(String(n.relatedReport));
      n.relatedReport = rep ? Object.fromEntries([['_id', rep._id], ...fields.map((f) => [f, rep[f]])]) : null;
    });
    return list;
  },
};

module.exports = Notification;
