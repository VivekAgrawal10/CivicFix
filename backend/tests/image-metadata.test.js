/** Node-side AI-generated image check (metadata only) — and that analyzeBuffer uses it without the AI service. */
const assert = require('assert');
const zlib = require('zlib');
const { detectAiGenerated } = require('../src/utils/imageMetadata');
const { analyzeBuffer } = require('../src/services/aiClient');

const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; };
const chunk = (type, body) => Buffer.concat([u32(body.length), Buffer.from(type, 'latin1'), body, u32(0)]);
const png = (...chunks) => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', Buffer.alloc(13)), ...chunks, chunk('IDAT', Buffer.from('pixels')), chunk('IEND', Buffer.alloc(0))]);
const text = (k, v) => chunk('tEXt', Buffer.concat([Buffer.from(k), Buffer.from([0]), Buffer.from(v, 'latin1')]));
const itxt = (k, v) => chunk('iTXt', Buffer.concat([Buffer.from(k), Buffer.from([0, 1, 0, 0, 0]), zlib.deflateSync(Buffer.from(v))]));
const seg = (marker, payload) => { const h = Buffer.alloc(4); h[0] = 0xff; h[1] = marker; h.writeUInt16BE(payload.length + 2, 2); return Buffer.concat([h, payload]); };
const jpeg = (segments = [], after = Buffer.alloc(0)) => Buffer.concat([Buffer.from([0xff, 0xd8]), ...segments, Buffer.from([0xff, 0xda, 0x00, 0x02]), Buffer.from('scan data'), Buffer.from([0xff, 0xd9]), after]);
const xmp = (s) => seg(0xe1, Buffer.from(`http://ns.adobe.com/xap/1.0/\0<x:xmpmeta>${s}</x:xmpmeta>`));
const webp = (fourcc, body) => { const size = Buffer.alloc(4); size.writeUInt32LE(body.length); const c = Buffer.concat([Buffer.from(fourcc), size, body, body.length & 1 ? Buffer.from([0]) : Buffer.alloc(0)]); const riff = Buffer.alloc(4); riff.writeUInt32LE(c.length + 4); return Buffer.concat([Buffer.from('RIFF'), riff, Buffer.from('WEBP'), c]); };

let passed = 0, failed = 0;
const it = async (name, fn) => { try { await fn(); console.log(`  ✓ ${name}`); passed++; } catch (e) { failed++; console.error(`  ✗ ${name}\n    ${e.message}`); } };
const SD = 'a road with a pothole\nNegative prompt: blurry\nSteps: 20, Sampler: Euler a, CFG scale: 7, Seed: 1';

(async () => {
  console.log('AI-generated image metadata check (Node)');
  await it('Stable Diffusion PNG parameters', () => { const r = detectAiGenerated(png(text('parameters', SD))); assert.ok(r.aiGenerated && r.generator === 'Stable Diffusion'); });
  await it('Midjourney in a compressed iTXt chunk', () => assert.ok(detectAiGenerated(png(itxt('Description', 'Made with Midjourney v6'))).aiGenerated));
  await it('ComfyUI prompt + workflow', () => assert.ok(detectAiGenerated(png(text('prompt', '{"3":{"class_type":"KSampler"}}'), text('workflow', '{"nodes":[]}'))).aiGenerated));
  await it('IPTC DigitalSourceType trainedAlgorithmicMedia in JPEG XMP', () => assert.ok(detectAiGenerated(jpeg([xmp('<rdf:Description Iptc4xmpExt:DigitalSourceType="http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia"/>')])).aiGenerated));
  await it('Stable Diffusion WebUI JPEG with a UTF-16 EXIF UserComment', () => {
    const comment = Buffer.concat([Buffer.from('UNICODE\0'), Buffer.from(SD, 'utf16le').swap16()]);
    assert.ok(detectAiGenerated(jpeg([seg(0xe1, Buffer.concat([Buffer.from('Exif\0\0'), comment]))])).aiGenerated);
  });
  await it('C2PA string split across two APP11 segments', () => {
    const marker = Buffer.from('http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia'); const cut = marker.length >> 1;
    const app11 = (n, body) => seg(0xeb, Buffer.concat([Buffer.from('JP\0\x01'), u32(n), body]));
    assert.ok(detectAiGenerated(jpeg([app11(1, Buffer.concat([Buffer.from('jumb c2pa '), marker.subarray(0, cut)])), app11(2, marker.subarray(cut))])).aiGenerated);
  });
  await it('XMP appended after the end of the JPEG', () => assert.ok(detectAiGenerated(jpeg([], Buffer.from('<x:xmpmeta>trainedAlgorithmicMedia</x:xmpmeta>'))).aiGenerated));
  await it('WebP XMP chunk (OpenAI / ChatGPT)', () => assert.ok(detectAiGenerated(webp('XMP ', Buffer.from('<x>claim_generator ChatGPT</x>'))).aiGenerated));
  await it('Meta AI and generic labels', () => { for (const l of ['Imagined with AI', 'AI-generated image', 'Created with AI']) assert.ok(detectAiGenerated(jpeg([xmp(l)])).aiGenerated, l); });
  await it('an ordinary photo is not flagged (camera EXIF, comments, C2PA-free)', () => {
    assert.ok(!detectAiGenerated(jpeg([seg(0xe1, Buffer.from('Exif\0\0Apple iPhone 14 2026:11:20'))])).aiGenerated);
    assert.ok(!detectAiGenerated(png(text('Comment', 'holiday in goa'))).aiGenerated);
    const comment = Buffer.concat([Buffer.from('UNICODE\0'), Buffer.from('taken with my phone', 'utf16le').swap16()]);
    assert.ok(!detectAiGenerated(jpeg([seg(0xe1, Buffer.concat([Buffer.from('Exif\0\0'), comment]))])).aiGenerated);
  });
  await it('pixel data is never scanned (a generator name inside the scan does not count)', () => {
    const buf = Buffer.concat([Buffer.from([0xff, 0xd8]), Buffer.from([0xff, 0xda, 0x00, 0x02]), Buffer.from('midjourney trainedAlgorithmicMedia'), Buffer.from([0xff, 0xd9])]);
    assert.ok(!detectAiGenerated(buf).aiGenerated);
    assert.ok(!detectAiGenerated(png()).aiGenerated);
  });
  await it('truncated / garbage files never throw', () => {
    for (const b of [Buffer.alloc(0), Buffer.from([0xff, 0xd8, 0xff]), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0xff, 0xff]), Buffer.from('RIFF\0\0\0\0WEBPEXIF\xff\xff\xff\xff'), Buffer.from('hello')]) assert.strictEqual(detectAiGenerated(b).aiGenerated, false);
  });
  await it('analyzeBuffer rejects an AI image by itself, even with the AI service unreachable', async () => {
    process.env.AI_SERVICE_URL = 'http://127.0.0.1:9'; // nothing listens here
    const r = await analyzeBuffer(png(text('parameters', SD)), { filename: 'x.png', mimetype: 'image/png' });
    assert.strictEqual(r.rejected, true); assert.strictEqual(r.rejectionCode, 'AI_GENERATED_IMAGE'); assert.strictEqual(r.available, true);
    assert.ok(/AI-generated/.test(r.message));
    const clean = await analyzeBuffer(png(), { filename: 'x.png', mimetype: 'image/png' });
    assert.strictEqual(clean.available, false, 'a clean image still goes to the AI service');
  });
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
