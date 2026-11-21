/**
 * imageMetadata.js — "was this photo made by an AI generator?" from the file's METADATA, with no ML and no
 * dependency on the Python AI service. It mirrors ai-service/app/cv/authenticity_detector.py so the check still
 * runs when the AI service is down, not started, or an old copy.
 *
 * It only reads the metadata regions of the container (JPEG APPn/COM segments and any data after the image,
 * PNG text/XMP/EXIF/C2PA chunks, WebP EXIF/XMP/C2PA chunks), never the pixels. A screenshot or re-save strips
 * the metadata, so a clean result proves nothing; it catches generated images that still carry their tags.
 */
const zlib = require('zlib');

const SOURCE_TYPES = ['compositewithtrainedalgorithmicmedia', 'trainedalgorithmicmedia', 'algorithmicmedia'];

const GENERATORS = [
  ['DALL-E / OpenAI', /dall[-\s.]?e\b|dall\xc2\xb7e|openai|chatgpt|gpt-image/i],
  ['Midjourney', /midjourney/i],
  ['Stable Diffusion', /stable[\s_-]?diffusion|stability[\s.]?ai|dreamstudio|\bsdxl\b/i],
  ['Adobe Firefly', /adobe[\s_-]?firefly|\bfirefly\b/i],
  ['Google AI (Imagen / Gemini)', /made with google ai|google imagen|\bimagen[\s-]?\d|synthid/i],
  ['Microsoft Designer / Bing Image Creator', /microsoft designer|bing image creator/i],
  ['Leonardo.Ai', /leonardo\.ai/i],
  ['Ideogram', /ideogram/i],
  ['NovelAI', /novelai/i],
  ['Fooocus', /fooocus/i],
  ['InvokeAI', /invokeai|sd-metadata/i],
  ['Craiyon', /craiyon/i],
  ['NightCafe', /nightcafe/i],
  ['Runway', /runwayml/i],
  ['Canva Magic Media', /magic media/i],
  ['Flux (Black Forest Labs)', /black forest labs|flux\.1/i],
  ['Playground AI', /playground[\s_-]?ai/i],
  ['Meta AI', /imagined with ai|meta ai\b|emu image|llama image/i],
  ['Grok / xAI', /\bgrok\b|x\.?ai aurora|\baurora\b.{0,20}x\.?ai/i],
  ['Microsoft Copilot', /microsoft copilot|copilot designer|image creator from microsoft/i],
  ['Amazon Titan / Nova', /amazon titan image|nova canvas|nova reel/i],
  ['ByteDance Seedream / Dreamina', /seedream|dreamina|doubao|jimeng/i],
  ['Recraft / Krea / Lexica', /recraft\.ai|krea\.ai|lexica\.art/i],
  ['Google Gemini image', /nano banana|gemini[\s-]?\d?(\.\d)?[\s-]?(flash|pro)?[\s-]?image/i],
  ['Generic AI label', /ai[\s-]generated|generated (by|with|using) ai|created (by|with|using) ai|made with ai|generative ai/i],
];

const MAX_TAIL = 2000000;

function jpegMetadata(buf) {
  const parts = [];
  const app11 = [];
  let i = 2;
  while (i + 4 <= buf.length && buf[i] === 0xff) {
    const marker = buf[i + 1];
    if (marker === 0xda) break;
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
    const length = buf.readUInt16BE(i + 2);
    const seg = buf.subarray(i + 4, i + 2 + length);
    if ((marker >= 0xe0 && marker <= 0xef) || marker === 0xfe) {
      parts.push(seg);
      if (marker === 0xeb) app11.push(seg.subarray(0, 2).toString('latin1') === 'JP' ? seg.subarray(8) : seg); // C2PA / JUMBF
    }
    i += 2 + length;
  }
  if (app11.length) parts.push(Buffer.concat(app11)); // a string split across two APP11 segments becomes whole again
  const eoi = buf.lastIndexOf(Buffer.from([0xff, 0xd9]));
  if (eoi > 0 && eoi < buf.length - 2 && buf.length - eoi < MAX_TAIL) parts.push(buf.subarray(eoi + 2)); // data appended after the image
  return { blob: Buffer.concat(parts.flatMap((p) => [p, Buffer.from('\n')])), text: {} };
}

