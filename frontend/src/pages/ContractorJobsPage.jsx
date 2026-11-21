import React, { useRef, useState } from 'react';
import { MapPin, Camera, Play, CheckCircle2, Clock, AlertTriangle, Navigation } from 'lucide-react';
import { api, assetUrl } from '../api/client';
import { Pill, Spinner, ErrorBox, useLoad, PageHeader, CATEGORY_LABEL, PRIORITY_STYLE, fmtDay } from '../components/admin/ui';

function Job({ o, onChanged }) {
  const rep = o.report || {};
  const fileRef = useRef(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const evidence = o.repairEvidence || [];
  const [lng, lat] = (rep.location && rep.location.coordinates) || [];
  const overdue = o.scheduledDate && ['open', 'in_progress'].includes(o.status) && new Date(o.scheduledDate) < new Date();

  const act = async (fn) => { setBusy(true); setErr(''); try { await fn(); await onChanged(); } catch (e) { setErr(e.message); } setBusy(false); };
  const upload = (e) => { const files = Array.from(e.target.files || []); e.target.value = ''; if (files.length) act(() => api.uploadJobEvidence(o._id, files)); };

  return (
    <div className={`civic-card p-4 space-y-3 ${overdue ? 'border-rose-500' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold">{rep.title}</div>
          <div className="text-xs opacity-70">{CATEGORY_LABEL[rep.category] || rep.category}</div>
        </div>
        <div className="flex flex-col items-end gap-1"><Pill value={o.status} /><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${PRIORITY_STYLE[o.priority]}`}>{o.priority}</span></div>
      </div>
      <div className="text-xs flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{rep.address || 'Pinned location'}</span>
        <span className={`flex items-center gap-1 ${overdue ? 'text-rose-600 font-bold' : ''}`}>{overdue ? <AlertTriangle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}{o.scheduledDate ? `Due ${fmtDay(o.scheduledDate)}` : 'No due date'}</span>
        {lat != null && <a className="flex items-center gap-1 underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}><Navigation className="w-3.5 h-3.5" />Directions</a>}
      </div>
      {rep.images && rep.images[0] && <img src={assetUrl(rep.images[0])} alt="Reported issue" className="h-32 rounded-lg object-cover border border-brand-border" />}
      {o.notes && <pre className="text-xs whitespace-pre-wrap font-sans civic-card p-2.5 opacity-90">{o.notes}</pre>}

      {['open', 'in_progress'].includes(o.status) && (
        <div className="space-y-2 border-t border-brand-border pt-3">
          {o.status === 'open' && <button disabled={busy} className="btn-primary w-full py-2 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5" onClick={() => act(() => api.setJobStatus(o._id, 'in_progress'))}><Play className="w-3.5 h-3.5" />Start job</button>}
          {o.status === 'in_progress' && (<>
            <div className="text-xs font-semibold">Proof of repair: {evidence.length} photo(s)</div>
            {evidence.length > 0 && <div className="flex gap-2 flex-wrap">{evidence.map((u) => <img key={u} src={assetUrl(u)} alt="Repair proof" className="h-16 w-16 object-cover rounded-lg border border-brand-border" />)}</div>}
            <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={upload} />
            <button disabled={busy} className="btn-secondary w-full py-2 rounded-lg text-xs inline-flex items-center justify-center gap-1.5" onClick={() => fileRef.current && fileRef.current.click()}><Camera className="w-3.5 h-3.5" />Add “after” photos</button>
            <input className="w-full text-xs px-3 py-2 rounded-lg bg-brand-surface border border-brand-border" placeholder="Note for the admin (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            <button disabled={busy || evidence.length === 0} className="btn-primary w-full py-2 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50" onClick={() => act(() => api.setJobStatus(o._id, 'completed', note))}><CheckCircle2 className="w-3.5 h-3.5" />Mark job complete</button>
            {evidence.length === 0 && <p className="text-[11px] opacity-60">Upload at least one photo of the finished repair to complete the job.</p>}
          </>)}
        </div>
      )}
      {o.status === 'completed' && <p className="text-xs text-amber-700 dark:text-amber-300 border-t border-brand-border pt-3">Submitted. Waiting for the admin to verify your work.</p>}
      {o.status === 'verified' && <p className="text-xs text-emerald-700 dark:text-emerald-300 border-t border-brand-border pt-3">Verified by admin. Nice work.</p>}
      {err && <p className="text-xs text-rose-600">{err}</p>}
    </div>
  );
}

export function ContractorJobsPage() {
  const { data, error, loading, reload } = useLoad(() => api.myJobs(), []);
  const [tab, setTab] = useState('active');
  const all = (data && data.data) || [];
  const groups = {
    active: all.filter((o) => ['open', 'in_progress'].includes(o.status)),
    review: all.filter((o) => o.status === 'completed'),
    done: all.filter((o) => o.status === 'verified'),
  };
  const TABS = [['active', 'To do'], ['review', 'Awaiting verification'], ['done', 'Verified']];
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
      <PageHeader title="My jobs" subtitle="Jobs assigned to you. Upload an “after” photo to finish a job; the admin then verifies it." />
      <div className="flex gap-2 flex-wrap">
        {TABS.map(([k, label]) => <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border border-brand-border ${tab === k ? 'bg-brand-primary text-brand-primary-text' : 'bg-brand-surface-elevated'}`}>{label} ({groups[k].length})</button>)}
      </div>
      {error && <ErrorBox error={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      {data && groups[tab].length === 0 && <div className="civic-card p-8 text-center text-xs opacity-70">Nothing here.</div>}
      <div className="space-y-4">{groups[tab].map((o) => <Job key={o._id} o={o} onChanged={reload} />)}</div>
    </div>
  );
}
