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
        background: '#070A10',
        navy: {
          950: '#070A10',
          900: '#0B101D',
          850: '#0F1626',
          800: '#141D32',
          750: '#1A253F',
          700: '#223052',
        },
        cyan: {
          DEFAULT: '#00F2FE',
          glow: '#00F2FE33',
          400: '#22D3EE',
          500: '#06B6D4',
        },
        teal: {
          accent: '#00E5BE',
          400: '#2DD4BF',
        },
        hazard: {
          critical: '#EF4444',
          high: '#F97316',
          medium: '#EAB308',
          low: '#10B981',
          purple: '#8B5CF6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 25px -5px rgba(0, 242, 254, 0.25)',
        'glow-teal': '0 0 25px -5px rgba(0, 229, 190, 0.25)',
        'glow-danger': '0 0 25px -5px rgba(239, 68, 68, 0.3)',
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.06)',
      },
      keyframes: {
        pulseSlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        }
      },
      animation: {
        'pulse-slow': 'pulseSlow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scanline 2.5s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
