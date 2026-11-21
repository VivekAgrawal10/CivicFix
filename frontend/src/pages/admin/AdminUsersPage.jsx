import React, { useEffect, useState } from 'react';
import { Search, Coins } from 'lucide-react';
import { api } from '../../api/client';
import { PageHeader, Spinner, ErrorBox, useLoad, Modal, Field, inputCls, Pager, fmtDate, fmtDay } from '../../components/admin/ui';
import { useAuth } from '../../context/AuthContext';

function CredsModal({ user, onClose, onChanged }) {
  const hist = useLoad(() => api.adminUserCreds(user._id), [user._id]);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const n = Number(amount);
  const valid = Number.isInteger(n) && n !== 0 && Math.abs(n) <= 500 && reason.trim().length >= 3;
  const submit = async () => { setBusy(true); setErr(''); try { await api.adminAdjustCreds(user._id, n, reason); setAmount(''); setReason(''); hist.reload(); onChanged(); } catch (e) { setErr(e.message); } setBusy(false); };
  return (
    <Modal title={`CivicCreds: ${user.name}`} onClose={onClose}>
      <div className="text-xs">Current balance <b className="font-mono">{user.civicCreds}</b> · tier {user.citizenTier}</div>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Amount (±500)"><input className={inputCls} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="+30 or -20" /></Field>
        <div className="col-span-2"><Field label="Reason (shown to the citizen)"><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Cleanup drive volunteer" /></Field></div>
      </div>
      {err && <p className="text-xs text-rose-600">{err}</p>}
      <button className="btn-primary w-full py-2 rounded-lg text-xs font-semibold disabled:opacity-50" disabled={!valid || busy} onClick={submit}>{busy ? 'Applying…' : 'Apply adjustment'}</button>
      <div className="max-h-48 overflow-y-auto space-y-1 text-xs border-t border-brand-border pt-3">
        {hist.loading && <Spinner />}
        {((hist.data && hist.data.data) || []).map((h, i) => (
          <div key={i} className="flex justify-between gap-2"><span className="truncate">{h.action}{h.details ? ` — ${h.details}` : ''}<span className="opacity-50"> · {fmtDate(h.createdAt)}</span></span><b className={`font-mono ${h.amount < 0 ? 'text-rose-600' : 'text-emerald-700 dark:text-emerald-400'}`}>{h.amount > 0 ? '+' : ''}{h.amount}</b></div>
        ))}
      </div>
    </Modal>
  );
}

export function AdminUsersPage() {
  const { user: me } = useAuth();
  const [q, setQ] = useState('');
  const [qs, setQs] = useState('');
  const [role, setRole] = useState('citizen');
  const [page, setPage] = useState(1);
  const [creds, setCreds] = useState(null);
  const [msg, setMsg] = useState('');
  useEffect(() => { const t = setTimeout(() => { setQs(q); setPage(1); }, 350); return () => clearTimeout(t); }, [q]);
  const { data, error, loading, reload } = useLoad(() => api.adminUsers({ role, q: qs, page, limit: 20 }), [role, qs, page]);
  const rows = (data && data.data) || [];

  const toggle = async (u) => {
    if (u.isActive && !window.confirm(`Suspend ${u.name}? They will be signed out of the API immediately.`)) return;
    try { await api.adminSetActive(u._id, !u.isActive); setMsg(`${u.name} ${u.isActive ? 'suspended' : 'reactivated'}.`); reload(); } catch (e) { setMsg(e.message); }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-5">
      <PageHeader title="Users & CivicCreds" subtitle="See every account, adjust points with a reason, suspend abusers." />
      <div className="civic-card p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]"><Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 opacity-60" /><input className={`${inputCls} pl-8`} placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className={`${inputCls} w-auto`} value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}><option value="citizen">Citizens</option><option value="contractor">Contractors</option><option value="admin">Admins</option><option value="">Everyone</option></select>
      </div>
      {msg && <div className="civic-card p-3 text-xs">{msg}</div>}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      <div className="civic-card overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-left border-b border-brand-border opacity-70"><th className="p-3">User</th><th>Role</th><th>CivicCreds</th><th>Tier</th><th>Reports</th><th>Resolved</th><th>Joined</th><th /></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u._id} className="border-b border-brand-border last:border-0">
                <td className="p-3"><div className="font-semibold">{u.name}{!u.isActive && <span className="ml-2 text-[10px] text-rose-600 font-bold">SUSPENDED</span>}</div><div className="opacity-60">{u.email}</div></td>
                <td>{u.role}</td>
                <td className="font-mono">{u.role === 'citizen' ? u.civicCreds : '—'}</td>
                <td>{u.role === 'citizen' ? u.citizenTier : '—'}</td>
                <td className="font-mono">{u.reportCount}</td>
                <td className="font-mono">{u.resolvedCount}</td>
                <td className="opacity-70 whitespace-nowrap">{fmtDay(u.createdAt)}</td>
                <td className="whitespace-nowrap space-x-1.5 pr-3 text-right">
                  {u.role === 'citizen' && <button className="btn-secondary px-2.5 py-1 rounded-lg inline-flex items-center gap-1" onClick={() => setCreds(u)}><Coins className="w-3 h-3" />Points</button>}
                  {u.role !== 'admin' && (!me || u._id !== me._id) && <button className={`px-2.5 py-1 rounded-lg border ${u.isActive ? 'border-rose-400 text-rose-700 dark:text-rose-300' : 'border-emerald-500 text-emerald-700 dark:text-emerald-300'}`} onClick={() => toggle(u)}>{u.isActive ? 'Suspend' : 'Reactivate'}</button>}
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && <tr><td colSpan={8} className="p-8 text-center opacity-60">No users found.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pager pagination={data && data.pagination} onPage={setPage} />
      {creds && <CredsModal user={creds} onClose={() => setCreds(null)} onChanged={reload} />}
    </div>
  );
}
