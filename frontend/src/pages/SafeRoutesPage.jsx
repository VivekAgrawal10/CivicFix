import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowUpDown, CheckCircle2, ExternalLink, Loader2, LocateFixed, MapPin, Route as RouteIcon, Search } from 'lucide-react';
import { RoutePlannerMap } from '../components/RoutePlannerMap';
import { useCivicData } from '../context/CivicDataContext';
import { fmtDistance, fmtDuration, geocode, isRoadHazard, planRoute, reverseGeocode, sampleWaypoints } from '../utils/routing';

const parsePoint = (s) => {
  if (!s) return null;
  const [lat, lng] = s.split(',').map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

function PlaceInput({ letter, color, label, place, onSelect, onPickOnMap, picking, onUseMyLocation }) {
  const [text, setText] = useState('');
  const [hits, setHits] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { if (place) setText(place.label || `${place.lat.toFixed(5)}, ${place.lng.toFixed(5)}`); }, [place]);

  const search = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true); setMsg(''); setHits([]);
    try {
      const found = await geocode(text.trim());
      if (!found.length) setMsg('No place found. Try a landmark or street name, or tap the map.');
      else if (found.length === 1) onSelect(found[0]);
      else setHits(found);
    } catch { setMsg('Place search is unavailable right now. Tap the map instead.'); }
    setBusy(false);
  };

  return (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold text-brand-text opacity-70">{label}</label>
      <form onSubmit={search} className="flex gap-1.5">
        <span className="w-7 h-9 shrink-0 rounded-lg text-white text-xs font-bold flex items-center justify-center" style={{ background: color }}>{letter}</span>
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-brand-text opacity-60 absolute left-2.5 top-2.5" />
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search a place, street or landmark" className="civic-input w-full pl-8 text-xs" />
        </div>
        <button type="submit" className="btn-secondary text-xs px-3 shrink-0" disabled={busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}</button>
      </form>
      <div className="flex gap-3 text-[11px] pl-9">
        <button type="button" onClick={onPickOnMap} className={`underline ${picking ? 'font-bold text-brand-primary' : 'text-brand-text opacity-80'}`}><MapPin className="w-3 h-3 inline -mt-0.5" /> {picking ? 'Tap the map now' : 'Pick on map'}</button>
        <button type="button" onClick={onUseMyLocation} className="underline text-brand-text opacity-80"><LocateFixed className="w-3 h-3 inline -mt-0.5" /> My location</button>
      </div>
      {msg && <p className="text-[11px] text-amber-900 dark:text-amber-300 pl-9">{msg}</p>}
      {hits.length > 0 && (
        <ul className="ml-9 rounded-lg border border-brand-border bg-brand-surface-elevated divide-y divide-brand-border text-xs">
          {hits.map((h, i) => (
            <li key={i}><button type="button" className="w-full text-left px-2.5 py-1.5 hover:bg-brand-surface text-brand-text" onClick={() => { setHits([]); onSelect(h); }}>{h.label}</button></li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SafeRoutesPage() {
  const { incidents } = useCivicData();
  const [params] = useSearchParams();
  const [origin, setOrigin] = useState(null);
  const [dest, setDest] = useState(null);
  const [pickMode, setPickMode] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const incidentsRef = useRef(incidents);
  incidentsRef.current = incidents;

  const labelFor = useCallback(async (which, lat, lng) => {
    const name = await reverseGeocode(lat, lng).catch(() => null);
    if (name) (which === 'origin' ? setOrigin : setDest)((p) => (p && p.lat === lat && p.lng === lng ? { ...p, label: name } : p));
  }, []);

  const setPoint = useCallback((which, lat, lng, label) => {
    const p = { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6, label: label || `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
    (which === 'origin' ? setOrigin : setDest)(p);
    if (!label) labelFor(which, p.lat, p.lng);
  }, [labelFor]);

  const locateMe = useCallback((which) => {
    if (!navigator.geolocation) { setError('This browser cannot share your location. Search for a place or tap the map.'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setError(''); setPoint(which, pos.coords.latitude, pos.coords.longitude); },
      () => setError('Could not read your location. Allow location access in the browser, or search for a place / tap the map.'),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }, [setPoint]);

  // Deep link from other pages: /routes?to=lat,lng&toName=...&from=lat,lng
  useEffect(() => {
    const to = parsePoint(params.get('to')), from = parsePoint(params.get('from'));
    if (to) setPoint('dest', to.lat, to.lng, params.get('toName') || undefined);
    if (from) setPoint('origin', from.lat, from.lng, params.get('fromName') || undefined);
    else if (to) locateMe('origin');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const compute = useCallback(async () => {
    if (!origin || !dest) return;
    setLoading(true); setError('');
    try {
      setPlan(await planRoute([origin.lat, origin.lng], [dest.lat, dest.lng], incidentsRef.current));
    } catch (e) {
      setPlan(null);
      setError(e.name === 'AbortError' ? 'The routing server took too long. Try again.' : `Could not find a route: ${e.message}`);
    }
    setLoading(false);
  }, [origin, dest]);

  useEffect(() => { setPlan(null); if (origin && dest) compute(); }, [origin && origin.lat, origin && origin.lng, dest && dest.lat, dest && dest.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPick = (which, lat, lng) => { setPoint(which, lat, lng); setPickMode(null); };
  const swap = () => { setOrigin(dest); setDest(origin); };

  const hazardCount = incidents.filter(isRoadHazard).length;
  const rec = plan && plan.recommended, fast = plan && plan.fastest;
  const extraSec = plan && !plan.sameRoute ? rec.duration - fast.duration : 0;

  const navUrl = rec && origin && dest
    ? `https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=${origin.lat},${origin.lng}&destination=${dest.lat},${dest.lng}`
      + (sampleWaypoints(rec.path).length ? `&waypoints=${sampleWaypoints(rec.path).map((p) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`).join('%7C')}` : '')
    : null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">Safe Travel Routes</h1>
        <p className="text-xs sm:text-sm text-brand-text opacity-80 mt-1">
          Pick a start and a destination. We find the fastest road route, check it against open reports of potholes, road damage and waterlogging, and switch to the next-best route if the fastest one passes a hazard.
        </p>
      </div>

      <div className="civic-card p-5 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-3 items-start">
          <PlaceInput letter="A" color="#2563EB" label="Starting location" place={origin} onSelect={(h) => setPoint('origin', h.lat, h.lng, h.label)}
            onPickOnMap={() => setPickMode(pickMode === 'origin' ? null : 'origin')} picking={pickMode === 'origin'} onUseMyLocation={() => locateMe('origin')} />
          <button type="button" onClick={swap} className="btn-secondary p-2 mt-6 hidden lg:block" title="Swap start and destination" aria-label="Swap start and destination"><ArrowUpDown className="w-4 h-4" /></button>
          <PlaceInput letter="B" color="#DC2626" label="Destination" place={dest} onSelect={(h) => setPoint('dest', h.lat, h.lng, h.label)}
            onPickOnMap={() => setPickMode(pickMode === 'dest' ? null : 'dest')} picking={pickMode === 'dest'} onUseMyLocation={() => locateMe('dest')} />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-brand-text opacity-80 border-t border-brand-border pt-3">
          <span>{hazardCount} open road hazard{hazardCount === 1 ? '' : 's'} reported by citizens are being checked.</span>
          {origin && dest && <button type="button" onClick={compute} disabled={loading} className="underline">Re-check with latest reports</button>}
        </div>
        {error && <p className="text-xs text-amber-900 dark:text-amber-300">{error}</p>}
      </div>

      {loading && <div className="civic-card p-4 text-xs text-brand-text flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Finding routes and checking them for hazards…</div>}

      {plan && !loading && (
        <>
          <div className={`civic-card p-4 text-sm flex items-start gap-2 ${plan.sameRoute && fast.score === 0 ? 'border-emerald-500/50' : plan.recommended.score === 0 ? 'border-emerald-500/50' : 'border-amber-500/60'}`}>
            {rec.score === 0 ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />}
            <p className="text-brand-text">
              {plan.sameRoute && fast.score === 0 && 'The fastest route has no reported hazards on it. Safe to go.'}
              {!plan.sameRoute && rec.score === 0 && `The fastest route passes ${fast.hazards.length} reported hazard${fast.hazards.length === 1 ? '' : 's'}. The next-best route avoids ${plan.avoided.length === 1 ? 'it' : 'them'} and adds about ${fmtDuration(extraSec)}.`}
              {!plan.sameRoute && rec.score > 0 && `Every route we found passes a hazard. The recommended one has the fewest and least severe (${rec.hazards.length} instead of ${fast.hazards.length}) and adds about ${fmtDuration(extraSec)}.`}
              {plan.sameRoute && fast.score > 0 && `The fastest route passes ${fast.hazards.length} reported hazard${fast.hazards.length === 1 ? '' : 's'}, and no alternative was close enough in time to avoid ${fast.hazards.length === 1 ? 'it' : 'them'}. Drive carefully.`}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`civic-card p-4 space-y-1.5 ${fast.score > 0 ? 'border-rose-500/50' : 'border-blue-500/40'}`}>
              <div className="flex items-center justify-between text-xs">
                <span className={`font-bold flex items-center gap-1 ${fast.score > 0 ? 'text-rose-600' : 'text-blue-600'}`}><RouteIcon className="w-3.5 h-3.5" /> Fastest route</span>
                <span className="font-mono text-brand-text">{fmtDuration(fast.duration)} · {fmtDistance(fast.distance)}</span>
              </div>
              {fast.hazards.length === 0
                ? <p className="text-xs text-brand-text opacity-80">No reported hazards on this route.</p>
                : <ul className="text-xs text-brand-text opacity-90 list-disc pl-4">{fast.hazards.map((h) => <li key={h.id}>{h.title} ({h.category}, {h.severity})</li>)}</ul>}
            </div>

            {!plan.sameRoute && (
              <div className={`civic-card p-4 space-y-1.5 ${rec.score === 0 ? 'border-emerald-500/50' : 'border-amber-500/60'}`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Recommended safer route</span>
                  <span className="font-mono text-brand-text font-bold">{fmtDuration(rec.duration)} · {fmtDistance(rec.distance)}</span>
                </div>
                <p className="text-xs text-brand-text opacity-80">
                  {rec.score === 0 ? 'No reported hazards on this route.' : `${rec.hazards.length} reported hazard${rec.hazards.length === 1 ? '' : 's'} remain.`}{' '}
                  {rec.source === 'detour' ? 'Built by bending around the hazard.' : 'Next-fastest road route.'}
                </p>
              </div>
            )}
          </div>

          <div className="civic-card p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-brand-text">Route map</span>
              {navUrl && (
                <a href={navUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-primary hover:underline flex items-center gap-1 font-semibold">
                  <ExternalLink className="w-3.5 h-3.5" /> Start navigation in Google Maps (follows the recommended route)
                </a>
              )}
            </div>
            <RoutePlannerMap origin={origin} dest={dest} plan={plan} incidents={incidents} pickMode={pickMode} onPick={onPick} onDrag={(w, lat, lng) => setPoint(w, lat, lng)} />
          </div>
        </>
      )}

      {!plan && !loading && (
        <div className="civic-card p-4 space-y-3">
          <span className="text-xs font-bold text-brand-text">Route map</span>
          <RoutePlannerMap origin={origin} dest={dest} plan={null} incidents={incidents} pickMode={pickMode} onPick={onPick} onDrag={(w, lat, lng) => setPoint(w, lat, lng)} />
        </div>
      )}

      <p className="text-[11px] text-brand-text opacity-60">
        Hazards are open citizen reports within 30 m of the road line, so a route can still contain problems nobody has reported. Driving routes by OSRM; map data &copy; OpenStreetMap contributors.
      </p>
    </div>
  );
}
