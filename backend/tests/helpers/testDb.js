/**
 * testDb.js — database backend for the backend test-suite.
 *
 *   TEST_DB unset / "sqlite"  → an in-memory SQLite database (node:sqlite) behind a mysql2-compatible pool.
 *                               The real database/schema.sql is translated to SQLite DDL, so tables, columns,
 *                               UNIQUE / FOREIGN KEY constraints and the reporting views are all exercised.
 *                               Needs Node >= 22.5 and no MySQL server.
 *   TEST_DB=mysql             → the REAL MySQL server from MYSQL_HOST/PORT/USER/PASSWORD/MYSQL_DATABASE.
 *                               MYSQL_DATABASE must contain "test" (the tables are emptied between suites).
 *
 * The same test files run against both, so a pass on SQLite can be re-confirmed on MySQL with:
 *   TEST_DB=mysql MYSQL_DATABASE=civicfix_test npm test
 */
const path = require('path');
const db = require('../../src/config/mysql');
const { loadStatements, initSchema } = require('../../src/db/init');

const TABLES = [
  'admin_activity', 'report_moderation', 'translations', 'road_segment_points', 'road_segments', 'notifications', 'work_order_evidence', 'work_orders',
  'report_status_history', 'report_confirmations', 'report_upvotes', 'report_images', 'reports',
  'creds_history', 'user_badges', 'users',
];

// ── schema.sql (MySQL) → SQLite ────────────────────────────────────────────────────────────
function translateCreateTable(stmt) {
  const m = /CREATE TABLE IF NOT EXISTS (\w+) \(([\s\S]*)\)\s*ENGINE[\s\S]*$/.exec(stmt);
  if (!m) throw new Error('Cannot translate: ' + stmt.slice(0, 60));
  const lines = m[2].split(/,\s*\n/).map((l) => l.trim()).filter(Boolean);
  const out = [];
  for (let line of lines) {
    if (/^KEY\s/i.test(line)) continue; // secondary indexes are irrelevant for correctness here
    line = line.replace(/^UNIQUE KEY \w+\s*/i, 'UNIQUE ');
    line = line.replace(/^CONSTRAINT \w+ /i, '');
    if (/^id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY/i.test(line)) { out.push('id INTEGER PRIMARY KEY AUTOINCREMENT'); continue; }
    const col = /^(\w+)\s+(.*)$/.exec(line);
    if (col && !/^(UNIQUE|PRIMARY|FOREIGN)/i.test(line)) {
      let rest = col[2];
      const en = /^ENUM\(([^)]*)\)/i.exec(rest);
      if (en) rest = rest.replace(/^ENUM\([^)]*\)/i, `TEXT CHECK (${col[1]} IN (${en[1]}))`);
      rest = rest
        .replace(/^BIGINT UNSIGNED/i, 'INTEGER').replace(/^TINYINT\(1\)/i, 'INTEGER').replace(/^INT\b/i, 'INTEGER')
        .replace(/^VARCHAR\(\d+\)/i, 'TEXT').replace(/^DATETIME\(3\)/i, 'TEXT').replace(/^DECIMAL\(\d+,\s*\d+\)/i, 'REAL').replace(/^DOUBLE/i, 'REAL')
        .replace(/ON UPDATE CURRENT_TIMESTAMP\(3\)/i, '')
        .replace(/DEFAULT CURRENT_TIMESTAMP\(3\)/i, "DEFAULT (strftime('%Y-%m-%d %H:%M:%f','now'))");
      out.push(`${col[1]} ${rest}`.trim());
    } else {
      out.push(line);
    }
  }
  return `CREATE TABLE IF NOT EXISTS ${m[1]} (${out.join(', ')})`;
}

