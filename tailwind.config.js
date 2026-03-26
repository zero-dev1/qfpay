/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand
        'qfpay-blue': '#0052FF',
        'qfpay-blue-hover': '#0047E1',
        'qfpay-blue-glow': 'rgba(0, 82, 255, 0.15)',
        'qfpay-blue-subtle': 'rgba(0, 82, 255, 0.08)',
        
        // Blue-tinted dark surfaces (NOT pure neutrals)
        'qfpay-bg': '#060A14',          // was #0A0A0A — now blue-tinted near-black
        'qfpay-surface': '#0C1019',     // was #111111 — card/modal backgrounds
        'qfpay-surface-hover': '#111827', // elevated hover state
        'qfpay-border': 'rgba(0, 82, 255, 0.08)', // subtle blue-tinted borders
        'qfpay-border-hover': 'rgba(0, 82, 255, 0.15)',
        
        // Burn crimson palette
        'qfpay-burn': '#B91C1C',
        'qfpay-burn-bright': '#DC2626',
        'qfpay-burn-ember': '#F59E0B',
        'qfpay-burn-glow': 'rgba(185, 28, 28, 0.2)',
        
        // Semantic
        'qfpay-green': '#00D179',
        'qfpay-error': '#E5484D',
        'qfpay-warning': '#F5A623',
        
        // Text hierarchy (blue-tinted, not flat grey)
        'qfpay-text-primary': '#F0F2F8',    // not pure white
        'qfpay-text-secondary': '#7A8BAB',   // blue-grey, not #8A8A8A
        'qfpay-text-muted': '#3D4A63',       // deep blue-grey
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
