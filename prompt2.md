# QFPay — Screen 2 Redesign
## SWE Implementation Prompt

---

## CONTEXT AND CURRENT STATE

Screen 2 currently spans two separate components: `IdentityScreen.tsx` (the
connected home/idle state) and `RecipientScreen.tsx` (recipient name entry).
They are separate screens with separate transitions between them.

The QDL redesign merges the spirit of both into a single cohesive connected
experience — but keeps them as separate components for routing purposes (the
`paymentStore` phase machine already handles this cleanly).

**What changes:**
- `IdentityScreen.tsx` — full rewrite with the recognition ceremony
- `RecipientScreen.tsx` — QDL treatment of existing logic (keep all resolution
  logic intact, rebuild the visual layer)
- `App.tsx` — replace the plain `LogOut` button with the new `ConnectedPill`
- New component: `src/components/ConnectedPill.tsx`

**What does NOT change:**
- `paymentStore.ts` — no changes whatsoever
- `walletStore.ts` — no changes whatsoever
- `utils/qfpay.ts` — all resolution utilities used as-is
- `utils/haptics.ts` — use existing functions exactly
- `lib/animations.ts` — use existing easing curves
- `lib/colors.ts` — use existing tokens
- `tailwind.config.js` — no changes
- Any other screen components

---

## STORE INTERFACE — EXACT FIELD NAMES

```typescript
// From useWalletStore() — confirmed from source:
const {
  qnsName,        // string | null — the user's .qf name (without .qf suffix)
  address,        // `0x${string}` | null — EVM address
  ss58Address,    // string | null — substrate address
  avatarUrl,      // string | null — resolved avatar image URL
  providerType,   // 'substrate' | 'evm' | null
  disconnect,     // () => void
} = useWalletStore()

// From usePaymentStore() — confirmed from source:
const {
  goToRecipient,      // () => void — navigate to recipient input
  goBackToIdle,       // () => void — back from recipient to identity
  setRecipient,       // (name, address, avatar?) => void
  goToAmount,         // () => void — navigate to amount screen
  recipientName,      // string | null
  recipientAddress,   // string | null
  recipientAvatar,    // string | null
} = usePaymentStore()
```

---

## UTILITY FUNCTIONS — EXACT IMPORTS

```typescript
import { getQFBalance, formatQF, truncateAddress, resolveForward, getAvatar } from '../utils/qfpay'
import { detectAddressType, ss58ToEvmAddress } from '../utils/address'
import { hapticLight, hapticMedium, hapticDouble } from '../utils/haptics'
import { EASE_OUT_EXPO, EASE_SPRING, staggerContainer, staggerChild } from '../lib/animations'
import { BRAND_BLUE, BG_PRIMARY, BG_SURFACE, SUCCESS_GREEN } from '../lib/colors'
import { useReducedMotion } from '../hooks/useReducedMotion'
```

---

## FILE 1: `src/components/ConnectedPill.tsx` — NEW FILE

This component replaces the plain `LogOut` icon button in `App.tsx`. It is the
persistent session indicator present on every screen from Screen 2 onward.

**Appearance:**
```
[avatar 32px] [name].qf [·] [balance] [▾]
```

- Container: clear glass — `BG_SURFACE` (`#0C1019`) fill, `1px solid rgba(255,255,255,0.10)`,
  `border-radius: 9999px`, `padding: 6px 12px 6px 6px`
- Avatar: 32px circle. If `avatarUrl` present: `<img>` with `object-fit: cover`.
  Fallback: gradient circle with initial letter in Clash Display.
  Presence dot: 6px, `SUCCESS_GREEN`, bottom-right of avatar,
  `border: 1.5px solid #060A14`
- Name: Satoshi Medium, `text-sm`, white at 90% opacity.
  `.qf` suffix: `#0040FF` at 85% opacity
- Square separator dot: 4px × 4px, `rgba(255,255,255,0.3)`, `border-radius: 1px`
- Balance: JetBrains Mono, `text-xs`, `#0040FF` at 80% opacity.
  Masked by default — `•••• QF`. Tap pill body to toggle reveal.
  Reveal is an instant character swap, no animation — just the numbers appear.
