# QFPay — Screen 3 Redesign
## SWE Implementation Prompt

---

## CONTEXT AND CURRENT STATE

`AmountScreen.tsx` currently renders:
- A standard OS text input for amount entry (`inputMode="decimal"`)
- Quick-amount pills (10, 50, 100, 500)
- Balance display and a burn calculation line with a Flame icon
- An insufficient balance error card
- A glass pill "Review" continue button
- Standard `ArrowLeft` back button

The QDL redesign replaces this with:
- Recipient presence at top (avatar travels via `layoutId` from RecipientScreen)
- Large Clash Display amount input above a sapphire underline
- A custom QFPay keyboard — part of the brand surface, no OS keyboard ever
- A live burn line in the QDL format with crimson ember
- Balance display that brightens as limit approaches
- MAX key built into the keyboard bottom row
- The `›` chevron continue trigger

**All existing calculation logic is preserved exactly.** Only the visual layer changes.

---

## WHAT DOES NOT CHANGE

- `paymentStore.ts` — no changes
- `walletStore.ts` — no changes
- `utils/qfpay.ts` — `calculateBurn`, `getQFBalance`, `formatQF` used as-is
- `utils/parseAmount.ts` — `parseQFAmount`, `isValidAmountInput` used as-is
- `config/contracts.ts` — `GAS_BUFFER` used as-is
- All other screen components
- `tailwind.config.js`, `lib/animations.ts`, `lib/colors.ts`

---

## UTILITY REFERENCE — EXACT SIGNATURES

```typescript
// Already imported in AmountScreen — keep all imports:
import { getQFBalance, formatQF, calculateBurn } from '../utils/qfpay'
import { parseQFAmount, isValidAmountInput } from '../utils/parseAmount'
import { GAS_BUFFER } from '../config/contracts'

// calculateBurn signature (confirmed from source):
calculateBurn(intendedAmount: bigint): {
  burnAmount: bigint        // 0.1% of intendedAmount
  recipientAmount: bigint   // equals intendedAmount — recipient gets exactly this
  totalRequired: bigint     // intendedAmount + burnAmount — leaves sender's wallet
}

// formatQF handles all precision cases including large numbers — use for all display
formatQF(wei: bigint): string

// isValidAmountInput — use to validate each key press from custom keyboard
isValidAmountInput(value: string): boolean
```

---

## BURN LINE FORMAT — CRITICAL

The burn line must use these exact calculated values:

```
[totalRequired formatted] QF leaves your wallet  ·  🔥 [burnAmount formatted] burns
```

Example: user types `100`
- `burnAmount` = `parseQFAmount("100") * 10 / 10000` = `0.1 QF`
- `totalRequired` = `100.1 QF`
- Display: `"100.1 QF leaves your wallet · 🔥 0.1 burns"`

Use `formatQF` on both `burnAmount` and `totalRequired` for correct precision
at all scales. Never hardcode `0.1` — always compute from `calculateBurn`.

---

## SOUNDS — ADD GUARD TO `src/utils/sounds.ts`

Add a sound-enabled check at the top of each exported function.
This respects the toggle set by `ConnectedPill`:

```typescript
// Add this helper at the top of sounds.ts, before the exported functions:
function isSoundEnabled(): boolean {
  return localStorage.getItem('qfpay-sound-enabled') !== 'false'
}

// Then guard each function:
export function playBurnSound(): void {
  if (!isSoundEnabled()) return
  // ... existing implementation unchanged
}

export function playSendSound(): void {
  if (!isSoundEnabled()) return
  // ... existing implementation unchanged
}

export function playSuccessSound(): void {
  if (!isSoundEnabled()) return
  // ... existing implementation unchanged
}
```

**This is the only change to `sounds.ts`.** The implementations are untouched.

---

## FILE: `src/components/AmountScreen.tsx` — Full Rewrite

### Store and Utility Imports (unchanged from current)

```typescript
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { usePaymentStore } from '../stores/paymentStore'
import { useWalletStore } from '../stores/walletStore'
import { getQFBalance, formatQF, calculateBurn } from '../utils/qfpay'
import { parseQFAmount, isValidAmountInput } from '../utils/parseAmount'
import { GAS_BUFFER } from '../config/contracts'
import { hapticLight, hapticMedium } from '../utils/haptics'
import { EASE_OUT_EXPO, EASE_SPRING } from '../lib/animations'
import { BRAND_BLUE, BG_SURFACE, BURN_CRIMSON } from '../lib/colors'
import { useReducedMotion } from '../hooks/useReducedMotion'
```

