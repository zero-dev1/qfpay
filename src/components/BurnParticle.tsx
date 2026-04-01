import { motion } from 'framer-motion'

export function BurnParticle({ x }: { x: number }) {
  return (
    <motion.div
      className="absolute pointer-events-none flex items-center gap-1"
      style={{ left: x, top: '50%', translateY: '-50%' }}
      initial={{ opacity: 0.9, y: 0, scale: 1, filter: 'blur(0px)' }}
      animate={{ opacity: 0, y: -120, scale: 0.6, filter: 'blur(2px)' }}
      transition={{ duration: 1.8, ease: 'easeOut' }}
    >
      {/* Ember icon */}
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path
          d="M5 9C5 9 1 6.5 1 3.5C1 2 2.5 1 4 2C4 2 3 0.5 5 0.5C7 0.5 6 2 6 2C7.5 1 9 2 9 3.5C9 6.5 5 9 5 9Z"
          fill="#F59E0B"
          opacity="0.9"
        />
      </svg>
      <span
        className="font-mono text-xs"
        style={{ color: '#F59E0B', fontSize: '11px' }}
      >
        −0.1
      </span>
    </motion.div>
  )
}
