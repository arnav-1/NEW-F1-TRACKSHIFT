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
          white: '#FFFFFF',
          canvas: '#F4F5F8',
          card: '#FFFFFF',
          cardMuted: '#F8F9FB',
          border: '#E2E4E9',
          borderHover: '#CBD0DC',
          carbon: '#111116',
          carbonLight: '#1E1E26',
          muted: '#686B78',
          red: '#E10600',
          redDark: '#D40000',
          redLight: '#FF3B30',
          cyan: '#0284C7',
          amber: '#F59E0B',
          green: '#10B981',
        },
        haas: {
          bg: '#F4F5F8',
          card: '#FFFFFF',
          border: '#E2E4E9',
          red: '#E10600',
          white: '#111116',
          gray: '#686B78',
          cyan: '#0284C7',
          amber: '#D97706',
          green: '#059669',
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
        'tgr-subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'tgr-card': '0 4px 12px -2px rgba(17, 17, 22, 0.06), 0 2px 6px -1px rgba(17, 17, 22, 0.04)',
        'tgr-red': '0 4px 14px 0 rgba(225, 6, 0, 0.25)',
      }
    },
  },
  plugins: [],
}
