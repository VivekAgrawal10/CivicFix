/**
 * aiClient.js — adapter between this Express backend and the CivicFix FastAPI AI service.
 *
 * The AI service contract (ai-service/app/api/analysis.py):
 *   POST {AI_SERVICE_URL}/api/v1/analyze   multipart: image (+ optional candidate_hashes)
 *   -> envelope { ok, data, meta, error }; HTTP 422 when the image is rejected/invalid.
 *
 * normalizeAnalysis() maps that rich result onto the flat shape the rest of the backend and the
 * frontend use, and keeps the honesty flags (manual review, XP pending) intact.
 */
const fs = require('fs');
const path = require('path');
const { detectAiGenerated, AI_GENERATED_MESSAGE } = require('../utils/imageMetadata');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // matches the AI service limit

const aiBase = () => (process.env.AI_SERVICE_URL || 'http://localhost:8000').replace(/\/+$/, '');
const timeoutMs = () => parseInt(process.env.AI_TIMEOUT_MS, 10) || 60000;

// AI-service categories -> Report.category enum
const CATEGORY_MAP = {
  pothole: 'pothole',
  road_damage: 'road_damage',
  garbage: 'garbage',
  waterlogging: 'waterlogging',
  streetlight_damage: 'streetlight',
};
// Area-proxy rubric label -> Report.priority-compatible severity (critical is never set by the AI)
const SEVERITY_MAP = { minor: 'low', moderate: 'medium', severe: 'high' };

function normalizeAnalysis(result) {
  const decision = result.decision || {};
  const relevance = result.relevance || {};
  const outcome = decision.outcome || 'unknown';
  const confidence =
    relevance.confidence ?? (result.classification && result.classification.confidence) ?? null;
  const message =
    result.message ||
    relevance.message ||
    (result.validation && result.validation.reason) ||
    decision.reason ||
    null;
  return {
    available: true,
    outcome, // rejected | manual_review_required | accepted_pending_verification
    rejected: outcome === 'rejected',
    rejectionCode: result.rejection_code || null, // NON_CIVIC_IMAGE | AI_GENERATED_IMAGE
    aiGenerated: Boolean(result.authenticity && result.authenticity.ai_generated),
    authenticityStatus: (result.authenticity && result.authenticity.status) || null,
    generator: (result.authenticity && result.authenticity.generator) || null,
    manualReviewRequired: Boolean(decision.manual_review_required),
    xpEligible: Boolean(decision.xp_eligible),
    xpFinalization: decision.xp_finalization || null,
    category: CATEGORY_MAP[relevance.kind] || null,
    severity: result.severity ? SEVERITY_MAP[result.severity.label] || null : null,
    confidence,
    relevanceStatus: relevance.status || null,
    // true when the pretrained CLIP scene model actually looked at the photo (false = only the document/screenshot gate ran)
    sceneModelUsed: Boolean(relevance.scene_model),
    method: relevance.method || null,
    message,
    imageHash: result.image_hash || null,
    duplicateCandidate: Boolean(result.duplicates && result.duplicates.duplicate_candidate),
    affectedAreaPct:
      result.area_estimation && result.area_estimation.percentage != null
        ? result.area_estimation.percentage
        : null,
    limitations:
      'Heuristic / pretrained zero-shot analysis; not a fine-tuned civic model. Verification is independent of the AI.',
  };
}

const unavailable = (reason) => ({
  available: false,
  outcome: 'unavailable',
  rejected: false,
  manualReviewRequired: true,
  xpEligible: false,
  category: null,
  severity: null,
  confidence: null,
  message: `AI service unavailable (${reason}); report queued for manual review.`,
});

/** Send raw image bytes to the AI service and return the normalized analysis. Never throws. */
async function analyzeBuffer(buffer, { filename = 'upload.jpg', mimetype = 'image/jpeg', candidateHashes = [] } = {}) {
  // Metadata check first, here in Node: it must work even when the AI service is offline or out of date
  const local = detectAiGenerated(buffer);
  if (local.aiGenerated) {
    const detail = local.generator || local.signals[0];
    return {
      available: true, outcome: 'rejected', rejected: true, rejectionCode: 'AI_GENERATED_IMAGE', aiGenerated: true,
      authenticityStatus: 'ai_generated', generator: local.generator, manualReviewRequired: false, xpEligible: false,
      category: null, severity: null, confidence: null, relevanceStatus: null, sceneModelUsed: false, method: 'metadata',
      message: AI_GENERATED_MESSAGE(detail), imageHash: null, duplicateCandidate: false, affectedAreaPct: null, signals: local.signals,
      limitations: 'Metadata-only check: it flags generated images that still carry their metadata.',
    };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());
  try {
    const form = new FormData();
    form.append('image', new Blob([buffer], { type: mimetype }), filename);
    if (candidateHashes.length) form.append('candidate_hashes', candidateHashes.join(','));
    const res = await fetch(`${aiBase()}/api/v1/analyze`, { method: 'POST', body: form, signal: controller.signal });
    let body = null;
    try {
      body = await res.json();
    } catch (_) {
      /* non-JSON error page */
    }
    // 422 with an envelope is a *valid* "rejected" answer, not a failure
    if (body && body.data) return normalizeAnalysis(body.data);
    const reason = (body && body.error && (body.error.message || body.error.code)) || `HTTP ${res.status}`;
    return unavailable(reason);
  } catch (err) {
    return unavailable(err.name === 'AbortError' ? 'timeout' : err.message);
  } finally {
    clearTimeout(timer);
  }
}

function allowedRemoteHosts() {
  const configured = (process.env.IMAGE_FETCH_ALLOWED_HOSTS || 'res.cloudinary.com,localhost,127.0.0.1')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return configured;
}

/** Load an uploaded image from our uploads folder or an allow-listed host (SSRF guard). */
async function loadImageFromUrl(imageUrl) {
  if (typeof imageUrl !== 'string' || !imageUrl) throw new Error('imageUrl must be a string');
  let pathname = imageUrl;
  let remote = null;
  if (/^https?:\/\//i.test(imageUrl)) {
    remote = new URL(imageUrl);
    pathname = remote.pathname;
  }
  if (pathname.startsWith('/uploads/')) {
    // Local file: basename only, so ../ traversal is impossible
    const file = path.join(UPLOAD_DIR, path.basename(pathname));
    const buffer = await fs.promises.readFile(file);
    const ext = path.extname(file).toLowerCase();
    const mimetype = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    return { buffer, filename: path.basename(file), mimetype };
  }
  if (!remote) throw new Error('Unsupported image reference');
  if (!allowedRemoteHosts().includes(remote.hostname.toLowerCase())) {
    throw new Error(`Image host not allowed: ${remote.hostname}`);
  }
  const res = await fetch(remote, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Image fetch failed: HTTP ${res.status}`);
  const type = (res.headers.get('content-type') || '').split(';')[0];
  if (!type.startsWith('image/')) throw new Error('URL did not return an image');
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > MAX_IMAGE_BYTES) throw new Error('Image exceeds 8 MB limit');
  return { buffer, filename: path.basename(remote.pathname) || 'image.jpg', mimetype: type };
}

async function analyzeImageUrl(imageUrl, candidateHashes = []) {
  try {
    const img = await loadImageFromUrl(imageUrl);
    return await analyzeBuffer(img.buffer, { ...img, candidateHashes });
  } catch (err) {
    return unavailable(err.message);
  }
}

module.exports = { analyzeBuffer, analyzeImageUrl, normalizeAnalysis, loadImageFromUrl, CATEGORY_MAP, SEVERITY_MAP };