- Chevron `▾`: white at 25% opacity, `text-xs`, right side

**Dropdown** (appears below pill on tap of chevron area):
- Anchored to right edge of pill, drops downward
- Clear glass: `rgba(255,255,255,0.04)` fill, `1px solid rgba(255,255,255,0.08)`,
  `border-radius: 12px`, `padding: 4px`
- Spring entrance: scale `0.95` → `1`, opacity `0` → `1`, `150ms`
- Two items, each `px-3 py-2.5 rounded-lg hover:bg-white/[0.06]`:
  - `"Copy address"` — Satoshi, `text-sm`, white at 60% opacity.
    On tap: copies `address` to clipboard, hapticLight(), brief "Copied" swap
  - `"Disconnect"` — Satoshi, `text-sm`, white at 40% opacity (quieter than copy)
    On tap: `hapticMedium()`, `disconnect()`
- Sound toggle row (below a 1px divider `rgba(255,255,255,0.06)`):
  - `"Sound"` label, white at 40% opacity + toggle switch right-aligned
  - Toggle state stored in `localStorage` key `qfpay-sound-enabled` (default: true)
  - Used by Screen 5/6 sound system — reading this key before playing sounds
- Tap outside dismisses instantly, no animation needed on dismiss

**Balance loading:** `getQFBalance` is called on mount using `ss58Address || address`.
While loading, show `"··· QF"` instead of the masked balance.

```typescript
// ConnectedPill.tsx
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
```

---

## FILE 2: `src/App.tsx` — Targeted Edit Only

**Replace** the entire `{showLogout && ...}` `AnimatePresence` block with the
`ConnectedPill`. The pill handles its own visibility (it reads `address` from
the store internally).

Add import at top:
```typescript
import { ConnectedPill } from './components/ConnectedPill'
```

Remove import:
```typescript
import { LogOut, WifiOff } from 'lucide-react'  // remove LogOut, keep WifiOff
```

**Replace** this block:
```typescript
{/* ── Logout button ── */}
<AnimatePresence>
  {showLogout && (
    <motion.button
      className="fixed top-5 right-5 z-50 p-2.5 ..."
      onClick={disconnect}
      ...
    >
      <LogOut ... />
    </motion.button>
  )}
</AnimatePresence>
```

**With:**
```typescript
{/* ── Connected pill — session indicator, always top-right when connected ── */}
<AnimatePresence>
  {!!address && !isAnimating && (
    <motion.div
      className="fixed top-4 right-4 z-50"
      initial={{ opacity: 0, scale: 0.9, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -4 }}
      transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
    >
      <ConnectedPill />
    </motion.div>
  )}
</AnimatePresence>
```

Also remove `disconnect` from the `useWalletStore` destructure in App.tsx —
it's no longer needed there directly. The `showLogout` variable can be removed.
Keep all other App.tsx logic exactly as-is.

---

## FILE 3: `src/components/IdentityScreen.tsx` — Full Rewrite

This is Screen 2's "idle" state — what the user sees after connecting, before
they initiate a payment. Currently it's a static layout with avatar, balance,
burn stat, and a Send button. The redesign introduces the recognition ceremony
and replaces the Send button with an invitation to the input.

**The recognition ceremony plays once on first mount, then the settled state
is permanent until disconnect.**

### Recognition Ceremony — Three Beats

Use `useRef` to track whether the ceremony has already played (`hasPlayedRef`).
On first mount: play beats sequentially. On subsequent renders (e.g. returning
from recipient screen): skip ceremony, show settled state immediately.

**Beat 1 — Avatar blooms at center (0–600ms):**
Avatar renders at center of screen, large (~80px). Spring entrance:
scale `0.6` → `1`, opacity `0` → `1`, blur `8px` → `0px` (via CSS filter).
Use `motion.div` with `initial` and `animate`.

**Beat 2 — Name and balance appear (600–1200ms):**
Name (`qnsName.qf`) fades up below avatar, delay `600ms`.
Balance counts up from `0` to actual value over `600ms` using a number
interpolation effect — not just opacity, the digits increment.
Use `useEffect` with a `setInterval` counting up in steps once balance loads.
Format with `formatQF` at each step.

