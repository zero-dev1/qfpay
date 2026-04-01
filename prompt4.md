# QFPay — Screen 4 Redesign
## SWE Implementation Prompt

---

## CONTEXT AND CURRENT STATE

`ConfirmScreen.tsx` currently renders:
- A "Confirm Payment" label at top
- Large amount as a hero element
- A sender → recipient card with `ArrowDown` divider
- A burn breakdown table (orange Flame icon, total deducted row)
- A white `onClick` confirm button that changes state: idle → signing → confirmed
- The full blockchain transaction logic in `handleConfirm`

The QDL redesign changes the visual layer only. **Every line of `handleConfirm`
is preserved exactly — both EVM and Substrate paths, error handling, toast
calls, state management.** The button changes from `onClick` to press-and-hold.
The layout changes to the three-row pill design. Nothing else in the logic changes.

---

## WHAT DOES NOT CHANGE — CRITICAL

```typescript
// These imports stay exactly as-is:
import { writeContract } from '../utils/contractCall'
import { QFPAY_ROUTER_ADDRESS, ROUTER_ABI } from '../config/contracts'
import { isRetryableError, RETRY_MESSAGE_SHORT } from '../utils/errorHelpers'
import { showToast } from './Toast'

// The entire handleConfirm function body — untouched:
// - providerType check (evm vs substrate)
// - evmWriteContract and writeContract calls with exact arguments
// - setBroadcasting(), startAnimation(txHash), setConfirmation()
// - All error handling and toast calls
// - buttonState machine: 'idle' | 'signing' | 'confirmed'

// Store destructuring — unchanged:
const { address, ss58Address, qnsName: senderName, avatarUrl: senderAvatar, providerType }
  = useWalletStore()
const {
  phase, recipientName, recipientAddress, recipientAvatar,
  recipientAmountWei, burnAmountWei, totalRequiredWei,
  goBackToAmount, setBroadcasting, startAnimation, setConfirmation, setError,
} = usePaymentStore()
```

---

## STORE REFERENCE

```typescript
// Confirmed field names from paymentStore source:
recipientAmountWei   // what recipient receives — display as primary amount
burnAmountWei        // the burn — crimson display
totalRequiredWei     // leaves sender's wallet — shown in sender pill
phase                // 'preview' | 'broadcasting' — hide back button when broadcasting
```

---

## LAYOUT — THREE ROWS WITH TWO DIVIDERS

Remove the "Confirm Payment" label. Remove the hero amount. Remove the card.
Replace with the QDL three-row layout: sender pill / burn row / recipient pill.

```
[‹ back — hidden during broadcasting]    [no ConnectedPill on this screen]


        [sender pill]
        alice.qf  ·  100.1 QF leaving


        ─────────────────────────────────   divider 1


              🔥  0.1 QF burns forever


        ─────────────────────────────────   divider 2


        [recipient pill]
        memechi.qf  ·  100 QF arriving


              [ Send — press and hold ]
```

**No ConnectedPill on this screen.** This is the one screen where the session
pill is hidden — the user is inside the ceremony. `App.tsx` already conditionally
hides the pill during `isAnimating` phases. For Screen 4 (`preview`/`broadcasting`),
update `App.tsx` to also hide the pill:

```typescript
// In App.tsx, update the isAnimating check:
const isAnimating =
  phase === 'burn' || phase === 'sending' || phase === 'success'
    || phase === 'preview' || phase === 'broadcasting'  // add these two
```

This means `ConnectedPill` disappears when the user enters Screen 4 and
reappears when they return to a previous screen or reach success. The back
chevron is the only navigation element during `preview`. During `broadcasting`
it hides too — consistent with the existing behavior.

---

## THE PILL COMPONENT FOR THIS SCREEN

The sender and recipient rows use a pill form — but not `NamePill` from Screen 1.
This is a wider layout pill specific to Screen 4. Build it inline, not as a
separate component.

