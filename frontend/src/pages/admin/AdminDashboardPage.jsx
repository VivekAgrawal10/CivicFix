import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ShieldQuestion, BadgeCheck, Clock, Download, School, Layers } from 'lucide-react';
import { api, downloadReportsCsv } from '../../api/client';
import { PageHeader, Stat, Bars, Spinner, ErrorBox, useLoad, CATEGORY_LABEL, PRIORITY_STYLE, Pill, fmtDate } from '../../components/admin/ui';

const Alert = ({ to, icon: Icon, tone, count, text }) => count > 0 && (
  <Link to={to} className={`civic-card p-3 flex items-center gap-3 border-l-4 ${tone}`}>
    <Icon className="w-5 h-5 shrink-0" /><div className="text-xs"><b className="text-base font-mono mr-1">{count}</b>{text}</div>
  </Link>
);

function Trend({ rows }) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.reported, r.resolved]));
  return (
    <div>
      <div className="flex items-end gap-1.5 h-28">
        {rows.map((r) => (
          <div key={r.date} className="flex-1 flex items-end justify-center gap-0.5 h-full" title={`${r.date}: ${r.reported} reported, ${r.resolved} resolved`}>
            <div className="w-1/2 bg-brand-primary rounded-t" style={{ height: `${(r.reported / max) * 100}%`, minHeight: r.reported ? 3 : 0 }} />
            <div className="w-1/2 bg-emerald-500 rounded-t" style={{ height: `${(r.resolved / max) * 100}%`, minHeight: r.resolved ? 3 : 0 }} />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] opacity-60 mt-1"><span>{rows[0]?.date.slice(5)}</span><span>{rows[rows.length - 1]?.date.slice(5)}</span></div>
      <div className="flex gap-4 text-[11px] mt-2"><span><i className="inline-block w-2.5 h-2.5 rounded bg-brand-primary mr-1" />Reported</span><span><i className="inline-block w-2.5 h-2.5 rounded bg-emerald-500 mr-1" />Resolved</span></div>
    </div>
  );
}

export function AdminDashboardPage() {
  const { data, error, loading, reload } = useLoad(() => api.adminAnalytics(), []);
  const a = data && data.data;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <PageHeader title="Admin Dashboard" subtitle="Live numbers from the CivicFix database.">
        <button className="btn-secondary px-3 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5" onClick={() => downloadReportsCsv().catch((e) => window.alert(e.message))}><Download className="w-3.5 h-3.5" />Export reports (CSV)</button>
      </PageHeader>

      {loading && !a && <Spinner />}
      {error && <ErrorBox error={error} onRetry={reload} />}

      {a && (<>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <Alert to="/admin/reports?priorityZone=true" icon={School} tone="border-amber-600" count={a.totals.priorityZoneOpen} text="priority problems near schools or hospitals" />
          <Alert to="/admin/clusters" icon={Layers} tone="border-sky-500" count={a.clusterCount} text={`same-problem clusters (${a.clusteredReports} reports, fix once)`} />
          <Alert to="/admin/reports?needsReview=true" icon={ShieldQuestion} tone="border-amber-500" count={a.totals.needsReview} text="reports flagged by the AI for manual review" />
          <Alert to="/admin/repairs" icon={BadgeCheck} tone="border-indigo-500" count={a.totals.awaitingVerification} text="finished jobs waiting for your verification" />
          <Alert to="/admin/repairs" icon={Clock} tone="border-rose-500" count={a.totals.overdueJobs} text="jobs past their due date" />
          <Alert to="/admin/reports?priority=critical" icon={AlertTriangle} tone="border-rose-600" count={a.totals.criticalOpen} text="critical issues still open" />
        </div>

        {a.priorityReports.length > 0 && (
          <div className="civic-card p-5 space-y-2 border-l-4 border-amber-600">
            <div className="flex items-center justify-between"><h2 className="text-sm font-bold flex items-center gap-1.5"><School className="w-4 h-4" />Priority problems (near schools and hospitals)</h2><Link to="/admin/reports?priorityZone=true" className="text-xs underline">See all</Link></div>
            {a.priorityReports.map((r) => (
              <Link key={r._id} to={`/admin/reports?open=${r._id}`} className="flex items-center justify-between gap-3 text-xs border-b border-brand-border pb-1.5 last:border-0 hover:bg-brand-surface-elevated rounded px-1">
                <span className="truncate"><b>{r.title}</b> <span className="opacity-70">· near a {r.priorityZone} · {r.address || 'pinned'} · {r.reporter}</span></span>
                <span className="shrink-0 flex items-center gap-2"><Pill value={r.status} /><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_STYLE[r.priority]}`}>{r.priority}</span></span>
              </Link>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <Stat label="Total reports" value={a.totals.reports} />
          <Stat label="Open" value={a.totals.open} hint={`${a.totals.pending} not yet assigned`} />
          <Stat label="Resolved" value={a.totals.resolved} tone="text-emerald-700 dark:text-emerald-400" hint={`${a.totals.resolutionRate}% resolution rate`} />
          <Stat label="Avg. time to resolve" value={a.totals.avgResolutionHours == null ? '—' : `${a.totals.avgResolutionHours} h`} />
          <Stat label="Active citizens" value={a.totals.citizens} />
          <Stat label="Active contractors" value={a.totals.contractors} />
          <Stat label="CivicCreds issued (30d)" value={a.totals.credsIssued30d} />
          <Stat label="Rejected as fake" value={a.totals.fake} tone={a.totals.fake ? 'text-rose-600' : ''} />
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="civic-card p-5 space-y-3"><h2 className="text-sm font-bold">Last 14 days</h2><Trend rows={a.trend} /></div>
          <div className="civic-card p-5 space-y-3"><h2 className="text-sm font-bold">Open issues by severity</h2>
            <Bars rows={a.byPriority} labelOf={(r) => r.priority[0].toUpperCase() + r.priority.slice(1)} />
            <h2 className="text-sm font-bold pt-2">All reports by category</h2>
            <Bars rows={a.byCategory} labelOf={(r) => CATEGORY_LABEL[r.category] || r.category} colour="bg-sky-500" />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="civic-card p-5 space-y-2">
            <h2 className="text-sm font-bold">Worst hotspots</h2>
            {(a.hotspots || []).length === 0 && <p className="text-xs opacity-60">No open clusters.</p>}
            {(a.hotspots || []).map((h, i) => (
              <div key={i} className="text-xs flex items-center justify-between gap-2 border-b border-brand-border pb-1.5 last:border-0">
                <span className="truncate">{h.address || `${h._id.lat}, ${h._id.lng}`}</span>
                <span className="font-mono shrink-0">{h.issueCount} open</span>
              </div>
            ))}
          </div>
          <div className="civic-card p-5 space-y-2">
            <h2 className="text-sm font-bold">Contractor workload</h2>
            {a.contractors.length === 0 && <p className="text-xs opacity-60">No contractors yet. <Link className="underline" to="/admin/contractors">Add one</Link>.</p>}
            {a.contractors.map((c) => (
              <div key={c._id} className="text-xs flex items-center justify-between border-b border-brand-border pb-1.5 last:border-0">
                <span>{c.name}</span><span className="font-mono">{c.activeOrders} active · {c.verifiedOrders} verified</span>
              </div>
            ))}
          </div>
          <div className="civic-card p-5 space-y-2">
            <h2 className="text-sm font-bold">Top citizens</h2>
            {a.topReporters.length === 0 && <p className="text-xs opacity-60">No citizens yet.</p>}
            {a.topReporters.map((u, i) => (
              <div key={u._id} className="text-xs flex items-center justify-between border-b border-brand-border pb-1.5 last:border-0">
                <span>{i + 1}. {u.name}</span><span className="font-mono">{u.civicCreds} · {u.tier}</span>
              </div>
            ))}
          </div>
        </div>
      </>)}
    </div>
  );
}
