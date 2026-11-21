// Pure policy helpers (no Express) so XP/verification rules are unit-testable.
export function isNonCivic(result) { return result?.data?.analysis_status === 'rejected_non_civic' || result?.data?.rejection_code === 'NON_CIVIC_IMAGE'; }

export function hashSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let diff = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
  return 1 - diff / a.length;
}

export function distanceMeters(a, b) {
  if (![a?.lat, a?.lon, b?.lat, b?.lon].every(Number.isFinite)) return null;
  const rad = x => x * Math.PI / 180, R = 6371000;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// A report may be finalized for XP only when it is verified, XP-eligible and not rejected.
export function finalizationDecision(report) {
  if (!report) return { allowed: false, code: 'report_not_found', message: 'No such report.' };
  if (report.state === 'rejected') return { allowed: false, code: 'report_rejected', message: 'Rejected reports never earn XP.' };
  if (!report.xp?.eligible) return { allowed: false, code: 'xp_ineligible', message: report.xp?.reason ?? 'This report is not eligible for XP.' };
  if (report.state !== 'verified') return { allowed: false, code: 'not_verified', message: 'XP is finalized only after independent verification.' };
  return { allowed: true };
}
