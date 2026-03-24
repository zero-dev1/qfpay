/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'qfpay-blue': '#0052FF',
        'qfpay-blue-hover': '#0047E1',
        'qfpay-bg': '#0A0A0A',
        'qfpay-card': '#111111',
        'qfpay-burn': '#C13333',
        'qfpay-burn-orange': '#E85D25',
        'qfpay-green': '#00D179',
        'qfpay-error': '#E5484D',
        'qfpay-warning': '#F5A623',
        'qfpay-secondary': '#8A8A8A',
      },
      fontFamily: {
        clash: ['"Clash Display"', 'sans-serif'],
        satoshi: ['Satoshi', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      keyframes: {
        'pulse-slow': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.05)' },
        },
      },
      animation: {
        'pulse-slow': 'pulse-slow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
