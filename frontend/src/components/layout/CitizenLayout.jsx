import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Map, 
  PlusCircle, 
  FileText, 
  Route, 
  Cpu, 
  CheckCircle2, 
  Info 
} from 'lucide-react';

const CITIZEN_LINKS = [
  { to: '/citizen', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/citizen/map', label: 'Live Hazard Map', icon: Map },
  { to: '/citizen/report', label: 'Report an Issue', icon: PlusCircle },
  { to: '/citizen/my-reports', label: 'My Reports', icon: FileText },
  { to: '/citizen/navigation', label: 'Safe Navigation', icon: Route },
  { to: '/citizen/ai', label: 'AI Intelligence', icon: Cpu },
  { to: '/citizen/repair-tracking', label: 'Repair Tracking', icon: CheckCircle2 },
  { to: '/citizen/about', label: 'About CivicFix', icon: Info },
];

export function CitizenLayout() {
  return (
    <div className="min-h-screen bg-brand-canvas text-white">
      {/* Citizen Sub-Navbar */}
      <div className="bg-brand-surface border-b border-brand-border sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 overflow-x-auto no-scrollbar py-2">
            <div className="flex items-center gap-1.5 min-w-max">
              {CITIZEN_LINKS.map((link) => {
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
          </div>
        </div>
      </div>

      {/* Main Page Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
