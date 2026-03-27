import { memo } from 'react';
import { motion } from 'framer-motion';
import { BRAND_BLUE_RGB } from '../../lib/colors';
import { useMouseParallax } from '../../hooks/useMouseParallax';

export const HeroBackground = memo(() => {
  const orb1 = useMouseParallax(60);    // primary — most visible, most movement
  const orb2 = useMouseParallax(-40);   // counter-direction for depth
  const orb3 = useMouseParallax(25);    // subtle mid-layer
  const accent = useMouseParallax(100);  // small bright accent — makes parallax undeniable

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 0%, rgba(${BRAND_BLUE_RGB}, 0.14) 0%, transparent 70%)`,
        }}
      />

      {/* Orb 1 — upper area, INSIDE viewport so parallax is visible */}
      <div
        className="absolute"
        style={{
          top: '-5%',
          left: '5%',
          animation: 'float-1 20s ease-in-out infinite, pulse-glow 6s ease-in-out infinite',
          willChange: 'transform',
        }}
      >
        <motion.div
          className="w-[500px] h-[500px] rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(${BRAND_BLUE_RGB}, 0.22) 0%, rgba(${BRAND_BLUE_RGB}, 0.06) 50%, transparent 70%)`,
            filter: 'blur(60px)',
            x: orb1.x,
            y: orb1.y,
          }}
        />
      </div>

      {/* Orb 2 — lower-right, moves opposite direction */}
      <div
        className="absolute"
        style={{
          bottom: '5%',
          right: '0%',
          animation: 'float-2 25s ease-in-out infinite',
          willChange: 'transform',
        }}
      >
        <motion.div
          className="w-[450px] h-[450px] rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(${BRAND_BLUE_RGB}, 0.15) 0%, transparent 65%)`,
            filter: 'blur(70px)',
            x: orb2.x,
            y: orb2.y,
          }}
        />
      </div>

      {/* Orb 3 — center, large and soft */}
      <div
        className="absolute"
        style={{
          top: '25%',
          left: '25%',
          animation: 'float-1 30s ease-in-out infinite reverse',
          willChange: 'transform',
        }}
      >
        <motion.div
          className="w-[400px] h-[400px] rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(${BRAND_BLUE_RGB}, 0.08) 0%, transparent 70%)`,
            filter: 'blur(100px)',
            x: orb3.x,
            y: orb3.y,
          }}
        />
      </div>

      {/* Accent glow — smaller, sharper, most reactive. This is what makes parallax visible. */}
      <div
        className="absolute"
        style={{
          top: '15%',
          left: '40%',
        }}
      >
        <motion.div
          className="w-[200px] h-[200px] rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(${BRAND_BLUE_RGB}, 0.12) 0%, transparent 70%)`,
            filter: 'blur(40px)',
            x: accent.x,
            y: accent.y,
          }}
        />
      </div>

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
