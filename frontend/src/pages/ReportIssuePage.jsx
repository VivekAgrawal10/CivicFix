import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, CheckCircle2, ArrowRight, AlertTriangle, Loader2, Coins, School } from 'lucide-react';
import { LocationPicker } from '../components/LocationPicker';
import { useCivicData } from '../context/CivicDataContext';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['Pothole', 'Waterlogging', 'Broken Drain', 'Road Damage', 'Garbage', 'Streetlight'];

export function ReportIssuePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { submitReport, precheckImage, dataSource } = useCivicData();
  const fileRef = useRef(null);

  const [category, setCategory] = useState('Pothole');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [coords, setCoords] = useState(null); // must be pinned by the citizen (GPS, search or tap on the map)
  const [description, setDescription] = useState('');
  const [zone, setZone] = useState(''); // '' | 'school' | 'hospital': near a school or hospital -> priority problem
  const [check, setCheck] = useState(null); // { state: 'checking' | 'ok' | 'review' | 'rejected' | 'unavailable', message }
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const onPickFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError('');
    setCheck({ state: 'checking' });
    try {
      const ai = await precheckImage(f);
      if (ai.rejected) setCheck({ state: 'rejected', message: ai.message || 'This photo does not look like a civic problem. Please upload a clear photo of the issue.' });
      else if (!ai.available) setCheck({ state: 'unavailable', message: 'The photo checker is offline, so this photo has NOT been checked. You can still submit; a reviewer will look at it before it counts.' });
      else if (ai.manualReviewRequired && !ai.sceneModelUsed) setCheck({ state: 'review', message: 'Automatic photo recognition is not installed on the server, so this photo has NOT been checked (only obvious documents/screenshots are rejected). It will go to manual review and no reward is paid until someone verifies it.' });
      else if (ai.manualReviewRequired) setCheck({ state: 'review', message: 'We could not tell whether this photo shows a civic problem. You can still submit; a reviewer will check it before it counts.' });
      else setCheck({ state: 'ok', message: ai.category ? `Verified by the photo checker: looks like ${ai.category.replace('_', ' ')}.` : 'Photo accepted by the photo checker.' });
      // never overwrite the citizen's choice, but offer the AI's category when it is confident
      const labelFor = { pothole: 'Pothole', waterlogging: 'Waterlogging', garbage: 'Garbage', streetlight: 'Streetlight', road_damage: 'Road Damage' };
      if (ai.category && labelFor[ai.category] && !ai.manualReviewRequired) setCategory(labelFor[ai.category]);
    } catch (err) {
      setCheck({ state: 'unavailable', message: err.message });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim() || !locationName.trim() || busy) return;
    if (!coords) { setError('Please pin the problem on the map: use your location, search an address, or tap the map.'); return; }
    if (check && check.state === 'rejected') { setError(check.message || 'Please choose a photo of the actual problem.'); return; }
    setBusy(true);
    setError('');
    try {
      const res = await submitReport({ category, description, locationName, ...coords, file, priorityZone: zone || undefined });
      setSubmitted(res);
    } catch (err) {
      setError(err.message || 'Could not submit the report.');
      if (err.code === 'NON_CIVIC_IMAGE' || err.code === 'AI_GENERATED_IMAGE') setCheck({ state: 'rejected', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const checkStyle = { ok: 'border-emerald-500', review: 'border-amber-500', rejected: 'border-red-500', unavailable: 'border-amber-500', checking: 'border-brand-border' };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="civic-card p-6 text-center space-y-3">
          <h1 className="text-lg font-bold text-brand-text">Sign in to report an issue</h1>
          <p className="text-xs text-brand-text opacity-80">Reports are tied to your account so you can track them and earn CivicCreds.</p>
          <Link to="/login" className="btn-primary inline-flex text-xs px-4 py-2">Go to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">Report an Issue</h1>
        <p className="text-xs sm:text-sm text-brand-text opacity-80 mt-1">Help us fix street issues quickly by providing a few details.</p>
        {dataSource !== 'live' && <p className="text-[11px] text-amber-900 dark:text-amber-300 mt-1">Backend not reachable: submitting will fail until the API is running.</p>}
      </div>

      {submitted ? (
        <div className="civic-card p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-800 dark:text-emerald-400" />
          </div>
          <h2 className="text-lg font-bold text-brand-text">Report Submitted</h2>
          <p className="text-xs text-brand-text opacity-80 max-w-sm mx-auto">{submitted.message}</p>
          {submitted.reward && submitted.reward.pending && (
            <p className="text-[11px] flex items-center justify-center gap-1.5 text-amber-900 dark:text-amber-300"><Coins className="w-3.5 h-3.5" /> +{submitted.reward.amount} CivicCreds pending — paid once another citizen or an admin verifies the report. <Link to="/rewards" className="underline">See Rewards</Link></p>
          )}
          <div className="p-3 rounded-lg bg-brand-surface-elevated border border-brand-border text-xs font-mono max-w-sm mx-auto space-y-1">
            <div className="flex justify-between"><span className="opacity-70">Report ID:</span><strong>{submitted.data._id.slice(-8)}</strong></div>
            <div className="flex justify-between"><span className="opacity-70">Category:</span><strong>{category}</strong></div>
            <div className="flex justify-between"><span className="opacity-70">Status:</span><strong>{submitted.data.status}</strong></div>
            {submitted.aiAnalysis && (
              <div className="flex justify-between"><span className="opacity-70">AI screening:</span><strong>{submitted.aiAnalysis.outcome}</strong></div>
            )}
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <button onClick={() => { setSubmitted(null); setFile(null); setPreview(null); setCheck(null); setDescription(''); setCoords(null); setLocationName(''); setZone(''); }} className="btn-secondary text-xs px-4 py-2">Report Another</button>
            <button onClick={() => navigate('/my-reports')} className="btn-primary text-xs px-4 py-2">
              <span>View My Reports</span><ArrowRight className="w-3.5 h-3.5 text-brand-text" />
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="civic-card p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-brand-text block">1. What is the problem?</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button key={cat} type="button" onClick={() => setCategory(cat)}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border text-center transition-colors ${
                    category === cat ? 'bg-brand-primary border-brand-border text-brand-primary-text font-semibold' : 'bg-brand-surface-elevated border-brand-border text-brand-text hover:bg-brand-surface'}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-brand-text block">2. Add a photo</label>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={onPickFile} className="hidden" />
            <button type="button" onClick={() => fileRef.current && fileRef.current.click()}
              className={`relative w-full rounded-lg overflow-hidden border h-44 bg-brand-surface-elevated flex items-center justify-center ${check ? checkStyle[check.state] : 'border-brand-border'}`}>
              {preview ? <img src={preview} alt="Issue preview" className="w-full h-full object-cover" /> : (
                <div className="text-center p-4 text-xs text-brand-text opacity-70">
                  <Camera className="w-6 h-6 mx-auto mb-1 opacity-60" />
                  <span>Tap to take or choose a photo</span>
                </div>
              )}
            </button>
            {check && (
              <div className={`text-[11px] flex items-start gap-1.5 ${check.state === 'rejected' ? 'text-red-900 dark:text-red-300' : check.state === 'ok' ? 'text-emerald-900 dark:text-emerald-300' : 'text-amber-900 dark:text-amber-300'}`}>
                {check.state === 'checking' ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : check.state === 'ok' ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                <span>{check.state === 'checking' ? 'Checking the photo…' : check.message}</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-brand-text block">3. Where is it? <span className="font-normal opacity-70">(type the address and press Enter, or tap the map)</span></label>
            <LocationPicker value={coords} address={locationName} onChange={setCoords} onAddressChange={setLocationName} />
          </div>

          <div className="space-y-1.5" data-testid="priority-zone">
            <span className="text-xs font-bold text-brand-text block">4. Is this spot near a school or hospital?</span>
            <div className="grid grid-cols-2 gap-2">
              {[['school', 'Near a school'], ['hospital', 'Near a hospital']].map(([v, label]) => (
                <label key={v} className={`flex items-center gap-2 p-3 rounded-lg border text-xs cursor-pointer ${zone === v ? 'border-amber-500 bg-amber-500/10 font-semibold' : 'border-brand-border bg-brand-surface-elevated'}`}>
                  <input type="checkbox" checked={zone === v} onChange={() => setZone(zone === v ? '' : v)} />
                  <School className="w-3.5 h-3.5" /><span>{label}</span>
                </label>
              ))}
            </div>
            <p className="text-[11px] text-brand-text opacity-75">Problems next to schools and hospitals are marked as priority and shown first to the city team. Tick only if it is true; admins check this. Leave both empty if neither.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-brand-text block">5. Short description</label>
            <textarea rows={3} placeholder="Tell us what you observed..." value={description}
              onChange={(e) => setDescription(e.target.value)} className="civic-input w-full text-xs" required />
          </div>

          {!coords && <p className="text-[11px] text-amber-900 dark:text-amber-300">The location is not pinned yet: type the street or landmark and press Enter, tap the map, or use the GPS button. Submit turns on once the pin is placed.</p>}
          {error && <p className="text-xs text-red-900 dark:text-red-300">{error}</p>}

          <div className="pt-2">
            <button type="submit" disabled={busy || !coords || (check && check.state === 'checking')}
              className="btn-primary w-full py-2.5 text-xs sm:text-sm font-semibold rounded-lg shadow-btn disabled:opacity-60">
              <span>{busy ? 'Submitting…' : 'Submit Report'}</span>
              <ArrowRight className="w-4 h-4 text-brand-text" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