**Pill spec:**
- Container: `BG_SURFACE` (`#0C1019`) fill, `1px solid rgba(255,255,255,0.10)`,
  `border-radius: 9999px`, `padding: 10px 16px 10px 10px`
- Avatar: 40px circle — real image if available, fallback gradient initial
- Name: Satoshi Medium, `text-sm`, white at 90%
  `.qf` suffix: `#0040FF` at 85%
- Square separator dot: 4px, `rgba(255,255,255,0.25)`
- Amount + verb: JetBrains Mono, `text-sm`

**Sender pill:**
- Amount text: `formatQF(totalRequiredWei) + " QF"`, white at 70%
- Verb: `"leaving"`, white at 40%
- Full label: `[totalRequired] QF leaving`

**Recipient pill:**
- Amount text: `formatQF(recipientAmountWei) + " QF"`, white at 80%
- Verb: `"arriving"`, white at 40%
- Full label: `[recipientAmount] QF arriving`

---

## THE DIVIDERS

Two thin lines between the three rows:

```typescript
const Divider = () => (
  <div
    className="w-full max-w-sm mx-auto my-5"
    style={{ height: 1, background: 'rgba(255,255,255,0.06)' }}
  />
)
```

---

## THE BURN ROW

Center of the screen. No container. No pill. Just the text, centered.

```typescript
<div className="text-center py-2">
  <span
    className="font-satoshi text-base"
    style={{ color: 'rgba(185,28,28,0.8)' }}  // BURN_CRIMSON at 80%
  >
    🔥 {formatQF(burnAmountWei)} QF burns forever
  </span>
</div>
```

The word `forever` appears here and only here in the entire flow.
It is not used on Screen 3's burn line (`burns`) or Screen 6's epitaph
(`burned forever`). The present tense with `forever` is the commitment register —
this is about to happen and it is permanent.

---

## THE SEND BUTTON — PRESS AND HOLD

This is the most important UI element in the entire app.
The existing `onClick` `handleConfirm` is now triggered by hold completion.

### Visual Spec

- Shape: wide pill, `border-radius: 100px`
- Width: `clamp(200px, 60vw, 320px)`
- Height: `56px`
- Fill: `#0040FF` (BRAND_BLUE) — solid, not gradient
- Label: `"Send"` in Clash Display, `18px`, white, `letter-spacing: -0.02em`
- Shimmer border: rotating conic-gradient, `4s` rotation (same as ShimmerButton
  but slower — this has gravity, not eagerness)
- Heartbeat: scale `1` → `1.02` → `1` on a `2s` loop

### Press-and-Hold Mechanics

Duration: **800ms** hold to fire.

Three haptic beats:
- `hapticLight()` on press start
- `hapticMedium()` at 400ms (halfway)
- `hapticMedium()` at completion (before `handleConfirm` fires)

```typescript
const [holdProgress, setHoldProgress] = useState(0)  // 0–1
const [isHolding, setIsHolding] = useState(false)
const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
const halfwayHapticRef = useRef(false)

const HOLD_DURATION = 800  // ms
const TICK_INTERVAL = 16   // ~60fps

const startHold = () => {
  if (buttonState !== 'idle') return
  setIsHolding(true)
  halfwayHapticRef.current = false
  hapticLight()

  let elapsed = 0
  holdTimerRef.current = setInterval(() => {
    elapsed += TICK_INTERVAL
    const progress = Math.min(elapsed / HOLD_DURATION, 1)
    setHoldProgress(progress)

    // Halfway haptic
    if (progress >= 0.5 && !halfwayHapticRef.current) {
      halfwayHapticRef.current = true
      hapticMedium()
    }

    // Completion
    if (progress >= 1) {
      clearInterval(holdTimerRef.current!)
      holdTimerRef.current = null
      setIsHolding(false)
      setHoldProgress(0)
      hapticMedium()
      handleConfirm()  // ← fires the existing transaction logic
    }
  }, TICK_INTERVAL)
}

const cancelHold = () => {
  if (holdTimerRef.current) {
    clearInterval(holdTimerRef.current)
    holdTimerRef.current = null
  }
  setIsHolding(false)
  setHoldProgress(0)
  halfwayHapticRef.current = false
}

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (holdTimerRef.current) clearInterval(holdTimerRef.current)
  }
}, [])
```

