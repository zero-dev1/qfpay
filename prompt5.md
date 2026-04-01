# QFPay — Screens 5 and 6 Redesign
## SWE Implementation Prompt

---

## CONTEXT AND CURRENT STATE

`AnimationSequence.tsx` currently handles three phases in one component:
- `burn` — crimson overlay, ember particles, dissolving amount
- `sending` — horizontal sender → amount badge → recipient layout
- `success` — checkmark with ring, summary, "Send Another" button

The QDL redesign replaces all three phases with a new vertical architecture.
Screens 5 and 6 are still handled by `AnimationSequence.tsx` — the component
is a full rewrite, not a new file. The phase machine in `paymentStore` is
unchanged: `burn` → `sending` → `success`, with `advanceToSending` and
`advanceToSuccess` as the triggers.

**What changes:** Everything visual. The layout, the animation sequence,
the background color ceremony, the burn treatment.

**What does not change:**
- `paymentStore.ts` — phase machine, `advanceToSending`, `advanceToSuccess`, `reset`
- `walletStore.ts` — sender identity fields
- `utils/sounds.ts` — sound functions (already guarded in Screen 3 prompt)
- `utils/haptics.ts` — haptic functions
- `EmberParticles.tsx` — keep the file, it is no longer imported by
  `AnimationSequence` but do not delete it (may be used elsewhere or in future)
- `config/contracts.ts` — no changes

---

## PHASE MACHINE — CONFIRMED TIMING

```typescript
// From AnimationSequence source — preserve these exact durations:
// burn phase:    1800ms → advanceToSending
// sending phase: 2200ms → advanceToSuccess
// success phase: no auto-advance — user taps "Send Again" or "Done" → reset()

// Reduced motion variants:
// burn:    400ms
// sending: 400ms
```

The new Screen 5 maps to `burn` + `sending` phases combined.
The new Screen 6 maps to the `success` phase.

The phase timing does not change. `burn` runs its 1800ms, then `sending`
runs its 2200ms. Screen 5's total cinematic duration is therefore 4000ms —
split across both phases. The animation is designed around this constraint.

---

## STORE INTERFACE — CONFIRMED FIELD NAMES

```typescript
// From AnimationSequence source:
const {
  phase,                  // 'burn' | 'sending' | 'success'
  recipientAmountWei,     // what recipient receives
  burnAmountWei,          // the burn amount
  recipientName,          // string | null
  recipientAddress,       // string | null
  recipientAvatar,        // string | null
  confirmed,              // boolean | null — on-chain confirmation status
  advanceToSending,       // () => void
  advanceToSuccess,       // () => void
  reset,                  // () => void — resets everything, goes to idle
} = usePaymentStore()

const { qnsName: senderName, avatarUrl: senderAvatar } = useWalletStore()

// Derived — totalRequired is not in paymentStore directly for AnimationSequence
// Compute it from the stored values:
// totalRequiredWei = recipientAmountWei + burnAmountWei
// (these are the correct values — calculateBurn stores them in setAmount)
```

Note: `AnimationSequence` does not import `totalRequiredWei` from the store
because it was added to paymentStore for ConfirmScreen. However for Screen 5's
countdown we need the departure amount. Compute it:

```typescript
const departureAmountWei = recipientAmountWei + burnAmountWei
// This equals totalRequiredWei — the amount that left the sender's wallet
```

---

## SCREEN 5 — THE TRANSFER
### Phase: `burn` (1800ms) + `sending` (2200ms)

Screen 5 is one continuous visual experience across two store phases.
The phase boundary (`burn` → `sending`) is where the burn completes
and the send trail begins. The user sees no hard cut — it flows.

### Layout — Vertical on All Screen Sizes

```
[sender pill — 15% from top, centered]

        |
        | (trail — vertical SVG line)
        |

[amount — center of screen, large]

        |
        | (trail — vertical SVG line)
        |

[recipient pill — 15% from bottom, centered]
```

