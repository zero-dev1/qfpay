import { memo } from 'react';

export const HeroBackground = memo(() => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient — subtle radial from center-top */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0, 82, 255, 0.08) 0%, transparent 70%)',
        }}
      />

      {/* Moving gradient orbs — slow, ambient, barely visible */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full animate-gradient-shift"
        style={{
          top: '-20%',
          left: '-10%',
          background:
            'radial-gradient(circle, rgba(0, 82, 255, 0.06) 0%, transparent 70%)',
          filter: 'blur(80px)',
          animation: 'float-1 20s ease-in-out infinite',
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          bottom: '-15%',
          right: '-10%',
          background:
            'radial-gradient(circle, rgba(0, 82, 255, 0.04) 0%, transparent 70%)',
          filter: 'blur(80px)',
          animation: 'float-2 25s ease-in-out infinite',
        }}
      />

      {/* Noise texture overlay for depth */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      {/* Top edge subtle line */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[50%] h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(0, 82, 255, 0.1), transparent)',
        }}
      />
    </div>
  );
});

HeroBackground.displayName = 'HeroBackground';
