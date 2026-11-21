import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ShieldAlert, 
  Menu, 
  X, 
  PlusCircle, 
  Navigation, 
  Wrench, 
  Home,
  CloudRain
} from 'lucide-react';
import { ThemeToggle } from '../common/ThemeToggle';
import { useCivicData } from '../../context/CivicDataContext';

export function Navbar() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { weatherAlertActive } = useCivicData();

  const isCitizen = location.pathname.startsWith('/citizen');
  const isAdmin = location.pathname.startsWith('/admin');
  const isHome = location.pathname === '/';

  return (
    <header className="sticky top-0 z-50 bg-brand-surface border-b border-brand-border">
      {/* Weather notification strip if active */}
      {weatherAlertActive && (
        <div className="bg-amber-900/90 text-white text-xs py-1.5 px-4 flex items-center justify-between border-b border-amber-700">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <CloudRain className="w-3.5 h-3.5 text-white shrink-0" />
            <span className="font-medium text-white">
              Monsoon Warning Active: Waterlogging-prone corridors marked on GIS and routing engine.
            </span>
          </div>
        </div>
      )}

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-brand-blue-light flex items-center justify-center border border-white/20 shadow-sm">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white font-mono">
                CIVIC<span className="text-white opacity-90">FIX</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-surface-elevated border border-brand-border text-white font-medium">
                SATHACK
              </span>
            </div>
            <p className="text-[10px] text-white opacity-70 tracking-wider uppercase font-medium hidden sm:block">
              Report • Move • Repair
            </p>
          </div>
        </Link>

        {/* Portal Switcher (Desktop) */}
        <nav className="hidden md:flex items-center bg-brand-surface-elevated p-1 rounded-lg border border-brand-border">
          <Link
            to="/"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              isHome
                ? 'bg-brand-blue-light text-white'
                : 'text-white hover:bg-brand-surface'
            }`}
          >
            <Home className="w-3.5 h-3.5 text-white" />
            <span>Home</span>
          </Link>

          <Link
            to="/citizen"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              isCitizen
                ? 'bg-brand-blue-light text-white'
                : 'text-white hover:bg-brand-surface'
            }`}
          >
            <Navigation className="w-3.5 h-3.5 text-white" />
            <span>Citizen Portal</span>
          </Link>

          <Link
            to="/admin"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              isAdmin
                ? 'bg-brand-blue-light text-white'
                : 'text-white hover:bg-brand-surface'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-white" />
            <span>City Operations</span>
          </Link>
        </nav>

        {/* Actions & Theme Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />

          <Link
            to="/citizen/report"
            className="flex items-center gap-1.5 bg-brand-blue-light hover:bg-brand-blue-light/90 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-btn transition-transform active:scale-95"
          >
            <PlusCircle className="w-3.5 h-3.5 text-white stroke-[2.5]" />
            <span className="hidden sm:inline">Report Hazard</span>
            <span className="sm:hidden">Report</span>
          </Link>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-brand-surface border border-brand-border text-white"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4 text-white" /> : <Menu className="w-4 h-4 text-white" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-brand-surface-elevated border-b border-brand-border px-4 py-3 space-y-2">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2.5 p-2 rounded-lg text-xs font-medium text-white ${isHome ? 'bg-brand-blue-light' : 'hover:bg-brand-surface'}`}
          >
            <Home className="w-4 h-4 text-white" />
            <span>Home Landing</span>
          </Link>
          <Link
            to="/citizen"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2.5 p-2 rounded-lg text-xs font-medium text-white ${isCitizen ? 'bg-brand-blue-light' : 'hover:bg-brand-surface'}`}
          >
            <Navigation className="w-4 h-4 text-white" />
            <span>Citizen Portal (8 Sub-Pages)</span>
          </Link>
          <Link
            to="/admin"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2.5 p-2 rounded-lg text-xs font-medium text-white ${isAdmin ? 'bg-brand-blue-light' : 'hover:bg-brand-surface'}`}
          >
            <Wrench className="w-4 h-4 text-white" />
            <span>City Operations Admin (7 Sub-Pages)</span>
          </Link>
        </div>
      )}
    </header>
  );
}