All three elements share the same horizontal center axis.
The trail is a single SVG line running the full height between pills.
The amount sits at the intersection of the two trail segments.

### Background Color Ceremony

This is the most significant visual change — the background `#060A14`
breaks twice, intentionally.

```typescript
// Background transitions:
// Screen opens:      #060A14 (inherited from ConfirmScreen)
// Burn phase begins: shift to #0F0608 (deep crimson void) over 300ms
// Burn completes:    shift back to #060A14 over 400ms
// Sending phase:     #060A14 (restored)
// Checkmark holds:   radial bloom from center, #0040FF fills viewport over 400ms
// Screen 6 opens:    already #0040FF (inherited)

// Implementation — animate the root div's background:
const bgColor = (() => {
  if (phase === 'burn') return '#0F0608'
  if (phase === 'sending') return '#060A14'
  if (phase === 'success') return '#0040FF'
  return '#060A14'
})()
```

For the `success` transition specifically, use a radial bloom rather than
a flat color switch. This is handled by an absolutely positioned expanding
circle element that covers the viewport as `success` begins:

```typescript
// Sapphire radial bloom — mounts when phase transitions to 'success'
// Starts as a small circle at center, expands to cover full viewport
<AnimatePresence>
  {phase === 'success' && (
    <motion.div
      className="fixed inset-0 z-0 pointer-events-none"
      style={{
        background: 'radial-gradient(circle at 50% 50%, #0040FF 0%, #0040FF 100%)',
        borderRadius: '50%',
      }}
      initial={{ scale: 0, opacity: 1 }}
      animate={{ scale: 4, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    />
  )}
</AnimatePresence>
```

### The Name Pills — Reuse NamePill Component

Use the existing `NamePill` component from `src/components/NamePill.tsx`.
It already supports `state` prop with `'default'`, `'dimmed'`, `'arriving'`.

```typescript
import { NamePill } from './NamePill'

// Sender pill state:
// burn phase: 'default' initially, then 'dimmed' after Act 1 charge
// sending phase: 'dimmed' (sender's job is done)

// Recipient pill state:
// burn phase: 'default'
// sending phase: 'default' until amount arrives, then 'arriving'
```

Pass real avatar URLs if available — `NamePill` accepts `avatarUrl` prop
(added in Screen 1 prompt). If `senderAvatar` or `recipientAvatar` is null,
the gradient fallback renders automatically.

```typescript
// Sender identity for NamePill:
const senderColor = 'linear-gradient(135deg, #3B82F6, #4F46E5)' // fallback

// Recipient color — derive from first letter for consistency:
const recipientColors: Record<string, string> = {
  a: 'linear-gradient(135deg, #3B82F6, #4F46E5)',
  b: 'linear-gradient(135deg, #06B6D4, #0284C7)',
  c: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
  d: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
  m: 'linear-gradient(135deg, #EC4899, #BE185D)',
  s: 'linear-gradient(135deg, #F97316, #EA580C)',
  // fallback for any other letter:
}
const recipientColor = recipientName
  ? recipientColors[recipientName[0].toLowerCase()] ||
    'linear-gradient(135deg, #10B981, #0D9488)'
  : 'linear-gradient(135deg, #10B981, #0D9488)'
```

### The Vertical Trail SVG

A single `<svg>` element covering the full space between sender pill and
recipient pill. Contains one `<line>` element.

```typescript
// The trail renders at full height between the pills
// It is drawn progressively via stroke-dashoffset animation:

<svg
  className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
  style={{ top: '15%', bottom: '15%', width: 2, height: '70%' }}
>
  <motion.line
    x1="1" y1="0%" x2="1" y2="100%"
    stroke="rgba(0,64,255,0.25)"
    strokeWidth="1.5"
    strokeDasharray="4 4"
    initial={{ pathLength: 0, opacity: 0 }}
    animate={{ pathLength: 1, opacity: phase !== 'idle' ? 1 : 0 }}
    transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
  />
</svg>
```

