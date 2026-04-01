import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { usePaymentStore } from '../stores/paymentStore'
import { useWalletStore } from '../stores/walletStore'
import { formatQF } from '../utils/qfpay'
import { hapticBurn, hapticImpact, hapticSuccess } from '../utils/haptics'
import { playBurnSound, playSendSound, playSuccessSound } from '../utils/sounds'
import { EASE_OUT_EXPO, EASE_SPRING } from '../lib/animations'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { NamePill } from './NamePill'
import { ShimmerButton } from './hero/ShimmerButton'

export const AnimationSequence = () => {
  const {
    phase,
    recipientAmountWei,
    burnAmountWei,
    recipientName,
    recipientAddress,
    recipientAvatar,
    confirmed,
    advanceToSending,
    advanceToSuccess,
    reset,
  } = usePaymentStore()

  const { qnsName: senderName, avatarUrl: senderAvatar } = useWalletStore()
  const reducedMotion = useReducedMotion()

  // Derived
  const departureAmountWei = recipientAmountWei + burnAmountWei

  // Screen 5 state flags
  const [senderDimmed, setSenderDimmed] = useState(false)
  const [recipientArriving, setRecipientArriving] = useState(false)
  const [showCheckmark, setShowCheckmark] = useState(false)
  const [pillsVisible, setPillsVisible] = useState(true)
  const [trailVisible, setTrailVisible] = useState(false)
  const [displayAmount, setDisplayAmount] = useState(
    Number(departureAmountWei) / 1e18
  )
  const [amountColor, setAmountColor] = useState('white')

  const displayRecipient = recipientName
    ? `${recipientName}.qf`
    : recipientAddress
      ? recipientAddress.slice(0, 8) + '...' + recipientAddress.slice(-4)
      : ''

  // Recipient gradient color
  const recipientColorMap: Record<string, string> = {
    a: 'linear-gradient(135deg, #3B82F6, #4F46E5)',
    b: 'linear-gradient(135deg, #06B6D4, #0284C7)',
    m: 'linear-gradient(135deg, #EC4899, #BE185D)',
    s: 'linear-gradient(135deg, #F97316, #EA580C)',
    d: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
  }
  const recipientColor = recipientName
    ? recipientColorMap[recipientName[0].toLowerCase()] ||
      'linear-gradient(135deg, #10B981, #0D9488)'
    : 'linear-gradient(135deg, #10B981, #0D9488)'

  // ── BURN PHASE ──
  useEffect(() => {
    if (phase !== 'burn') return
    if (reducedMotion) {
      setTimeout(advanceToSending, 400)
      return
    }

    playBurnSound()
    hapticBurn()

    const startValue = Number(departureAmountWei) / 1e18
    const endValue = Number(recipientAmountWei) / 1e18
    const difference = startValue - endValue

    let countdownAF: number

    const timers = [
      setTimeout(() => setTrailVisible(true), 100),
      // Shift amount to amber and start countdown
      setTimeout(() => {
        setAmountColor('#F59E0B')
        const COUNTDOWN_DURATION = 700
        const startTime = performance.now()
        const tick = () => {
          const elapsed = performance.now() - startTime
          const progress = Math.min(elapsed / COUNTDOWN_DURATION, 1)
          const eased = progress * (2 - progress) // easeOut
          setDisplayAmount(startValue - difference * eased)
          if (progress < 1) {
            countdownAF = requestAnimationFrame(tick)
          } else {
            setDisplayAmount(endValue)
          }
        }
        countdownAF = requestAnimationFrame(tick)
      }, 600),
      setTimeout(() => setSenderDimmed(true), 1100),
      setTimeout(() => setAmountColor('white'), 1400),
      setTimeout(advanceToSending, 1800),
    ]

    return () => {
      timers.forEach(clearTimeout)
      if (countdownAF) cancelAnimationFrame(countdownAF)
    }
  }, [phase])

  // ── SENDING PHASE ──
  useEffect(() => {
    if (phase !== 'sending') return
    if (reducedMotion) {
      setTimeout(advanceToSuccess, 400)
      return
    }

    playSendSound()

    const timers = [
      setTimeout(() => hapticImpact(), 700),
      setTimeout(() => {
        setShowCheckmark(true)
        setRecipientArriving(true)
      }, 800),
      setTimeout(() => setPillsVisible(false), 1100),
      setTimeout(advanceToSuccess, 2200),
    ]
    return () => timers.forEach(clearTimeout)
  }, [phase])

  // ── SUCCESS PHASE ──
  useEffect(() => {
    if (phase !== 'success') return
    playSuccessSound()
    hapticSuccess()
  }, [phase])

  // ── BACKGROUND COLOR ──
  const getBgColor = () => {
    if (phase === 'burn') return '#0F0608'
    if (phase === 'success') return '#0040FF'
    return '#060A14'
  }

  // ── REDUCED MOTION — static success state ──
  if (reducedMotion && phase === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6"
        style={{ background: '#0040FF' }}>
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" className="mb-6">
          <path d="M14 28L24 38L42 18"
            stroke="rgba(34,197,94,0.9)" strokeWidth="3"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="font-satoshi text-base mb-8"
          style={{ color: 'rgba(185,28,28,0.8)' }}>
          🔥 {formatQF(burnAmountWei)} QF burned forever
        </p>
        <button
          className="font-satoshi font-medium text-white/80 text-base mb-3"
          onClick={reset}
        >
          Send again
        </button>
        <button
          className="font-satoshi text-white/50 text-sm"
          onClick={reset}
        >
          Done
        </button>
      </div>
    )
  }

  return (
    <motion.div
      className="relative flex flex-col items-center justify-center min-h-screen px-6 overflow-hidden"
      animate={{ backgroundColor: getBgColor() }}
      transition={{ duration: phase === 'burn' ? 0.3 : 0.4, ease: EASE_OUT_EXPO }}
    >

      {/* ── SCREEN 5 — burn + sending phases ── */}
      <AnimatePresence>
        {(phase === 'burn' || phase === 'sending') && (
          <motion.div
            key="screen5"
            className="relative w-full flex flex-col items-center"
            style={{ minHeight: '70vh' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >

            {/* Sender pill */}
            <AnimatePresence>
              {pillsVisible && (
                <motion.div
                  className="absolute left-1/2 -translate-x-1/2"
                  style={{ top: '8%' }}
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
                >
                  <NamePill
                    name={senderName || 'you'}
                    color="linear-gradient(135deg, #3B82F6, #4F46E5)"
                    avatarUrl={senderAvatar || undefined}
                    state={senderDimmed ? 'dimmed' : 'default'}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Vertical trail */}
            <AnimatePresence>
              {trailVisible && (
                <motion.svg
                  className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
                  style={{ top: '15%', height: '70%', width: 2 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: pillsVisible ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.line
                    x1="1" y1="0%" x2="1" y2="100%"
                    stroke="rgba(0,64,255,0.25)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
                  />
                </motion.svg>
              )}
            </AnimatePresence>

            {/* Amount — center stage */}
            <AnimatePresence>
              {!showCheckmark && (
                <motion.div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10"
                  initial={{ scale: 0.7, opacity: 0, filter: 'blur(8px)' }}
                  animate={{
                    scale: 1,
                    opacity: phase === 'sending' ? [1, 1, 0] : 1,
                    filter: 'blur(0px)',
                    y: phase === 'sending' ? [0, 0, '35vh'] : 0,
                  }}
                  transition={{
                    scale: { duration: 0.5, ease: EASE_OUT_EXPO },
                    filter: { duration: 0.5 },
                    opacity: phase === 'sending'
                      ? { duration: 0.8, times: [0, 0.5, 1] }
                      : { duration: 0.4 },
                    y: phase === 'sending'
                      ? { duration: 0.8, ease: [0.25, 0.1, 0.25, 1], times: [0, 0.1, 1] }
                      : {},
                  }}
                  exit={{ opacity: 0, scale: 0.85 }}
                >
                  <span
                    className="font-clash font-bold"
                    style={{
                      fontSize: 'clamp(2.5rem, 8vw, 5rem)',
                      color: amountColor,
                      letterSpacing: '-0.02em',
                      transition: 'color 0.15s ease',
                    }}
                  >
                    {/* Format display amount — avoid calling formatQF on float,
                        convert back to bigint for formatting */}
                    {formatQF(BigInt(Math.round(displayAmount * 1e18)))}
                    <span style={{ color: '#0040FF', fontSize: '0.55em', marginLeft: '0.15em' }}>
                      QF
                    </span>
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Checkmark — appears after amount travels */}
            <AnimatePresence>
              {showCheckmark && (
                <motion.div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                >
                  <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                    <motion.path
                      d="M14 28L24 38L42 18"
                      stroke="rgba(34,197,94,0.9)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                    />
                  </svg>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Recipient pill */}
            <AnimatePresence>
              {pillsVisible && (
                <motion.div
                  className="absolute left-1/2 -translate-x-1/2"
                  style={{ bottom: '8%' }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ delay: 0.15, duration: 0.4, ease: EASE_OUT_EXPO }}
                >
                  <NamePill
                    name={recipientName || recipientAddress?.slice(0, 8) || '?'}
                    color={recipientColor}
                    avatarUrl={recipientAvatar || undefined}
                    state={recipientArriving ? 'arriving' : 'default'}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sapphire radial bloom — starts as success phase begins */}
            <AnimatePresence>
              {phase === 'sending' && showCheckmark && (
                <motion.div
                  className="fixed inset-0 pointer-events-none"
                  style={{
                    background: '#0040FF',
                    borderRadius: '50%',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 100,
                    height: 100,
                    zIndex: 0,
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  // This only starts when advanceToSuccess fires
                  // The bloom is triggered by the success phase transition
                />
              )}
            </AnimatePresence>

          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SCREEN 6 — success phase ── */}
      <AnimatePresence>
        {phase === 'success' && (
          <motion.div
            key="screen6"
            className="flex flex-col items-center text-center relative z-10 w-full px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          >
            {/* Background cooling overlay */}
            <motion.div
              className="fixed inset-0 pointer-events-none z-0"
              style={{ background: '#080D1A' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.5, ease: 'easeOut', delay: 0.8 }}
            />

            {/* Checkmark — persists from Screen 5 */}
            <motion.div
              className="relative z-10 mb-6"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
            >
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                <path
                  d="M14 28L24 38L42 18"
                  stroke="rgba(34,197,94,0.9)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.div>

            {/* Burn epitaph — first text to appear */}
            <motion.p
              className="relative z-10 font-satoshi font-medium text-base mb-8"
              style={{ color: 'rgba(185,28,28,0.8)' }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.4, ease: EASE_OUT_EXPO }}
            >
              🔥 {formatQF(burnAmountWei)} QF burned forever
            </motion.p>

            {/* Receipt card */}
            <motion.div
              className="relative z-10 w-full max-w-sm mx-auto mb-8"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 20,
                padding: '16px',
              }}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 1.4,
                type: 'spring',
                stiffness: 200,
                damping: 24,
              }}
            >
              {/* Pills row */}
              <div className="flex items-center justify-between gap-2 mb-3">
                {/* Sender pill — compact */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {senderAvatar ? (
                    <img src={senderAvatar} alt={senderName || ''}
                      className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                      <span className="font-clash font-bold text-[10px] text-white">
                        {(senderName || '?')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="font-satoshi text-xs text-white/70 truncate">
                    {senderName
                      ? <>{senderName}<span style={{ color: '#0040FF' }}>.qf</span></>
                      : 'you'}
                  </span>
                </div>

                {/* Arrow */}
                <div style={{
                  height: 1, flex: '0 0 24px',
                  background: 'rgba(0,64,255,0.4)',
                }} />

                {/* Recipient pill — compact */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                  <span className="font-satoshi text-xs text-white/70 truncate">
                    {recipientName
                      ? <>{recipientName}<span style={{ color: '#0040FF' }}>.qf</span></>
                      : displayRecipient}
                  </span>
                  {recipientAvatar ? (
                    <img src={recipientAvatar} alt={recipientName || ''}
                      className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                      <span className="font-clash font-bold text-[10px] text-white">
                        {(recipientName || '?')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Amount + burn row */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-white/60">
                  {formatQF(recipientAmountWei)} QF ·{' '}
                  <span style={{ color: 'rgba(185,28,28,0.7)' }}>
                    🔥 {formatQF(burnAmountWei)} burned
                  </span>
                </span>
                {/* Share icon */}
                <button
                  className="ml-2 flex-shrink-0"
                  style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem' }}
                  onClick={async () => {
                    const text = `Sent ${formatQF(recipientAmountWei)} QF to ${
                      recipientName ? recipientName + '.qf' : displayRecipient
                    } · ${formatQF(burnAmountWei)} QF burned forever · qfpay.xyz`
                    if (navigator.share) {
                      await navigator.share({ text })
                    } else {
                      navigator.clipboard.writeText(text)
                    }
                  }}
                >
                  ↗
                </button>
              </div>

              {/* Timestamp */}
              <p className="font-mono text-white/25 mt-1"
                style={{ fontSize: 10 }}>
                {new Date().toLocaleTimeString()}
              </p>
            </motion.div>

            {/* Action buttons */}
            <motion.div
              className="relative z-10 flex flex-col items-center gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.0, duration: 0.4, ease: EASE_OUT_EXPO }}
            >
              <ShimmerButton onClick={reset}>
                Send again
              </ShimmerButton>
              <button
                className="font-satoshi text-sm focus-ring"
                style={{ color: 'rgba(255,255,255,0.5)' }}
                onClick={reset}
              >
                Done
              </button>
            </motion.div>

            {/* On-chain confirmation status — preserved from original */}
            <motion.div
              className="relative z-10 mt-6 flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.4, duration: 0.5 }}
            >
              {confirmed === true ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-qfpay-green" />
                  <span className="font-mono text-xs text-white/40">
                    Confirmed on-chain
                  </span>
                </>
              ) : confirmed === null ? (
                <>
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-white/30"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <span className="font-mono text-xs text-white/30">
                    Confirming...
                  </span>
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                  <span className="font-mono text-xs text-white/25">
                    Transaction sent
                  </span>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  )
}
