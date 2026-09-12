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
        haas: {
          bg: '#0B0B0E',
          card: '#15151E',
          cardHover: '#1B1B26',
          border: '#242432',
          red: '#E10600',
          redGlow: 'rgba(225, 6, 0, 0.25)',
          white: '#F5F5F7',
          gray: '#8C8C9A',
          cyan: '#00E5FF',
          amber: '#FF9100',
          green: '#10B981',
        },
        pirelli: {
          soft: '#E10600',
          medium: '#E5A823',
          hard: '#FFFFFF',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Chivo Mono"', 'monospace'],
      },
      boxShadow: {
        'haas-red': '0 0 20px -3px rgba(225, 6, 0, 0.35)',
        'haas-cyan': '0 0 15px -3px rgba(0, 229, 255, 0.25)',
        'haas-card': '0 4px 20px -2px rgba(0, 0, 0, 0.65)',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: 1, boxShadow: '0 0 10px rgba(225, 6, 0, 0.5)' },
          '50%': { opacity: 0.6, boxShadow: '0 0 4px rgba(225, 6, 0, 0.2)' },
        }
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
