import React, { useState } from 'react';
import { MapPin, Clock, Camera, CheckCircle2, Undo2, AlertTriangle } from 'lucide-react';
import { api, assetUrl } from '../../api/client';
import { PageHeader, Pill, Spinner, ErrorBox, useLoad, Modal, Field, inputCls, CATEGORY_LABEL, PRIORITY_STYLE, fmtDay, fmtDate } from '../../components/admin/ui';

const COLUMNS = [
  { key: 'open', title: 'Not started' },
  { key: 'in_progress', title: 'In progress' },
  { key: 'completed', title: 'Awaiting verification' },
  { key: 'verified', title: 'Verified' },
];

function Card({ o, onOpen }) {
  const rep = o.report || {};
  return (
    <button onClick={() => onOpen(o)} className={`text-left w-full civic-card p-3 space-y-1.5 hover:shadow-md ${o.overdue ? 'border-rose-500' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold leading-snug">{rep.title}</span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${PRIORITY_STYLE[o.priority]}`}>{o.priority}</span>
      </div>
      <div className="text-[11px] opacity-70">{CATEGORY_LABEL[rep.category] || rep.category} · {o.assignedContractor ? o.assignedContractor.name : 'unassigned'}</div>
      <div className="text-[11px] flex items-center gap-1 opacity-70"><MapPin className="w-3 h-3" /><span className="truncate">{rep.address || 'pinned'}</span></div>
      <div className="text-[11px] flex items-center justify-between">
        <span className={`flex items-center gap-1 ${o.overdue ? 'text-rose-600 font-bold' : 'opacity-70'}`}>{o.overdue ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}{o.scheduledDate ? `due ${fmtDay(o.scheduledDate)}` : 'no due date'}</span>
        <span className="flex items-center gap-1 opacity-70"><Camera className="w-3 h-3" />{(o.repairEvidence || []).length}</span>
      </div>
    </button>
  );
}

function Detail({ o, onClose, onChanged }) {
  const rep = o.report || {};
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const move = async (status, confirm) => {
    if (confirm && !window.confirm(confirm)) return;
    setBusy(true); setErr('');
    try { await api.setJobStatus(o._id, status, note); onChanged(status === 'verified' ? 'Verified. The report is resolved and the citizen was paid +50 CivicCreds.' : 'Job updated.'); }
    catch (e) { setErr(e.message); setBusy(false); }
  };
  return (
    <Modal title={rep.title || 'Work order'} onClose={onClose}>
      <div className="flex items-center gap-2"><Pill value={o.status} /><span className="text-xs opacity-70">{o.assignedContractor ? o.assignedContractor.name : 'Unassigned'} · due {fmtDay(o.scheduledDate)}</span></div>
      <div className="text-xs opacity-80">{rep.address}</div>
      <div>
        <div className="text-xs font-semibold mb-1.5">Proof of repair ({(o.repairEvidence || []).length})</div>
        {(o.repairEvidence || []).length === 0 ? <p className="text-xs opacity-60">No photos uploaded yet.</p> : (
          <div className="grid grid-cols-3 gap-2">{o.repairEvidence.map((u) => <a key={u} href={assetUrl(u)} target="_blank" rel="noreferrer"><img src={assetUrl(u)} alt="Repair proof" className="h-20 w-full object-cover rounded-lg border border-brand-border" /></a>)}</div>
        )}
      </div>
      {rep.images && rep.images[0] && <div><div className="text-xs font-semibold mb-1.5">Original report photo</div><img src={assetUrl(rep.images[0])} alt="Original issue" className="h-28 rounded-lg border border-brand-border object-cover" /></div>}
      {o.notes && <pre className="text-xs whitespace-pre-wrap font-sans opacity-80 civic-card p-2.5">{o.notes}</pre>}
      {o.status === 'completed' && (<>
        <Field label="Note for the crew (optional)"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Edges still rough, please redo" /></Field>
        {err && <p className="text-xs text-rose-600">{err}</p>}
        <div className="flex gap-2">
          <button disabled={busy} className="btn-primary flex-1 py-2 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5" onClick={() => move('verified', 'Verify this repair? The report is marked resolved and the citizen is paid +50 CivicCreds.')}><CheckCircle2 className="w-3.5 h-3.5" />Verify and award points</button>
          <button disabled={busy} className="btn-secondary flex-1 py-2 rounded-lg text-xs inline-flex items-center justify-center gap-1.5" onClick={() => move('in_progress')}><Undo2 className="w-3.5 h-3.5" />Send back</button>
        </div>
      </>)}
      {o.status !== 'completed' && err && <p className="text-xs text-rose-600">{err}</p>}
      {o.status === 'verified' && <p className="text-xs text-emerald-700 dark:text-emerald-300">Verified {fmtDate(o.completedDate)}. Reward paid.</p>}
      {['open', 'in_progress'].includes(o.status) && <p className="text-xs opacity-60">Waiting for the contractor. To change the crew, use Reassign from the report on the Reports page.</p>}
    </Modal>
  );
}

export function AdminRepairsPage() {
  const { data, error, loading, reload } = useLoad(() => api.adminWorkOrders(), []);
  const [open, setOpen] = useState(null);
  const [msg, setMsg] = useState('');
  const orders = (data && data.data) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-5">
      <PageHeader title="Work orders" subtitle="Track every repair from assignment to verification. Verifying a finished job pays the citizen." />
      {msg && <div className="civic-card p-3 text-xs">{msg}</div>}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      {data && orders.length === 0 && <div className="civic-card p-8 text-center text-xs opacity-70">No work orders yet. Open a report and choose “Assign to contractor”.</div>}
      {orders.length > 0 && (
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {COLUMNS.map((c) => {
            const list = orders.filter((o) => o.status === c.key);
            return (
              <div key={c.key} className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold px-1"><span>{c.title}</span><span className="font-mono opacity-70">{list.length}</span></div>
                {list.map((o) => <Card key={o._id} o={o} onOpen={setOpen} />)}
                {list.length === 0 && <div className="text-[11px] opacity-50 px-1">Nothing here.</div>}
              </div>
            );
          })}
        </div>
      )}
      {open && <Detail o={open} onClose={() => setOpen(null)} onChanged={(m) => { setOpen(null); setMsg(m); reload(); }} />}
    </div>
  );
}
