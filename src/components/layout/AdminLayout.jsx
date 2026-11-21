import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  BarChart3, 
  Inbox, 
  Layers, 
  FileSpreadsheet, 
  Users, 
  Activity, 
  ShieldCheck 
} from 'lucide-react';

const ADMIN_LINKS = [
  { to: '/admin', label: 'Operations Overview', icon: BarChart3, end: true },
  { to: '/admin/complaints', label: 'Complaint Management', icon: Inbox },
  { to: '/admin/clusters', label: 'Hazard Clusters', icon: Layers },
  { to: '/admin/work-orders', label: 'Repair Work Orders', icon: FileSpreadsheet },
  { to: '/admin/crews', label: 'Crew Management', icon: Users },
  { to: '/admin/analytics', label: 'Infrastructure Analytics', icon: Activity },
  { to: '/admin/verification', label: 'Citizen Verification', icon: ShieldCheck },
];

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-brand-canvas text-white">
      {/* Admin Operations Sub-Navbar */}
      <div className="bg-brand-surface border-b border-brand-border sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 overflow-x-auto no-scrollbar py-2">
            <div className="flex items-center gap-1.5 min-w-max">
              {ADMIN_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) => `
                      flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap text-white
                      ${isActive 
                        ? 'bg-brand-blue-light text-white shadow-sm' 
                        : 'bg-brand-surface-elevated/70 hover:bg-brand-surface-hover text-white'}
                    `}
                  >
                    <Icon className="w-3.5 h-3.5 text-white" />
                    <span className="text-white">{link.label}</span>
                  </NavLink>
                );
              })}
            </div>
            <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-white opacity-80 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>ADMIN COMMAND: SECURE SESSION</span>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