function pngMetadata(buf) {
  const parts = [];
  const text = {};
  let i = 8;
  while (i + 8 <= buf.length) {
    const length = buf.readUInt32BE(i);
    const type = buf.toString('latin1', i + 4, i + 8);
    const body = buf.subarray(i + 8, i + 8 + length);
    const nul = body.indexOf(0);
    if (type === 'tEXt' && nul > 0) {
      text[body.toString('latin1', 0, nul)] = body.toString('latin1', nul + 1);
      parts.push(body);
    } else if (type === 'zTXt' && nul > 0) {
      let val = Buffer.alloc(0);
      try { val = zlib.inflateSync(body.subarray(nul + 2)); } catch (_) { /* corrupt */ }
      text[body.toString('latin1', 0, nul)] = val.toString('utf8');
      parts.push(val);
    } else if (type === 'iTXt' && nul > 0) {
      const flag = body[nul + 1];
      let rest = body.subarray(nul + 3);
      rest = rest.subarray(rest.indexOf(0) + 1); // language tag
      let val = rest.subarray(rest.indexOf(0) + 1); // translated keyword
      if (flag === 1) { try { val = zlib.inflateSync(val); } catch (_) { val = Buffer.alloc(0); } }
      text[body.toString('latin1', 0, nul)] = val.toString('utf8');
      parts.push(val);
    } else if (type === 'eXIf' || type === 'caBX') {
      parts.push(body);
    } else if (type === 'IEND') {
      const tail = buf.subarray(i + 12, i + 12 + MAX_TAIL);
      if (tail.length) parts.push(tail);
      break;
    }
    i += 12 + length;
  }
  return { blob: Buffer.concat(parts.flatMap((p) => [p, Buffer.from('\n')])), text };
}

function webpMetadata(buf) {
  const parts = [];
  let i = 12;
  while (i + 8 <= buf.length) {
    const fourcc = buf.toString('latin1', i, i + 4);
    const size = buf.readUInt32LE(i + 4);
    if (fourcc === 'EXIF' || fourcc === 'XMP ' || fourcc === 'C2PA') parts.push(buf.subarray(i + 8, i + 8 + size));
    i += 8 + size + (size & 1);
  }
  return { blob: Buffer.concat(parts.flatMap((p) => [p, Buffer.from('\n')])), text: {} };
}

function extract(buf) {
  try {
    if (buf[0] === 0xff && buf[1] === 0xd8) return { format: 'jpeg', ...jpegMetadata(buf) };
    if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { format: 'png', ...pngMetadata(buf) };
    if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return { format: 'webp', ...webpMetadata(buf) };
  } catch (_) { /* a malformed container just yields less metadata */ }
  return { format: 'unknown', blob: Buffer.alloc(0), text: {} };
}

/** @returns {{ aiGenerated: boolean, generator: string|null, signals: string[], format: string }} */
function detectAiGenerated(buffer) {
  const meta = extract(buffer);
  // UTF-16 text (EXIF UserComment from Stable Diffusion WebUI ...) has a NUL between letters: search a NUL-stripped copy as well
  const raw = meta.blob;
  const stripped = Buffer.from(raw.filter((b) => b !== 0));
  const hay = Buffer.concat([raw, Buffer.from('\n'), stripped]).toString('latin1');
  const lower = hay.toLowerCase();
  const signals = [];
  let generator = null;

  if (SOURCE_TYPES.some((s) => lower.includes(s))) signals.push('Marked as AI-generated (IPTC DigitalSourceType)');
  for (const [label, re] of GENERATORS) {
    if (re.test(hay)) { signals.push(`Metadata names the generator: ${label}`); generator = generator || label; }
  }
  let params = meta.text.parameters || '';
  if (!params && hay.includes('Steps:') && (hay.includes('Sampler:') || hay.includes('CFG scale'))) params = 'Steps: Sampler:';
  if (params.includes('Steps:') && (params.includes('Sampler:') || params.includes('CFG scale'))) {
    signals.push('Stable Diffusion generation parameters found in the file');
    generator = generator || 'Stable Diffusion';
  }
  if (meta.text.prompt && meta.text.workflow && (meta.text.prompt + meta.text.workflow).includes('"class_type"')) {
    signals.push('ComfyUI workflow found in the PNG');
    generator = generator || 'ComfyUI';
  }
  for (const key of ['invokeai_metadata', 'invokeai_graph', 'sd-metadata', 'Dream', 'fooocus_scheme']) {
    if (key in meta.text) { signals.push(`Generator metadata key '${key}' found in the PNG`); generator = generator || (/invoke|sd-metadata|Dream/.test(key) ? 'InvokeAI' : 'Fooocus'); break; }
  }
  return { aiGenerated: signals.length > 0, generator, signals, format: meta.format };
}

const AI_GENERATED_MESSAGE = (detail) =>
  `This image appears to be AI-generated or AI-edited (${detail}). Please upload an original photograph that you took of the problem.`;

module.exports = { detectAiGenerated, AI_GENERATED_MESSAGE };
