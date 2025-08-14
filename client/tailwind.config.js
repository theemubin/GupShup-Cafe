/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        roundtable: {
          wood: '#8B4513',
          chair: '#D2B48C',
          active: '#10B981',
          waiting: '#6B7280'
        }
      },
      animation: {
        'pulse-active': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'rotate-slow': 'spin 20s linear infinite',
      }
    },
  },
  plugins: [],
}
