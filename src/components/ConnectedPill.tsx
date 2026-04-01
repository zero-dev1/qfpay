import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWalletStore } from '../stores/walletStore'
import { getQFBalance, formatQF, truncateAddress } from '../utils/qfpay'
import { hapticLight, hapticMedium } from '../utils/haptics'
import { BG_SURFACE, SUCCESS_GREEN, BRAND_BLUE } from '../lib/colors'
import { EASE_OUT_EXPO } from '../lib/animations'

export function ConnectedPill() {
  const { qnsName, address, ss58Address, avatarUrl, disconnect } = useWalletStore()
  const [balance, setBalance] = useState<bigint | null>(null)
  const [balanceVisible, setBalanceVisible] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('qfpay-sound-enabled') !== 'false'
  })
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const addr = ss58Address || address
    if (addr) getQFBalance(addr).then(setBalance)
  }, [ss58Address, address])

  // Close dropdown on outside tap
  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  const handleCopy = () => {
    if (!address) return
    navigator.clipboard.writeText(address)
    hapticLight()
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleSoundToggle = () => {
    const next = !soundEnabled
    setSoundEnabled(next)
    localStorage.setItem('qfpay-sound-enabled', String(next))
    hapticLight()
  }

  const displayBalance = balance === null
    ? '··· QF'
    : balanceVisible
      ? `${formatQF(balance)} QF`
      : '•••• QF'

  const name = qnsName || truncateAddress(address || '')
  const initial = (qnsName || 'W')[0].toUpperCase()

  return (
    <div ref={dropdownRef} className="relative">
      {/* Pill */}
      <motion.div
        className="flex items-center gap-2 cursor-pointer select-none"
        style={{
          background: BG_SURFACE,
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 9999,
          padding: '6px 12px 6px 6px',
        }}
        whileTap={{ scale: 0.97 }}
        onClick={() => {
          hapticLight()
          setBalanceVisible(v => !v)
        }}
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-clash font-bold text-white text-sm"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #4F46E5)' }}
            >
              {initial}
            </div>
          )}
          <div
            className="absolute bottom-0 right-0 rounded-full animate-pulse-glow"
            style={{
              width: 7, height: 7,
              background: SUCCESS_GREEN,
              border: '1.5px solid #060A14',
            }}
          />
        </div>

        {/* Name */}
        <span className="font-satoshi font-medium text-sm whitespace-nowrap"
          style={{ color: 'rgba(255,255,255,0.9)' }}>
          {qnsName || truncateAddress(address || '')}
          {qnsName && <span style={{ color: `rgba(0,64,255,0.85)` }}>.qf</span>}
        </span>

        {/* Separator dot */}
        <div style={{
          width: 4, height: 4, borderRadius: 1,
          background: 'rgba(255,255,255,0.3)',
          flexShrink: 0,
        }} />

        {/* Balance */}
        <span className="font-mono text-xs whitespace-nowrap"
          style={{ color: `rgba(0,64,255,0.8)` }}>
          {displayBalance}
        </span>

        {/* Chevron — tap to open dropdown */}
        <span
          className="text-xs ml-0.5 select-none"
          style={{ color: 'rgba(255,255,255,0.25)' }}
          onClick={(e) => {
            e.stopPropagation()
            hapticLight()
            setDropdownOpen(v => !v)
          }}
        >▾</span>
      </motion.div>

      {/* Dropdown */}
      <AnimatePresence>
        {dropdownOpen && (
          <motion.div
            className="absolute right-0 mt-2 min-w-[160px] z-50"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: 4,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: EASE_OUT_EXPO }}
          >
            <button
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-satoshi transition-colors"
              style={{ color: 'rgba(255,255,255,0.6)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              onClick={handleCopy}
            >
              {copied ? 'Copied ✓' : 'Copy address'}
            </button>

            <button
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-satoshi transition-colors"
              style={{ color: 'rgba(255,255,255,0.4)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              onClick={() => { hapticMedium(); disconnect() }}
            >
              Disconnect
            </button>

            {/* Divider */}
            <div style={{
              height: 1, background: 'rgba(255,255,255,0.06)',
              margin: '4px 8px',
            }} />

            {/* Sound toggle */}
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="text-sm font-satoshi" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Sound
              </span>
              <button
                onClick={handleSoundToggle}
                className="relative w-8 h-4 rounded-full transition-colors"
                style={{
                  background: soundEnabled ? BRAND_BLUE : 'rgba(255,255,255,0.12)',
                }}
              >
                <div
                  className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform"
                  style={{ transform: soundEnabled ? 'translateX(18px)' : 'translateX(2px)' }}
                />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
