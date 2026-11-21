/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Strict CivicFix Brand Palette
        // Light Theme: Primary #5797DB, Light bg #EBEBEB, Secondary dark grey #474647
        // Dark Theme: Primary #153C65, Secondary grey #999999, Main bg #343234
        brand: {
          blue: {
            light: '#5797DB',
            dark: '#153C65',
            DEFAULT: 'var(--color-primary)',
            hover: 'var(--color-primary-hover)',
          },
          canvas: 'var(--color-bg-canvas)',
          surface: 'var(--color-surface)',
          'surface-card': 'var(--color-surface-card)',
          'surface-hover': 'var(--color-surface-hover)',
          'surface-elevated': 'var(--color-surface-elevated)',
          border: 'var(--color-border)',
          'border-active': 'var(--color-border-active)',
          grey: {
            dark: '#474647',
            light: '#999999',
            canvas: '#EBEBEB',
            darkbg: '#343234',
            DEFAULT: 'var(--color-secondary-grey)'
          }
        },
        // Restrained semantic status indicators
        hazard: {
          critical: '#DC2626',
          warning: '#D97706',
          caution: '#CA8A04',
          safe: '#16A34A',
          info: '#2563EB',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'card': '0 2px 8px -1px rgba(0, 0, 0, 0.25), 0 0 0 1px var(--color-border)',
        'card-elevated': '0 10px 25px -5px rgba(0, 0, 0, 0.35), 0 0 0 1px var(--color-border)',
        'btn': '0 2px 4px rgba(0, 0, 0, 0.2)',
      }
    },
  },
  plugins: [],
}
