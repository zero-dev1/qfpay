import { motion } from 'framer-motion'

export interface NamePillProps {
  name: string        // e.g. "alice"
  color: string       // gradient color for avatar, e.g. "#3B82F6"
  state?: 'default' | 'dimmed' | 'arriving'
  className?: string
}

export function NamePill({ name, color, state = 'default', className }: NamePillProps) {
  const initial = name[0].toUpperCase()

  return (
    <motion.div
      className={`flex items-center gap-2 px-3 py-2 rounded-full ${className}`}
      style={{
        background: 'rgba(255, 255, 255, 0.04)',
        border: state === 'arriving'
          ? '1px solid rgba(34, 197, 94, 0.4)'
          : '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: state === 'arriving'
          ? '0 0 20px rgba(34, 197, 94, 0.15)'
          : 'none',
      }}
      animate={{
        opacity: state === 'dimmed' ? 0.4 : 1,
        borderColor: state === 'arriving'
          ? 'rgba(34, 197, 94, 0.4)'
          : 'rgba(255, 255, 255, 0.08)',
      }}
      transition={{ duration: 0.3 }}
    >
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
        style={{ background: color }}
      >
        {initial}
      </div>
      {/* Name */}
      <span className="text-sm font-medium whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.8)' }}>
        {name}
        <span style={{ color: 'rgba(0, 64, 255, 0.7)' }}>.qf</span>
      </span>
    </motion.div>
  )
}
