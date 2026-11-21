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
        // CivicFix Brand Palette
        // Light Theme: Background #F5F8FA, Cards #FFFFFF, Borders #DCE8EF, Primary #24445C, Accent #6E9B8A, Text #263746
        // Dark Theme: Background #17232D, Cards #22323E, Borders #344956, Primary #8FB8D0, Accent #83B6A0, Text #E6EDF2
        brand: {
          canvas: 'var(--color-bg-canvas)',
          card: 'var(--color-surface-card)',
          surface: 'var(--color-surface-card)',
          'surface-elevated': 'var(--color-surface-elevated)',
          border: 'var(--color-border)',
          primary: 'var(--color-primary)',
          'primary-text': 'var(--color-primary-text)',
          accent: 'var(--color-accent)',
          text: 'var(--color-text)',
          'text-muted': 'var(--color-text-muted)',
        },
        hazard: {
          critical: '#DC2626',
          warning: '#D97706',
          caution: '#CA8A04',
          safe: '#16A34A',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.06)',
        'card-elevated': '0 4px 12px -2px rgba(0, 0, 0, 0.08)',
        'btn': '0 1px 2px rgba(0, 0, 0, 0.1)',
      }
    },
  },
  plugins: [],
}
