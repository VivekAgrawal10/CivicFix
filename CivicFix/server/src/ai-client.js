const envelope = async (response) => {
  const body = await response.json().catch(() => null);
  return body?.ok ? body : { ok: false, error: body?.error ?? { code: 'ai_service_error', message: `AI service returned ${response.status}` } };
};

export async function analyzeImage({ buffer, filename, mimeType, candidateHashes = [] }, config) {
  const form = new FormData();
  form.append('image', new Blob([buffer], { type: mimeType }), filename);
  if (candidateHashes.length) form.append('candidate_hashes', candidateHashes.join(','));
  const signal = AbortSignal.timeout(config.timeoutMs);
  let response;
  try { response = await fetch(`${config.aiServiceUrl}/api/v1/analyze`, { method: 'POST', body: form, signal }); }
  catch (error) { return { ok: false, error: { code: 'ai_service_unavailable', message: `AI service unavailable: ${error.name}` } }; }
  // /analyze answers 422 with ok:true and a structured non-civic rejection in `data`; envelope() keeps it.
  return envelope(response);
}

export async function postJson(path, payload, config) {
  try {
    const response = await fetch(`${config.aiServiceUrl}/api/v1${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(config.timeoutMs) });
    return await envelope(response);
  } catch (error) { return { ok: false, error: { code: 'ai_service_unavailable', message: `AI service unavailable: ${error.name}` } }; }
}

export async function getJson(path, config) {
  try { return await envelope(await fetch(`${config.aiServiceUrl}/api/v1${path}`, { signal: AbortSignal.timeout(config.timeoutMs) })); }
  catch (error) { return { ok: false, error: { code: 'ai_service_unavailable', message: `AI service unavailable: ${error.name}` } }; }
}
