import { memo } from 'react';
import { motion } from 'framer-motion';
import { BRAND_BLUE_RGB } from '../../lib/colors';
import { useMouseParallax } from '../../hooks/useMouseParallax';

export const HeroBackground = memo(() => {
  // Each orb gets a different parallax strength for depth
  const orb1 = useMouseParallax(20);   // closest — moves most
  const orb2 = useMouseParallax(-15);  // opposite direction — depth contrast
  const orb3 = useMouseParallax(10);   // subtle middle layer

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient — radial from center-top */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 0%, rgba(${BRAND_BLUE_RGB}, 0.14) 0%, transparent 70%)`,
        }}
      />

      {/* Orb 1 — top-left, parallax + CSS float */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          top: '-20%',
          left: '-10%',
          background: `radial-gradient(circle, rgba(${BRAND_BLUE_RGB}, 0.16) 0%, transparent 70%)`,
          filter: 'blur(80px)',
          animation: 'float-1 20s ease-in-out infinite, pulse-glow 6s ease-in-out infinite',
          willChange: 'transform',
          x: orb1.x,
          y: orb1.y,
        }}
      />

      {/* Orb 2 — bottom-right, opposite parallax */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          bottom: '-15%',
          right: '-10%',
          background: `radial-gradient(circle, rgba(${BRAND_BLUE_RGB}, 0.10) 0%, transparent 70%)`,
          filter: 'blur(80px)',
          animation: 'float-2 25s ease-in-out infinite',
          willChange: 'transform',
          x: orb2.x,
          y: orb2.y,
        }}
      />

      {/* Orb 3 — center, subtle */}
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full"
        style={{
          top: '30%',
          left: '30%',
          background: `radial-gradient(circle, rgba(${BRAND_BLUE_RGB}, 0.06) 0%, transparent 70%)`,
          filter: 'blur(100px)',
          animation: 'float-1 30s ease-in-out infinite reverse',
          willChange: 'transform',
          x: orb3.x,
          y: orb3.y,
        }}
      />

      {/* Noise texture */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      {/* Top edge line */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[50%] h-px"
        style={{
          background: `linear-gradient(90deg, transparent, rgba(${BRAND_BLUE_RGB}, 0.15), transparent)`,
        }}
      />
    </div>
  );
});

HeroBackground.displayName = 'HeroBackground';
