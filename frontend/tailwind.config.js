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
        tgr: {
          bg: '#0B0B0E',
          canvas: '#0E0E14',
          card: '#15151E',
          cardHover: '#1B1B27',
          cardMuted: '#101018',
          border: '#242432',
          borderHover: '#333345',
          carbon: '#0B0B0E',
          carbonLight: '#181824',
          white: '#F5F5F7',
          muted: '#8C8C9A',
          red: '#E10600',
          redDark: '#B30500',
          redLight: '#FF2E2E',
          cyan: '#00E5FF',
          amber: '#FF9100',
          green: '#10B981',
        },
        haas: {
          bg: '#0B0B0E',
          card: '#15151E',
          cardHover: '#1B1B26',
          border: '#242432',
          red: '#E10600',
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
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Chivo Mono"', 'monospace'],
      },
      boxShadow: {
        'haas-red': '0 0 20px -3px rgba(225, 6, 0, 0.35)',
        'haas-cyan': '0 0 15px -3px rgba(0, 229, 255, 0.25)',
        'pitwall-card': '0 4px 20px -2px rgba(0, 0, 0, 0.65)',
      }
    },
  },
  plugins: [],
}
