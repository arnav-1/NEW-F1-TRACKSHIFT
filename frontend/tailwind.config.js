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
        f1: {
          red: '#E10600',
          darkRed: '#B30500',
          black: '#0A0A0C',
          page: '#101114',
          card: '#16181D',
          cardHover: '#1E2128',
          elevated: '#242731',
          border: 'rgba(255, 255, 255, 0.08)',
          borderHover: 'rgba(255, 255, 255, 0.16)',
          muted: '#8E929B',
          white: '#F5F5F7',
          yellow: '#FFF500',
          green: '#00D2BE',
          cyan: '#00E5FF',
          amber: '#FF9100',
        },
        tgr: {
          bg: '#0A0A0C',
          canvas: '#101114',
          card: '#16181D',
          cardHover: '#1E2128',
          cardMuted: '#121317',
          border: 'rgba(255, 255, 255, 0.08)',
          borderHover: 'rgba(255, 255, 255, 0.16)',
          carbon: '#0A0A0C',
          carbonLight: '#181824',
          white: '#F5F5F7',
          muted: '#8E929B',
          red: '#E10600',
          redDark: '#B30500',
          redLight: '#FF2E2E',
          cyan: '#00E5FF',
          amber: '#FF9100',
          green: '#10B981',
        },
        haas: {
          bg: '#0A0A0C',
          card: '#16181D',
          cardHover: '#1E2128',
          border: 'rgba(255, 255, 255, 0.08)',
          red: '#E10600',
          white: '#F5F5F7',
          gray: '#8E929B',
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
        display: ['"Barlow Condensed"', 'system-ui', 'sans-serif'],
        sans: ['"Titillium Web"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Chivo Mono"', 'monospace'],
      },
      boxShadow: {
        'haas-red': '0 0 20px -3px rgba(225, 6, 0, 0.35)',
        'haas-cyan': '0 0 15px -3px rgba(0, 229, 255, 0.25)',
        'pitwall-card': '0 4px 20px -2px rgba(0, 0, 0, 0.65)',
        'f1-card': '0 4px 24px -2px rgba(0, 0, 0, 0.45)',
      }
    },
  },
  plugins: [],
}
