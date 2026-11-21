import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export function ThemeToggle({ className = '', showLabel = false }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={`inline-flex items-center gap-2 p-2 rounded-lg bg-brand-surface border border-brand-border hover:bg-brand-surface-elevated transition-colors text-brand-text ${className}`}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-brand-accent" />
      ) : (
        <Moon className="w-4 h-4 text-brand-primary" />
      )}
      {showLabel && (
        <span className="text-xs font-medium text-brand-text">
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
}
