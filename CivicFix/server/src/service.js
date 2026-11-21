import { XpLedger } from './ledger.js';
import { distanceMeters, finalizationDecision, hashSimilarity, isNonCivic } from './policy.js';

const fail = (status, code, message, extra = {}) => ({ status, body: { ok: false, error: { code, message }, ...extra } });
const ok = (status, data) => ({ status, body: { ok: true, data, error: null } });

// `ai` must provide analyze/xp/priority/verify, each resolving to the FastAPI envelope or { ok:false, error }.
export class ReportService {
  constructor({ ai, ledger = new XpLedger(), now = () => new Date(), maxReportsPerDay = 10 }) {
    this.ai = ai; this.ledger = ledger; this.now = now; this.maxReportsPerDay = maxReportsPerDay; this.reports = new Map();
  }
  hashes() { return [...this.reports.values()].map(r => r.analysis?.image_hash).filter(Boolean); }
  reportsToday(reporterId) { const day = this.now().toISOString().slice(0, 10); return [...this.reports.values()].filter(r => r.reporterId === reporterId && r.createdAt.slice(0, 10) === day); }

  async priorityFor(report) {
    const a = report.analysis;
    const res = await this.ai.priority({ severity: a.severity?.label ?? 'minor', affected_area: Math.min(1, a.area_estimation?.relative_affected_area ?? 0), safety_risk: report.inputs.safetyRisk,
      traffic_impact: report.inputs.trafficImpact, public_exposure: report.inputs.publicExposure, verified: report.state === 'verified', location_importance: report.inputs.locationImportance,
      independent_reports: 1 + report.corroborations, hours_unresolved: (this.now() - new Date(report.createdAt)) / 3.6e6 });
    return res.ok ? res.data : null;
  }

  async submit({ image, reporterId, category = 'road_damage', lat, lon, safetyRisk = 0, trafficImpact = 0, publicExposure = 0, locationImportance = 0 }) {
    if (!image || !reporterId) return fail(422, 'validation_error', 'image and reporterId are required.');
    const result = await this.ai.analyze({ ...image, candidateHashes: this.hashes() });
    if (!result.ok) return fail(503, result.error?.code ?? 'ai_service_unavailable', result.error?.message ?? 'AI service unavailable.');
    // Non-civic images are rejected before anything is persisted or any XP is promised.
    if (isNonCivic(result)) return fail(422, 'NON_CIVIC_IMAGE', result.data.message, { analysis: result.data });
    if (result.data?.analysis_status === 'rejected') return fail(422, 'INVALID_IMAGE', result.data.validation?.reason ?? 'Image failed validation.', { analysis: result.data });
    const analysis = result.data, decision = analysis.decision ?? {};
    const prior = this.reportsToday(reporterId);
    let reason = null;
    if (decision.xp_eligible === false) reason = decision.reason ?? 'The AI service marked this upload XP-ineligible.';
    else if (analysis.duplicates?.duplicate_candidate) reason = 'Visually duplicates an existing report (anti-farming).';
    else if (prior.length >= this.maxReportsPerDay) reason = `Daily report limit of ${this.maxReportsPerDay} reached (anti-farming).`;
    const inputs = { safetyRisk: Number(safetyRisk) || 0, trafficImpact: Number(trafficImpact) || 0, publicExposure: Number(publicExposure) || 0, locationImportance: Number(locationImportance) || 0 };
    const report = { id: crypto.randomUUID(), reporterId, category, category_source: 'user_declared', location: { lat: Number(lat), lon: Number(lon) }, createdAt: this.now().toISOString(),
      analysis, inputs, corroborations: 0, state: 'pending_verification', manual_review_required: decision.manual_review_required === true,
      xp: { eligible: reason === null, status: reason === null ? 'pending' : 'ineligible', reason, recommendation: null } };
    if (reason === null) {
      const xp = await this.ai.xp({ severity: analysis.severity?.label ?? 'minor', quality_ok: analysis.quality?.suitable_for_inference === true, category, trust: 0.5,
        first_report: prior.length === 0, verified: false, daily_awarded: this.ledger.awardedToday(reporterId) });
      if (!xp.ok) return fail(503, xp.error?.code ?? 'ai_service_unavailable', 'XP could not be calculated; report not stored.');
      report.xp.recommendation = xp.data;   // the exact promise; finalization never trusts client input
    }
    report.priority = await this.priorityFor(report);
    this.reports.set(report.id, report);
    return ok(201, report);
  }

  async verify(reportId, { corroboratingReportId, distanceM, population = 'normal' } = {}) {
    const report = this.reports.get(reportId), other = this.reports.get(corroboratingReportId);
    if (!report) return fail(404, 'report_not_found', 'No such report.');
    if (!other) return fail(422, 'corroboration_required', 'corroboratingReportId must name a stored report.');
    const distance = distanceMeters(report.location, other.location) ?? (Number.isFinite(Number(distanceM)) && distanceM !== '' && distanceM != null ? Number(distanceM) : null);
    if (distance === null) return fail(422, 'location_required', 'Both reports need lat/lon, or distanceM must be supplied.');
    const independent = hashSimilarity(report.analysis.image_hash, other.analysis.image_hash) < 0.9;
    const res = await this.ai.verify({ population, reporter_id: report.reporterId, corroborator_id: other.reporterId, category_match: report.category === other.category, distance_m: distance,
      age_hours: Math.abs(new Date(report.createdAt) - new Date(other.createdAt)) / 3.6e6, image_independent: independent,
      ai_passed: report.analysis.decision?.auto_verification_eligible === true, trust_ok: report.xp.eligible && other.xp.eligible });
    if (!res.ok) return fail(503, res.error?.code ?? 'ai_service_unavailable', 'Verification rules unavailable.');
    if (res.data.state === 'community_verified' && report.state !== 'rejected') { report.state = 'verified'; report.corroborations += 1; report.priority = await this.priorityFor(report); }
    return ok(200, { report, verification: res.data });
  }

  finalize(reportId) {
    const report = this.reports.get(reportId);
    const decision = finalizationDecision(report);
    if (!decision.allowed) return fail(decision.code === 'report_not_found' ? 404 : 409, decision.code, decision.message);
    const result = this.ledger.finalize(report.id, report.xp.recommendation, report.reporterId);
    report.xp.status = 'finalized';
    return ok(200, result);
  }
}
