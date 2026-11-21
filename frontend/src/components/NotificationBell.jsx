import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const ago = (iso) => {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 90) return 'just now';
  if (s < 5400) return `${Math.round(s / 60)} min ago`;
  if (s < 129600) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
};

// Bell with unread count; polls every 30 s while the tab is open. This is where "your report was fixed" messages show up.
export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  const refreshCount = useCallback(() => api.unreadCount().then((r) => setCount(r.count || 0)).catch(() => {}), []);
  useEffect(() => {
    if (!user) return undefined;
    refreshCount();
    const t = setInterval(refreshCount, 30000);
    return () => clearInterval(t);
  }, [user, refreshCount]);
  useEffect(() => {
    if (!open) return undefined;
    const h = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  if (!user) return null;

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) { try { setItems((await api.notifications()).data || []); } catch { setItems([]); } refreshCount(); }
  };
  const go = async (n) => {
    setOpen(false);
    if (!n.isRead) { api.markNotificationRead(n._id).catch(() => {}); setCount((c) => Math.max(0, c - 1)); }
    if (user.role === 'admin') navigate(n.relatedReport ? `/admin/reports?open=${n.relatedReport}` : '/admin');
    else if (user.role === 'contractor') navigate('/jobs');
    else navigate('/my-reports');
  };
  const readAll = async () => { await api.markAllNotificationsRead().catch(() => {}); setCount(0); setItems((l) => l.map((n) => ({ ...n, isRead: true }))); };

  return (
    <div className="relative" ref={box}>
      <button onClick={toggle} aria-label="Notifications" className="relative p-2 rounded-lg bg-brand-surface-elevated border border-brand-border text-brand-text">
        <Bell className="w-4 h-4" />
        {count > 0 && <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">{count > 9 ? '9+' : count}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] civic-card-elevated z-[3000] border border-brand-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-brand-border text-xs">
            <b>Notifications</b>
            {count > 0 && <button className="underline" onClick={readAll}>Mark all read</button>}
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-brand-border">
            {items.length === 0 && <div className="p-6 text-center text-xs opacity-60">Nothing yet.</div>}
            {items.map((n) => (
              <button key={n._id} onClick={() => go(n)} className={`w-full text-left px-3 py-2.5 text-xs hover:bg-brand-surface-elevated ${n.isRead ? 'opacity-70' : ''}`}>
                <div className="flex items-start justify-between gap-2"><b>{n.title}</b>{!n.isRead && <i className="w-2 h-2 mt-1 rounded-full bg-rose-600 shrink-0" />}</div>
                <div className="opacity-80 mt-0.5">{n.message}</div>
                <div className="opacity-50 mt-0.5 text-[10px]">{ago(n.createdAt)}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
