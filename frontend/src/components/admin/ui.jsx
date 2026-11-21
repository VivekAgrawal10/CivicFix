import React, { useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

export const PRIORITY_STYLE = {
  critical: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  low: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
};
export const SEVERITY_LABEL = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
export const SeverityPill = ({ value }) => (
  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_STYLE[value] || ''}`}>{SEVERITY_LABEL[value] || value}</span>
);
export const STATUS_STYLE = {
  pending: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
  assigned: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  in_progress: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  resolved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  closed: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
  open: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
  completed: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  verified: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
};
export const STATUS_LABEL = {
  pending: 'Pending', assigned: 'Assigned', in_progress: 'In progress', resolved: 'Resolved', closed: 'Rejected (fake)',
  open: 'Not started', completed: 'Awaiting verification', verified: 'Verified',
};
export const CATEGORY_LABEL = {
  pothole: 'Pothole', waterlogging: 'Waterlogging', drainage: 'Broken drain', road_damage: 'Road damage', garbage: 'Garbage', streetlight: 'Streetlight', other: 'Other',
};

export const Pill = ({ value, map = STATUS_STYLE, labels = STATUS_LABEL }) => (
  <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${map[value] || 'bg-slate-200 text-slate-800'}`}>{labels[value] || value}</span>
);

export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
export const fmtDay = (iso) => (iso ? new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">{title}</h1>
        {subtitle && <p className="text-xs sm:text-sm text-brand-text opacity-80 mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  );
}

export const Stat = ({ label, value, tone = '', hint }) => (
  <div className="civic-card p-4">
    <span className="text-xs text-brand-text opacity-75 block mb-1">{label}</span>
    <div className={`text-2xl font-bold font-mono ${tone || 'text-brand-text'}`}>{value}</div>
    {hint && <span className="text-[11px] text-brand-text opacity-60">{hint}</span>}
  </div>
);

export function Bars({ rows, labelOf = (r) => r.label, colour = 'bg-brand-primary' }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (!rows.length) return <p className="text-xs opacity-60">No data yet.</p>;
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={labelOf(r)} className="flex items-center gap-2 text-xs">
          <span className="w-28 shrink-0 text-brand-text truncate">{labelOf(r)}</span>
          <div className="flex-1 h-2.5 rounded-full bg-brand-surface-elevated overflow-hidden"><div className={`h-full rounded-full ${colour}`} style={{ width: `${(r.count / max) * 100}%` }} /></div>
          <span className="w-8 text-right font-mono text-brand-text">{r.count}</span>
        </div>
      ))}
    </div>
  );
}

export function Spinner({ label = 'Loading…' }) {
  return <div className="flex items-center gap-2 text-xs text-brand-text opacity-70 py-8 justify-center"><Loader2 className="w-4 h-4 animate-spin" />{label}</div>;
}
export const ErrorBox = ({ error, onRetry }) => (
  <div className="civic-card p-4 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3">
    <span>{error}</span>{onRetry && <button className="btn-secondary px-3 py-1 rounded-lg" onClick={onRetry}>Retry</button>}
  </div>
);

export function Drawer({ title, onClose, children, wide }) {
  useEffect(() => { const h = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  return (
    <div className="fixed inset-0 z-[2500] flex justify-end bg-black/40" onClick={onClose}>
      <div className={`h-full w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} bg-brand-card border-l border-brand-border overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-brand-card border-b border-brand-border px-5 py-3 flex items-center justify-between z-10">
          <h2 className="text-sm font-bold text-brand-text truncate pr-3">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-brand-surface-elevated"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-5">{children}</div>
      </div>
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[2600] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="civic-card-elevated w-full max-w-md p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-brand-text">{title}</h3><button onClick={onClose} aria-label="Close"><X className="w-4 h-4" /></button></div>
        {children}
      </div>
    </div>
  );
}

export const Field = ({ label, children }) => (
  <label className="block text-xs space-y-1"><span className="font-semibold text-brand-text">{label}</span>{children}</label>
);
export const inputCls = 'w-full text-xs px-3 py-2 rounded-lg bg-brand-surface border border-brand-border text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary';

export function Pager({ pagination, onPage }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages, total } = pagination;
  return (
    <div className="flex items-center justify-between text-xs pt-2">
      <span className="opacity-70">{total} total</span>
      <div className="flex items-center gap-2">
        <button className="btn-secondary px-3 py-1 rounded-lg disabled:opacity-40" disabled={page <= 1} onClick={() => onPage(page - 1)}>Prev</button>
        <span className="font-mono">{page} / {totalPages}</span>
        <button className="btn-secondary px-3 py-1 rounded-lg disabled:opacity-40" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}

// Tiny data hook: { data, error, loading, reload }
export function useLoad(fn, deps) {
  const [state, setState] = React.useState({ data: null, error: '', loading: true });
  const run = React.useCallback(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: '' }));
    fn().then((r) => live && setState({ data: r, error: '', loading: false })).catch((e) => live && setState({ data: null, error: e.message || 'Something went wrong', loading: false }));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => run(), [run]);
  return { ...state, reload: run };
}
