/**
 * mysql.js — the ONLY database connection for CivicFix (MySQL 8 via mysql2/promise).
 *
 * One lazily-created, reusable connection pool configured from:
 *   MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
 * (+ optional MYSQL_CONNECTION_LIMIT).  There is no other datastore and no fallback.
 *
 * query()/transaction() always return plain rows (SELECT) or the ResultSetHeader
 * ({ insertId, affectedRows }) for writes, so callers never deal with mysql2's [rows, fields] tuple.
 * We use pool.query (client-side escaping) rather than execute: it supports `IN (?)` with arrays and
 * numeric LIMIT/OFFSET parameters on every MySQL 8 minor version.
 */
const mysql = require('mysql2/promise');

let pool = null;
let injected = false;

function getConfig() {
  return {
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'civicfix_db',
  };
}

function getPool() {
  if (!pool) {
    const cfg = getConfig();
    pool = mysql.createPool({
      ...cfg,
      waitForConnections: true,
      connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT) || 10,
      queueLimit: 0,
      charset: 'utf8mb4',
      timezone: 'Z', // DATETIME values are stored and read as UTC
      decimalNumbers: true, // DECIMAL columns come back as numbers, not strings
      supportBigNumbers: true,
      bigNumberStrings: false,
    });
  }
  return pool;
}

/** Test hook: inject a pool-compatible object (see tests/helpers/testDb.js). */
function setPool(customPool) {
  pool = customPool;
  injected = Boolean(customPool);
}
const isInjected = () => injected;

async function query(sql, params = []) {
  const [result] = await getPool().query(sql, params);
  return result;
}

/** Run `callback(tx)` in a transaction; `tx.query(sql, params)` behaves like query(). Rolls back on error. */
async function transaction(callback) {
  const conn = await getPool().getConnection();
  const tx = {
    query: async (sql, params = []) => {
      const [result] = await conn.query(sql, params);
      return result;
    },
  };
  try {
    await conn.beginTransaction();
    const out = await callback(tx);
    await conn.commit();
    return out;
  } catch (err) {
    try { await conn.rollback(); } catch (_) { /* connection already gone */ }
    throw err;
  } finally {
    conn.release();
  }
}

async function ping() {
  await query('SELECT 1');
}

async function closePool() {
  if (pool && typeof pool.end === 'function') await pool.end();
  pool = null;
  injected = false;
}

// MySQL is the only database, so it is always "available"; kept for backwards compatibility.
const isMySqlAvailable = () => true;

module.exports = { getConfig, getPool, setPool, isInjected, query, transaction, ping, closePool, isMySqlAvailable };