**Beat 3 — Everything contracts to settled state (1200–1800ms):**
After `1200ms`, the avatar, name, and balance animate to their settled positions
using `layoutId` — avatar travels from center-large to top-right (into
`ConnectedPill`). Since `ConnectedPill` is in App.tsx and uses its own avatar,
we simulate this by animating the ceremony avatar to scale down and fade out
toward the top-right corner, while `ConnectedPill` fades in simultaneously.

Practical implementation note: true `layoutId` cross-component animation
between `IdentityScreen` and `ConnectedPill` in App.tsx requires shared
`LayoutGroup` — this adds complexity. Instead: animate the ceremony elements
to fade out toward top-right (`x: '45vw', y: '-35vh'`, opacity `0`), and
have the `ConnectedPill` entrance animation delayed by `1400ms` on first connect
only. The visual effect is the same — identity travels to the corner.

To track "first connect" for the pill delay: use a `sessionStorage` flag
`qfpay-ceremony-played`. Set it after ceremony completes. `ConnectedPill`
checks this on mount — if not set, adds `1400ms` delay to its entrance.

**Settled State:**
After ceremony (or on return visits), show the settled home screen:
- No large center avatar — it lives in `ConnectedPill` top-right
- Center content: the recipient input invitation

### Settled State Layout

```
[ConnectedPill — top-right, App.tsx]


[back chevron — hidden on this screen, this IS home]


         [center vertically]

         ________________________
         [auto-typing input — Clash Display, large]

         [subtle invitation text below — optional]
```

The center is the underline input. The `ConnectedPill` carries the user's
identity. The screen has one question: who are you sending to?

**The underline input — invitation state (no real input yet):**
- This is NOT a real `<input>` element on `IdentityScreen` — it's display only
- It renders the auto-typing placeholder demo (same names as `RecipientScreen`)
- Tapping anywhere on the screen calls `goToRecipient()` — the entire screen
  is the tap target
- The underline: `clamp(200px, 50vw, 360px)` wide, `2px` height,
  `rgba(255,255,255,0.12)` color, centered below the typing text
- The cursor blinks slowly: `600ms on, 400ms off`

**Auto-typing on IdentityScreen:**
Same names and timing as RecipientScreen — reuse the exact same loop logic.
`EXAMPLE_NAMES`, `TYPE_SPEED`, `DELETE_SPEED`, `PAUSE_AFTER_TYPE`,
`PAUSE_AFTER_DELETE` — define as shared constants in a new file
`src/lib/recipientDemoNames.ts` and import in both screens.

```typescript
// src/lib/recipientDemoNames.ts
export const EXAMPLE_NAMES = ['memechi.qf', 'alice.qf', 'spin.qf', 'satoshi.qf', 'dev.qf']
export const TYPE_SPEED = 80
export const DELETE_SPEED = 40
export const PAUSE_AFTER_TYPE = 1500
export const PAUSE_AFTER_DELETE = 300
```

**The no-.qf fork** — when `!qnsName`:
The wallet address blooms to center. Same spring animation as the avatar bloom.
Address in JetBrains Mono, `text-2xl`, white at 70% opacity.
Two lines appear sequentially:
1. `"You don't have a .qf name yet."` — Satoshi Medium, white at 80%, 500ms delay
2. `"Get one at "` + `<a href="https://dotqf.xyz">dotqf.xyz</a>` in sapphire,
   tappable. 11px. 300ms after line 1.

Then the shimmer CTA — same `ShimmerButton` component, label `"Get my .qf name"`,
`onClick` opens `https://dotqf.xyz` in new tab.
No underline input appears. No auto-typing.

### IdentityScreen Implementation

```typescript
// IdentityScreen.tsx
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
```

---

## FILE 4: `src/components/RecipientScreen.tsx` — QDL Treatment

The existing `RecipientScreen.tsx` has correct resolution logic, correct store
integration, and correct auto-typing — all of this is preserved exactly.
Only the visual layer changes.

### What Changes