### The Fill Animation

The fill is the progress indicator — the button's own background brightens
radially from the press point. Since we can't easily track press position
on mobile, use a center-origin radial sweep:

```typescript
// The button fill uses a conic-gradient that progressively covers the button:
// At holdProgress 0: base sapphire #0040FF
// At holdProgress 1: fully brightened to #1A56FF

// Implementation — two overlapping divs:
// 1. Base button fill (always visible)
// 2. Progress overlay (clips to holdProgress)

<div
  className="absolute inset-0 rounded-full overflow-hidden"
  style={{ borderRadius: 100 }}
>
  {/* Progress fill — radial sweep */}
  <motion.div
    className="absolute inset-0"
    style={{
      background: 'conic-gradient(#1A56FF 0deg, #1A56FF calc(360deg * var(--progress)), transparent calc(360deg * var(--progress)))',
      '--progress': holdProgress,
    } as React.CSSProperties}
    // Note: CSS custom properties in style — TypeScript needs the cast
  />
</div>
```

Simpler alternative if conic-gradient CSS variable approach has TypeScript issues:
Use a `motion.div` with `scaleX` from `0` to `1` on `transformOrigin: 'left center'`,
with a brightened sapphire fill. Less circular but equally readable as progress:

```typescript
<motion.div
  className="absolute inset-0 rounded-full"
  style={{
    background: '#1A56FF',
    transformOrigin: 'left center',
    scaleX: holdProgress,
  }}
/>
```

Use whichever renders without TypeScript errors — both convey the same
press-and-hold progress. The simpler `scaleX` approach is preferred if
there's any uncertainty.

### Release-Before-Completion Feedback

If the user releases before 800ms:
- `cancelHold()` fires
- `holdProgress` snaps back to `0` — use `transition: { duration: 0.2 }`
- Button does a single gentle pulse: scale `1.02` → `1`
- No toast, no label — the visual rewind is sufficient

```typescript
<motion.div
  animate={
    isHolding ? { scale: 1 }
    : holdProgress === 0 ? { scale: [1, 1.02, 1] }
    : { scale: 1 }
  }
  transition={{ duration: 0.3 }}
>
  {/* button content */}
</motion.div>
```

### First-Visit Teaching Moment

On first arrival at Screen 4 only (check `sessionStorage` key
`qfpay-send-taught`), the button auto-demonstrates itself:
fills to 60% over 600ms, then reverses over 400ms.
No label. The button teaches itself.

```typescript
useEffect(() => {
  const taught = sessionStorage.getItem('qfpay-send-taught')
  if (taught || buttonState !== 'idle') return

  sessionStorage.setItem('qfpay-send-taught', 'true')

  // Auto-demo: fill to 60% then reverse
  let elapsed = 0
  const target = HOLD_DURATION * 0.6
  const up = setInterval(() => {
    elapsed += TICK_INTERVAL
    setHoldProgress(Math.min(elapsed / HOLD_DURATION, 0.6))
    if (elapsed >= target) {
      clearInterval(up)
      // Now reverse
      const down = setInterval(() => {
        setHoldProgress(prev => {
          const next = prev - 0.04
          if (next <= 0) { clearInterval(down); return 0 }
          return next
        })
      }, TICK_INTERVAL)
    }
  }, TICK_INTERVAL)

  return () => clearInterval(up)
}, [])  // empty deps — only on mount
```

### Button During `signing` and `confirmed` States

When `handleConfirm` fires and `buttonState` transitions to `signing`,
the button changes appearance — same as current implementation but in the
new visual form:

```typescript
// signing state: show Loader2 spinner with "Signing..." label
// confirmed state: show checkmark with "Sent" label
// Both use AnimatePresence mode="wait" as in the current implementation

// Keep the existing buttonState machine exactly:
const [buttonState, setButtonState] = useState<'idle' | 'signing' | 'confirmed'>('idle')
// This is set inside handleConfirm — do not change handleConfirm
```

