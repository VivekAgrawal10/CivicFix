import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, Search, Loader2, MapPin } from 'lucide-react';
import { TILE_URL, TILE_ATTRIBUTION, TILE_MAX_ZOOM, DEFAULT_CENTER, NOMINATIM } from '../config/map';

const pinIcon = L.divIcon({
  className: 'civic-pin',
  html: '<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#DC2626;border:2px solid #fff;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.5)"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

function ClickToPlace({ onPlace }) {
  useMapEvents({ click: (e) => onPlace(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Recenter({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo([position.lat, position.lng], Math.max(map.getZoom(), 17), { duration: 0.8 });
  }, [position, map]);
  return null;
}

const roundCoord = (n) => Math.round(n * 1e6) / 1e6;

/**
 * Where is the problem? ONE address box plus a map:
 *   - type a street / landmark and press Enter (or "Find"): the place is looked up and the pin is dropped there
 *   - or tap / drag the pin on the map, or use the GPS button (the address box is then filled in from the pin)
 * Whatever the citizen types is never overwritten by an automatic GPS lookup.
 * Props: value {lat,lng}|null, address string, onChange({lat,lng}), onAddressChange(text)
 */
export function LocationPicker({ value, address, onChange, onAddressChange }) {
  const [status, setStatus] = useState({ kind: 'idle', message: '' }); // idle | locating | searching | error | ok
  const [flyTarget, setFlyTarget] = useState(null);
  const reverseSeq = useRef(0);
  const typed = useRef(false);          // the citizen typed in the box: do not overwrite it automatically
  const lastLookup = useRef('');        // the text that was last turned into a pin
  const pinSource = useRef(null);       // 'gps' | 'map' | 'search'

  const reverse = useCallback(async (lat, lng) => {
    const seq = ++reverseSeq.current;
    try {
      const res = await fetch(`${NOMINATIM}/reverse?format=jsonv2&zoom=18&lat=${lat}&lon=${lng}`, { headers: { Accept: 'application/json' } });
      const data = await res.json();
      if (seq === reverseSeq.current && data && data.display_name && !typed.current) { lastLookup.current = data.display_name; onAddressChange(data.display_name); }
    } catch { /* offline: the citizen can type the landmark instead */ }
  }, [onAddressChange]);

  const place = useCallback((lat, lng, { fly = false, source = 'map', note = '' } = {}) => {
    const next = { lat: roundCoord(lat), lng: roundCoord(lng) };
    pinSource.current = source;
    onChange(next);
    setStatus({ kind: 'ok', message: `Pinned at ${next.lat.toFixed(5)}, ${next.lng.toFixed(5)}${note}. Drag the pin if it is not exactly on the problem.` });
    if (fly) setFlyTarget({ ...next, t: Date.now() });
    if (source !== 'search') reverse(next.lat, next.lng);
  }, [onChange, reverse]);

  const locateMe = useCallback((explicit = false) => {
    if (!navigator.geolocation) { setStatus({ kind: 'error', message: 'This browser cannot share your location. Type the street or landmark and press Enter, or tap the map.' }); return; }
    if (explicit) typed.current = false; // pressing the GPS button means "use where I am", so the address box may be refilled
    setStatus({ kind: 'locating', message: 'Asking for your location…' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const acc = Math.round(pos.coords.accuracy || 0);
        place(pos.coords.latitude, pos.coords.longitude, { fly: true, source: 'gps', note: acc ? ` (GPS accuracy about ±${acc} m${acc > 100 ? ', rough' : ''})` : '' });
      },
      (err) => setStatus({
        kind: 'error',
        message: err.code === 1
          ? 'Location permission was denied. Type the street or landmark and press Enter, or tap the map to drop the pin.'
          : 'Could not read your location. Type the street or landmark and press Enter, or tap the map to drop the pin.',
      }),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }, [place]);

  // Ask for the location as soon as the form opens (the browser shows its permission prompt)
  useEffect(() => { if (!value) locateMe(false); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // Turn the typed text into a pin
  const find = useCallback(async () => {
    const q = (address || '').trim();
    if (!q) return;
    lastLookup.current = q;
    setStatus({ kind: 'searching', message: `Looking for “${q}”…` });
    try {
      const res = await fetch(`${NOMINATIM}/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`, { headers: { Accept: 'application/json' } });
      const hits = await res.json();
      if (!hits.length) { setStatus({ kind: 'error', message: `Could not find “${q}” on the map. Add the area or city (for example “Mall Road, Patiala”), or tap the map to drop the pin.` }); return; }
      place(parseFloat(hits[0].lat), parseFloat(hits[0].lon), { fly: true, source: 'search' });
    } catch {
      setStatus({ kind: 'error', message: 'Address search is unavailable right now. Tap the map or use the GPS button.' });
    }
  }, [address, place]);

  const onType = (e) => { typed.current = true; onAddressChange(e.target.value); };
  const onBlur = () => { if (typed.current && (address || '').trim() && address.trim() !== lastLookup.current && pinSource.current !== 'map') find(); };
  const onKey = (e) => { if (e.key === 'Enter') { e.preventDefault(); find(); } };

  const center = value ? [value.lat, value.lng] : DEFAULT_CENTER;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-brand-text opacity-60 absolute left-3 top-2.5" />
          <input type="text" value={address} onChange={onType} onBlur={onBlur} onKeyDown={onKey}
            placeholder="Type the street, landmark or area, then press Enter (e.g. Mall Road, Patiala)" className="civic-input w-full pl-9 text-xs" required />
        </div>
        <button type="button" onClick={find} className="btn-secondary text-xs px-3 shrink-0">Find</button>
        <button type="button" onClick={() => locateMe(true)} className="btn-secondary text-xs px-3 shrink-0" title="Use my current location" aria-label="Use my current location">
          {status.kind === 'locating' ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
        </button>
      </div>

      <div className="relative h-60 rounded-lg overflow-hidden border border-brand-border">
        <MapContainer center={center} zoom={value ? 17 : 14} style={{ width: '100%', height: '100%' }} scrollWheelZoom>
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={TILE_MAX_ZOOM} />
          <ClickToPlace onPlace={(lat, lng) => { typed.current = false; place(lat, lng, { source: 'map' }); }} />
          <Recenter position={flyTarget} />
          {value && (
            <Marker
              position={[value.lat, value.lng]}
              icon={pinIcon}
              draggable
              eventHandlers={{ dragend: (e) => { const p = e.target.getLatLng(); typed.current = false; place(p.lat, p.lng, { source: 'map' }); } }}
            />
          )}
        </MapContainer>
        {!value && (
          <div className="absolute inset-x-0 bottom-2 flex justify-center pointer-events-none z-[500]">
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-black/70 text-white flex items-center gap-1"><MapPin className="w-3 h-3" /> Tap the map to drop a pin on the problem</span>
          </div>
        )}
      </div>

      {status.message && (
        <p className={`text-[11px] ${status.kind === 'error' ? 'text-amber-900 dark:text-amber-300' : status.kind === 'ok' ? 'text-emerald-900 dark:text-emerald-300' : 'text-brand-text opacity-75'}`}>{status.message}</p>
      )}
    </div>
  );
}
