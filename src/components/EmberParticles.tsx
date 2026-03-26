import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface EmberParticlesProps {
  /** Number of particles — responsive default */
  count?: number;
  /** Spread radius from center (px) */
  spread?: number;
}

export const EmberParticles = ({ count = 45, spread = 160 }: EmberParticlesProps) => {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      // Birth position — spread wider for more cinematic effect
      const startX = (Math.random() - 0.5) * spread;
      // Drift — each particle curves slightly as it rises
      const driftX = (Math.random() - 0.5) * 60;

      // Size distribution — mostly small with a few larger "core" embers
      const isCore = Math.random() > 0.85;
      const size = isCore ? 4 + Math.random() * 4 : 1.5 + Math.random() * 2.5;

      // Color — crimson palette, brighter at start, ashen at end
      const colorSet = [
        '#DC2626', // crimson core
        '#B91C1C', // deep crimson
        '#EF4444', // bright red
        '#F59E0B', // amber (hottest point)
        '#D97706', // dark amber
      ];
      const color = colorSet[Math.floor(Math.random() * colorSet.length)];

      // Timing — stagger starts, vary durations
      const delay = Math.random() * 0.6;
      const duration = 1.2 + Math.random() * 0.8;

      // Rise distance — some embers go far, most stay medium
      const riseDistance = -(100 + Math.random() * 250);

      return {
        id: i,
        startX,
        driftX,
        size,
        color,
        delay,
        duration,
        riseDistance,
        isCore,
      };
    });
  }, [count, spread]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: '50%',
            top: '50%',
            marginLeft: -p.size / 2,
            marginTop: -p.size / 2,
            // Core embers get a glow
            boxShadow: p.isCore
              ? `0 0 ${p.size * 2}px ${p.color}` 
              : 'none',
          }}
          initial={{
            opacity: 0,
            y: 0,
            x: p.startX,
            scale: 0,
            backgroundColor: p.color,
          }}
          animate={{
            opacity: [0, 0.9, 0.7, 0.3, 0],
            y: p.riseDistance,
            x: [p.startX, p.startX + p.driftX * 0.5, p.startX + p.driftX],
            scale: [0, 1.3, 1, 0.6, 0.2],
            backgroundColor: [p.color, p.color, '#6B7280', '#374151'],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: [0.25, 0.46, 0.45, 0.94], // custom ease — fast start, gentle fade
            times: [0, 0.15, 0.4, 0.7, 1],
          }}
        />
      ))}
    </div>
  );
};