During `signing` and `confirmed` states, disable the press-and-hold
(`if (buttonState !== 'idle') return` at the top of `startHold`).

### Desktop — Click and Hold

On desktop, `onPointerDown` / `onPointerUp` / `onPointerLeave` handles
the same hold behavior. No separate desktop implementation needed —
pointer events work for both mouse and touch.

---

## ASSEMBLY ANIMATION

Screen 4 enters with a scale entrance (keep existing `scale: 0.96 → 1`).
Internal elements assemble sequentially — replace `staggerContainer` /
`staggerChild` with explicit delays:

```typescript
// Sender row: delay 0
// Divider 1: delay 0.1
// Burn row: delay 0.15
// Divider 2: delay 0.2
// Recipient row: delay 0.25
// Send button: delay 0.4 — always last
```

Each element uses:
```typescript
initial={{ opacity: 0, y: 8 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: X, duration: 0.35, ease: EASE_OUT_EXPO }}
```

The Send button rises from below:
```typescript
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: 0.4, duration: 0.4, ease: EASE_OUT_EXPO }}
```

---

## COMPLETE REWRITTEN `ConfirmScreen.tsx`

```typescript
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Check } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useWalletStore } from '../stores/walletStore'
import { usePaymentStore } from '../stores/paymentStore'
import { formatQF } from '../utils/qfpay'
import { writeContract } from '../utils/contractCall'
import { QFPAY_ROUTER_ADDRESS, ROUTER_ABI } from '../config/contracts'
import { isRetryableError, RETRY_MESSAGE_SHORT } from '../utils/errorHelpers'
import { showToast } from './Toast'
import { hapticLight, hapticMedium } from '../utils/haptics'
import { EASE_OUT_EXPO } from '../lib/animations'
import { BG_SURFACE } from '../lib/colors'

export const ConfirmScreen = () => {
  const {
    address, ss58Address,
    qnsName: senderName,
    avatarUrl: senderAvatar,
    providerType,
  } = useWalletStore()

  const {
    phase,
    recipientName, recipientAddress, recipientAvatar,
    recipientAmountWei, burnAmountWei, totalRequiredWei,
    goBackToAmount, setBroadcasting, startAnimation, setConfirmation, setError,
  } = usePaymentStore()

  const [buttonState, setButtonState] = useState<'idle' | 'signing' | 'confirmed'>('idle')
  const [holdProgress, setHoldProgress] = useState(0)
  const [isHolding, setIsHolding] = useState(false)
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const halfwayHapticRef = useRef(false)

  const isBroadcasting = phase === 'broadcasting'
  const HOLD_DURATION = 800
  const TICK_INTERVAL = 16

  // ── handleConfirm — UNCHANGED FROM ORIGINAL ──
  const handleConfirm = async () => {
    if (!recipientAddress || !address) {
      setError('Missing recipient or sender information')
      return
    }
    setButtonState('signing')
    setBroadcasting()
    hapticMedium()
    try {
      let txHash: string
      let confirmation: Promise<{ confirmed: boolean; error?: string }>
      if (providerType === 'evm') {
        const { evmWriteContract } = await import('../utils/evmContractCall')
        const result = await evmWriteContract(
          QFPAY_ROUTER_ADDRESS, ROUTER_ABI, 'send',
          [recipientAddress, recipientAmountWei], totalRequiredWei
        )
        txHash = result.txHash
        confirmation = result.confirmation
      } else {
        const result = await writeContract(
          QFPAY_ROUTER_ADDRESS, ROUTER_ABI, 'send',
          [recipientAddress, recipientAmountWei], null, totalRequiredWei
        )
        txHash = result.txHash
        confirmation = result.confirmation
      }
      setButtonState('confirmed')
      await new Promise((resolve) => setTimeout(resolve, 400))
      startAnimation(txHash)
      const fallbackTimer = setTimeout(() => { setConfirmation(true) }, 3000)
      confirmation.then(({ confirmed, error }) => {
        clearTimeout(fallbackTimer)
        setConfirmation(confirmed, error)
      })
    } catch (err: any) {
      setButtonState('idle')
      const msg = err?.message || 'Transaction failed'
      if (isRetryableError(msg)) {
        showToast('warning', RETRY_MESSAGE_SHORT)
        goBackToAmount()
      } else if (msg.includes('not connected') || msg.includes('reconnect')) {
        showToast('error', 'Wallet connection lost. Please disconnect and reconnect.')
        goBackToAmount()
      } else if (msg.includes('switch MetaMask') || msg.includes('QF Network')) {
        showToast('error', 'Please switch MetaMask to QF Network.')
        goBackToAmount()
      } else {
        showToast('error', msg)
        goBackToAmount()
      }
    }
  }
  // ── END handleConfirm ──

  // Press-and-hold logic
  const startHold = () => {
    if (buttonState !== 'idle') return
    setIsHolding(true)
    halfwayHapticRef.current = false
    hapticLight()
    let elapsed = 0
    holdTimerRef.current = setInterval(() => {
      elapsed += TICK_INTERVAL
      const progress = Math.min(elapsed / HOLD_DURATION, 1)
      setHoldProgress(progress)
      if (progress >= 0.5 && !halfwayHapticRef.current) {
        halfwayHapticRef.current = true
        hapticMedium()
      }
      if (progress >= 1) {
        clearInterval(holdTimerRef.current!)
        holdTimerRef.current = null
        setIsHolding(false)
        setHoldProgress(0)
        hapticMedium()
        handleConfirm()
      }
    }, TICK_INTERVAL)
  }

  const cancelHold = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current)
      holdTimerRef.current = null
    }
    setIsHolding(false)
    setHoldProgress(0)
    halfwayHapticRef.current = false
  }

  useEffect(() => {
    return () => { if (holdTimerRef.current) clearInterval(holdTimerRef.current) }
  }, [])

  // First-visit teaching moment
  useEffect(() => {
    const taught = sessionStorage.getItem('qfpay-send-taught')
    if (taught || buttonState !== 'idle') return
    sessionStorage.setItem('qfpay-send-taught', 'true')
    let elapsed = 0
    const target = HOLD_DURATION * 0.6
    const up = setInterval(() => {
      elapsed += TICK_INTERVAL
      setHoldProgress(Math.min(elapsed / HOLD_DURATION, 0.6))
      if (elapsed >= target) {
        clearInterval(up)
        const down = setInterval(() => {
          setHoldProgress(prev => {
            const next = prev - 0.04
            if (next <= 0) { clearInterval(down); return 0 }
            return next
          })
        }, TICK_INTERVAL)
      }
    }, TICK_INTERVAL)
    return () => clearInterval(up)
  }, [])

  // Pill helper
  const renderPill = (
    avatarUrl: string | null,
    name: string | null,
    fallbackAddress: string | null,
    amountLabel: string,
    verb: string
  ) => {
    const displayName = name || (fallbackAddress
      ? fallbackAddress.slice(0, 8) + '...' + fallbackAddress.slice(-4)
      : '?')
    const initial = name
      ? name[0].toUpperCase()
      : fallbackAddress
        ? fallbackAddress.slice(2, 4).toUpperCase()
        : '?'

    return (
      <div
        className="flex items-center gap-3 w-full max-w-sm mx-auto"
        style={{
          background: BG_SURFACE,
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 9999,
          padding: '10px 16px 10px 10px',
        }}
      >
        {/* Avatar */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            style={{ border: '1px solid rgba(255,255,255,0.15)' }}
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(0,64,255,0.3), rgba(0,64,255,0.1))',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <span className="font-clash font-bold text-sm text-white">{initial}</span>
          </div>
        )}

        {/* Name */}
        <span className="font-satoshi font-medium text-sm flex-shrink-0"
          style={{ color: 'rgba(255,255,255,0.9)' }}>
          {name
            ? <>{name}<span style={{ color: '#0040FF' }}>.qf</span></>
            : displayName}
        </span>

        {/* Separator dot */}
        <div style={{
          width: 4, height: 4, borderRadius: 1,
          background: 'rgba(255,255,255,0.25)',
          flexShrink: 0,
        }} />

        {/* Amount + verb */}
        <span className="font-mono text-sm"
          style={{ color: 'rgba(255,255,255,0.7)' }}>
          {amountLabel}{' '}
          <span style={{ color: 'rgba(255,255,255,0.35)' }}>{verb}</span>
        </span>
      </div>
    )
  }

  const Divider = () => (
    <div className="w-full max-w-sm mx-auto my-5"
      style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
  )

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-6"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
    >
      {/* Back chevron — hidden during broadcasting */}
      <AnimatePresence>
        {!isBroadcasting && (
          <motion.button
            className="fixed top-5 left-5 z-50 text-white/25 hover:text-white/50
                       transition-colors focus-ring"
            style={{ fontSize: '1.5rem', lineHeight: 1 }}
            onClick={() => { hapticLight(); goBackToAmount() }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            whileTap={{ scale: 0.9 }}
          >
            ‹
          </motion.button>
        )}
      </AnimatePresence>

      <div className="w-full">
        {/* Sender row */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0, duration: 0.35, ease: EASE_OUT_EXPO }}
        >
          {renderPill(
            senderAvatar,
            senderName,
            address,
            formatQF(totalRequiredWei) + ' QF',
            'leaving'
          )}
        </motion.div>

        {/* Divider 1 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          <Divider />
        </motion.div>

        {/* Burn row */}
        <motion.div
          className="text-center py-2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35, ease: EASE_OUT_EXPO }}
        >
          <span className="font-satoshi text-base"
            style={{ color: 'rgba(185,28,28,0.8)' }}>
            🔥 {formatQF(burnAmountWei)} QF burns forever
          </span>
        </motion.div>

        {/* Divider 2 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <Divider />
        </motion.div>

        {/* Recipient row */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35, ease: EASE_OUT_EXPO }}
        >
          {renderPill(
            recipientAvatar,
            recipientName,
            recipientAddress,
            formatQF(recipientAmountWei) + ' QF',
            'arriving'
          )}
        </motion.div>

        {/* Send button */}
        <motion.div
          className="flex justify-center mt-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4, ease: EASE_OUT_EXPO }}
        >
          {/* Heartbeat wrapper */}
          <motion.div
            animate={
              buttonState === 'idle' && !isHolding
                ? { scale: [1, 1.02, 1] }
                : { scale: 1 }
            }
            transition={{
              duration: 2,
              repeat: buttonState === 'idle' && !isHolding ? Infinity : 0,
              ease: 'easeInOut',
            }}
          >
            <motion.div
              className="relative overflow-hidden"
              style={{
                width: 'clamp(200px, 60vw, 320px)',
                height: 56,
                borderRadius: 100,
                background: '#0040FF',
                cursor: buttonState === 'idle' ? 'pointer' : 'default',
              }}
              onPointerDown={startHold}
              onPointerUp={cancelHold}
              onPointerLeave={cancelHold}
              whileTap={buttonState === 'idle' ? { scale: 0.98 } : undefined}
            >
              {/* Shimmer border */}
              <div
                className="absolute -inset-[1px] rounded-full overflow-hidden pointer-events-none"
                style={{ borderRadius: 100 }}
              >
                <div
                  className="w-full h-full animate-shimmer-rotate"
                  style={{
                    background: buttonState !== 'idle'
                      ? 'transparent'
                      : 'conic-gradient(from var(--shimmer-angle, 0deg), rgba(0,64,255,0.05) 0%, rgba(100,160,255,0.4) 10%, rgba(0,64,255,0.05) 20%, rgba(0,64,255,0.05) 100%)',
                    animationDuration: '4s',
                  }}
                />
              </div>

              {/* Fill progress */}
              <motion.div
                className="absolute inset-0"
                style={{
                  background: '#1A56FF',
                  transformOrigin: 'left center',
                  borderRadius: 100,
                }}
                animate={{ scaleX: holdProgress }}
                transition={{ duration: 0.05 }}
              />

              {/* Button label */}
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <AnimatePresence mode="wait">
                  {buttonState === 'idle' && (
                    <motion.span
                      key="idle"
                      className="font-clash font-bold text-white"
                      style={{ fontSize: 18, letterSpacing: '-0.02em' }}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                    >
                      Send
                    </motion.span>
                  )}
                  {buttonState === 'signing' && (
                    <motion.span
                      key="signing"
                      className="flex items-center gap-2 text-white font-satoshi font-medium"
                      style={{ fontSize: 15 }}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Signing...
                    </motion.span>
                  )}
                  {buttonState === 'confirmed' && (
                    <motion.span
                      key="confirmed"
                      className="flex items-center gap-2 text-white font-satoshi font-medium"
                      style={{ fontSize: 15 }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                      <Check className="w-4 h-4" />
                      Sent
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  )
}
```

