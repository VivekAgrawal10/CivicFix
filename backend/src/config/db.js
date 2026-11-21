/**
 * db.js — start-up connection check. MySQL is the only database: connect, make sure the schema exists,
 * and FAIL FAST if MySQL is unreachable (there is no fallback datastore).
 */
const { ping, getConfig, isInjected } = require('./mysql');
const { initSchema } = require('../db/init');

const connectDB = async () => {
  const cfg = getConfig();
  try {
    await initSchema();
    await ping();
    console.log(isInjected() ? '✅ Test database adapter ready (injected pool)' : `✅ MySQL connected: ${cfg.user}@${cfg.host}:${cfg.port}/${cfg.database}`);
  } catch (error) {
    console.error(`❌ MySQL connection error: ${error.message}`);
    console.error(`   Check MYSQL_HOST / MYSQL_PORT / MYSQL_USER / MYSQL_PASSWORD / MYSQL_DATABASE in backend/.env and that MySQL is running.`);
    if (process.env.NODE_ENV !== 'test') process.exit(1);
    throw error;
  }
};

module.exports = connectDB;
