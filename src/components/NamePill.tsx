import { motion } from 'framer-motion';
import { BRAND_BLUE, BG_SURFACE, SUCCESS_GREEN } from '../lib/colors';
import { EASE_OUT_EXPO } from '../lib/animations';
import { AvatarFallback } from './AvatarFallback';

export type NamePillState = 'default' | 'dimmed' | 'connecting' | 'arriving';
export type NamePillSize = 'sm' | 'md';

interface NamePillProps {
  name: string;
  avatarUrl?: string;
  state?: NamePillState;
  size?: NamePillSize;
  className?: string;
}

export function NamePill({
  name,
  avatarUrl,
  state = 'default',
  size = 'md',
  className = '',
}: NamePillProps) {
  const isMd = size === 'md';

  // ── Sizing tokens ──
  const avatarSize = isMd ? 32 : 26;
  const dotSize    = isMd ? 7  : 6;
  const gap        = isMd ? 10 : 7;
  const padding    = isMd ? '6px 10px 6px 6px' : '4px 8px 4px 4px';
  const fontSize   = isMd ? '0.8125rem' : '0.6875rem'; // 13px / 11px

  // ── Border & glow by state ──
  const borderColor =
    state === 'connecting' ? `rgba(0, 64, 255, 0.35)` :
    state === 'arriving'   ? `rgba(0, 209, 121, 0.45)` :
                             'rgba(255, 255, 255, 0.10)';

  const boxShadow =
    state === 'connecting' ? `0 0 0 1px rgba(0,64,255,0.15), 0 2px 12px rgba(0,64,255,0.12)` :
    state === 'arriving'   ? `0 0 0 1px rgba(0,209,121,0.20), 0 2px 12px rgba(0,209,121,0.14)` :
                             'none';

  const opacity = state === 'dimmed' ? 0.35 : 1;

  return (
    <motion.div
      animate={{ opacity, boxShadow }}
      transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
      className={`inline-flex items-center flex-shrink-0 ${className}`}
      style={{
        background: BG_SURFACE,
        border: `1px solid ${borderColor}`,
        borderRadius: '100px',
        padding,
        gap,
        transition: 'border-color 0.3s ease',
      }}
    >
      {/* ── Avatar ── */}
      <div
        className="relative flex-shrink-0"
        style={{ width: avatarSize, height: avatarSize }}
      >
        <AvatarFallback
          name={name}
          address={null}
          avatarUrl={avatarUrl || null}
          size={avatarSize}
          className="rounded-full"
        />

        {/* ── Presence dot ── */}
        <div
          className="absolute animate-pulse-glow"
          style={{
            width:  dotSize,
            height: dotSize,
            bottom: -1,
            right:  -1,
            borderRadius: '50%',
            background: SUCCESS_GREEN,
            border: '1.5px solid #0C1019',
          }}
        />
      </div>

      {/* ── Name + .qf ── */}
      <span
        className="font-satoshi font-medium whitespace-nowrap"
        style={{ fontSize }}
      >
        <span style={{ color: 'rgba(255,255,255,0.90)' }}>{name}</span>
        <span style={{ color: `${BRAND_BLUE}d9` }}>.qf</span>
      </span>
    </motion.div>
  );
}