---

## `App.tsx` — ONE LINE CHANGE

Update the `isAnimating` variable to hide `ConnectedPill` during Screen 4:

```typescript
// Find this line in App.tsx:
const isAnimating =
  phase === 'burn' || phase === 'sending' || phase === 'success'

// Replace with:
const isAnimating =
  phase === 'burn' || phase === 'sending' || phase === 'success'
  || phase === 'preview' || phase === 'broadcasting'
```

---

## SUMMARY OF ALL CHANGES

| File | Action |
|------|--------|
| `src/components/ConfirmScreen.tsx` | REWRITE — QDL three-row layout, press-and-hold button |
| `src/App.tsx` | ONE LINE — extend `isAnimating` to include `preview` and `broadcasting` |

---

## QUALITY BAR — DEFINITION OF DONE

- [ ] `handleConfirm` body is byte-for-byte identical to original — no logic changes
- [ ] Both EVM and Substrate transaction paths preserved
- [ ] Press-and-hold: nothing fires until 800ms held
- [ ] Hold progress fill animates left-to-right as user holds
- [ ] Light haptic on press start, medium at 400ms, medium at completion
- [ ] Release before 800ms: fill snaps back to 0, button pulses once
- [ ] First-visit teaching moment plays on first Screen 4 visit only
- [ ] `sessionStorage` key `qfpay-send-taught` prevents re-teaching
- [ ] Shimmer border rotates on the Send button at 4s cycle
- [ ] Heartbeat pulse: scale 1→1.02→1 on 2s loop when idle and not holding
- [ ] Heartbeat stops when holding or signing
- [ ] `signing` state: Loader2 spinner + "Signing..." label
- [ ] `confirmed` state: Check icon + "Sent" label
- [ ] Sender pill: `totalRequiredWei` formatted + "leaving" verb
- [ ] Recipient pill: `recipientAmountWei` formatted + "arriving" verb
- [ ] Burn row: `burnAmountWei` formatted + "burns forever" in crimson
- [ ] `forever` appears ONLY in the burn row — not "burns" (Screen 3) or "burned forever" (Screen 6)
- [ ] Two dividers visible between the three rows
- [ ] `ConnectedPill` hidden on Screen 4 — `App.tsx` change applied
- [ ] Back chevron `‹` top-left, hidden during `broadcasting`
- [ ] No `ArrowLeft`, `ArrowDown`, `Flame` Lucide imports remaining
- [ ] `staggerContainer`, `staggerChild` imports removed — replaced with explicit delays
- [ ] No TypeScript errors — pointer event handlers typed correctly
- [ ] Pointer events work on both touch (mobile) and mouse (desktop)
- [ ] `useEffect` cleanup cancels hold timer on unmount

---

*QDL — Quantum Design Language. Interactions are ceremonies, not clicks.*
*Built for QF Network. qfpay.xyz*
