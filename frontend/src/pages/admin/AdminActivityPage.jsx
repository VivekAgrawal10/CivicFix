import React, { useState } from 'react';
import { api } from '../../api/client';
import { PageHeader, Spinner, ErrorBox, useLoad, Pager, fmtDate } from '../../components/admin/ui';

const LABEL = {
  verify_report: 'Verified a report', reject_fake: 'Rejected a report as fake', assign_job: 'Assigned a job', reassign_job: 'Reassigned a job',
  resolve_report: 'Resolved a report', workorder_verified: 'Verified finished work', workorder_in_progress: 'Moved a job back to in progress',
  workorder_completed: 'Marked a job complete', workorder_open: 'Reopened a job', adjust_creds: 'Adjusted CivicCreds', suspend_user: 'Suspended a user',
  activate_user: 'Reactivated a user', create_contractor: 'Created a contractor account',
};

export function AdminActivityPage() {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useLoad(() => api.adminActivity({ page, limit: 30 }), [page]);
  const rows = (data && data.data) || [];
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">
      <PageHeader title="Activity log" subtitle="An audit trail of every admin action: who did what, and when." />
      {error && <ErrorBox error={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      <div className="civic-card divide-y divide-brand-border">
        {rows.map((a) => (
          <div key={a._id} className="p-3 text-xs flex items-start justify-between gap-3">
            <div><div className="font-semibold">{LABEL[a.action] || a.action}</div><div className="opacity-70">{a.details}</div></div>
            <div className="text-right shrink-0 opacity-70"><div>{a.admin}</div><div>{fmtDate(a.createdAt)}</div></div>
          </div>
        ))}
        {!loading && rows.length === 0 && <div className="p-8 text-center text-xs opacity-60">No admin actions recorded yet.</div>}
      </div>
      <Pager pagination={data && data.pagination} onPage={setPage} />
    </div>
  );
}
