import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, School, MapPin, Wrench } from 'lucide-react';
import { api } from '../../api/client';
import { PageHeader, Pill, Spinner, ErrorBox, useLoad, CATEGORY_LABEL, PRIORITY_STYLE, fmtDate } from '../../components/admin/ui';

export function AdminClustersPage() {
  const { data, error, loading, reload } = useLoad(() => api.adminClusters(), []);
  const clusters = (data && data.data) || [];
  const radius = data && data.radiusM;
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-5">
      <PageHeader title="Clusters" subtitle={`The same problem reported by several people${radius ? ` (same category, within ${radius} m)` : ''}. Fix it once and everyone who reported it is notified and gets the certificate.`} />
      {error && <ErrorBox error={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      {data && clusters.length === 0 && <div className="civic-card p-8 text-center text-xs opacity-70">No duplicate reports right now. When two or more people report the same problem at the same spot, it appears here.</div>}
      <div className="space-y-4">
        {clusters.map((c) => (
          <div key={c.key} className="civic-card p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-sm font-bold"><Layers className="w-4 h-4" />{c.count} reports · {CATEGORY_LABEL[c.category] || c.category}</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_STYLE[c.priority]}`}>Severity: {c.priority}</span>
                  {c.priorityZone && <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200"><School className="w-3 h-3" />Near a {c.priorityZone}</span>}
                </div>
                <div className="text-xs opacity-75 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{c.address || `${c.center.lat.toFixed(5)}, ${c.center.lng.toFixed(5)}`}
                  <a className="underline ml-1" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${c.center.lat}&mlon=${c.center.lng}#map=19/${c.center.lat}/${c.center.lng}`}>map</a></div>
                {c.workOrder && <div className="text-xs flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5" />Job: {c.workOrder.contractorName || '—'} <Pill value={c.workOrder.status} /></div>}
              </div>
              <Link to={`/admin/reports?open=${c.primaryId}`} className="btn-primary px-3 py-2 rounded-lg text-xs">Manage this problem</Link>
            </div>
            <ul className="text-xs divide-y divide-brand-border border border-brand-border rounded-lg">
              {c.reports.map((r, i) => (
                <li key={r._id} className="px-3 py-2 flex items-center justify-between gap-3">
                  <span className="truncate">{i === 0 && <b className="mr-1.5">First:</b>}{r.reporter} — {r.title}</span>
                  <span className="shrink-0 flex items-center gap-2 opacity-80"><Pill value={r.status} />{fmtDate(r.createdAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
