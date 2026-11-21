/**
 * init.js — create the database (if missing) and apply database/schema.sql.
 *   CLI:  npm run db:init        Server start-up also calls initSchema() (idempotent).
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const db = require('../config/mysql');

const SCHEMA_FILE = path.join(__dirname, '../../database/schema.sql');

/** Split schema.sql into statements (comment lines removed; statements end with ';' at end of line). */
function loadStatements(file = SCHEMA_FILE) {
  const text = fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
  return text
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function ensureDatabase() {
  if (db.isInjected()) return;
  const cfg = db.getConfig();
  if (!/^[A-Za-z0-9_]+$/.test(cfg.database)) {
    throw new Error('MYSQL_DATABASE may only contain letters, digits and underscores.');
  }
  const conn = await mysql.createConnection({ host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password });
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${cfg.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  } catch (err) {
    // A user without CREATE privilege can still use a database that an admin created beforehand;
    // genuine connection problems (ECONNREFUSED, bad password) already failed in createConnection above.
    if (!String(err.code || '').startsWith('ER_')) throw err;
  } finally {
    await conn.end();
  }
}

// Columns added after the first release. CREATE TABLE IF NOT EXISTS does not touch a table that already exists,
// so an older database gets them here (MySQL 8 has no "ADD COLUMN IF NOT EXISTS").
const COLUMN_MIGRATIONS = [
  { table: 'reports', column: 'priority_zone', ddl: 'ALTER TABLE reports ADD COLUMN priority_zone VARCHAR(20) NULL AFTER is_verified_by_community' },
];

async function applyColumnMigrations() {
  for (const m of COLUMN_MIGRATIONS) {
    const rows = await db.query(
      'SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
      [m.table, m.column]
    );
    if (Number(rows[0].c) === 0) await db.query(m.ddl);
  }
}

async function initSchema() {
  // A pool injected by the test-suite (tests/helpers/testDb.js) already has its schema loaded.
  if (db.isInjected()) return;
  await ensureDatabase();
  for (const statement of loadStatements()) {
    await db.query(statement);
  }
  await applyColumnMigrations();
}

module.exports = { initSchema, ensureDatabase, loadStatements, COLUMN_MIGRATIONS };

if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
  initSchema()
    .then(() => {
      console.log(`✅ MySQL schema ready in database "${db.getConfig().database}"`);
      return db.closePool();
    })
    .catch((err) => {
      console.error('❌ Could not initialise the MySQL schema:', err.message);
      process.exit(1);
    });
}