**1. Back button** — replace the current styled button with the QDL treatment:
```typescript
// Replace existing back button with:
<motion.button
  className="fixed top-5 left-5 z-50 text-white/25 hover:text-white/50 transition-colors"
  style={{ fontSize: '1.5rem', lineHeight: 1 }}
  onClick={(e) => { e.stopPropagation(); hapticLight(); goBackToIdle() }}
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ delay: 0.2 }}
  whileTap={{ scale: 0.9 }}
>
  ‹
</motion.button>
```

**2. Remove the `"Send to"` label** — `<motion.p className="font-satoshi text-white/40 text-sm uppercase tracking-widest mb-6">Send to</motion.p>` — delete this entirely. The auto-typing makes it unnecessary.

**3. The underline** — current implementation uses `motion.div` with `backgroundColor`
animation. Replace with the QDL spec:
- Default: `rgba(255,255,255,0.15)`
- Resolved: run a sapphire wave animation. Use a `::after` pseudo-element via
  inline keyframe — or simpler: animate width from `0%` to `100%` on a sapphire
  overlay div that sits atop the white underline, then fades. Duration: `300ms`.
- Error: `rgba(229,72,77,0.8)` (existing `qfpay-error` color)
- Keep the existing `motion.div` approach, just update the color values and add
  the wave effect on resolution.

**4. The resolved identity display** — current implementation shows avatar + name
below the input. QDL spec: the resolved avatar appears **above** the input, large,
with a pulse ring and breathing animation.

Replace the existing resolved identity block:
```typescript
// Replace the existing resolved section (lines ~140-185) with:
<AnimatePresence>
  {resolved && recipientName && !error && (
    <motion.div
      className="flex flex-col items-center mb-6"
      // This appears ABOVE the input — render it before the input div in JSX
      initial={{ opacity: 0, scale: 0.5, filter: 'blur(8px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
    >
      {/* Avatar — large, above input */}
      <div className="relative mb-3">
        {recipientAvatar ? (
          <img
            src={recipientAvatar}
            alt={recipientName}
            className="w-16 h-16 rounded-full object-cover border border-white/20"
            onLoad={() => setAvatarLoaded(true)}
            style={{ opacity: avatarLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
          />
        ) : (
          <div className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            <span className="font-clash font-bold text-2xl text-white">
              {recipientName[0].toUpperCase()}
            </span>
          </div>
        )}

        {/* Single pulse ring — plays once on mount */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: '1px solid rgba(0,64,255,0.4)' }}
          initial={{ scale: 1, opacity: 0.4 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />

        {/* Continuous breathing */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: '1px solid rgba(0,64,255,0.2)' }}
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Name below avatar */}
      <motion.p
        className="font-satoshi font-medium text-sm"
        style={{ color: 'rgba(255,255,255,0.7)' }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3, ease: EASE_OUT_EXPO }}
      >
        {recipientName}
        <span style={{ color: 'rgba(0,64,255,0.85)' }}>.qf</span>
      </motion.p>
    </motion.div>
  )}
</AnimatePresence>
```

**Move this resolved block to render ABOVE the input div in JSX**, so the avatar
appears above the underline — not below it.

**5. The Continue button** — replace the current glass pill button:
```typescript
// Replace existing continue button with the underline chevron approach:
<AnimatePresence>
  {canContinue && (
    <motion.button
      className="mt-10 flex items-center gap-2 focus-ring"
      style={{ color: 'rgba(255,255,255,0.5)' }}
      onClick={(e) => {
        e.stopPropagation()
        hapticLight()
        goToAmount()
      }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={EASE_SPRING}
      whileHover={{ color: 'rgba(255,255,255,0.9)' }}
      whileTap={{ scale: 0.95 }}
    >
      <span className="font-satoshi font-medium text-base">Continue</span>
      <span style={{ fontSize: '1.2rem' }}>›</span>
    </motion.button>
  )}
</AnimatePresence>
```

**6. Screen entrance animation** — update the outer `motion.div` transition:
```typescript
// Replace existing entrance:
initial={{ opacity: 0, x: 60 }}
animate={{ opacity: 1, x: 0 }}
exit={{ opacity: 0, x: -60 }}
transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}

// With — slide up from below, matching QDL screen transition direction:
initial={{ opacity: 0, y: 40 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -20 }}
transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
```