function translateView(stmt) {
  const name = /CREATE OR REPLACE VIEW (\w+)/.exec(stmt)[1];
  let body = stmt.replace(/CREATE OR REPLACE VIEW \w+ AS/, '');
  body = body
    .replace(/TIMESTAMPDIFF\(HOUR,\s*([\w.]+),\s*UTC_TIMESTAMP\(\)\)/g, "CAST((julianday('now') - julianday($1)) * 24 AS INTEGER)")
    .replace(/TIMESTAMPDIFF\(DAY,\s*([\w.]+),\s*UTC_TIMESTAMP\(\)\)/g, "CAST(julianday('now') - julianday($1) AS INTEGER)")
    .replace(/TIMESTAMPDIFF\(MINUTE,\s*([\w.]+),\s*([\w.]+)\)/g, '((julianday($2) - julianday($1)) * 1440)')
    .replace(/\bGREATEST\(/g, 'MAX(').replace(/\bLEAST\(/g, 'MIN(');
  return [`DROP VIEW IF EXISTS ${name}`, `CREATE VIEW ${name} AS ${body}`];
}

// ── runtime SQL (MySQL dialect used by src/models) → SQLite ───────────────────────────────────
const pad = (n, w = 2) => String(n).padStart(w, '0');
const fmtDate = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${pad(d.getUTCMilliseconds(), 3)}`;

function prepare(sql, params = []) {
  const out = [];
  let i = 0;
  const text = sql.replace(/\bFOR UPDATE\b/gi, '').replace(/\?/g, () => {
    const p = params[i++];
    if (Array.isArray(p)) { p.forEach((x) => out.push(x)); return p.length ? `(${p.map(() => '?').join(',')})`.slice(1, -1) : 'NULL'; }
    out.push(p);
    return '?';
  });
  const bound = out.map((v) => (v instanceof Date ? fmtDate(v) : typeof v === 'boolean' ? (v ? 1 : 0) : v === undefined ? null : typeof v === 'bigint' ? Number(v) : v));
  return { text, bound };
}

function mapError(err) {
  const msg = String(err.message || '');
  if (/UNIQUE constraint failed: (\w+)\.(\w+)/.test(msg)) {
    const [, t, c] = /UNIQUE constraint failed: (\w+)\.(\w+)/.exec(msg);
    return Object.assign(new Error(`Duplicate entry for key '${t}.${c}'`), { code: 'ER_DUP_ENTRY', errno: 1062 });
  }
  if (/FOREIGN KEY constraint failed/.test(msg)) return Object.assign(new Error('Cannot add or update a child row: a foreign key constraint fails'), { code: 'ER_NO_REFERENCED_ROW_2', errno: 1452 });
  if (/CHECK constraint failed/.test(msg)) return Object.assign(new Error('Data truncated (invalid ENUM value)'), { code: 'WARN_DATA_TRUNCATED', errno: 1265 });
  return err;
}

class Mutex {
  constructor() { this.q = []; this.locked = false; }
  acquire() {
    return new Promise((resolve, reject) => {
      const grant = () => { this.locked = true; resolve(() => this.release()); };
      if (!this.locked) return grant();
      const timer = setTimeout(() => reject(new Error('testDb: timed out waiting for the connection — a pool.query() inside an open transaction would deadlock a 1-connection pool')), 8000);
      this.q.push(() => { clearTimeout(timer); grant(); });
    });
  }
  release() { const next = this.q.shift(); if (next) next(); else this.locked = false; }
}

function createSqlitePool() {
  const { DatabaseSync } = require('node:sqlite');
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  const mutex = new Mutex();

  const run = (sql, params) => {
    const { text, bound } = prepare(sql, params);
    const isRead = /^\s*(SELECT|WITH|PRAGMA)\b/i.test(text);
    try {
      const stmt = sqlite.prepare(text);
      if (isRead) return [stmt.all(...bound).map((r) => ({ ...r }))];
      const r = stmt.run(...bound);
      return [{ insertId: Number(r.lastInsertRowid), affectedRows: Number(r.changes) }];
    } catch (err) { throw mapError(err); }
  };

  return {
    exec: (sql) => sqlite.exec(sql),
    async query(sql, params) { const release = await mutex.acquire(); try { return run(sql, params); } finally { release(); } },
    async getConnection() {
      const release = await mutex.acquire();
      return {
        query: async (sql, params) => run(sql, params),
        beginTransaction: async () => sqlite.exec('BEGIN'),
        commit: async () => sqlite.exec('COMMIT'),
        rollback: async () => { try { sqlite.exec('ROLLBACK'); } catch (_) { /* no active tx */ } },
        release,
      };
    },
    async end() { sqlite.close(); },
  };
}

function loadSqliteSchema(pool) {
  for (const stmt of loadStatements()) {
    if (/^CREATE TABLE/i.test(stmt)) pool.exec(translateCreateTable(stmt));
    else if (/^CREATE OR REPLACE VIEW/i.test(stmt)) translateView(stmt).forEach((s) => pool.exec(s));
    else throw new Error('Unhandled schema statement: ' + stmt.slice(0, 60));
  }
}

// ── public API ────────────────────────────────────────────────────────────────────────────
const backend = () => (String(process.env.TEST_DB || 'sqlite').toLowerCase() === 'mysql' ? 'mysql' : 'sqlite');

async function setup() {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-not-for-production';
  if (backend() === 'mysql') {
    process.env.MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'civicfix_test';
    if (!/test/i.test(process.env.MYSQL_DATABASE)) {
      throw new Error(`Refusing to run tests against MYSQL_DATABASE="${process.env.MYSQL_DATABASE}": the name must contain "test" because tables are emptied.`);
    }
    await initSchema();
    await reset();
  } else {
    const pool = createSqlitePool();
    loadSqliteSchema(pool);
    db.setPool(pool);
  }
  return backend();
}

async function reset() {
  if (backend() === 'mysql') {
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of TABLES) await db.query(`TRUNCATE TABLE ${t}`);
    await db.query('SET FOREIGN_KEY_CHECKS = 1');
  } else {
    for (const t of TABLES) await db.query(`DELETE FROM ${t}`);
  }
}

async function teardown() { await db.closePool(); }

const label = () => (backend() === 'mysql'
  ? `REAL MySQL (${db.getConfig().host}:${db.getConfig().port}/${db.getConfig().database})`
  : 'in-memory SQLite adapter (schema.sql translated; NOT a MySQL server)');

module.exports = { setup, reset, teardown, backend, label, TABLES, translateCreateTable, translateView };