### Calculation Logic (preserve exactly — no changes)

```typescript
const amountWei = amountInput ? parseQFAmount(amountInput) : 0n
const { burnAmount, recipientAmount, totalRequired } = calculateBurn(amountWei)
const insufficientBalance = amountWei > 0n && totalRequired + GAS_BUFFER > balance
const canContinue = amountWei > 0n && !insufficientBalance && recipientAddress

// Max sendable amount — balance minus gas buffer, then minus burn
// Solve: amount + (amount * 10 / 10000) + GAS_BUFFER <= balance
// amount * (10010 / 10000) <= balance - GAS_BUFFER
// amount <= (balance - GAS_BUFFER) * 10000 / 10010
const maxSendableWei = balance > GAS_BUFFER
  ? ((balance - GAS_BUFFER) * 10000n) / 10010n
  : 0n
```

### Layout Structure

```
[‹ back — top left]            [ConnectedPill — App.tsx, top right]

        [recipient presence — top center, 48px avatar]
              name.qf

        [balance line — quiet, brightens near limit]    [MAX key in keyboard]

        ________________________  ← amount display + underline

        [burn line]

        [› continue — appears when valid amount]

══════════════════════════════════════
        [custom keyboard — fixed bottom]
══════════════════════════════════════
```

### Screen Entrance Animation

Replace current horizontal slide with vertical rise — consistent with
Screen 2's RecipientScreen exit:

```typescript
// Outer motion.div:
initial={{ opacity: 0, y: 40 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -20 }}
transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
```

### Back Button — QDL Treatment

Replace `ArrowLeft` icon button with the bare chevron:

```typescript
<motion.button
  className="fixed top-5 left-5 z-50 text-white/25 hover:text-white/50
             transition-colors focus-ring"
  style={{ fontSize: '1.5rem', lineHeight: 1 }}
  onClick={() => { hapticLight(); goBackToRecipient() }}
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ delay: 0.15 }}
  whileTap={{ scale: 0.9 }}
>
  ‹
</motion.button>
```

### Recipient Presence — Top Center

