import { useState, useEffect, useCallback, memo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { NamePill } from './NamePill'
import { BurnParticle } from './BurnParticle'

type Phase = 'idle' | 'ignite' | 'transfer' | 'arrive' | 'rest'

const PHASE_DURATIONS: Record<Phase, number> = {
  idle: 1400,
  ignite: 1200,
  transfer: 2000,
  arrive: 1600,
  rest: 1400,
}

const PHASE_ORDER: Phase[] = ['idle', 'ignite', 'transfer', 'arrive', 'rest']

const SCENARIOS = [
  { sender: 'alice', senderColor: 'linear-gradient(135deg, #3B82F6, #4F46E5)', recipient: 'bob', recipientColor: 'linear-gradient(135deg, #06B6D4, #3B82F6)', amount: '50' },
  { sender: 'dev', senderColor: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', recipient: 'spin', recipientColor: 'linear-gradient(135deg, #10B981, #0D9488)', amount: '100' },
  { sender: 'satoshi', senderColor: 'linear-gradient(135deg, #F97316, #EA580C)', recipient: 'memechi', recipientColor: 'linear-gradient(135deg, #EC4899, #BE185D)', amount: '25' },
]

export const ThresholdScene = memo(function ThresholdScene() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [scenarioIndex, setScenarioIndex] = useState(0)
  const [showBurn, setShowBurn] = useState(false)
  const [showCheckmark, setShowCheckmark] = useState(false)

  const senderRef = useRef<HTMLDivElement>(null)
  const recipientRef = useRef<HTMLDivElement>(null)
  const [amountX, setAmountX] = useState(0)

  const scenario = SCENARIOS[scenarioIndex]

  // Calculate exact amount position based on pill positions
  const calculateAmountPosition = useCallback(() => {
    if (phase === 'transfer' || phase === 'arrive') {
      const senderEl = senderRef.current
      const recipientEl = recipientRef.current
      
      if (senderEl && recipientEl) {
        const senderRect = senderEl.getBoundingClientRect()
        const recipientRect = recipientEl.getBoundingClientRect()
        const containerRect = senderEl.parentElement?.getBoundingClientRect()
        
        if (containerRect) {
          const startX = senderRect.right - containerRect.left
          const endX = recipientRect.left - containerRect.left
          const progress = phase === 'transfer' ? 0.5 : 1
          return startX + (endX - startX) * progress
        }
      }
    }
    return 0
  }, [phase])

  // Update amount position when phase changes
  useEffect(() => {
    if (phase === 'transfer' || phase === 'arrive') {
      const timer = setTimeout(() => {
        setAmountX(calculateAmountPosition())
      }, 100)
      return () => clearTimeout(timer)
    } else {
      setAmountX(0)
    }
  }, [phase, calculateAmountPosition])

  // Phase machine
  useEffect(() => {
    const duration = PHASE_DURATIONS[phase]
    const timer = setTimeout(() => {
      const currentIndex = PHASE_ORDER.indexOf(phase)
      const nextPhase = PHASE_ORDER[(currentIndex + 1) % PHASE_ORDER.length]

      if (nextPhase === 'idle') {
        // Advance to next scenario
        setScenarioIndex(i => (i + 1) % SCENARIOS.length)
        setShowCheckmark(false)
      }
      if (phase === 'transfer') {
        // Mount burn particle halfway through transfer
        setTimeout(() => setShowBurn(true), duration * 0.3)
        setTimeout(() => setShowBurn(false), duration * 0.85)
      }
      if (nextPhase === 'arrive') {
        setTimeout(() => setShowCheckmark(true), 300)
      }

      setPhase(nextPhase)
    }, duration)

    return () => clearTimeout(timer)
  }, [phase])

  // Derived state for pill appearances
  const senderState = phase === 'transfer' || phase === 'arrive' ? 'dimmed' : 'default'
  const recipientState = phase === 'arrive' ? 'arriving' : 'default'

  return (
    <div className="relative w-full flex-1 flex items-center justify-center overflow-hidden select-none">

      {/* Subtle atmosphere background */}
      <div
        className="absolute inset-0 transition-all duration-1000 pointer-events-none"
        style={{
          background: phase === 'ignite' || phase === 'transfer'
            ? 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(0,64,255,0.04) 0%, transparent 70%)'
            : phase === 'arrive'
            ? 'radial-gradient(ellipse 40% 40% at 75% 50%, rgba(34,197,94,0.04) 0%, transparent 70%)'
            : 'transparent',
        }}
      />

      {/* Stage — full width, centered row */}
      <div className="relative w-full max-w-4xl mx-auto flex items-center justify-between px-8 md:px-16">

        {/* Sender pill */}
        <div ref={senderRef}>
          <NamePill
            name={scenario.sender}
            color={scenario.senderColor}
            state={senderState}
          />
        </div>

        {/* Center stage — amount + trail + burn */}
        <div className="relative flex-1 flex items-center justify-center mx-4">

          {/* SVG trail line */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
            style={{ opacity: phase === 'transfer' ? 1 : 0, transition: 'opacity 0.3s' }}
          >
            <line
              x1="0" y1="50%" x2="100%" y2="50%"
              stroke="rgba(0, 64, 255, 0.18)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
          </svg>

          {/* Amount */}
          <AnimatePresence mode="wait">
            {!showCheckmark ? (
              <motion.div
                key={`amount-${scenarioIndex}`}
                className="relative z-10 text-center"
                animate={{
                  x: amountX,
                  opacity: phase === 'idle' ? 0 : phase === 'rest' ? 0 : 1,
                  scale: phase === 'arrive' ? [1, 1.06, 1] : 1,
                }}
                transition={{
                  x: { duration: PHASE_DURATIONS.transfer / 1000, ease: [0.25, 0.1, 0.25, 1] },
                  opacity: { duration: 0.4 },
                  scale: { duration: 0.4, times: [0, 0.5, 1] },
                }}
              >
                <span
                  className="font-clash font-bold"
                  style={{
                    fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
                    letterSpacing: phase === 'ignite' ? '0.06em' : '-0.03em',
                    transition: 'letter-spacing 0.6s ease',
                    color: 'white',
                  }}
                >
                  {scenario.amount}
                  <span style={{ color: '#0040FF', fontSize: '0.65em', marginLeft: '0.15em' }}>
                    QF
                  </span>
                </span>
              </motion.div>
            ) : (
              // Checkmark
              <motion.div
                key="checkmark"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'backOut' }}
              >
                <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                  <motion.path
                    d="M12 26L22 36L40 16"
                    stroke="rgba(34, 197, 94, 0.9)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Burn particle */}
          <AnimatePresence>
            {showBurn && (
              <BurnParticle key={`burn-${scenarioIndex}`} x={0} />
            )}
          </AnimatePresence>

        </div>

        {/* Recipient pill */}
        <div ref={recipientRef}>
          <NamePill
            name={scenario.recipient}
            color={scenario.recipientColor}
            state={recipientState}
          />
        </div>

      </div>
    </div>
  )
})