The trail stays visible throughout Screen 5. During the success transition
it fades out as the sapphire bloom covers everything.

### The Amount Element — Center Stage

Large Clash Display. This is the centerpiece of Screen 5.

```typescript
// Amount starts as departureAmountWei (what left sender's wallet)
// During burn phase: counts DOWN to recipientAmountWei
// After burn: shows recipientAmountWei cleanly
// During sending: travels toward recipient (y animation)
// On arrival: replaced by checkmark

const [displayAmount, setDisplayAmount] = useState(
  Number(departureAmountWei) / 1e18
)
const [amountColor, setAmountColor] = useState<'white' | 'amber' | 'white-clean'>('white')
```

### THE FOUR ACTS — Timing Map

```
BURN PHASE (0–1800ms total):
  Act 1 — Charge    (0–600ms)
  Act 2 — Burn      (600–1100ms)
  [burn phase ends at 1800ms → advanceToSending fires]

SENDING PHASE (0–2200ms from phase start):
  Act 3 — Send      (0–800ms of sending phase)
  Act 4 — Resolution (800–2200ms of sending phase → advanceToSuccess fires]
```

---

### ACT 1 — THE CHARGE (burn phase, 0–600ms)

**What happens:**
- Both pills fade in with staggered entrance
- Trail draws downward from sender pill to amount
- Amount materializes at center — scale from `0.7` to `1`, blur `8px` to `0`
- Amount shows `departureAmountWei` (e.g. `100.1 QF`) in white
- Letter-spacing compresses from `0.06em` to `-0.02em` over 600ms
- Sender pill pulses twice — brief sapphire border brightening
- Background: `#060A14` still (crimson hasn't hit yet)

```typescript
// Trail draws from top (sender) to center (amount):
// Use two separate SVG line segments — top half and bottom half
// Top half draws during Act 1
// Bottom half draws during Act 3

// Amount entrance:
initial={{ scale: 0.7, opacity: 0, filter: 'blur(8px)' }}
animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
```

**Sound:** None in Act 1.

---

### ACT 2 — THE BURN (burn phase, 600–1800ms)

**What happens:**
- Background shifts from `#060A14` to `#0F0608` over 300ms
- Amount color shifts from white to amber `#F59E0B` over 150ms
- Amount COUNTS DOWN from `departureAmountWei` to `recipientAmountWei`
  - Countdown uses `easeOut` — fast at first, decelerating
  - Duration: 700ms (from 700ms mark to 1400ms mark within burn phase)
  - Interpolate the floating point values: start=`Number(departureAmountWei)/1e18`,
    end=`Number(recipientAmountWei)/1e18`
  - Display using `formatQF` on the current interpolated bigint value
- Amount holds on `recipientAmountWei` in amber for 200ms
- Background shifts back from `#0F0608` to `#060A14` over 400ms
- Amount color shifts from amber back to white over 300ms
- Sender pill state → `'dimmed'` (sender's role is complete)
- Top trail segment fades out

**Sound:** `playBurnSound()` at 600ms mark (start of Act 2)
**Haptic:** `hapticBurn()` at 600ms mark

**Countdown implementation:**

```typescript
// In a useEffect that watches phase === 'burn':
useEffect(() => {
  if (phase !== 'burn') return

  const COUNTDOWN_START = 600   // ms after burn phase begins
  const COUNTDOWN_DURATION = 700 // ms

  const startTimer = setTimeout(() => {
    const startValue = Number(departureAmountWei) / 1e18
    const endValue = Number(recipientAmountWei) / 1e18
    const difference = startValue - endValue

    const startTime = performance.now()

    const tick = () => {
      const elapsed = performance.now() - startTime
      const progress = Math.min(elapsed / COUNTDOWN_DURATION, 1)
      // easeOut — t * (2 - t)
      const eased = progress * (2 - progress)
      const current = startValue - (difference * eased)
      setDisplayAmount(current)

      if (progress < 1) {
        requestAnimationFrame(tick)
      } else {
        setDisplayAmount(endValue) // snap to exact value
      }
    }

    requestAnimationFrame(tick)
  }, COUNTDOWN_START)

  return () => clearTimeout(startTimer)
}, [phase])
```

---

### ACT 3 — THE SEND (sending phase, 0–800ms)

**What happens:**
- Background: `#060A14` (restored)
- Amount: white, shows `recipientAmountWei`, begins traveling downward
  toward recipient pill via `y` animation
- Amount moves from center (`y: 0`) toward recipient (`y: ~35vh`)
  using `easeOut` easing — fast departure, gentle arrival
- Trail bottom half draws from center down to recipient pill — single pulse,
  then second pulse, then holds lit
- Recipient pill brightens on second pulse: border shifts to sapphire at
  higher opacity
- Sound: `playSendSound()` at start of sending phase
- Haptic: `hapticImpact()` delayed 700ms (when amount "arrives")

```typescript
// Amount travel animation — triggers when phase becomes 'sending':
<motion.div
  animate={{
    y: phase === 'sending' ? '35vh' : 0,
    opacity: phase === 'sending' ? [1, 1, 0] : 1,
  }}
  transition={{
    y: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] },
    opacity: { duration: 0.8, times: [0, 0.6, 1] },
  }}
>
  {/* amount display */}
</motion.div>
```

---

### ACT 4 — THE RESOLUTION (sending phase, 800–2200ms)

**What happens:**
- Amount fades out (already animated in Act 3)
- Recipient pill state → `'arriving'` (green border, glow, pulse ring)
- `hapticImpact()` fires
- SVG checkmark draws at center — same position amount was
  - Emerald stroke `rgba(34,197,94,0.9)`, path length animation 350ms
- Checkmark holds for 300ms
- Everything dissolves except checkmark:
  - Both pills fade to opacity 0 over 300ms
  - Trail fades to opacity 0
- Checkmark remains alone for 200ms
- Sapphire radial bloom begins from checkmark position
- `advanceToSuccess` fires at 2200ms → Screen 6 assembles around checkmark

**Sound:** `playSuccessSound()` fires at the moment `advanceToSuccess` triggers
(handled in the existing `useEffect` that watches `phase === 'success'`)

```typescript
// Checkmark SVG — appears at center when amount has traveled away
<AnimatePresence>
  {showCheckmark && (
    <motion.div
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
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
```

**State flags to track within Screen 5:**

```typescript
const [senderDimmed, setSenderDimmed] = useState(false)
const [showCheckmark, setShowCheckmark] = useState(false)
const [pillsVisible, setPillsVisible] = useState(true)
const [trailVisible, setTrailVisible] = useState(false)
const [recipientArriving, setRecipientArriving] = useState(false)
const [displayAmount, setDisplayAmount] = useState(
  Number(departureAmountWei) / 1e18
)
const [amountColor, setAmountColor] = useState<string>('white')
```

**Timing effects — coordinate all state flags:**

```typescript
// On phase === 'burn':
useEffect(() => {
  if (phase !== 'burn') return
  if (reducedMotion) {
    setTimeout(advanceToSending, 400)
    return
  }

  playBurnSound()
  hapticBurn()

  const timers = [
    // Act 1: trail draws, amount appears (handled by animation, no state needed)
    setTimeout(() => setTrailVisible(true), 100),

    // Act 2: burn begins
    setTimeout(() => setAmountColor('#F59E0B'), 600),
    // [countdown useEffect handles displayAmount interpolation]

    // Act 2: sender dims after burn
    setTimeout(() => setSenderDimmed(true), 1100),

    // Act 2: color returns to white
    setTimeout(() => setAmountColor('white'), 1400),

    // Auto-advance
    setTimeout(advanceToSending, 1800),
  ]
  return () => timers.forEach(clearTimeout)
}, [phase])

// On phase === 'sending':
useEffect(() => {
  if (phase !== 'sending') return
  if (reducedMotion) {
    setTimeout(advanceToSuccess, 400)
    return
  }

  playSendSound()

  const timers = [
    // Act 3: amount travels (animation handles it via phase prop)
    // Act 4: show checkmark after amount has traveled
    setTimeout(() => setShowCheckmark(true), 800),
    setTimeout(() => setRecipientArriving(true), 800),
    setTimeout(() => hapticImpact(), 700),

    // Act 4: pills and trail dissolve
    setTimeout(() => setPillsVisible(false), 1100),

    // Auto-advance — playSuccessSound handled in success phase useEffect
    setTimeout(advanceToSuccess, 2200),
  ]
  return () => timers.forEach(clearTimeout)
}, [phase])

// On phase === 'success': (sound only — visuals handled in Screen 6)
useEffect(() => {
  if (phase !== 'success') return
  playSuccessSound()
  hapticSuccess()
}, [phase])
```

---

## SCREEN 6 — SUCCESS AND RECEIPT
### Phase: `success`

Screen 6 opens already in the sapphire world (`#0040FF`). The checkmark is
already present via the radial bloom transition. Screen 6 assembles around it.

### Opening State

Background: `#0040FF` — inherited from the radial bloom.
The background slowly cools to `#080D1A` over 1500ms.
The checkmark is already rendered — it persists via the same element
(no `layoutId` needed — it's in the same component, same DOM element).

```typescript
// Background cooling — animate on success phase:
<motion.div
  className="fixed inset-0 z-0 pointer-events-none"
  animate={{
    backgroundColor: phase === 'success' ? '#080D1A' : 'transparent'
  }}
  initial={{ backgroundColor: 'transparent' }}
  transition={{ duration: 1.5, ease: 'easeOut', delay: 0.8 }}
/>
```

### Assembly Sequence

**800ms of stillness.** Only the checkmark visible. The sapphire world.
Then elements assemble in order:

1. **Burn epitaph** (400ms fade, after 800ms delay):
   ```
   🔥 0.1 QF burned forever
   ```
   Crimson `rgba(185,28,28,0.8)`. Centered below checkmark. Satoshi Medium, `16px`.
   Holds alone for 600ms before the receipt card appears.
   The word `forever` here is past tense and final — `burned` not `burns`.

2. **Receipt card slides up** (spring, after 1400ms delay):
   Clear glass — `rgba(255,255,255,0.06)` fill, `1px solid rgba(255,255,255,0.10)`,
   `border-radius: 20px`. Settles in the lower portion of the screen.

   **Inside the receipt card:**
   ```
   [sender pill — compact]  →  [recipient pill — compact]
          [amount] QF · 🔥 [burn] burned
          [timestamp]    [share icon ↗]
   ```

   The `→` arrow between pills is a static sapphire line — `1px`,
   `rgba(0,64,255,0.4)`. Frozen record of the transfer path.

   Timestamp: `new Date().toLocaleTimeString()` in JetBrains Mono, `10px`,
   white at 30% opacity.

   Share icon: top-right corner of card, white at 35% opacity.
   On tap: uses `navigator.share` if available, otherwise copies a formatted
   string to clipboard:
   ```typescript
   const shareText = `Sent ${formatQF(recipientAmountWei)} QF to ${
     recipientName ? recipientName + '.qf' : recipientAddress?.slice(0,8) + '...'
   } · ${formatQF(burnAmountWei)} QF burned forever · qfpay.xyz`
   ```

3. **Action buttons** (fade in together, after card settles, ~2000ms delay):
   - `"Send again"` — shimmer pill button, smaller than Connect Wallet
     `onClick`: `reset()` — resets paymentStore, navigates back to idle
   - `"Done"` — plain text below, Satoshi `14px`, white at 50% opacity
     `onClick`: `reset()` — same destination, different emotional register

4. **On-chain confirmation status** (inherited from existing implementation):
   The pulsing dot + "Confirming..." / "Confirmed on-chain" text.
   Keep exactly as-is from the original `AnimationSequence`.

### Reduced Motion — Success State

Static layout: checkmark visible, burn epitaph visible, card visible,
buttons visible. No assembly animation. Instant.

---

## COMPLETE REWRITTEN `AnimationSequence.tsx`

```typescript
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
```

---

## SUMMARY OF ALL CHANGES

| File | Action |
|------|--------|
| `src/components/AnimationSequence.tsx` | REWRITE — vertical Screen 5, receipt Screen 6 |
| `src/components/EmberParticles.tsx` | KEEP — no longer imported but do not delete |

---

## QUALITY BAR — DEFINITION OF DONE

- [ ] Background shifts to `#0F0608` at burn phase start — noticeable crimson tint
- [ ] Background returns to `#060A14` after burn completes
- [ ] Background blooms to `#0040FF` at success — radial or flat, clearly blue
- [ ] Amount displays `departureAmountWei` on entry (e.g. `100.1 QF` not `100 QF`)
- [ ] Amount color shifts amber during countdown, returns white after
- [ ] Amount counts DOWN — not up — from departure to received value
- [ ] Countdown uses `easeOut` — fast then decelerating
- [ ] Sender pill dims after burn completes
- [ ] Amount travels downward (y) during sending phase
- [ ] Checkmark appears at center after amount travels away
- [ ] Recipient pill state shifts to `'arriving'` when checkmark appears
- [ ] Pills fade out after checkmark appears
- [ ] `playBurnSound()` fires at burn phase start
- [ ] `playSendSound()` fires at sending phase start
- [ ] `playSuccessSound()` fires at success phase start
- [ ] All three sounds respect `isSoundEnabled()` guard (added in Screen 3 prompt)
- [ ] `hapticBurn()` fires at burn phase start
- [ ] `hapticImpact()` fires at 700ms into sending phase
- [ ] `hapticSuccess()` fires at success phase start
- [ ] Screen 6: checkmark visible on success entry
- [ ] Burn epitaph appears after 800ms: `"🔥 X QF burned forever"` in crimson
- [ ] `burned` not `burns` — past tense on Screen 6
- [ ] `forever` present — matches Screen 4's `burns forever` in commitment vs record registers
- [ ] Receipt card slides up after 1400ms delay
- [ ] Receipt card shows: sender, recipient, amount, burn amount, timestamp, share icon
- [ ] Share icon: `navigator.share` if available, otherwise clipboard copy
- [ ] "Send again" and "Done" buttons both call `reset()` correctly
- [ ] On-chain confirmation status preserved — pulsing dot behavior intact
- [ ] Background cooling: `#0040FF` → `#080D1A` over 1500ms on Screen 6
- [ ] Reduced motion: static success state renders correctly, no blank screen
- [ ] `advanceToSending` called at exactly 1800ms (reducedMotion: 400ms)
- [ ] `advanceToSuccess` called at exactly 2200ms (reducedMotion: 400ms)
- [ ] No `EmberParticles` import in the new file
- [ ] `NamePill` imported from `./NamePill` — uses updated component from Screen 1 prompt
- [ ] `ShimmerButton` imported from `./hero/ShimmerButton` — exact path
- [ ] TypeScript: `BigInt(Math.round(displayAmount * 1e18))` — handles float→bigint correctly
- [ ] No leftover imports: `EmberParticles`, `ArrowDown` removed

---

*QDL — Quantum Design Language. Interactions are ceremonies, not clicks.*
*Built for QF Network. qfpay.xyz*
