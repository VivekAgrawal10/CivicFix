import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { 
  ShieldAlert, 
  Menu, 
  X, 
  Home, 
  PlusCircle, 
  Map, 
  FileText, 
  Route, 
  MessageSquare,
  LayoutDashboard,
  Inbox,
  Wrench,
  Coins,
  ArrowRight,
  HardHat,
  Users,
  History,
  Layers
} from 'lucide-react';
import { ThemeToggle } from '../common/ThemeToggle';
import { useAuth } from '../../context/AuthContext';
import { NotificationBell } from '../NotificationBell';

const CITIZEN_LINKS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/report', label: 'Report Issue', icon: PlusCircle },
  { to: '/map', label: 'Live Map', icon: Map },
  { to: '/my-reports', label: 'My Reports', icon: FileText },
  { to: '/rewards', label: 'Rewards', icon: Coins },
  { to: '/routes', label: 'Safe Routes', icon: Route },
  { to: '/chatbot', label: 'Chatbot', icon: MessageSquare },
];

const ADMIN_LINKS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/reports', label: 'Reports', icon: Inbox },
  { to: '/admin/clusters', label: 'Clusters', icon: Layers },
  { to: '/admin/repairs', label: 'Work orders', icon: Wrench },
  { to: '/admin/contractors', label: 'Contractors', icon: HardHat },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/activity', label: 'Activity', icon: History },
];
const CONTRACTOR_LINKS = [
  { to: '/jobs', label: 'My jobs', icon: Wrench, end: true },
];

export function Navbar() {
  const location = useLocation();
  const { user, logout, isAdmin: userIsAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = location.pathname.startsWith('/admin');
  const isContractor = user && user.role === 'contractor';
  const links = isAdmin ? ADMIN_LINKS : isContractor ? CONTRACTOR_LINKS : CITIZEN_LINKS;

  return (
    <header className="sticky top-0 z-50 bg-brand-card border-b border-brand-border transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center border border-brand-border shadow-sm">
            <ShieldAlert className="w-4 h-4 text-brand-primary-text" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-brand-text font-mono">
                CivicFix
              </span>
              {isAdmin && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-brand-surface-elevated border border-brand-border text-brand-text">
                  Admin
                </span>
              )}
            </div>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                  ${isActive 
                    ? 'bg-brand-primary text-brand-primary-text font-semibold border border-brand-border shadow-sm' 
                    : 'text-brand-text hover:bg-brand-surface-elevated opacity-85 hover:opacity-100'}
                `}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Right Actions: Switch Portal + Theme Toggle */}
        <div className="flex items-center gap-2.5">
          {isAdmin ? (
            <Link
              to="/"
              className="hidden sm:inline-flex items-center gap-1 text-xs text-brand-text opacity-85 hover:opacity-100 font-medium px-2.5 py-1.5 rounded-lg bg-brand-surface-elevated hover:bg-brand-card border border-brand-border transition-colors"
            >
              <span>Citizen View</span>
            </Link>
          ) : userIsAdmin ? (
            <Link
              to="/admin"
              className="hidden sm:inline-flex items-center gap-1 text-xs text-brand-text opacity-85 hover:opacity-100 font-medium px-2.5 py-1.5 rounded-lg bg-brand-surface-elevated hover:bg-brand-card border border-brand-border transition-colors"
            >
              <span>Admin Portal</span>
            </Link>
          ) : null}

          {user && !isAdmin && user.role === 'citizen' && (
            <Link
              to="/rewards"
              title="Your CivicCreds — click to see rewards"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-brand-surface-elevated hover:bg-brand-surface border border-brand-border"
            >
              <Coins className="w-3.5 h-3.5 text-amber-900 dark:text-amber-300" />
              <span className="font-mono">{user.civicCreds ?? 0}</span>
            </Link>
          )}

          {user ? (
            <button
              onClick={logout}
              title={user.email}
              className="text-xs text-brand-text opacity-85 hover:opacity-100 font-medium px-2.5 py-1.5 rounded-lg bg-brand-surface-elevated hover:bg-brand-surface border border-brand-border"
            >
              Sign out ({(user.name || 'user').split(' ')[0]})
            </button>
          ) : (
            <Link
              to="/login"
              className="text-xs text-brand-primary-text font-semibold px-2.5 py-1.5 rounded-lg bg-brand-primary"
            >
              Sign in
            </Link>
          )}

          <NotificationBell />
          <ThemeToggle />

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-brand-surface-elevated border border-brand-border text-brand-text"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-4 h-4 text-brand-text" /> : <Menu className="w-4 h-4 text-brand-text" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-brand-card border-b border-brand-border px-4 py-3 space-y-1.5">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium
                  ${isActive ? 'bg-brand-primary text-brand-primary-text font-semibold border border-brand-border' : 'text-brand-text hover:bg-brand-surface-elevated'}
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}

          <div className="pt-2 border-t border-brand-border">
            {isAdmin ? (
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2 text-xs text-brand-text rounded-lg hover:bg-brand-surface-elevated"
              >
                <span>Switch to Citizen Portal</span>
                <ArrowRight className="w-3.5 h-3.5 text-brand-text" />
              </Link>
            ) : (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2 text-xs text-brand-text rounded-lg hover:bg-brand-surface-elevated"
              >
                <span>Switch to Admin Portal</span>
                <ArrowRight className="w-3.5 h-3.5 text-brand-text" />
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
