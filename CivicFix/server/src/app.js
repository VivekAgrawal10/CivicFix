import express from 'express';
import multer from 'multer';
import { fileURLToPath } from 'node:url';
import { analyzeImage, getJson, postJson } from './ai-client.js';
import { XpLedger } from './ledger.js';
import { isNonCivic } from './policy.js';
import { ReportService } from './service.js';

const config = { aiServiceUrl: process.env.AI_SERVICE_URL ?? 'http://127.0.0.1:8000', timeoutMs: Number(process.env.AI_SERVICE_TIMEOUT_MS ?? 8000) };
const ledger = new XpLedger();
const ai = {
  analyze: image => analyzeImage(image, config),
  xp: payload => postJson('/xp/calculate', payload, config),
  priority: payload => postJson('/priority', payload, config),
  verify: payload => postJson('/verify', payload, config),
};
const service = new ReportService({ ai, ledger });
const app = express();
const upload = multer({ limits: { fileSize: 8 * 1024 * 1024 } });
const send = res => ({ status, body }) => res.status(status).json(body);
export { isNonCivic };
app.use(express.json());
app.use(express.static(fileURLToPath(new URL('../../web/', import.meta.url))));
app.get('/api/health', (_, res) => res.json({ ok: true, data: { service: 'civicfix-node', status: 'healthy' }, error: null }));
app.get('/api/models/status', async (_, res) => res.json(await getJson('/models/status', config)));
app.post('/api/reports', upload.single('image'), async (req, res) => {
  const b = req.body;
  const image = req.file && { buffer: req.file.buffer, filename: req.file.originalname, mimeType: req.file.mimetype };
  send(res)(await service.submit({ image, reporterId: b.reporterId, category: b.category, lat: b.lat, lon: b.lon, safetyRisk: b.safetyRisk, trafficImpact: b.trafficImpact, publicExposure: b.publicExposure, locationImportance: b.locationImportance }));
});
app.get('/api/reports/:id', (req, res) => {
  const report = service.reports.get(req.params.id);
  report ? res.json({ ok: true, data: report, error: null }) : res.status(404).json({ ok: false, error: { code: 'report_not_found', message: 'No such report.' } });
});
app.post('/api/reports/:id/verify', async (req, res) => send(res)(await service.verify(req.params.id, req.body ?? {})));
// Finalization never accepts a client-supplied XP recommendation: the promise stored at submission is credited.
app.post('/api/reports/:id/finalize-xp', (req, res) => send(res)(service.finalize(req.params.id)));
app.use((error, _, res, __) => res.status(400).json({ ok: false, error: { code: 'request_error', message: error.message } }));
if (process.argv[1]?.endsWith('/src/app.js') || process.argv[1] === 'src/app.js') app.listen(process.env.PORT ?? 3000, () => console.log(`CivicFix Node API on port ${process.env.PORT ?? 3000}`));
export { app, config, ledger, service };
