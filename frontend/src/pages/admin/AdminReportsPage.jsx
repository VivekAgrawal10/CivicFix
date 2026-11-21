import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, MapPin, CheckCircle2, XCircle, UserPlus, Wrench, Cpu, Camera, School, Layers } from 'lucide-react';
import { api, assetUrl } from '../../api/client';
import {
  PageHeader, Pill, SeverityPill, Drawer, Modal, Field, inputCls, Pager, Spinner, ErrorBox, useLoad,
  CATEGORY_LABEL, PRIORITY_STYLE, fmtDate, fmtDay,
} from '../../components/admin/ui';

const ZONE_LABEL = { school: 'Near a school', hospital: 'Near a hospital' };
const ZoneBadge = ({ zone }) => zone && <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200"><School className="w-3 h-3" />{ZONE_LABEL[zone]}</span>;
const STATUSES = ['pending', 'assigned', 'in_progress', 'resolved', 'closed'];
const PRIORITIES = ['critical', 'high', 'medium', 'low'];

function AssignForm({ report, onDone, onCancel }) {
  const { data, loading } = useLoad(() => api.adminContractors(), []);
  const crews = ((data && data.data) || []).filter((c) => c.isActive);
  const [f, setF] = useState({ contractorId: '', dueDate: '', priority: report.priority, notes: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async () => {
    if (!f.contractorId) return setErr('Choose a contractor.');
    setBusy(true); setErr('');
    try {
      const res = await api.adminAssign(report._id, { ...f, dueDate: f.dueDate ? new Date(`${f.dueDate}T18:00:00`).toISOString() : undefined });
      const more = res.data.clusterAssigned;
      onDone(`Job assigned.${more ? ` ${more} other report(s) of the same problem were moved to “assigned” too.` : ''}`);
    }
    catch (e) { setErr(e.message); setBusy(false); }
  };
  return (
    <Modal title={`Assign: ${report.title}`} onClose={onCancel}>
      {loading ? <Spinner /> : crews.length === 0 ? <p className="text-xs">No active contractors yet. Add one on the Contractors page first.</p> : (<>
        <Field label="Contractor"><select className={inputCls} value={f.contractorId} onChange={set('contractorId')}>
          <option value="">Select…</option>
          {crews.map((c) => <option key={c._id} value={c._id}>{c.name} ({c.activeOrders} active)</option>)}
        </select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Due date"><input type="date" className={inputCls} value={f.dueDate} min={new Date().toISOString().slice(0, 10)} onChange={set('dueDate')} /></Field>
          <Field label="Priority"><select className={inputCls} value={f.priority} onChange={set('priority')}>{PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}</select></Field>
        </div>
        <Field label="Instructions for the crew"><textarea rows={3} className={inputCls} value={f.notes} onChange={set('notes')} placeholder="Materials, access, safety notes…" /></Field>
        {err && <p className="text-xs text-rose-600">{err}</p>}
        <button className="btn-primary w-full py-2 rounded-lg text-xs font-semibold disabled:opacity-50" disabled={busy} onClick={submit}>{busy ? 'Assigning…' : 'Assign job'}</button>
      </>)}
    </Modal>
  );
}

function RejectForm({ report, onDone, onCancel }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async () => {
    setBusy(true); setErr('');
    try { await api.adminReject(report._id, reason); onDone('Rejected as fake (-40 CivicCreds applied)'); } catch (e) { setErr(e.message); setBusy(false); }
  };
  return (
    <Modal title="Reject as fake / invalid" onClose={onCancel}>
      <p className="text-xs opacity-80">The report is closed, the citizen loses 40 CivicCreds and sees your reason. This cannot be undone.</p>
      <Field label="Reason (shown to the citizen)"><textarea rows={3} className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. The photo shows a private driveway, not a public road." /></Field>
      {err && <p className="text-xs text-rose-600">{err}</p>}
      <button className="w-full py-2 rounded-lg text-xs font-semibold bg-rose-600 text-white disabled:opacity-50" disabled={busy || reason.trim().length < 3} onClick={submit}>{busy ? 'Rejecting…' : 'Reject report'}</button>
    </Modal>
  );
}

function ReportDrawer({ id, onClose, onChanged }) {
  const { data, error, loading, reload } = useLoad(() => api.adminReport(id), [id]);
  const [modal, setModal] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const r = data && data.data;

  const done = (text) => { setModal(null); setMsg(text); reload(); onChanged(); };
  const run = async (fn, text) => { setBusy(true); setMsg(''); try { await fn(); done(text); } catch (e) { setMsg(e.message); } setBusy(false); };

  const ai = (r && r.aiAnalysis) || {};
  const closedOut = r && ['resolved', 'closed'].includes(r.status);

  return (
    <Drawer title={r ? r.title : 'Report'} onClose={onClose} wide>
      {loading && !r && <Spinner />}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {r && (<>
        <div className="flex flex-wrap items-center gap-2">
          <Pill value={r.status} />
          <SeverityPill value={r.priority} />
          <span className="text-xs opacity-70">{CATEGORY_LABEL[r.category] || r.category}</span>
          {r.moderation && <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${r.moderation.verdict === 'fake' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>{r.moderation.verdict === 'fake' ? 'Rejected as fake' : 'Verified genuine'}</span>}
        </div>
        {msg && <div className="text-xs civic-card p-2.5">{msg}</div>}

        {r.images && r.images.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">{r.images.map((u) => <a key={u} href={assetUrl(u)} target="_blank" rel="noreferrer"><img src={assetUrl(u)} alt="Report evidence" className="rounded-lg border border-brand-border w-full h-40 object-cover" /></a>)}</div>
        ) : <div className="text-xs opacity-60 flex items-center gap-1.5"><Camera className="w-4 h-4" />No photo attached</div>}

        <p className="text-sm text-brand-text">{r.description}</p>
        <div className="text-xs space-y-1">
          <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{r.address || 'Pinned on map'} <a className="underline ml-1" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${r.location.coordinates[1]}&mlon=${r.location.coordinates[0]}#map=18/${r.location.coordinates[1]}/${r.location.coordinates[0]}`}>open map</a></div>
          <div>Reported by <b>{r.submittedBy ? r.submittedBy.name : 'deleted user'}</b>{r.submittedBy && ` (${r.submittedBy.email})`} on {fmtDate(r.createdAt)}</div>
          <div>{r.confirmationCount} confirmation(s){r.confirmers && r.confirmers.length ? `: ${r.confirmers.map((c) => c.name).join(', ')}` : ''}</div>
          <div>Citizen reward: {r.rewardGranted ? '+25 released' : r.rewardPending ? '+25 pending your verification' : 'none'}</div>
        </div>

        <div className="rounded-lg border border-brand-border p-3 text-xs space-y-2" data-testid="severity-box">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-bold">Severity: <SeverityPill value={r.priority} /></span>
            {!closedOut && (
              <span className="flex items-center gap-1.5">Change to
                <select disabled={busy} className={`${inputCls} w-auto`} value={r.priority} onChange={(e) => run(() => api.adminSetSeverity(r._id, e.target.value), `Severity set to ${e.target.value}.`)}>{PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}</select>
              </span>
            )}
          </div>
          <ul className="opacity-80 space-y-0.5">
            <li>· AI estimate from the photo: <b>{ai.severity || 'not available'}</b>{ai.affectedAreaPct != null ? ` (about ${ai.affectedAreaPct}% of the photo affected)` : ''}</li>
            <li>· Confirmed by {r.confirmationCount} other citizen(s){r.confirmationCount >= 5 ? ' → raised to critical' : r.confirmationCount >= 3 ? ' → raised to high' : ''}</li>
            <li>· {r.priorityZone ? `Near a ${r.priorityZone}: always at least high` : 'Not flagged as near a school or hospital'}</li>
            {(r.sameProblem || []).length > 0 && <li>· {r.sameProblem.length} other report(s) of the same problem</li>}
          </ul>
        </div>

        {r.priorityZone && (
          <div className="rounded-lg border border-amber-500 bg-amber-500/10 p-3 text-xs flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5"><School className="w-4 h-4" /><b>Priority problem:</b> the citizen says this is {ZONE_LABEL[r.priorityZone].toLowerCase()}.</span>
            {!closedOut && <button disabled={busy} className="underline shrink-0" onClick={() => { if (window.confirm('Remove the priority flag? Use this when the spot is not really near a school or hospital.')) run(() => api.adminSetPriorityZone(r._id, null), 'Priority flag removed; the report is back in the normal queue.'); }}>Not true, remove flag</button>}
          </div>
        )}

        {(r.sameProblem || []).length > 0 && (
          <div className="civic-card p-3 text-xs space-y-1.5">
            <div className="font-bold flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" />Same problem reported by {r.sameProblem.length} other {r.sameProblem.length === 1 ? 'person' : 'people'}</div>
            <p className="opacity-70">Same category, within {r.clusterRadiusM} m. Assigning or resolving this report does the same for them, and they get the notification and certificate.</p>
            <ul className="space-y-0.5">{r.sameProblem.map((m) => <li key={m._id}>· {m.submittedBy ? m.submittedBy.name : 'Citizen'} — {m.title} <span className="opacity-60">({m.status.replace('_', ' ')}, {fmtDate(m.createdAt)})</span></li>)}</ul>
          </div>
        )}

        <div className="civic-card p-3 text-xs space-y-1">
          <div className="font-bold flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5" />AI analysis</div>
          <div>Outcome: <b>{ai.outcome || 'not analysed'}</b>{ai.confidence != null && ` · confidence ${Math.round(ai.confidence * 100)}%`}{ai.manualReviewRequired && <b className="text-amber-700 dark:text-amber-300"> · flagged for manual review</b>}</div>
          {ai.message && <div className="opacity-80">{ai.message}</div>}
        </div>

        {r.workOrder && (
          <div className="civic-card p-3 text-xs space-y-1">
            <div className="font-bold flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5" />Work order <Pill value={r.workOrder.status} /></div>
            <div>Contractor: <b>{r.workOrder.contractorName || '—'}</b> · due {fmtDay(r.workOrder.scheduledDate)} · {r.workOrder.evidenceCount} proof photo(s)</div>
            {r.workOrder.notes && <pre className="whitespace-pre-wrap opacity-80 font-sans">{r.workOrder.notes}</pre>}
          </div>
        )}

        {!closedOut && (
          <div className="flex flex-wrap gap-2 pt-1">
            {!(r.moderation && r.moderation.verdict === 'valid') && <button disabled={busy} className="btn-secondary px-3 py-2 rounded-lg text-xs inline-flex items-center gap-1.5" onClick={() => run(() => api.adminVerify(r._id), 'Verified as genuine. The citizen’s +25 is released.')}><CheckCircle2 className="w-3.5 h-3.5" />Verify genuine</button>}
            <button disabled={busy} className="btn-primary px-3 py-2 rounded-lg text-xs inline-flex items-center gap-1.5" onClick={() => setModal('assign')}><UserPlus className="w-3.5 h-3.5" />{r.workOrder && ['open', 'in_progress'].includes(r.workOrder.status) ? 'Reassign' : 'Assign to contractor'}</button>
            <button disabled={busy} className="btn-secondary px-3 py-2 rounded-lg text-xs" onClick={() => { if (window.confirm(`Mark this issue as fixed? The citizen is paid +50 CivicCreds.${(r.sameProblem || []).length ? ` The ${r.sameProblem.length} other report(s) of the same problem will be resolved too and those citizens notified.` : ''}`)) run(() => api.adminResolve(r._id), `Resolved. +50 CivicCreds paid to the citizen.${(r.sameProblem || []).length ? ` The ${r.sameProblem.length} other report(s) of the same problem were resolved and their reporters notified.` : ''}`); }}>Mark resolved</button>
            <button disabled={busy} className="px-3 py-2 rounded-lg text-xs inline-flex items-center gap-1.5 border border-rose-400 text-rose-700 dark:text-rose-300" onClick={() => setModal('reject')}><XCircle className="w-3.5 h-3.5" />Reject as fake</button>
          </div>
        )}

        <div>
          <h3 className="text-xs font-bold mb-1.5">History</h3>
          <ol className="space-y-1.5 text-xs border-l-2 border-brand-border pl-3">
            {(r.statusHistory || []).map((h, i) => <li key={i}><b>{(h.newStatus || '').replace('_', ' ')}</b> · {fmtDate(h.createdAt)}{h.remarks ? ` — ${h.remarks}` : ''}</li>)}
          </ol>
        </div>

        {modal === 'assign' && <AssignForm report={r} onDone={done} onCancel={() => setModal(null)} />}
        {modal === 'reject' && <RejectForm report={r} onDone={done} onCancel={() => setModal(null)} />}
      </>)}
    </Drawer>
  );
}

export function AdminReportsPage() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);
  const status = params.get('status') || '';
  const priority = params.get('priority') || '';
  const category = params.get('category') || '';
  const needsReview = params.get('needsReview') || '';
  const qParam = params.get('q') || '';
  const priorityZone = params.get('priorityZone') || '';
  const sort = params.get('sort') || '';
  useEffect(() => { const id = params.get('open'); if (id) setOpenId(id); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, error, loading, reload } = useLoad(
    () => api.adminReports({ status, priority, category, needsReview, priorityZone, sort, q: qParam, page, limit: 15 }),
    [status, priority, category, needsReview, priorityZone, sort, qParam, page],
  );
  const setFilter = (k, v) => { const n = new URLSearchParams(params); v ? n.set(k, v) : n.delete(k); setParams(n, { replace: true }); setPage(1); };
  useEffect(() => { const t = setTimeout(() => q !== qParam && setFilter('q', q), 350); return () => clearTimeout(t); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = (data && data.data) || [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-5">
      <PageHeader title="Reports" subtitle="Triage, verify, assign and close citizen reports." />

      <div className="civic-card p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]"><Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 opacity-60" /><input className={`${inputCls} pl-8`} placeholder="Search title, address, description…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className={`${inputCls} w-auto`} value={status} onChange={(e) => setFilter('status', e.target.value)}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select>
        <select className={`${inputCls} w-auto`} value={priority} onChange={(e) => setFilter('priority', e.target.value)}><option value="">All severities</option>{PRIORITIES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <select className={`${inputCls} w-auto`} value={category} onChange={(e) => setFilter('category', e.target.value)}><option value="">All categories</option>{Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className={`${inputCls} w-auto`} value={sort} onChange={(e) => setFilter('sort', e.target.value)} aria-label="Sort"><option value="">Newest first</option><option value="severity">Most severe first</option></select>
        <label className="text-xs flex items-center gap-1.5"><input type="checkbox" checked={priorityZone === 'true'} onChange={(e) => setFilter('priorityZone', e.target.checked ? 'true' : '')} />Near school / hospital</label>
        <label className="text-xs flex items-center gap-1.5"><input type="checkbox" checked={needsReview === 'true'} onChange={(e) => setFilter('needsReview', e.target.checked ? 'true' : '')} />Needs manual review</label>
      </div>

      {error && <ErrorBox error={error} onRetry={reload} />}
      {loading && !data && <Spinner />}

      <div className="civic-card overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-left border-b border-brand-border opacity-70"><th className="p-3">Report</th><th>Reporter</th><th>Severity</th><th>Status</th><th>Job</th><th>Reported</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} className="border-b border-brand-border last:border-0 hover:bg-brand-surface-elevated cursor-pointer" onClick={() => setOpenId(r._id)}>
                <td className="p-3 max-w-[260px]"><div className="font-semibold truncate">{r.title}</div><div className="opacity-60 truncate">{CATEGORY_LABEL[r.category] || r.category} · {r.address || 'pinned'}</div>
                  <ZoneBadge zone={r.priorityZone} />
                  {r.aiAnalysis && r.aiAnalysis.manualReviewRequired && !r.moderation && <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold">NEEDS REVIEW</span>}</td>
                <td>{r.submittedBy ? r.submittedBy.name : '—'}</td>
                <td><SeverityPill value={r.priority} />{r.sameProblemCount > 0 && <div className="text-[10px] mt-1 font-semibold text-sky-800 dark:text-sky-300">+{r.sameProblemCount} same problem</div>}</td>
                <td><Pill value={r.status} /></td>
                <td>{r.workOrder ? <span>{r.workOrder.contractorName}<br /><Pill value={r.workOrder.status} /></span> : <span className="opacity-50">—</span>}</td>
                <td className="opacity-70 whitespace-nowrap">{fmtDate(r.createdAt)}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && <tr><td colSpan={6} className="p-8 text-center opacity-60">No reports match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pager pagination={data && data.pagination} onPage={setPage} />

      {openId && <ReportDrawer id={openId} onClose={() => { setOpenId(null); if (params.get('open')) { const n = new URLSearchParams(params); n.delete('open'); setParams(n, { replace: true }); } }} onChanged={reload} />}
    </div>
  );
}
