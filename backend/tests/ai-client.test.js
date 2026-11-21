/**
 * ai-client.test.js — tests the backend↔AI adapter against a fake FastAPI server.
 * No database, no network, no extra packages:  node tests/ai-client.test.js
 */
const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');

const envelope = (data) => JSON.stringify({ ok: true, data, meta: {}, error: null });
let lastBody = '';
const fake = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    lastBody = Buffer.concat(chunks).toString('latin1');
    if (req.url !== '/api/v1/analyze') { res.writeHead(404); return res.end('{}'); }
    const mode = req.headers['x-mode'] || (lastBody.includes('filename="reject.png"') ? 'reject' : lastBody.includes('filename="aigen.png"') ? 'aigen' : lastBody.includes('filename="civic.jpg"') ? 'civic' : 'review');
    if (mode === 'reject') {
      res.writeHead(422, { 'content-type': 'application/json' });
      return res.end(envelope({ analysis_status: 'rejected_non_civic', message: 'Not a civic issue.', severity: null,
        relevance: { status: 'non_civic', kind: 'document' }, decision: { outcome: 'rejected', manual_review_required: false, xp_eligible: false } }));
    }
    if (mode === 'aigen') {
      res.writeHead(422, { 'content-type': 'application/json' });
      return res.end(envelope({ analysis_status: 'rejected_ai_generated', rejection_code: 'AI_GENERATED_IMAGE', message: 'This image appears to be AI-generated.',
        authenticity: { status: 'ai_generated', ai_generated: true, generator: 'Midjourney' }, decision: { outcome: 'rejected', manual_review_required: false, xp_eligible: false } }));
    }
    if (mode === 'civic') {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(envelope({ analysis_status: 'completed_with_degraded_models', image_hash: 'abcd1234abcd1234',
        relevance: { status: 'civic', kind: 'streetlight_damage', confidence: 0.82, method: 'clip_zero_shot_pretrained', scene_model: { category: 'streetlight_damage' } },
        severity: { label: 'moderate' }, duplicates: { duplicate_candidate: true },
        decision: { outcome: 'accepted_pending_verification', manual_review_required: false, xp_eligible: true, xp_finalization: 'only_after_independent_verification' } }));
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(envelope({ analysis_status: 'completed_with_degraded_models', relevance: { status: 'uncertain', kind: null },
      severity: { label: 'severe' }, decision: { outcome: 'manual_review_required', manual_review_required: true, xp_eligible: true } }));
  });
});

(async () => {
  await new Promise((r) => fake.listen(0, r));
  process.env.AI_SERVICE_URL = `http://127.0.0.1:${fake.address().port}`;
  const ai = require('../src/services/aiClient');
  let passed = 0;
  const t = async (name, fn) => { try { await fn(); console.log(`  ✅ ${name}`); passed++; } catch (e) { console.error(`  ❌ ${name}: ${e.message}`); process.exitCode = 1; } };
  const img = Buffer.from('fake-image-bytes');

  await t('rejected (HTTP 422) is a valid answer, not an outage', async () => {
    const r = await ai.analyzeBuffer(img, { filename: 'reject.png', mimetype: 'image/png' });
    assert.strictEqual(r.available, true); assert.strictEqual(r.rejected, true);
    assert.strictEqual(r.xpEligible, false); assert.strictEqual(r.message, 'Not a civic issue.');
  });
  await t('civic scene maps category/severity and keeps XP pending', async () => {
    const r = await ai.analyzeBuffer(img, { filename: 'civic.jpg', candidateHashes: ['aa', 'bb'] });
    assert.strictEqual(r.category, 'streetlight'); assert.strictEqual(r.severity, 'medium');
    assert.strictEqual(r.xpFinalization, 'only_after_independent_verification');
    assert.strictEqual(r.sceneModelUsed, true); assert.strictEqual(r.duplicateCandidate, true); assert.ok(lastBody.includes('aa,bb'), 'candidate_hashes forwarded');
  });
  await t('AI-generated image -> rejected with code AI_GENERATED_IMAGE and generator name', async () => {
    const r = await ai.analyzeBuffer(img, { filename: 'aigen.png' });
    assert.strictEqual(r.rejected, true); assert.strictEqual(r.rejectionCode, 'AI_GENERATED_IMAGE');
    assert.strictEqual(r.aiGenerated, true); assert.strictEqual(r.generator, 'Midjourney'); assert.ok(/AI-generated/.test(r.message));
  });
  await t('uncertain image -> manual review, no category guess', async () => {
    const r = await ai.analyzeBuffer(img, { filename: 'other.jpg' });
    assert.strictEqual(r.manualReviewRequired, true); assert.strictEqual(r.category, null); assert.strictEqual(r.severity, 'high');
    assert.strictEqual(r.sceneModelUsed, false, 'CLIP did not look at this photo, so the UI can say the classifier is missing');
  });
  await t('AI service down -> unavailable + manual review, never throws', async () => {
    const saved = process.env.AI_SERVICE_URL;
    process.env.AI_SERVICE_URL = 'http://127.0.0.1:1';
    const r = await ai.analyzeBuffer(img, {});
    process.env.AI_SERVICE_URL = saved;
    assert.strictEqual(r.available, false); assert.strictEqual(r.manualReviewRequired, true); assert.strictEqual(r.xpEligible, false);
  });
  await t('remote image host outside the allow-list is refused (SSRF guard)', async () => {
    const r = await ai.analyzeImageUrl('http://169.254.169.254/latest/meta-data');
    assert.strictEqual(r.available, false); assert.ok(/not allowed/.test(r.message));
  });
  await t('local /uploads path resolves by basename only (no traversal)', async () => {
    const dir = path.join(__dirname, '../uploads'); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'civic.jpg'), img);
    const loaded = await ai.loadImageFromUrl('/uploads/../../etc/civic.jpg');
    assert.strictEqual(loaded.filename, 'civic.jpg');
    fs.unlinkSync(path.join(dir, 'civic.jpg'));
  });
  fake.close();
  console.log(`\n${passed} passed`);
})();
