/**
 * seed.js — CivicFix database seeder
 * Usage: node src/seeds/seed.js
 *
 * Creates:
 *  - 1 admin user
 *  - 1 citizen user
 *  - 1 contractor user
 * No demo reports or work orders are created: the app starts empty and only shows real reports.
 * Re-running the seed also removes any reports/work orders that belonged to these three demo accounts.
 */

require('dotenv').config();
const db = require('../config/mysql');
const { initSchema, ensureDatabase } = require('../db/init');

const User = require('../models/User');

const log = (msg) => console.log(`[Seed] ${msg}`);

async function seed() {
  log('Connecting to MySQL…');
  await ensureDatabase();
  await initSchema();
  await db.ping();
  log('Connected, schema ready.');

  // ── Clean previous seed data ──────────────────────────────────────────────
  // Deleting the seed users cascades to their badges/history; their reports are removed first
  // (reports.submitted_by is ON DELETE SET NULL, which would otherwise leave orphaned demo reports).
  const seedEmails = ['admin@civicfix.com', 'citizen@civicfix.com', 'contractor@civicfix.com'];
  for (const email of seedEmails) {
    const u = await User.findByEmail(email);
    if (!u) continue;
    await db.query('DELETE FROM work_orders WHERE created_by = ? OR assigned_contractor = ?', [u._id, u._id]);
    await db.query('DELETE FROM reports WHERE submitted_by = ?', [u._id]);
    await User.delete(u._id);
  }
  log('Cleared existing seed users.');

  // ── Users ─────────────────────────────────────────────────────────────────
  const admin = await User.create({
    name: 'CivicFix Admin',
    email: 'admin@civicfix.com',
    password: 'Admin@123',
    role: 'admin',
    language: 'en',
    phone: '9000000001',
    isActive: true,
  });
  log(`Created admin: ${admin.email}`);

  const citizen = await User.create({
    name: 'Demo Citizen',
    email: 'citizen@civicfix.com',
    password: 'Demo@123',
    role: 'citizen',
    language: 'pa',
    phone: '9000000002',
    isActive: true,
  });
  log(`Created citizen: ${citizen.email}`);

  const contractor = await User.create({
    name: 'Demo Contractor',
    email: 'contractor@civicfix.com',
    password: 'Demo@123',
    role: 'contractor',
    language: 'en',
    phone: '9000000003',
    isActive: true,
  });
  log(`Created contractor: ${contractor.email}`);

  // ── Done ─────────────────────────────────────────────────────────────────
  log('Seed complete! Credentials:');
  log('  admin@civicfix.com     / Admin@123');
  log('  citizen@civicfix.com   / Demo@123');
  log('  contractor@civicfix.com / Demo@123');

  await db.closePool();
  log('Disconnected. Bye!');
}

seed().catch(async (err) => {
  console.error('[Seed] FATAL:', err.message);
  try { await db.closePool(); } catch (_) { /* ignore */ }
  process.exit(1);
});
