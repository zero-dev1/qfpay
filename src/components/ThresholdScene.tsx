import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { NamePill } from './NamePill'
import { useReducedMotion } from '../hooks/useReducedMotion'

const NETWORK_IDENTITIES = [
  { name: 'alice',    color: 'linear-gradient(135deg, #3B82F6, #4F46E5)' },
  { name: 'satoshi',  color: 'linear-gradient(135deg, #F97316, #EA580C)' },
  { name: 'memechi',  color: 'linear-gradient(135deg, #EC4899, #BE185D)' },
  { name: 'dev',      color: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' },
  { name: 'spin',     color: 'linear-gradient(135deg, #10B981, #0D9488)' },
  { name: 'bob',      color: 'linear-gradient(135deg, #06B6D4, #0284C7)' },
  { name: 'nova',     color: 'linear-gradient(135deg, #F59E0B, #D97706)' },
  { name: 'zara',     color: 'linear-gradient(135deg, #A78BFA, #7C3AED)' },
  { name: 'flux',     color: 'linear-gradient(135deg, #34D399, #059669)' },
  { name: 'kai',      color: 'linear-gradient(135deg, #FB7185, #E11D48)' },
]

const FOREGROUND_PILLS = [
  { id: 0, x: 8,  y: 20 },
  { id: 1, x: 72, y: 12 },
  { id: 2, x: 18, y: 58 },
  { id: 3, x: 62, y: 52 },
  { id: 4, x: 38, y: 78 },
  { id: 5, x: 78, y: 72 },
]

const BACKGROUND_PILLS = [
  { id: 6, x: 45, y: 8  },
  { id: 7, x: 88, y: 38 },
  { id: 8, x: 5,  y: 82 },
  { id: 9, x: 55, y: 88 },
]

const DRIFT_CONFIGS = [
  { dx: 12, dy: -8,  duration: 18 },
  { dx: -10, dy: 10, duration: 22 },
  { dx: 8,  dy: 12,  duration: 16 },
  { dx: -14, dy: -6, duration: 20 },
  { dx: 10, dy: -10, duration: 24 },
  { dx: -8, dy: 8,   duration: 19 },
  { dx: 6,  dy: 14,  duration: 15 },
  { dx: -12, dy: -10,duration: 21 },
  { dx: 14, dy: 6,   duration: 17 },
  { dx: -6, dy: -12, duration: 23 },
]

interface Connection {
  id: string
  x1: number; y1: number
  x2: number; y2: number
  phase: 'entering' | 'holding' | 'leaving'
}

export const ThresholdScene = memo(function ThresholdScene() {
  const reducedMotion = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const pillRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const [connections, setConnections] = useState<Connection[]>([])
  const [lastConnectedPair, setLastConnectedPair] = useState<[number, number] | null>(null)

  useEffect(() => {
    if (reducedMotion) return

    const trigger = () => {
      let a: number, b: number
      do {
        a = Math.floor(Math.random() * FOREGROUND_PILLS.length)
        b = Math.floor(Math.random() * FOREGROUND_PILLS.length)
      } while (a === b || (lastConnectedPair?.[0] === a && lastConnectedPair?.[1] === b))

      const pillA = pillRefs.current.get(FOREGROUND_PILLS[a].id)
      const pillB = pillRefs.current.get(FOREGROUND_PILLS[b].id)
      const container = containerRef.current

      if (!pillA || !pillB || !container) return

      const cRect = container.getBoundingClientRect()
      const aRect = pillA.getBoundingClientRect()
      const bRect = pillB.getBoundingClientRect()

      const conn: Connection = {
        id: `${Date.now()}`,
        x1: aRect.left + aRect.width / 2 - cRect.left,
        y1: aRect.top + aRect.height / 2 - cRect.top,
        x2: bRect.left + bRect.width / 2 - cRect.left,
        y2: bRect.top + bRect.height / 2 - cRect.top,
        phase: 'entering',
      }

      setLastConnectedPair([a, b])
      setConnections(prev => [...prev, conn])

      setTimeout(() => {
        setConnections(prev =>
          prev.map(c => c.id === conn.id ? { ...c, phase: 'holding' } : c)
        )
      }, 300)
      setTimeout(() => {
        setConnections(prev =>
          prev.map(c => c.id === conn.id ? { ...c, phase: 'leaving' } : c)
        )
      }, 1100)
      setTimeout(() => {
        setConnections(prev => prev.filter(c => c.id !== conn.id))
      }, 1500)
    }

    const interval = setInterval(trigger, 4500)
    const initial = setTimeout(trigger, 1500)

    return () => {
      clearInterval(interval)
      clearTimeout(initial)
    }
  }, [reducedMotion, lastConnectedPair])

  if (reducedMotion) {
    return (
      <div className="relative w-full flex-1">
        {[...FOREGROUND_PILLS, ...BACKGROUND_PILLS].map((pos, i) => (
          <div
            key={pos.id}
            className="absolute"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              opacity: i >= FOREGROUND_PILLS.length ? 0.4 : 1,
            }}
          >
            <NamePill
              name={NETWORK_IDENTITIES[pos.id].name}
              color={NETWORK_IDENTITIES[pos.id].color}
              size={i >= FOREGROUND_PILLS.length ? 'sm' : 'md'}
            />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative w-full flex-1 overflow-hidden">

      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 1 }}
      >
        <AnimatePresence>
          {connections.map(conn => (
            <motion.g key={conn.id}>
              <motion.line
                x1={conn.x1} y1={conn.y1}
                x2={conn.x2} y2={conn.y2}
                stroke="rgba(0,64,255,0.6)"
                strokeWidth="1"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: conn.phase === 'holding' ? 0.6
                    : conn.phase === 'leaving' ? 0 : 0.6
                }}
                transition={{ duration: conn.phase === 'leaving' ? 0.4 : 0.3 }}
              />
              {conn.phase === 'holding' && (
                <motion.circle
                  r="3"
                  fill="rgba(0,64,255,0.8)"
                  initial={{ cx: conn.x1, cy: conn.y1 }}
                  animate={{ cx: conn.x2, cy: conn.y2 }}
                  transition={{ duration: 0.8, ease: 'easeInOut' }}
                />
              )}
            </motion.g>
          ))}
        </AnimatePresence>
      </svg>

      {FOREGROUND_PILLS.map((pos) => {
        const drift = DRIFT_CONFIGS[pos.id]
        const identity = NETWORK_IDENTITIES[pos.id]
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
        const driftScale = isMobile ? 0.5 : 1
        
        return (
          <motion.div
            key={pos.id}
            ref={(el) => { if (el) pillRefs.current.set(pos.id, el) }}
            className="absolute"
            style={{ 
              left: `${pos.x}%`, 
              top: `${pos.y}%`, 
              zIndex: 2,
              animationName: 'pill-emerge',
              animationDuration: '600ms',
              animationDelay: `${pos.id * 120}ms`,
              animationFillMode: 'both',
              animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            animate={{ x: drift.dx * driftScale, y: drift.dy * driftScale }}
            transition={{
              duration: drift.duration,
              repeat: Infinity,
              repeatType: 'mirror',
              ease: 'easeInOut',
            }}
          >
            <NamePill
              name={identity.name}
              color={identity.color}
              size="md"
            />
          </motion.div>
        )
      })}

      {BACKGROUND_PILLS.map((pos) => {
        const drift = DRIFT_CONFIGS[pos.id]
        const identity = NETWORK_IDENTITIES[pos.id]
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
        const driftScale = isMobile ? 0.5 : 1
        
        return (
          <motion.div
            key={pos.id}
            className="absolute"
            style={{ 
              left: `${pos.x}%`, 
              top: `${pos.y}%`, 
              opacity: 0.45, 
              zIndex: 1,
              animationName: 'pill-emerge',
              animationDuration: '600ms',
              animationDelay: `${pos.id * 120}ms`,
              animationFillMode: 'both',
              animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            animate={{ x: drift.dx * driftScale, y: drift.dy * driftScale }}
            transition={{
              duration: drift.duration,
              repeat: Infinity,
              repeatType: 'mirror',
              ease: 'easeInOut',
            }}
          >
            <NamePill
              name={identity.name}
              color={identity.color}
              size="sm"
            />
          </motion.div>
        )
      })}

    </div>
  )
})
