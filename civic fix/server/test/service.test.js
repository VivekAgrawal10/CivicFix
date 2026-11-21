import test from 'node:test';
import assert from 'node:assert/strict';
import { ReportService } from '../src/service.js';
import { finalizationDecision } from '../src/policy.js';

const civicAnalysis = (hash = '0101', extra = {}) => ({ analysis_status: 'completed_with_degraded_models', image_hash: hash, severity: { label: 'moderate' }, area_estimation: { relative_affected_area: .1 },
  quality: { suitable_for_inference: true }, duplicates: { duplicate_candidate: false }, decision: { outcome: 'manual_review_required', manual_review_required: true, xp_eligible: true, auto_verification_eligible: false }, ...extra });
const nonCivic = { analysis_status: 'rejected_non_civic', rejection_code: 'NON_CIVIC_IMAGE', message: 'not civic', decision: { xp_eligible: false } };
function makeService(analysisFor, opts = {}) {
  const calls = { xp: 0, verify: [] };
  const ai = {
    analyze: async img => ({ ok: true, data: typeof analysisFor === 'function' ? analysisFor(img) : analysisFor }),
    xp: async p => { calls.xp++; return { ok: true, data: { status: 'pending', breakdown: { capped_total: 150 + p.daily_awarded * 0 } } }; },
    priority: async () => ({ ok: true, data: { score: 40, category: 'medium', components: {} } }),
    verify: async p => { calls.verify.push(p); return { ok: true, data: p.corroborator_id === p.reporter_id ? { state: 'rejected' } : p.category_match && p.distance_m <= 100 && p.image_independent ? { state: 'community_verified' } : { state: 'manual_review_required' } }; },
  };
  return { service: new ReportService({ ai, now: () => new Date('2026-01-01T10:00:00Z'), ...opts }), calls };
}
const img = { buffer: Buffer.from('x'), filename: 'a.png', mimeType: 'image/png' };

test('non-civic report is rejected: nothing stored, no XP computed, no verification possible', async () => {
  const { service, calls } = makeService(nonCivic);
  const res = await service.submit({ image: img, reporterId: 'u1' });
  assert.equal(res.status, 422); assert.equal(res.body.error.code, 'NON_CIVIC_IMAGE');
  assert.equal(service.reports.size, 0); assert.equal(calls.xp, 0);
});
test('invalid image is rejected without persistence', async () => {
  const { service } = makeService({ analysis_status: 'rejected', validation: { reason: 'corrupt' }, decision: { xp_eligible: false } });
  const res = await service.submit({ image: img, reporterId: 'u1' });
  assert.equal(res.status, 422); assert.equal(res.body.error.code, 'INVALID_IMAGE'); assert.equal(service.reports.size, 0);
});
test('civic-candidate report earns only pending XP and cannot be finalized before verification', async () => {
  const { service } = makeService(civicAnalysis());
  const { body } = await service.submit({ image: img, reporterId: 'u1', lat: 30, lon: 76 });
  assert.equal(body.data.xp.status, 'pending'); assert.equal(body.data.manual_review_required, true);
  const fin = service.finalize(body.data.id);
  assert.equal(fin.status, 409); assert.equal(fin.body.error.code, 'not_verified');
  assert.equal(service.ledger.entries.size, 0);
});
test('self-corroboration is rejected; independent nearby report verifies; exact promise is finalized once', async () => {
  let n = 0; const { service } = makeService(() => civicAnalysis(n++ === 0 ? '0000' : '1111'));
  const a = (await service.submit({ image: img, reporterId: 'u1', lat: 30, lon: 76 })).body.data;
  const self = (await service.submit({ image: img, reporterId: 'u1', lat: 30, lon: 76 })).body.data;
  assert.equal((await service.verify(a.id, { corroboratingReportId: self.id })).body.data.verification.state, 'rejected');
  const b = (await service.submit({ image: img, reporterId: 'u2', lat: 30.0002, lon: 76 })).body.data;
  const v = await service.verify(a.id, { corroboratingReportId: b.id });
  assert.equal(v.body.data.verification.state, 'community_verified'); assert.equal(a.state, 'verified');
  const first = service.finalize(a.id), again = service.finalize(a.id);
  assert.equal(first.body.data.entry.amount, 150); assert.equal(first.body.data.entry.promised, 150);
  assert.equal(again.body.data.idempotent, true); assert.equal(service.ledger.entries.size, 1);
});
test('distant or visually identical corroboration does not verify', async () => {
  let n = 0; const { service } = makeService(() => civicAnalysis(['0000', '1111', '0000'][n++]));
  const a = (await service.submit({ image: img, reporterId: 'u1', lat: 30, lon: 76 })).body.data;
  const far = (await service.submit({ image: img, reporterId: 'u2', lat: 31, lon: 76 })).body.data;
  assert.equal((await service.verify(a.id, { corroboratingReportId: far.id })).body.data.verification.state, 'manual_review_required');
  const same = (await service.submit({ image: img, reporterId: 'u3', lat: 30, lon: 76 })).body.data;
  assert.equal((await service.verify(a.id, { corroboratingReportId: same.id })).body.data.verification.state, 'manual_review_required');
  assert.equal(a.state, 'pending_verification');
});
test('anti-farming: duplicate image and over-limit reports are XP-ineligible and cannot finalize', async () => {
  const dup = makeService(civicAnalysis('0', { duplicates: { duplicate_candidate: true } }));
  const d = (await dup.service.submit({ image: img, reporterId: 'u1' })).body.data;
  assert.equal(d.xp.eligible, false); assert.equal(dup.service.finalize(d.id).body.error.code, 'xp_ineligible');
  const lim = makeService(civicAnalysis(), { maxReportsPerDay: 1 });
  await lim.service.submit({ image: img, reporterId: 'u1' });
  const second = (await lim.service.submit({ image: img, reporterId: 'u1' })).body.data;
  assert.equal(second.xp.eligible, false); assert.match(second.xp.reason, /Daily report limit/);
});
test('rejected report never finalizes; client cannot inject a recommendation', () => {
  assert.equal(finalizationDecision({ state: 'rejected', xp: { eligible: true } }).code, 'report_rejected');
  assert.equal(finalizationDecision({ state: 'verified', xp: { eligible: true } }).allowed, true);
});
test('AI-service outage returns 503 and stores nothing', async () => {
  const service = new ReportService({ ai: { analyze: async () => ({ ok: false, error: { code: 'ai_service_unavailable', message: 'down' } }) } });
  const res = await service.submit({ image: img, reporterId: 'u1' });
  assert.equal(res.status, 503); assert.equal(service.reports.size, 0);
});
