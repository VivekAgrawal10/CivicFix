import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Coins, Trophy, Award, ShieldCheck, Loader2, PlusCircle, ThumbsUp, Wrench, AlertTriangle } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCivicData } from '../context/CivicDataContext';

const TIERS = [
  { name: 'Bronze Citizen', min: 0 },
  { name: 'Silver Guardian', min: 100 },
  { name: 'Gold Civic Champion', min: 300 },
  { name: 'Platinum City Hero', min: 750 },
];

const WAYS_TO_EARN = [
  { icon: PlusCircle, label: 'Report a real problem', value: '+25', note: 'paid once another citizen confirms it or an admin reviews it (max 5 per day)' },
  { icon: ThumbsUp, label: 'Confirm someone else’s report', value: '+15', note: 'max 10 per day; you cannot confirm your own' },
  { icon: Wrench, label: 'Your report gets fixed', value: '+50', note: 'bonus when the repair is verified' },
  { icon: AlertTriangle, label: 'Fake or spam report', value: '−40', note: 'and your CivicScore drops' },
];

const fmtDate = (d) => { try { return new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); } catch { return ''; } };

export function RewardsPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const { myReports, dataSource } = useCivicData();
  const [creds, setCreds] = useState(null);
  const [board, setBoard] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [c, l] = await Promise.all([api.civicCreds(), api.leaderboard()]);
      setCreds(c.data);
      setBoard(l.data || []);
      setError('');
      refreshUser();
    } catch (e) {
      setError(e.message || 'Could not load your rewards.');
    }
  }, [refreshUser]);

  useEffect(() => { if (user) load(); }, [user && user._id, load]); // eslint-disable-line react-hooks/exhaustive-deps

  if (authLoading) return null;
  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="civic-card p-6 text-center space-y-3">
          <h1 className="text-lg font-bold text-brand-text">Sign in to see your rewards</h1>
          <p className="text-xs text-brand-text opacity-80">Earn CivicCreds for reporting and confirming real civic problems.</p>
          <Link to="/login" className="btn-primary inline-flex text-xs px-4 py-2">Go to sign in</Link>
        </div>
      </div>
    );
  }

  const pending = myReports.filter((r) => r.rewardPending && !r.rewardGranted);
  const pendingTotal = pending.length * 25;
  const balance = creds ? creds.civicCreds : user.civicCreds ?? 0;
  const tierName = creds ? creds.citizenTier : user.citizenTier || 'Bronze Citizen';
  const tp = creds && creds.tierProgress;
  const current = TIERS.find((t) => t.name === tierName) || TIERS[0];
  const next = TIERS[TIERS.indexOf(current) + 1] || null;
  const pct = next ? Math.max(0, Math.min(100, Math.round(((balance - current.min) / (next.min - current.min)) * 100))) : 100;
  const history = creds ? [...(creds.history || [])].reverse() : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">Rewards</h1>
        <p className="text-xs sm:text-sm text-brand-text opacity-80 mt-1">Your CivicCreds for helping fix the city.</p>
        {dataSource !== 'live' && <p className="text-[11px] text-amber-900 dark:text-amber-300 mt-1">Cannot reach the CivicFix server, so some numbers may be out of date.</p>}
        {error && <p className="text-[11px] text-red-900 dark:text-red-300 mt-1">{error}</p>}
      </div>

      {/* Balance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="civic-card p-5 sm:col-span-2 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-brand-primary flex items-center justify-center"><Coins className="w-5 h-5 text-brand-primary-text" /></div>
            <div>
              <div className="text-3xl font-bold font-mono text-brand-text">{balance}</div>
              <div className="text-xs text-brand-text opacity-75">CivicCreds · {tierName}</div>
            </div>
            {!creds && !error && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
          </div>
          <div>
            <div className="h-2 rounded-full bg-brand-surface-elevated border border-brand-border overflow-hidden">
              <div className="h-full bg-brand-accent" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[11px] text-brand-text opacity-75 mt-1.5">
              {next ? `${tp ? tp.pointsNeededForNextTier : next.min - balance} more CivicCreds to reach ${next.name}` : 'Top tier reached — thank you!'}
            </p>
          </div>
        </div>
        <div className="civic-card p-5 space-y-1">
          <div className="text-xs text-brand-text opacity-75">Pending rewards</div>
          <div className="text-2xl font-bold font-mono text-amber-900 dark:text-amber-300">+{pendingTotal}</div>
          <p className="text-[11px] text-brand-text opacity-70">{pending.length ? `${pending.length} report${pending.length > 1 ? 's' : ''} waiting to be verified` : 'Nothing waiting'}</p>
          <div className="text-xs text-brand-text opacity-75 pt-2">CivicScore (reputation)</div>
          <div className="text-lg font-bold font-mono text-brand-text">{creds ? creds.civicScore : '—'}<span className="text-xs opacity-60"> / 100</span></div>
        </div>
      </div>

      {/* Badges */}
      <div className="civic-card p-5 space-y-3">
        <h2 className="text-sm font-bold text-brand-text flex items-center gap-2"><Award className="w-4 h-4" /> Badges</h2>
        <div className="flex flex-wrap gap-2">
          {(creds ? creds.badges : []).map((b) => (
            <span key={b} className="text-xs px-2.5 py-1 rounded-full bg-brand-surface-elevated border border-brand-border text-brand-text flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" />{b}</span>
          ))}
          {creds && !creds.badges.length && <span className="text-xs text-brand-text opacity-70">No badges yet.</span>}
        </div>
      </div>

      {/* Pending + History */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div className="civic-card p-5 space-y-3">
          <h2 className="text-sm font-bold text-brand-text">Waiting for verification</h2>
          {pending.length === 0 && <p className="text-xs text-brand-text opacity-70">None. Rewards for new reports show up here until they are verified.</p>}
          {pending.map((r) => (
            <div key={r.id} className="p-3 rounded-lg bg-brand-surface-elevated border border-brand-border text-xs flex items-center justify-between gap-3">
              <div><div className="font-semibold text-brand-text">{r.title}</div><div className="opacity-70 text-[11px]">{r.reportedAt} · {r.confirmations} confirmation{r.confirmations === 1 ? '' : 's'}</div></div>
              <span className="font-mono text-amber-900 dark:text-amber-300 shrink-0">+25</span>
            </div>
          ))}
        </div>

        <div className="civic-card p-5 space-y-3">
          <h2 className="text-sm font-bold text-brand-text">Points history</h2>
          {creds && history.length === 0 && <p className="text-xs text-brand-text opacity-70">No points earned yet. Your welcome balance is 50 CivicCreds.</p>}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {history.map((h, i) => (
              <div key={i} className="p-3 rounded-lg bg-brand-surface-elevated border border-brand-border text-xs flex items-center justify-between gap-3">
                <div><div className="font-semibold text-brand-text">{h.action}</div><div className="opacity-70 text-[11px]">{h.details} · {fmtDate(h.date)}</div></div>
                <span className={`font-mono shrink-0 ${h.amount >= 0 ? 'text-emerald-900 dark:text-emerald-300' : 'text-red-900 dark:text-red-300'}`}>{h.amount >= 0 ? '+' : ''}{h.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How to earn */}
      <div className="civic-card p-5 space-y-3">
        <h2 className="text-sm font-bold text-brand-text">How to earn CivicCreds</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {WAYS_TO_EARN.map(({ icon: Icon, label, value, note }) => (
            <div key={label} className="p-3 rounded-lg bg-brand-surface-elevated border border-brand-border flex gap-3 text-xs">
              <Icon className="w-4 h-4 shrink-0 mt-0.5" />
              <div><div className="font-semibold text-brand-text">{label} <span className={`font-mono ${value.startsWith('−') ? 'text-red-900 dark:text-red-300' : 'text-emerald-900 dark:text-emerald-300'}`}>{value}</span></div><div className="opacity-70 text-[11px]">{note}</div></div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-brand-text opacity-60">Tiers: Silver Guardian 100 · Gold Civic Champion 300 · Platinum City Hero 750.</p>
      </div>

      {/* Leaderboard */}
      <div className="civic-card p-5 space-y-3">
        <h2 className="text-sm font-bold text-brand-text flex items-center gap-2"><Trophy className="w-4 h-4" /> Leaderboard</h2>
        {board.length === 0 && <p className="text-xs text-brand-text opacity-70">No citizens ranked yet.</p>}
        {board.map((u, i) => (
          <div key={u._id} className={`p-3 rounded-lg border text-xs flex items-center gap-3 ${u._id === user._id ? 'bg-brand-primary border-brand-accent' : 'bg-brand-surface-elevated border-brand-border'}`}>
            <span className="w-6 text-center font-mono font-bold">{i + 1}</span>
            <div className="flex-1"><div className="font-semibold text-brand-text">{u.name}{u._id === user._id ? ' (you)' : ''}</div><div className="opacity-70 text-[11px]">{u.citizenTier}</div></div>
            <span className="font-mono">{u.civicCreds}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
