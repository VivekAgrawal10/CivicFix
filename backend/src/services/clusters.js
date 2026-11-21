/**
 * clusters.js — "the same problem reported by several people".
 *
 * Two reports belong to the same cluster when they have the SAME category, are both still open
 * (pending / assigned / in progress) and are within CLUSTER_RADIUS_M metres of each other. The groups are
 * computed on demand (nothing is stored), so a new report joins its cluster as soon as it is filed.
 */
const Report = require('../models/Report');
const Admin = require('../models/Admin');
const { haversineM } = require('../db/util');

// Reports within this many metres of the FIRST report of a problem are treated as the same problem. People rarely drop a pin
// on exactly the same spot, so the default is generous; set CLUSTER_RADIUS_M in backend/.env to tighten or loosen it.
const CLUSTER_RADIUS_M = Math.max(10, parseInt(process.env.CLUSTER_RADIUS_M, 10) || 100);
// Categories that people use interchangeably for the same thing on the road
const FAMILY = { pothole: 'road', road_damage: 'road', waterlogging: 'water', drainage: 'water' };
const familyOf = (category) => FAMILY[category] || category;
const RANK = { low: 0, medium: 1, high: 2, critical: 3 };

const coords = (r) => [r.location.coordinates[1], r.location.coordinates[0]]; // [lat, lng]

/**
 * Pure: group reports of the same kind that are close together. The OLDEST report of a problem is the anchor: a later
 * report joins it when it is within radiusM of that anchor, so a long road never turns into one giant cluster.
 * Returns arrays of reports (oldest first), biggest first.
 */
function groupReports(reports, radiusM = CLUSTER_RADIUS_M) {
  const ordered = [...reports].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt) || String(a._id).localeCompare(String(b._id), undefined, { numeric: true }));
  const groups = [];
  for (const r of ordered) {
    const [lat, lng] = coords(r);
    const home = groups.find((g) => g.family === familyOf(r.category) && haversineM(g.lat, g.lng, lat, lng) <= radiusM);
    if (home) home.items.push(r);
    else groups.push({ family: familyOf(r.category), lat, lng, items: [r] });
  }
  return groups.map((g) => g.items).sort((a, b) => b.length - a.length);
}

/**
 * The other open reports of the same problem as `report` (same grouping the admin sees on the Clusters page).
 * `report` itself may already be resolved; it is included in the grouping so it keeps its place.
 */
async function clusterMates(report, radiusM = CLUSTER_RADIUS_M) {
  const [lng, lat] = report.location.coordinates;
  const near = await Report.nearby({ lat, lng, radiusM: radiusM * 3, filter: { statusIn: Report.ACTIVE }, limit: 500 });
  const pool = near.filter((r) => r._id !== report._id && familyOf(r.category) === familyOf(report.category));
  if (!pool.length) return [];
  const group = groupReports([...pool, report], radiusM).find((g) => g.some((r) => r._id === report._id)) || [];
  const others = group.filter((r) => r._id !== report._id);
  if (!others.length) return [];
  const moderation = await Admin.moderationFor(others.map((r) => r._id));
  return others.filter((r) => !(moderation.get(r._id) && moderation.get(r._id).verdict === 'fake'));
}

/** report id -> number of OTHER open reports of the same problem (for the badge in the admin list) */
function memberCounts(groups) {
  const m = new Map();
  groups.forEach((g) => g.reports.forEach((r) => m.set(r._id, g.count - 1)));
  return m;
}

/** All open clusters with 2+ reports, ready for the admin screen. */
async function listClusters({ radiusM = CLUSTER_RADIUS_M } = {}) {
  const open = await Report.list({ filter: { statusIn: Report.ACTIVE }, skip: 0, limit: 2000, order: 'created_at ASC, id ASC' });
  const moderation = await Admin.moderationFor(open.map((r) => r._id));
  const live = open.filter((r) => !(moderation.get(r._id) && moderation.get(r._id).verdict === 'fake'));
  await Report.populate(live, { submittedBy: ['name'] });
  const orders = await Admin.workOrdersForReports(live.map((r) => r._id));
  return groupReports(live, radiusM).filter((g) => g.length > 1).map((g) => {
    const primary = g[0]; // the oldest report leads the cluster
    const lat = g.reduce((s, r) => s + r.location.coordinates[1], 0) / g.length;
    const lng = g.reduce((s, r) => s + r.location.coordinates[0], 0) / g.length;
    const priority = g.reduce((best, r) => (RANK[r.priority] > RANK[best] ? r.priority : best), 'low');
    const zone = (g.find((r) => r.priorityZone) || {}).priorityZone || null;
    const job = g.map((r) => orders.get(r._id)).find(Boolean) || null;
    return {
      key: primary._id,
      primaryId: primary._id,
      category: primary.category,
      categories: [...new Set(g.map((r) => r.category))],
      address: primary.address || '',
      center: { lat, lng },
      count: g.length,
      priority,
      priorityZone: zone,
      workOrder: job ? { _id: job._id, status: job.status, contractorName: job.contractorName } : null,
      reports: g.map((r) => ({
        _id: r._id, title: r.title, status: r.status, priority: r.priority, priorityZone: r.priorityZone,
        reporter: r.submittedBy ? r.submittedBy.name : 'Citizen', createdAt: r.createdAt,
      })),
    };
  }).sort((a, b) => (RANK[b.priority] - RANK[a.priority]) || (b.count - a.count));
}

module.exports = { CLUSTER_RADIUS_M, groupReports, clusterMates, listClusters, memberCounts };
