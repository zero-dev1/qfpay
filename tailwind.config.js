/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand — Deep Sapphire Blue
        'qfpay-blue': '#0040FF',
        'qfpay-blue-hover': '#0036DB',
        'qfpay-blue-glow': 'rgba(0, 64, 255, 0.15)',
        'qfpay-blue-subtle': 'rgba(0, 64, 255, 0.08)',

        // Blue-tinted dark surfaces
        'qfpay-bg': '#060A14',
        'qfpay-surface': '#0C1019',
        'qfpay-surface-hover': '#111827',
        'qfpay-border': 'rgba(0, 64, 255, 0.08)',
        'qfpay-border-hover': 'rgba(0, 64, 255, 0.15)',

        // Burn crimson palette (unchanged)
        'qfpay-burn': '#B91C1C',
        'qfpay-burn-bright': '#DC2626',
        'qfpay-burn-ember': '#F59E0B',
        'qfpay-burn-glow': 'rgba(185, 28, 28, 0.2)',

        // Semantic (unchanged)
        'qfpay-green': '#00D179',
        'qfpay-error': '#E5484D',
        'qfpay-warning': '#F5A623',

        // Text hierarchy (unchanged)
        'qfpay-text-primary': '#F0F2F8',
        'qfpay-text-secondary': '#7A8BAB',
        'qfpay-text-muted': '#3D4A63',
      },
      fontFamily: {
        clash: ['"Clash Display"', 'sans-serif'],
        satoshi: ['Satoshi', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      keyframes: {
        'gradient-shift': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'gradient-shift': 'gradient-shift 8s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        shimmer: 'shimmer 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
