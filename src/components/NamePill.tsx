import { motion } from 'framer-motion'
import { BRAND_BLUE, SUCCESS_GREEN, BG_SURFACE } from '../lib/colors'

export interface NamePillProps {
  name: string
  color: string
  avatarUrl?: string
  state?: 'default' | 'dimmed' | 'connecting' | 'arriving'
  size?: 'sm' | 'md'
  className?: string
}

export function NamePill({
  name,
  color,
  avatarUrl,
  state = 'default',
  size = 'md',
  className = '',
}: NamePillProps) {
  const initial = name[0].toUpperCase()
  const isMd = size === 'md'

  const borderColor = {
    default: 'rgba(255,255,255,0.10)',
    dimmed: 'rgba(255,255,255,0.06)',
    connecting: `rgba(0,64,255,0.35)`,
    arriving: 'rgba(0,209,121,0.4)',
  }[state]

  const boxShadow = {
    default: 'none',
    dimmed: 'none',
    connecting: '0 0 16px rgba(0,64,255,0.12)',
    arriving: '0 0 20px rgba(0,209,121,0.15)',
  }[state]

  return (
    <motion.div
      className={`inline-flex items-center rounded-full ${className}`}
      style={{
        background: BG_SURFACE,
        border: `1px solid ${borderColor}`,
        boxShadow,
        padding: isMd ? '8px 14px 8px 8px' : '6px 10px 6px 6px',
        gap: isMd ? '10px' : '7px',
      }}
      animate={{ opacity: state === 'dimmed' ? 0.35 : 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="rounded-full object-cover"
            style={{ width: isMd ? 32 : 26, height: isMd ? 32 : 26 }}
          />
        ) : (
          <div
            className="rounded-full flex items-center justify-center font-clash font-bold text-white"
            style={{
              width: isMd ? 32 : 26,
              height: isMd ? 32 : 26,
              background: color,
              fontSize: isMd ? 13 : 11,
            }}
          >
            {initial}
          </div>
        )}
        {/* Presence dot */}
        <div
          className="absolute bottom-0 right-0 rounded-full animate-pulse-glow"
          style={{
            width: isMd ? 7 : 6,
            height: isMd ? 7 : 6,
            background: SUCCESS_GREEN,
            border: '1.5px solid #060A14',
          }}
        />
      </div>

      {/* Name */}
      <span
        className={`whitespace-nowrap font-satoshi font-medium ${isMd ? 'text-sm' : 'text-xs'}`}
        style={{ color: 'rgba(255,255,255,0.9)' }}
      >
        {name}
        <span style={{ color: `rgba(0,64,255,0.85)` }}>.qf</span>
      </span>
    </motion.div>
  )
}