**Everything else in RecipientScreen.tsx stays exactly as-is** — the hidden
input, the resolution logic, the auto-typing loop, store calls, error handling,
self-send check. Only the visual elements listed above change.

---

## FILE 5: `src/lib/recipientDemoNames.ts` — NEW FILE

```typescript
// src/lib/recipientDemoNames.ts
// Shared constants for the auto-typing demo — used by both
// IdentityScreen (invitation state) and RecipientScreen (active input)

export const EXAMPLE_NAMES = ['memechi.qf', 'alice.qf', 'spin.qf', 'satoshi.qf', 'dev.qf']
export const TYPE_SPEED = 80       // ms per character while typing
export const DELETE_SPEED = 40     // ms per character while deleting
export const PAUSE_AFTER_TYPE = 1500  // ms to hold before deleting
export const PAUSE_AFTER_DELETE = 300 // ms to hold before next name
```

Update `RecipientScreen.tsx` to import from this file instead of re-declaring:
```typescript
// Remove these lines from RecipientScreen.tsx:
const EXAMPLE_NAMES = ['memechi.qf', 'alice.qf', 'spin.qf', 'satoshi.qf', 'dev.qf']
const TYPE_SPEED = 80
const DELETE_SPEED = 40
const PAUSE_AFTER_TYPE = 1500
const PAUSE_AFTER_DELETE = 300

// Replace with:
import { EXAMPLE_NAMES, TYPE_SPEED, DELETE_SPEED, PAUSE_AFTER_TYPE, PAUSE_AFTER_DELETE }
  from '../lib/recipientDemoNames'
```

---

## SUMMARY OF ALL CHANGES

| File | Action |
|------|--------|
| `src/components/ConnectedPill.tsx` | CREATE — new session indicator |
| `src/components/IdentityScreen.tsx` | REWRITE — recognition ceremony + input invitation |
| `src/components/RecipientScreen.tsx` | MODIFY — QDL visual treatment, keep all logic |
| `src/App.tsx` | MODIFY — replace LogOut button with ConnectedPill |
| `src/lib/recipientDemoNames.ts` | CREATE — shared demo name constants |

---

## QUALITY BAR — DEFINITION OF DONE

- [ ] `ConnectedPill` renders top-right on `IdentityScreen`, `RecipientScreen`,
      and `AmountScreen` — not on `DisconnectedView`, not during animation phases
- [ ] Tapping pill body toggles balance reveal — instant character swap, no animation
- [ ] Tapping chevron opens dropdown — copy, disconnect, sound toggle all functional
- [ ] Dropdown closes on outside tap
- [ ] Recognition ceremony plays once per session (sessionStorage flag)
      then shows settled state on all subsequent visits
- [ ] Balance counts up from 0 on first ceremony — not on return visits
- [ ] Ceremony avatar contracts toward top-right and ConnectedPill appears with
      slight delay — visual handoff feels continuous
- [ ] No-.qf fork shows address bloom + invitation + shimmer CTA — no input shown
- [ ] IdentityScreen settled state shows auto-typing demo, tapping screen → RecipientScreen
- [ ] RecipientScreen: resolved avatar appears ABOVE the underline, not below
- [ ] RecipientScreen: pulse ring expands once on avatar mount, then breathing
- [ ] RecipientScreen: everything else on screen dims ~15% when avatar resolved
- [ ] RecipientScreen: back chevron `‹` top-left, 25% opacity
- [ ] RecipientScreen: "Send to" label removed
- [ ] RecipientScreen: Continue button uses `›` chevron style, not glass pill
- [ ] No TypeScript errors — all store field names match source exactly
- [ ] `hapticDouble()` still fires on successful name resolution (already in
      `RecipientScreen` — do not remove)
- [ ] Reduced motion: ceremony skipped, static states shown, no auto-typing

---

*QDL — Quantum Design Language. Interactions are ceremonies, not clicks.*
*Built for QF Network. qfpay.xyz*
