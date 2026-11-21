import React from 'react';
import { ShieldAlert, Phone, Mail } from 'lucide-react';

export function Footer({ status = null }) {
  return (
    <footer className="border-t border-brand-border bg-brand-card py-8 text-xs text-brand-text transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          
          {/* Brand & Slogan */}
          <div className="space-y-1">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <div className="w-5 h-5 rounded bg-brand-primary flex items-center justify-center text-brand-primary-text border border-brand-border">
                <ShieldAlert className="w-3.5 h-3.5 text-brand-primary-text" />
              </div>
              <span className="font-bold text-sm text-brand-text tracking-wide font-mono">
                CIVICFIX
              </span>
            </div>
            <p className="text-brand-text opacity-75 text-xs">
              Making our streets safer, one report at a time.
            </p>
            <p className="text-[10px] opacity-50 font-mono" data-testid="build-stamp">build v8</p>
          </div>

          {/* Contact Us Links */}
          <div className="space-y-1">
            <span className="font-semibold text-brand-text block text-[11px] uppercase tracking-wider opacity-60">
              Contact Us
            </span>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs">
              <a
                href="tel:123456789"
                className="flex items-center gap-1.5 text-brand-text hover:text-brand-primary transition-colors"
                title="Call CivicFix Support"
              >
                <Phone className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                <span>Phone: 123456789</span>
              </a>

              <a
                href="mailto:civicfix@gmail.com"
                className="flex items-center gap-1.5 text-brand-text hover:text-brand-primary transition-colors"
                title="Email CivicFix Support"
              >
                <Mail className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                <span>Email: civicfix@gmail.com</span>
              </a>
            </div>
          </div>

          {/* Copyright */}
          <div className="text-brand-text opacity-60 text-[11px]">
            Copyright © 2026 CivicFix.
            {status && <div className="mt-1">{status}</div>}
          </div>

        </div>
      </div>
    </footer>
  );
}
