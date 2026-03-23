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
    },
  },
  plugins: [],
}
