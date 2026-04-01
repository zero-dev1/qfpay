import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useWalletStore } from '../stores/walletStore'
import { usePaymentStore } from '../stores/paymentStore'
import { getQFBalance, formatQF, truncateAddress } from '../utils/qfpay'
import { hapticMedium } from '../utils/haptics'
import { EASE_OUT_EXPO } from '../lib/animations'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { ShimmerButton } from './hero/ShimmerButton'
import {
  EXAMPLE_NAMES, TYPE_SPEED, DELETE_SPEED,
  PAUSE_AFTER_TYPE, PAUSE_AFTER_DELETE
} from '../lib/recipientDemoNames'

export const IdentityScreen = () => {
  const { qnsName, address, ss58Address, avatarUrl } = useWalletStore()
  const { goToRecipient } = usePaymentStore()
  const reducedMotion = useReducedMotion()

  const hasQNS = !!qnsName

  // Ceremony state
  const hasPlayedRef = useRef(false)
  const [ceremonyPhase, setCeremonyPhase] = useState<
    'blooming' | 'naming' | 'contracting' | 'settled'
  >('blooming')

  // Balance
  const [balance, setBalance] = useState<bigint | null>(null)
  const [displayBalance, setDisplayBalance] = useState('0')

  // Auto-typing placeholder
  const [placeholder, setPlaceholder] = useState('')
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load balance
  useEffect(() => {
    const addr = ss58Address || address
    if (addr) getQFBalance(addr).then(setBalance)
  }, [ss58Address, address])

  // Count-up animation when balance loads
  useEffect(() => {
    if (balance === null) return
    const target = Number(formatQF(balance).replace(/,/g, ''))
    if (target === 0) { setDisplayBalance('0'); return }
    const steps = 30
    const step = target / steps
    let current = 0
    const interval = setInterval(() => {
      current = Math.min(current + step, target)
      setDisplayBalance(
        current >= target
          ? formatQF(balance)
          : Math.floor(current).toLocaleString()
      )
      if (current >= target) clearInterval(interval)
    }, 20)
    return () => clearInterval(interval)
  }, [balance])

  // Ceremony sequencing — only on first mount
  useEffect(() => {
    if (reducedMotion || !hasQNS) {
      setCeremonyPhase('settled')
      return
    }
    const alreadyPlayed = sessionStorage.getItem('qfpay-ceremony-played')
    if (alreadyPlayed) {
      setCeremonyPhase('settled')
      hasPlayedRef.current = true
      return
    }
    // Play ceremony
    const t1 = setTimeout(() => setCeremonyPhase('naming'), 600)
    const t2 = setTimeout(() => setCeremonyPhase('contracting'), 1400)
    const t3 = setTimeout(() => {
      setCeremonyPhase('settled')
      sessionStorage.setItem('qfpay-ceremony-played', 'true')
    }, 1900)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  // Auto-typing demo — only when settled and hasQNS
  useEffect(() => {
    if (ceremonyPhase !== 'settled' || !hasQNS || reducedMotion) return
    let nameIndex = 0
    let charIndex = 0
    let isDeleting = false

    const tick = () => {
      const currentName = EXAMPLE_NAMES[nameIndex]
      if (!isDeleting) {
        charIndex++
        setPlaceholder(currentName.slice(0, charIndex))
        if (charIndex === currentName.length) {
          animRef.current = setTimeout(() => { isDeleting = true; tick() }, PAUSE_AFTER_TYPE)
          return
        }
        animRef.current = setTimeout(tick, TYPE_SPEED)
      } else {
        charIndex--
        setPlaceholder(currentName.slice(0, charIndex))
        if (charIndex === 0) {
          isDeleting = false
          nameIndex = (nameIndex + 1) % EXAMPLE_NAMES.length
          animRef.current = setTimeout(tick, PAUSE_AFTER_DELETE)
          return
        }
        animRef.current = setTimeout(tick, DELETE_SPEED)
      }
    }
    animRef.current = setTimeout(tick, 800)
    return () => { if (animRef.current) clearTimeout(animRef.current) }
  }, [ceremonyPhase, hasQNS, reducedMotion])

  const handleScreenTap = () => {
    if (ceremonyPhase !== 'settled' || !hasQNS) return
    hapticMedium()
    goToRecipient()
  }

  // ── No QNS fork ──
  if (!hasQNS) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center min-h-screen px-6 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
      >
        {/* Address bloom */}
        <motion.div
          className="font-mono text-xl sm:text-2xl mb-8"
          style={{ color: 'rgba(255,255,255,0.7)' }}
          initial={{ scale: 0.7, opacity: 0, filter: 'blur(8px)' }}
          animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
        >
          {truncateAddress(address || '')}
        </motion.div>

        <motion.p
          className="font-satoshi font-medium text-base mb-2"
          style={{ color: 'rgba(255,255,255,0.8)' }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4, ease: EASE_OUT_EXPO }}
        >
          You don't have a .qf name yet.
        </motion.p>

        <motion.p
          className="font-satoshi text-xs mb-10"
          style={{ color: 'rgba(255,255,255,0.4)' }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4, ease: EASE_OUT_EXPO }}
        >
          Get one at{' '}
          <a
            href="https://dotqf.xyz"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#0040FF' }}
          >
            dotqf.xyz
          </a>
          {' '}— takes 30 seconds
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.4, ease: EASE_OUT_EXPO }}
        >
          <ShimmerButton onClick={() => window.open('https://dotqf.xyz', '_blank')}>
            Get my .qf name
          </ShimmerButton>
        </motion.div>
      </motion.div>
    )
  }

  // ── Has QNS — ceremony + settled state ──
  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-6 cursor-pointer select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
      onClick={handleScreenTap}
    >
      <AnimatePresence mode="wait">

        {/* ── Ceremony phases ── */}
        {(ceremonyPhase === 'blooming' || ceremonyPhase === 'naming' || ceremonyPhase === 'contracting') && (
          <motion.div
            key="ceremony"
            className="flex flex-col items-center text-center"
            exit={{
              opacity: 0,
              scale: 0.6,
              x: '40vw',
              y: '-30vh',
              transition: { duration: 0.5, ease: EASE_OUT_EXPO },
            }}
          >
            {/* Avatar bloom */}
            <motion.div
              className="relative mb-6"
              initial={{ scale: 0.6, opacity: 0, filter: 'blur(8px)' }}
              animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
            >
              <div className="relative w-20 h-20 rounded-full p-[2px]"
                style={{ background: 'linear-gradient(135deg, rgba(0,64,255,0.4), rgba(0,64,255,0.1))' }}>
                <div className="w-full h-full rounded-full overflow-hidden bg-qfpay-bg">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={qnsName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"
                      style={{ background: 'rgba(0,64,255,0.1)' }}>
                      <span className="font-clash font-bold text-3xl text-qfpay-blue">
                        {qnsName[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {/* Presence dot */}
              <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-[3px] border-qfpay-bg animate-pulse-glow"
                style={{ background: '#00D179' }} />
            </motion.div>

            {/* Name */}
            <AnimatePresence>
              {(ceremonyPhase === 'naming' || ceremonyPhase === 'contracting') && (
                <motion.h1
                  className="font-clash font-bold tracking-tight mb-2"
                  style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)' }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
                >
                  <span className="text-white">{qnsName}</span>
                  <span style={{ color: '#0040FF' }}>.qf</span>
                </motion.h1>
              )}
            </AnimatePresence>

            {/* Balance count-up */}
            <AnimatePresence>
              {(ceremonyPhase === 'naming' || ceremonyPhase === 'contracting') && (
                <motion.div
                  className="flex items-baseline gap-2"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.4, ease: EASE_OUT_EXPO }}
                >
                  <span className="font-clash font-bold text-5xl text-white">
                    {displayBalance}
                  </span>
                  <span className="font-clash text-xl" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    QF
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── Settled state — the input invitation ── */}
        {ceremonyPhase === 'settled' && (
          <motion.div
            key="settled"
            className="flex flex-col items-center w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
          >
            {/* Auto-typing display */}
            <div className="flex items-center justify-center min-h-[72px]">
              <span
                className="font-clash font-bold text-center"
                style={{
                  fontSize: 'clamp(2rem, 8vw, 4rem)',
                  color: 'rgba(255,255,255,0.2)',
                  letterSpacing: '-0.02em',
                }}
              >
                {reducedMotion ? 'alice.qf' : placeholder}
              </span>
              {!reducedMotion && (
                <motion.span
                  className="inline-block bg-white/20 ml-1"
                  style={{ width: 3, height: '0.85em', borderRadius: 1 }}
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
                />
              )}
            </div>

            {/* Underline */}
            <div
              style={{
                width: 'clamp(200px, 50vw, 360px)',
                height: 2,
                borderRadius: 1,
                background: 'rgba(255,255,255,0.12)',
                marginTop: 12,
              }}
            />
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  )
}
