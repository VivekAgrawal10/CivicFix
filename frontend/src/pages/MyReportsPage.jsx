import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  MapPin, 
  Clock, 
  X,
  Download,
  Coins,
  PlusCircle
} from 'lucide-react';
import { useCivicData } from '../context/CivicDataContext';
import { useAuth } from '../context/AuthContext';
import { generateResolutionCertificate } from '../utils/generateCertificatePdf';

// Reward state of one of the citizen's own reports
function RewardBadge({ report }) {
  if (report.rewardGranted) return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border border-emerald-500/40 flex items-center gap-1"><Coins className="w-3 h-3" />+25 earned</span>;
  if (report.rewardPending) return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-500/40 flex items-center gap-1"><Coins className="w-3 h-3" />+25 pending verification</span>;
  return null;
}

export function MyReportsPage() {
  const { myReports, dataSource } = useCivicData();
  const { user, loading } = useAuth();
  const [selectedReport, setSelectedReport] = useState(null);

  const handleDownload = (e, report) => {
    e.stopPropagation();
    generateResolutionCertificate(report);
  };

  if (loading) return null;
  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="civic-card p-6 text-center space-y-3">
          <h1 className="text-lg font-bold text-brand-text">Sign in to see your reports</h1>
          <p className="text-xs text-brand-text opacity-80">Only reports you submit appear here.</p>
          <Link to="/login" className="btn-primary inline-flex text-xs px-4 py-2">Go to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-text">My Reports</h1>
        <p className="text-xs sm:text-sm text-brand-text opacity-75 mt-1">
          Track the status of issues reported in your neighborhood and download resolution certificates once verified.
        </p>
        {dataSource !== 'live' && <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-1">Cannot reach the CivicFix server right now, so your reports may be out of date.</p>}
      </div>

      {myReports.length === 0 && (
        <div className="civic-card p-8 text-center space-y-3">
          <FileText className="w-8 h-8 mx-auto text-brand-text opacity-60" />
          <p className="text-sm font-semibold text-brand-text">You haven't reported anything yet</p>
          <p className="text-xs text-brand-text opacity-75">Spot a pothole, garbage pile or broken street light? Report it and earn CivicCreds.</p>
          <Link to="/report" className="btn-primary inline-flex text-xs px-4 py-2"><PlusCircle className="w-4 h-4" /><span>Report an Issue</span></Link>
        </div>
      )}

      {/* Reports List */}
      <div className="space-y-3">
        {myReports.map((report) => {
          const isResolved = report.status === 'RESOLVED' || report.status === 'COMPLETED' || report.status === 'Completed';

          return (
            <div
              key={report.id}
              onClick={() => setSelectedReport(report)}
              className="civic-card p-4 hover:border-brand-primary cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-surface-elevated border border-brand-border text-brand-text font-semibold">
                    {report.id}
                  </span>
                  <h3 className="text-sm font-bold text-brand-text">{report.title}</h3>
                  <RewardBadge report={report} />
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-brand-text opacity-75">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 opacity-60" />
                    {report.roadName}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 opacity-60" />
                    {report.reportedAt}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-center shrink-0">
                <span className={`text-xs font-mono px-2.5 py-1 rounded font-medium ${
                  isResolved 
                    ? 'bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border border-emerald-500/40' 
                    : 'bg-brand-surface-elevated border border-brand-border text-brand-text'
                }`}>
                  {report.status}
                </span>

                {/* Download Resolution Certificate (PDF) Button - Only for resolved reports */}
                {isResolved && (
                  <button
                    type="button"
                    onClick={(e) => handleDownload(e, report)}
                    title="Download Official Resolution Certificate (PDF)"
                    className="btn-accent text-xs font-semibold px-3 py-1 rounded-md shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Resolution Certificate (PDF)</span>
                  </button>
                )}

                <button 
                  type="button"
                  className="text-xs text-brand-primary font-semibold hover:underline px-1"
                >
                  View details
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Clean Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="civic-card-elevated w-full max-w-lg p-6 relative space-y-4">
            <button
              onClick={() => setSelectedReport(null)}
              className="absolute top-4 right-4 p-1 rounded-lg bg-brand-surface hover:bg-brand-surface-elevated text-brand-text"
            >
              <X className="w-4 h-4 text-brand-text" />
            </button>

            <div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-surface border border-brand-border text-brand-text font-bold">
                {selectedReport.id}
              </span>
              <h2 className="text-lg font-bold text-brand-text mt-1">{selectedReport.title}</h2>
              <p className="text-xs text-brand-text opacity-70 mt-0.5">{selectedReport.roadName}</p>
            </div>

            {selectedReport.imageUrl && (
              <div className="rounded-lg overflow-hidden border border-brand-border h-44">
                <img 
                  src={selectedReport.imageUrl} 
                  alt={selectedReport.title} 
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="space-y-2 text-xs text-brand-text">
              <p className="opacity-90">{selectedReport.description}</p>
              
              <div className="p-3 rounded-lg bg-brand-surface border border-brand-border space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="opacity-70">Category:</span>
                  <strong>{selectedReport.category}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-70">Current Status:</span>
                  <strong>{selectedReport.status}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-70">Community confirmations:</span>
                  <strong>{selectedReport.confirmations}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-70">Reward:</span>
                  <strong>{selectedReport.rewardGranted ? '+25 CivicCreds earned' : selectedReport.rewardPending ? '+25 pending verification' : '—'}</strong>
                </div>
                {selectedReport.aiData && selectedReport.aiData.manualReview && (
                  <div className="text-amber-900 dark:text-amber-300">Photo not auto-verified — waiting for a reviewer.</div>
                )}
                {selectedReport.reporter && (
                  <div className="flex justify-between">
                    <span className="opacity-70">Reporter:</span>
                    <strong>{selectedReport.reporter}</strong>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-brand-border">
              {/* PDF Download Button inside Modal if resolved */}
              {(selectedReport.status === 'RESOLVED' || selectedReport.status === 'COMPLETED' || selectedReport.status === 'Completed') ? (
                <button
                  type="button"
                  onClick={(e) => handleDownload(e, selectedReport)}
                  className="btn-accent text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Resolution Certificate (PDF)</span>
                </button>
              ) : (
                <span className="text-[11px] text-brand-text opacity-60 font-mono">
                  Certificate available once repair is verified.
                </span>
              )}

              <button
                onClick={() => setSelectedReport(null)}
                className="btn-secondary text-xs px-4 py-1.5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
