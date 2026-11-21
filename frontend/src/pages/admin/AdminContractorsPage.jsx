import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { api } from '../../api/client';
import { PageHeader, Spinner, ErrorBox, useLoad, Modal, Field, inputCls } from '../../components/admin/ui';

function AddForm({ onDone, onCancel }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async () => { setBusy(true); setErr(''); try { await api.adminCreateContractor(f); onDone(); } catch (e) { setErr(e.message); setBusy(false); } };
  return (
    <Modal title="Add contractor" onClose={onCancel}>
      <Field label="Name / company"><input className={inputCls} value={f.name} onChange={set('name')} /></Field>
      <Field label="Email (their login)"><input type="email" className={inputCls} value={f.email} onChange={set('email')} /></Field>
      <Field label="Phone (optional)"><input className={inputCls} value={f.phone} onChange={set('phone')} /></Field>
      <Field label="Temporary password (min 8 characters)"><input type="text" className={inputCls} value={f.password} onChange={set('password')} /></Field>
      {err && <p className="text-xs text-rose-600">{err}</p>}
      <button className="btn-primary w-full py-2 rounded-lg text-xs font-semibold disabled:opacity-50" disabled={busy || !f.name || !f.email || f.password.length < 8} onClick={submit}>{busy ? 'Creating…' : 'Create contractor account'}</button>
      <p className="text-[11px] opacity-60">Share the email and password with the contractor. They sign in at the same login page and land on “My Jobs”.</p>
    </Modal>
  );
}

export function AdminContractorsPage() {
  const { data, error, loading, reload } = useLoad(() => api.adminContractors(), []);
  const [adding, setAdding] = useState(false);
  const rows = (data && data.data) || [];
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-5">
      <PageHeader title="Contractors" subtitle="Repair crews, their workload and how quickly they deliver.">
        <button className="btn-primary px-3 py-2 rounded-lg text-xs inline-flex items-center gap-1.5" onClick={() => setAdding(true)}><UserPlus className="w-3.5 h-3.5" />Add contractor</button>
      </PageHeader>
      {error && <ErrorBox error={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      <div className="civic-card overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-left border-b border-brand-border opacity-70"><th className="p-3">Contractor</th><th>Active</th><th>Overdue</th><th>Finished</th><th>Verified</th><th>Avg repair time</th><th>On time</th><th>Account</th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c._id} className="border-b border-brand-border last:border-0">
                <td className="p-3"><div className="font-semibold">{c.name}</div><div className="opacity-60">{c.email}{c.phone ? ` · ${c.phone}` : ''}</div></td>
                <td className="font-mono">{c.activeOrders}</td>
                <td className={`font-mono ${c.overdueOrders ? 'text-rose-600 font-bold' : ''}`}>{c.overdueOrders}</td>
                <td className="font-mono">{c.completedOrders}</td>
                <td className="font-mono">{c.verifiedOrders}</td>
                <td className="font-mono">{c.avgRepairHours == null ? '—' : `${c.avgRepairHours} h`}</td>
                <td className="font-mono">{c.onTimeRate == null ? '—' : `${c.onTimeRate}%`}</td>
                <td>{c.isActive ? 'Active' : <span className="text-rose-600">Suspended</span>}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && <tr><td colSpan={8} className="p-8 text-center opacity-60">No contractors yet. Add your first repair crew.</td></tr>}
          </tbody>
        </table>
      </div>
      {adding && <AddForm onCancel={() => setAdding(false)} onDone={() => { setAdding(false); reload(); }} />}
    </div>
  );
}
