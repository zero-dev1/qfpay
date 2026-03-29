import { motion } from 'framer-motion';
import { BRAND_BLUE_RGB } from '../../lib/colors';
import { EASE_OUT_EXPO } from '../../lib/animations';
import type { ReactNode } from 'react';

export type CeremonyPhase = 'idle' | 'ignite' | 'transfer' | 'arrive' | 'rest';

const BORDER_COLORS: Record<CeremonyPhase, string> = {
  idle:     `rgba(${BRAND_BLUE_RGB}, 0.1)`,
  ignite:   `rgba(${BRAND_BLUE_RGB}, 0.2)`,
  transfer: `rgba(${BRAND_BLUE_RGB}, 0.15)`,
  arrive:   'rgba(0, 209, 121, 0.25)',
  rest:     'rgba(255, 255, 255, 0.04)',
};

interface CeremonyAtmosphereProps {
  phase: CeremonyPhase;
  children: ReactNode;
  activityLine?: ReactNode;
}

export const CeremonyAtmosphere = ({
  phase,
  children,
  activityLine,
}: CeremonyAtmosphereProps) => {
  return (
    <motion.div
      className="relative w-full rounded-[20px] p-6 sm:p-8 overflow-hidden"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        minHeight: '160px',
      }}
      animate={{
        borderColor: BORDER_COLORS[phase],
        boxShadow: phase === 'ignite'
          ? `0 0 40px rgba(${BRAND_BLUE_RGB}, 0.06), inset 0 0 60px rgba(${BRAND_BLUE_RGB}, 0.03)` 
          : phase === 'arrive'
            ? '0 0 30px rgba(0, 209, 121, 0.06), inset 0 0 40px rgba(0, 209, 121, 0.02)'
            : `0 0 0px rgba(0, 0, 0, 0)`,
      }}
      transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
    >
      {/* The 1px border — rendered as outline to avoid layout shift */}
      <motion.div
        className="absolute inset-0 rounded-[20px] pointer-events-none"
        style={{ border: '1px solid' }}
        animate={{ borderColor: BORDER_COLORS[phase] }}
        transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
      />

      {/* Top edge highlight — brighter than sides for hierarchy */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-px pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent, rgba(${BRAND_BLUE_RGB}, 0.25), transparent)`,
        }}
      />

      {/* Inner radial glow — breathes with phase */}
      {(phase === 'ignite' || phase === 'transfer') && (
        <motion.div
          className="absolute inset-0 rounded-[20px] pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 60% 80% at 50% 40%, rgba(${BRAND_BLUE_RGB}, 0.04) 0%, transparent 70%)`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        />
      )}

      {phase === 'arrive' && (
        <motion.div
          className="absolute inset-0 rounded-[20px] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 50% 70% at 65% 40%, rgba(0, 209, 121, 0.03) 0%, transparent 70%)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.8 }}
        />
      )}

      {/* Noise texture */}
      <div
        className="absolute inset-0 rounded-[20px] opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.4' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      {/* Main content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Activity line — inside container, bottom */}
      {activityLine && (
        <div className="relative z-10 mt-4 flex justify-center">
          {activityLine}
        </div>
      )}
    </motion.div>
  );
};
