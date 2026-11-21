/**
 * resolution.js — the money-and-trust moments of the admin workflow, in one place so every path
 * (work order verified, admin resolves directly, admin changes status to "resolved") behaves the same:
 *
 *   resolveReport      report -> resolved, the reporter's pending +25 is finalized, +50 "issue fixed" is paid ONCE
 *   rejectReportAsFake report -> closed, reporter loses 40 CivicCreds, pending reward cancelled, decision recorded
 *   verifyReport       admin confirms the report is genuine: pending +25 is released
 */
const Report = require('../models/Report');
const Admin = require('../models/Admin');
const { awardCivicCreds } = require('../utils/civicCreds');
const { notifyUser } = require('./notify');
const { emitToUser } = require('../config/socket');
const { clusterMates } = require('./clusters');

// Release the one-time submit reward (atomic claim: can never be paid twice)
async function finalizeSubmitReward(report) {
  if (!report.rewardPending || report.rewardGranted) return null;
  if (!(await Report.claimSubmitReward(report._id))) return null;
  report.rewardGranted = true;
  report.rewardPending = false;
  return awardCivicCreds(report.submittedBy, 'SUBMIT_REPORT', `Verified report: ${report.title}`);
}

// Everyone who reported the SAME problem at the SAME spot (see clusters.js) is told it is fixed, their report becomes
// "resolved" (which unlocks the certificate PDF in My Reports) and their pending submit reward is released.
// The +50 "issue fixed" bonus is paid to the report that was actually resolved only, so filing duplicates never pays extra.
async function resolveClusterMates(report, adminId) {
  const mates = await clusterMates(report);
  let resolved = 0;
  for (const mate of mates) {
    const claim = await Report.claimResolution(mate._id, { changedBy: adminId, remarks: `Resolved together with "${report.title}" (same problem, same location)` });
    if (!claim.claimed) continue;
    resolved++;
    if (String(mate.submittedBy) !== String(report.submittedBy)) await finalizeSubmitReward(claim.report); // one person cannot farm points with duplicates
    await notifyUser(mate.submittedBy, 'report_update', 'The problem you reported is fixed',
      `"${mate.title}" has been repaired. It was reported by ${mates.length + 1} people and fixed in one job. Download your resolution certificate (PDF) from My Reports.`, mate._id);
    emitToUser(String(mate.submittedBy), 'report_update', { reportId: mate._id, status: 'resolved' });
  }
  return resolved;
}

// When one report is assigned, the other open reports of the same problem follow it to "assigned"
async function assignClusterMates(report, adminId) {
  const mates = (await clusterMates(report)).filter((m) => m.status === 'pending');
  for (const mate of mates) {
    await Report.update(mate._id, { status: 'assigned' }, { changedBy: adminId, remarks: `Assigned together with "${report.title}" (same problem, same location)` });
    await notifyUser(mate.submittedBy, 'report_update', 'A repair crew is on the way',
      `The problem you reported ("${mate.title}") was also reported by others and has now been assigned to a repair crew.`, mate._id);
  }
  return mates.length;
}

async function resolveReport(reportId, { adminId = null, remarks = 'Resolved by admin' } = {}) {
  const moderation = await Admin.getModeration(reportId);
  if (moderation && moderation.verdict === 'fake') return { ok: false, code: 409, message: 'This report was rejected as fake and cannot be resolved.' };
  const { found, claimed, report } = await Report.claimResolution(reportId, { changedBy: adminId, remarks });
  if (!found) return { ok: false, code: 404, message: 'Report not found.' };
  if (!claimed) return { ok: true, already: true, report, points: 0 };

  await finalizeSubmitReward(report);
  const award = await awardCivicCreds(report.submittedBy, 'REPORT_RESOLVED', `Issue resolved: ${report.title}`);
  const points = award && award.success ? award.earnedAmount : 0;
  await notifyUser(report.submittedBy, 'report_update', 'Your report was fixed',
    `"${report.title}" has been repaired and verified.${points ? ` You earned +${points} CivicCreds.` : ''}`, report._id);
  emitToUser(String(report.submittedBy), 'report_update', { reportId: report._id, status: 'resolved' });
  const clusterResolved = await resolveClusterMates(report, adminId);
  return { ok: true, already: false, report, points, clusterResolved };
}

async function verifyReport(report, adminId) {
  await Admin.setModeration(report._id, 'valid', null, adminId);
  const award = await finalizeSubmitReward(report);
  if (award && award.success) {
    await notifyUser(report.submittedBy, 'report_update', 'Report verified',
      `Your report "${report.title}" was verified by the city team. +${award.earnedAmount} CivicCreds.`, report._id);
  }
  return award;
}

async function rejectReportAsFake(report, adminId, reason) {
  const first = await Admin.setModeration(report._id, 'fake', reason, adminId);
  if (!first) return { ok: false, code: 409, message: 'This report already has a moderation decision.' };
  await Report.update(report._id, { status: 'closed', rewardPending: false }, { changedBy: adminId, remarks: `Rejected as fake: ${reason}` });
  const penalty = await awardCivicCreds(report.submittedBy, 'PENALTY_FAKE_CALL', `Report rejected: ${reason}`.slice(0, 480));
  await notifyUser(report.submittedBy, 'report_update', 'Report rejected',
    `Your report "${report.title}" was rejected: ${reason}. 40 CivicCreds were deducted.`, report._id);
  emitToUser(String(report.submittedBy), 'report_update', { reportId: report._id, status: 'closed' });
  return { ok: true, penalty };
}

module.exports = {
  assignClusterMates, finalizeSubmitReward, resolveReport, verifyReport, rejectReportAsFake };
