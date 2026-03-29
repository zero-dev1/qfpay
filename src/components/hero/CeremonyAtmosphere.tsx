import { motion } from 'framer-motion';
import { BRAND_BLUE_RGB } from '../../lib/colors';

type CeremonyPhase = 'idle' | 'ignite' | 'transfer' | 'arrive' | 'rest';

interface CeremonyAtmosphereProps {
  phase: CeremonyPhase;
}

export const CeremonyAtmosphere = ({ phase }: CeremonyAtmosphereProps) => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Ignite pulse — sapphire bloom from center when amount appears */}
      {phase === 'ignite' && (
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(${BRAND_BLUE_RGB}, 0.06) 0%, transparent 70%)`,
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1.2 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      )}

      {/* Transfer — directional glow that follows the amount path (left→right) */}
      {phase === 'transfer' && (
        <motion.div
          className="absolute top-[45%] h-[120px] w-[300px]"
          style={{
            background: `radial-gradient(ellipse, rgba(${BRAND_BLUE_RGB}, 0.04) 0%, transparent 70%)`,
          }}
          initial={{ opacity: 0, left: '20%' }}
          animate={{ opacity: [0, 0.8, 0.4, 0], left: ['20%', '50%', '70%'] }}
          transition={{ duration: 1.6, ease: 'easeOut' }}
        />
      )}

      {/* Arrive — brief green tint, barely perceptible */}
      {phase === 'arrive' && (
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 70% 50%, rgba(0, 209, 121, 0.03) 0%, transparent 50%)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      )}

      {/* Noise texture — prevents gradient banding (same as old HeroBackground) */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.4' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      {/* Top edge line — retained from old hero for continuity */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[50%] h-px"
        style={{
          background: `linear-gradient(90deg, transparent, rgba(${BRAND_BLUE_RGB}, 0.15), transparent)`,
        }}
      />
    </div>
  );
};