The recipient avatar travels from RecipientScreen's resolved state via `layoutId`.
Use `layoutId="recipient-avatar"` — same ID must be used in `RecipientScreen.tsx`
on the resolved avatar element (add this `layoutId` to RecipientScreen's avatar).

```typescript
<motion.div
  className="flex flex-col items-center mb-6 mt-16"
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
>
  {/* Avatar with layoutId for shared element transition */}
  <motion.div layoutId="recipient-avatar" className="mb-2">
    {recipientAvatar ? (
      <img
        src={recipientAvatar}
        alt={recipientName || ''}
        className="w-12 h-12 rounded-full object-cover"
        style={{ border: '1px solid rgba(255,255,255,0.15)' }}
      />
    ) : (
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <span className="font-clash font-bold text-lg text-white">
          {(recipientName || '?')[0].toUpperCase()}
        </span>
      </div>
    )}
  </motion.div>

  {/* Name */}
  <p className="font-satoshi font-medium text-sm"
    style={{ color: 'rgba(255,255,255,0.6)' }}>
    {recipientName
      ? <>{recipientName}<span style={{ color: '#0040FF' }}>.qf</span></>
      : truncateAddress(recipientAddress || '')}
  </p>
</motion.div>
```

Add `import { truncateAddress } from '../utils/qfpay'` — already in qfpay.ts.

### Balance Line — Brightens Near Limit

```typescript
// Calculate opacity based on how close amount is to balance
const balanceProximity = amountWei > 0n && balance > 0n
  ? Number(totalRequired * 100n / balance) / 100  // 0–1 ratio
  : 0
const balanceOpacity = balanceProximity > 0.9
  ? 1
  : balanceProximity > 0.7
    ? 0.5 + (balanceProximity - 0.7) * 2.5
    : 0.25

// Render:
<motion.div
  className="flex items-center justify-center mb-4"
  animate={{ opacity: balanceOpacity }}
  transition={{ duration: 0.3 }}
>
  <span className="font-mono text-xs"
    style={{ color: insufficientBalance ? '#E5484D' : 'rgba(255,255,255,0.6)' }}>
    {formatQF(balance)} QF available
  </span>
</motion.div>
```

### Amount Display — Large Clash Display Above Underline

Remove the OS `<input>` element entirely. Replace with a display-only div
and a hidden input that receives keyboard output from the custom keyboard.

```typescript
{/* Hidden input — receives value from custom keyboard, NOT from OS keyboard */}
{/* inputMode="none" prevents OS keyboard from appearing on mobile */}
<input
  ref={inputRef}
  type="text"
  inputMode="none"
  value={amountInput}
  readOnly
  className="absolute opacity-0 pointer-events-none w-0 h-0"
  aria-hidden="true"
/>

{/* Amount display */}
<div className="flex items-baseline justify-center gap-2 mb-3">
  <span
    className="font-clash font-bold text-center transition-all"
    style={{
      fontSize: 'clamp(3rem, 10vw, 6rem)',
      color: insufficientBalance
        ? '#E5484D'
        : amountInput
          ? 'white'
          : 'rgba(255,255,255,0.2)',
      letterSpacing: '-0.03em',
      minWidth: '2ch',
      textAlign: 'right',
    }}
  >
    {amountInput || '0'}
  </span>
  <span
    className="font-clash font-bold"
    style={{
      fontSize: 'clamp(1.2rem, 3vw, 2rem)',
      color: '#0040FF',
      opacity: amountInput ? 1 : 0.4,
    }}
  >
    QF
  </span>
</div>

{/* Underline — sapphire wave on resolution */}
<div className="relative mx-auto" style={{ width: 'clamp(200px, 50vw, 360px)', height: 2 }}>
  {/* Base underline */}
  <div
    className="absolute inset-0 rounded-full transition-colors duration-300"
    style={{
      background: insufficientBalance
        ? 'rgba(229,72,77,0.8)'
        : 'rgba(255,255,255,0.15)',
    }}
  />
  {/* Sapphire wave — plays when amount becomes valid */}
  <AnimatePresence>
    {canContinue && (
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: '#0040FF', transformOrigin: 'left center' }}
        initial={{ scaleX: 0, opacity: 0.8 }}
        animate={{ scaleX: 1, opacity: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
      />
    )}
  </AnimatePresence>
</div>
```

### Burn Line — QDL Format with Crimson

Appears immediately below the underline when `amountWei > 0n`.

```typescript
<AnimatePresence>
  {amountWei > 0n && (
    <motion.div
      className="flex items-center justify-center gap-1.5 mt-3"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
    >
      {/* Left part — white at 45% opacity */}
      <span className="font-satoshi text-xs sm:text-sm"
        style={{ color: 'rgba(255,255,255,0.45)' }}>
        {formatQF(totalRequired)} QF leaves your wallet
      </span>

      {/* Separator dot */}
      <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.6rem' }}>·</span>

      {/* Burn part — crimson */}
      <span className="font-satoshi text-xs sm:text-sm flex items-center gap-1"
        style={{ color: `rgba(185,28,28,0.7)` }}>  {/* BURN_CRIMSON at 70% */}
        🔥 {formatQF(burnAmount)} burns
      </span>
    </motion.div>
  )}
</AnimatePresence>

{/* Insufficient balance — inline, amber, no card */}
<AnimatePresence>
  {insufficientBalance && (
    <motion.p
      className="text-center mt-2 font-satoshi text-xs"
      style={{ color: '#F59E0B' }}  // qfpay-burn-ember — amber, not red
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      Insufficient balance
    </motion.p>
  )}
</AnimatePresence>
```

Note: insufficient balance uses amber `#F59E0B` — not the red error card from
the current implementation. QDL register: amber means "here's the truth,"
not "you did something wrong." Remove the existing `AlertCircle` red card entirely.

### Continue Trigger — Chevron Style

Replace the glass pill "Review" button:

```typescript
<AnimatePresence>
  {canContinue && (
    <motion.button
      className="mt-6 flex items-center gap-2 focus-ring"
      style={{ color: 'rgba(255,255,255,0.5)' }}
      onClick={() => {
        hapticMedium()
        setAmount(amountInput, amountWei, burnAmount, recipientAmount, totalRequired)
        goToPreview()
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

Note: `hapticMedium` on continue — this is a meaningful commitment action,
not just navigation. Upgrade from existing `hapticLight`.

---

## THE CUSTOM KEYBOARD

This is the most significant addition. A full custom numeric keyboard rendered
in-app. No OS keyboard appears — ever. The `inputMode="none"` on the hidden
input prevents it.

### Layout

```
[ 1 ]  [ 2 ]  [ 3 ]
[ 4 ]  [ 5 ]  [ 6 ]
[ 7 ]  [ 8 ]  [ 9 ]
[ . ]  [ 0 ]  [ MAX ]  [ ⌫ ]
```

Standard 3-column grid, 4 rows. Bottom row has 4 columns — the MAX key
sits between `0` and backspace.

### Key Visual Spec

Each key is a `motion.button`:
- Background: `rgba(255,255,255,0.06)`
- Border: `1px solid rgba(255,255,255,0.08)`
- Border-radius: `12px`
- Numbers in Clash Display, `1.4rem`, white at 90% opacity
- Height: `56px` on mobile, `60px` on desktop
- `whileTap`: scale `0.96`, background `rgba(255,255,255,0.12)`, duration `80ms`
- `hapticLight()` on every key press — the lightest haptic, one per tap

### Special Keys

**Decimal `.`**
- Same visual as number keys
- Disabled state: `opacity: 0.3`, `cursor: not-allowed`, non-interactive
- Disabled when `amountInput` already contains `.`

**MAX key**
- Same size as number keys but with sapphire tint:
  `background: rgba(0,64,255,0.08)`, `border: 1px solid rgba(0,64,255,0.15)`
- Label: `"MAX"` in Satoshi Medium, `0.75rem`, sapphire `#0040FF` at 70%
- On tap: set `amountInput` to the formatted `maxSendableWei` value
  Use `formatQF(maxSendableWei)` — this gives the display string
  Then call `parseQFAmount` on it to confirm valid input
  Simpler: convert `maxSendableWei` to decimal string directly:
  ```typescript
  const maxDisplay = (Number(maxSendableWei) / 1e18).toFixed(6)
    .replace(/\.?0+$/, '') // trim trailing zeros
  setAmountInput(maxDisplay)
  ```
- Haptic: `hapticMedium()` on MAX tap — slightly more meaningful than a digit

**Backspace `⌫`**
- Same visual as number keys but icon is white at 50% opacity
- Single tap: remove last character
- Long press (500ms hold): clear entire input
  Use `useRef` for a hold timer:
  ```typescript
  const backspaceHoldRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  const handleBackspaceDown = () => {
    hapticLight()
    setAmountInput(prev => prev.slice(0, -1))
    backspaceHoldRef.current = setTimeout(() => {
      setAmountInput('')
      hapticMedium()
    }, 500)
  }
  const handleBackspaceUp = () => {
    if (backspaceHoldRef.current) clearTimeout(backspaceHoldRef.current)
  }
  ```

### Input Handling — Custom Keyboard Logic

Each number/decimal key press:
```typescript
const handleKeyPress = (key: string) => {
  hapticLight()
  const next = amountInput + key
  if (isValidAmountInput(next)) {
    // Prevent more than 18 decimal places (parseQFAmount truncates anyway,
    // but avoid showing invalid state)
    const parts = next.split('.')
    if (parts[1] && parts[1].length > 8) return // 8 decimal places max for display
    setAmountInput(next)
  }
}
```

### Keyboard Container

Fixed to bottom of viewport. Never scrolls.

```typescript
<div
  className="fixed bottom-0 left-0 right-0 z-20"
  style={{
    background: '#060A14',  // BG_PRIMARY — keyboard sits on the void
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: 'env(safe-area-inset-bottom)',  // PWA safe area
    paddingTop: 8,
    paddingLeft: 16,
    paddingRight: 16,
  }}
>
  <div className="grid gap-2 max-w-sm mx-auto" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
    {/* Rows 1-3: digits */}
    {[1,2,3,4,5,6,7,8,9].map(n => (
      <motion.button
        key={n}
        className="rounded-xl font-clash font-bold flex items-center justify-center"
        style={{
          height: 56,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.08)',
          fontSize: '1.4rem',
          color: 'rgba(255,255,255,0.9)',
        }}
        onTapStart={() => handleKeyPress(String(n))}
        whileTap={{ scale: 0.96, backgroundColor: 'rgba(255,255,255,0.12)' }}
        transition={{ duration: 0.08 }}
      >
        {n}
      </motion.button>
    ))}

    {/* Row 4: . / 0 / MAX / ⌫ */}
    {/* Row 4 needs 4 columns — override grid for this row */}
  </div>

  {/* Row 4 — 4 columns */}
  <div className="grid gap-2 max-w-sm mx-auto mt-2"
    style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>

    {/* Decimal */}
    <motion.button
      className="rounded-xl font-clash font-bold flex items-center justify-center"
      style={{
        height: 56,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.08)',
        fontSize: '1.4rem',
        color: 'rgba(255,255,255,0.9)',
        opacity: amountInput.includes('.') ? 0.3 : 1,
        pointerEvents: amountInput.includes('.') ? 'none' : 'auto',
      }}
      onTapStart={() => handleKeyPress('.')}
      whileTap={{ scale: 0.96, backgroundColor: 'rgba(255,255,255,0.12)' }}
      transition={{ duration: 0.08 }}
    >
      .
    </motion.button>

    {/* 0 */}
    <motion.button
      className="rounded-xl font-clash font-bold flex items-center justify-center"
      style={{
        height: 56,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.08)',
        fontSize: '1.4rem',
        color: 'rgba(255,255,255,0.9)',
      }}
      onTapStart={() => handleKeyPress('0')}
      whileTap={{ scale: 0.96, backgroundColor: 'rgba(255,255,255,0.12)' }}
      transition={{ duration: 0.08 }}
    >
      0
    </motion.button>

    {/* MAX */}
    <motion.button
      className="rounded-xl flex items-center justify-center"
      style={{
        height: 56,
        background: 'rgba(0,64,255,0.08)',
        border: '1px solid rgba(0,64,255,0.15)',
        fontSize: '0.75rem',
        color: 'rgba(0,64,255,0.7)',
        fontFamily: 'Satoshi, sans-serif',
        fontWeight: 500,
        opacity: maxSendableWei === 0n ? 0.3 : 1,
        pointerEvents: maxSendableWei === 0n ? 'none' : 'auto',
      }}
      onTapStart={() => {
        hapticMedium()
        if (maxSendableWei > 0n) {
          const maxDisplay = (Number(maxSendableWei) / 1e18)
            .toFixed(8)
            .replace(/\.?0+$/, '')
          setAmountInput(maxDisplay)
        }
      }}
      whileTap={{ scale: 0.96 }}
    >
      MAX
    </motion.button>

    {/* Backspace */}
    <motion.button
      className="rounded-xl flex items-center justify-center"
      style={{
        height: 56,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: 'rgba(255,255,255,0.5)',
        fontSize: '1.1rem',
      }}
      onPointerDown={handleBackspaceDown}
      onPointerUp={handleBackspaceUp}
      onPointerLeave={handleBackspaceUp}
      whileTap={{ scale: 0.96, backgroundColor: 'rgba(255,255,255,0.12)' }}
      transition={{ duration: 0.08 }}
    >
      ⌫
    </motion.button>
  </div>
</div>
```

### Keyboard Height Compensation

The keyboard is `fixed` so it overlaps the screen content. The main content
area needs bottom padding to ensure the continue button is visible above the
keyboard. Add to the outer container:

```typescript
// Add paddingBottom to the main flex container:
style={{ paddingBottom: 'calc(280px + env(safe-area-inset-bottom))' }}
```

280px is the approximate keyboard height. This ensures the burn line and
continue button are always visible above the keyboard.

---

## REMOVING QUICK-AMOUNT PILLS

The existing `QUICK_AMOUNTS = [10, 50, 100, 500]` pill row is removed entirely.
The MAX key on the custom keyboard replaces it. Do not preserve quick amounts
in any form.

---

## `layoutId` COORDINATION WITH RECIPIENTSCREEN

Add `layoutId="recipient-avatar"` to the resolved avatar element in
`RecipientScreen.tsx`. This enables the shared element transition where
the recipient avatar travels from RecipientScreen to AmountScreen.

In `RecipientScreen.tsx`, find the resolved avatar block and wrap it:

```typescript
// In RecipientScreen, the resolved avatar motion.div — add layoutId:
<motion.div layoutId="recipient-avatar" className="relative">
  {/* existing avatar img or fallback div */}
</motion.div>
```

Both screens must use the same string `"recipient-avatar"` exactly.
Framer Motion handles the transition automatically — no additional code needed.

---

## COMPLETE AMENDED `AmountScreen.tsx`

Below is the full rewritten component for drop-in replacement:

```typescript
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { usePaymentStore } from '../stores/paymentStore'
import { useWalletStore } from '../stores/walletStore'
import { getQFBalance, formatQF, calculateBurn, truncateAddress } from '../utils/qfpay'
import { parseQFAmount, isValidAmountInput } from '../utils/parseAmount'
import { GAS_BUFFER } from '../config/contracts'
import { hapticLight, hapticMedium } from '../utils/haptics'
import { EASE_OUT_EXPO, EASE_SPRING } from '../lib/animations'
import { useReducedMotion } from '../hooks/useReducedMotion'

export const AmountScreen = () => {
  const {
    recipientName, recipientAddress, recipientAvatar,
    setAmount, goToPreview, goBackToRecipient,
  } = usePaymentStore()
  const { ss58Address, address } = useWalletStore()
  const reducedMotion = useReducedMotion()

  const [amountInput, setAmountInput] = useState('')
  const [balance, setBalance] = useState<bigint>(0n)
  const inputRef = useRef<HTMLInputElement>(null)
  const backspaceHoldRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const addr = ss58Address || address
    if (addr) getQFBalance(addr).then(setBalance)
  }, [ss58Address, address])

  // ── Calculations — unchanged logic ──
  const amountWei = amountInput ? parseQFAmount(amountInput) : 0n
  const { burnAmount, recipientAmount, totalRequired } = calculateBurn(amountWei)
  const insufficientBalance = amountWei > 0n && totalRequired + GAS_BUFFER > balance
  const canContinue = amountWei > 0n && !insufficientBalance && recipientAddress
  const maxSendableWei = balance > GAS_BUFFER
    ? ((balance - GAS_BUFFER) * 10000n) / 10010n
    : 0n

  // ── Balance proximity for brightness ──
  const balanceProximity = amountWei > 0n && balance > 0n
    ? Math.min(Number(totalRequired * 100n / balance) / 100, 1)
    : 0
  const balanceOpacity = balanceProximity > 0.9
    ? 1
    : balanceProximity > 0.7
      ? 0.5 + (balanceProximity - 0.7) * 2.5
      : 0.25

  // ── Keyboard handlers ──
  const handleKeyPress = (key: string) => {
    hapticLight()
    setAmountInput(prev => {
      const next = prev + key
      if (!isValidAmountInput(next)) return prev
      const parts = next.split('.')
      if (parts[1] && parts[1].length > 8) return prev
      // Prevent leading zeros (e.g. "007")
      if (next.length > 1 && next[0] === '0' && next[1] !== '.') return prev
      return next
    })
  }

  const handleBackspaceDown = () => {
    hapticLight()
    setAmountInput(prev => prev.slice(0, -1))
    backspaceHoldRef.current = setTimeout(() => {
      setAmountInput('')
      hapticMedium()
    }, 500)
  }

  const handleBackspaceUp = () => {
    if (backspaceHoldRef.current) {
      clearTimeout(backspaceHoldRef.current)
      backspaceHoldRef.current = null
    }
  }

  const handleMax = () => {
    if (maxSendableWei <= 0n) return
    hapticMedium()
    const maxDisplay = (Number(maxSendableWei) / 1e18)
      .toFixed(8).replace(/\.?0+$/, '')
    setAmountInput(maxDisplay)
  }

  const handleContinue = () => {
    hapticMedium()
    setAmount(amountInput, amountWei, burnAmount, recipientAmount, totalRequired)
    goToPreview()
  }

  const keyStyle = {
    height: 56,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    fontSize: '1.4rem',
    color: 'rgba(255,255,255,0.9)',
    fontFamily: '"Clash Display", sans-serif',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    userSelect: 'none' as const,
  }

  return (
    <motion.div
      className="flex flex-col items-center min-h-screen px-6 relative"
      style={{ paddingBottom: 'calc(280px + env(safe-area-inset-bottom))' }}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
    >
      {/* Back chevron */}
      <motion.button
        className="fixed top-5 left-5 z-50 text-white/25 hover:text-white/50
                   transition-colors focus-ring"
        style={{ fontSize: '1.5rem', lineHeight: 1 }}
        onClick={() => { hapticLight(); goBackToRecipient() }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        whileTap={{ scale: 0.9 }}
      >
        ‹
      </motion.button>

      {/* Hidden input — prevents OS keyboard */}
      <input
        ref={inputRef}
        type="text"
        inputMode="none"
        value={amountInput}
        readOnly
        className="absolute opacity-0 pointer-events-none w-0 h-0"
        aria-hidden="true"
      />

      {/* Recipient presence */}
      <motion.div
        className="flex flex-col items-center mt-16 mb-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
      >
        <motion.div layoutId="recipient-avatar" className="mb-2">
          {recipientAvatar ? (
            <img
              src={recipientAvatar}
              alt={recipientName || ''}
              className="w-12 h-12 rounded-full object-cover"
              style={{ border: '1px solid rgba(255,255,255,0.15)' }}
            />
          ) : (
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <span className="font-clash font-bold text-lg text-white">
                {(recipientName || '?')[0].toUpperCase()}
              </span>
            </div>
          )}
        </motion.div>
        <p className="font-satoshi font-medium text-sm"
          style={{ color: 'rgba(255,255,255,0.6)' }}>
          {recipientName ? (
            <>{recipientName}<span style={{ color: '#0040FF' }}>.qf</span></>
          ) : truncateAddress(recipientAddress || '')}
        </p>
      </motion.div>

      {/* Balance line */}
      <motion.div
        className="mb-4"
        animate={{ opacity: balanceOpacity }}
        transition={{ duration: 0.3 }}
      >
        <span className="font-mono text-xs"
          style={{ color: insufficientBalance ? '#E5484D' : 'rgba(255,255,255,0.6)' }}>
          {formatQF(balance)} QF available
        </span>
      </motion.div>

      {/* Amount display */}
      <div className="flex flex-col items-center w-full">
        <div className="flex items-baseline justify-center gap-2 mb-3">
          <span
            className="font-clash font-bold transition-colors duration-300"
            style={{
              fontSize: 'clamp(3rem, 10vw, 6rem)',
              color: insufficientBalance
                ? '#E5484D'
                : amountInput ? 'white' : 'rgba(255,255,255,0.2)',
              letterSpacing: '-0.03em',
              minWidth: '2ch',
              textAlign: 'right',
            }}
          >
            {amountInput || '0'}
          </span>
          <span
            className="font-clash font-bold"
            style={{
              fontSize: 'clamp(1.2rem, 3vw, 2rem)',
              color: '#0040FF',
              opacity: amountInput ? 1 : 0.4,
            }}
          >
            QF
          </span>
        </div>

        {/* Underline */}
        <div
          className="relative mx-auto"
          style={{ width: 'clamp(200px, 50vw, 360px)', height: 2 }}
        >
          <div
            className="absolute inset-0 rounded-full transition-colors duration-300"
            style={{
              background: insufficientBalance
                ? 'rgba(229,72,77,0.8)'
                : 'rgba(255,255,255,0.15)',
            }}
          />
          <AnimatePresence>
            {canContinue && (
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: '#0040FF',
                  transformOrigin: 'left center',
                }}
                initial={{ scaleX: 0, opacity: 0.8 }}
                animate={{ scaleX: 1, opacity: 0 }}
                transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Burn line */}
        <AnimatePresence>
          {amountWei > 0n && (
            <motion.div
              className="flex flex-wrap items-center justify-center gap-1.5 mt-3 px-4"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
            >
              <span className="font-satoshi text-xs sm:text-sm"
                style={{ color: 'rgba(255,255,255,0.45)' }}>
                {formatQF(totalRequired)} QF leaves your wallet
              </span>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.6rem' }}>·</span>
              <span className="font-satoshi text-xs sm:text-sm"
                style={{ color: 'rgba(185,28,28,0.7)' }}>
                🔥 {formatQF(burnAmount)} burns
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Insufficient balance */}
        <AnimatePresence>
          {insufficientBalance && (
            <motion.p
              className="text-center mt-2 font-satoshi text-xs"
              style={{ color: '#F59E0B' }}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              Insufficient balance
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Continue trigger */}
      <AnimatePresence>
        {canContinue && (
          <motion.button
            className="mt-6 flex items-center gap-2 focus-ring"
            style={{ color: 'rgba(255,255,255,0.5)' }}
            onClick={handleContinue}
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

      {/* ── Custom Keyboard ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-20"
        style={{
          background: '#060A14',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingTop: 8,
          paddingLeft: 16,
          paddingRight: 16,
        }}
      >
        <div
          className="grid gap-2 max-w-sm mx-auto"
          style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <motion.button
              key={n}
              style={keyStyle}
              onTapStart={() => handleKeyPress(String(n))}
              whileTap={{ scale: 0.96, backgroundColor: 'rgba(255,255,255,0.12)' }}
              transition={{ duration: 0.08 }}
            >
              {n}
            </motion.button>
          ))}
        </div>

        {/* Bottom row — 4 columns */}
        <div
          className="grid gap-2 max-w-sm mx-auto mt-2"
          style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}
        >
          {/* Decimal */}
          <motion.button
            style={{
              ...keyStyle,
              opacity: amountInput.includes('.') ? 0.3 : 1,
              pointerEvents: amountInput.includes('.') ? 'none' : 'auto',
            }}
            onTapStart={() => handleKeyPress('.')}
            whileTap={{ scale: 0.96, backgroundColor: 'rgba(255,255,255,0.12)' }}
            transition={{ duration: 0.08 }}
          >
            .
          </motion.button>

          {/* 0 */}
          <motion.button
            style={keyStyle}
            onTapStart={() => handleKeyPress('0')}
            whileTap={{ scale: 0.96, backgroundColor: 'rgba(255,255,255,0.12)' }}
            transition={{ duration: 0.08 }}
          >
            0
          </motion.button>

          {/* MAX */}
          <motion.button
            style={{
              ...keyStyle,
              background: 'rgba(0,64,255,0.08)',
              border: '1px solid rgba(0,64,255,0.15)',
              fontSize: '0.75rem',
              color: 'rgba(0,64,255,0.7)',
              fontFamily: 'Satoshi, sans-serif',
              fontWeight: 500,
              opacity: maxSendableWei === 0n ? 0.3 : 1,
              pointerEvents: maxSendableWei === 0n ? 'none' : 'auto',
            }}
            onTapStart={handleMax}
            whileTap={{ scale: 0.96 }}
          >
            MAX
          </motion.button>

          {/* Backspace */}
          <motion.button
            style={{
              ...keyStyle,
              fontSize: '1.1rem',
              color: 'rgba(255,255,255,0.5)',
            }}
            onPointerDown={handleBackspaceDown}
            onPointerUp={handleBackspaceUp}
            onPointerLeave={handleBackspaceUp}
            whileTap={{ scale: 0.96, backgroundColor: 'rgba(255,255,255,0.12)' }}
            transition={{ duration: 0.08 }}
          >
            ⌫
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
```

---

## SUMMARY OF ALL CHANGES

| File | Action |
|------|--------|
| `src/components/AmountScreen.tsx` | REWRITE — custom keyboard, QDL visuals, burn line |
| `src/components/RecipientScreen.tsx` | ADD `layoutId="recipient-avatar"` to resolved avatar |
| `src/utils/sounds.ts` | ADD `isSoundEnabled()` guard to all three functions |

---

## QUALITY BAR — DEFINITION OF DONE

- [ ] OS keyboard never appears on mobile — `inputMode="none"` working
- [ ] Custom keyboard covers bottom of screen, never scrolls
- [ ] Main content visible above keyboard — `paddingBottom` compensation working
- [ ] Numbers appear in amount display as keys are pressed
- [ ] `0` prefix prevention — `"007"` cannot be typed, `"0.7"` is valid
- [ ] Decimal key disables correctly after first `.` is pressed
- [ ] Backspace removes one character per tap
- [ ] Backspace long press (500ms) clears entire input — `hapticMedium` fires
- [ ] MAX fills input with correct max sendable amount
- [ ] Burn line appears as soon as any amount is typed
- [ ] Burn line: `formatQF(totalRequired)` on the left, `formatQF(burnAmount)` on right
- [ ] Burn line crimson: `rgba(185,28,28,0.7)` — not orange, not red
- [ ] Insufficient balance: amber `#F59E0B` inline text — NOT a red card
- [ ] Balance line opacity brightens as amount approaches limit
- [ ] Continue `›` button appears only when `canContinue` is true
- [ ] `hapticMedium` fires on Continue — not `hapticLight`
- [ ] `setAmount(...)` called with all 5 args before `goToPreview()` — unchanged
- [ ] `layoutId="recipient-avatar"` on AmountScreen avatar matches RecipientScreen
- [ ] Recipient avatar travels via shared element transition between screens
- [ ] Back chevron `‹` top-left — consistent with RecipientScreen
- [ ] `sounds.ts` guard: `isSoundEnabled()` check at top of each function
- [ ] No TypeScript errors — `truncateAddress` imported from `../utils/qfpay`
- [ ] No `Flame`, `ArrowRight`, `ArrowLeft`, `AlertCircle` Lucide imports remaining
- [ ] `QUICK_AMOUNTS` array completely removed — no quick-amount pills anywhere
- [ ] Reduced motion: keyboard still functions, animations suppressed

---

*QDL — Quantum Design Language. Interactions are ceremonies, not clicks.*
*Built for QF Network. qfpay.xyz*
