# QFPay — Final QDL Polish Pass
## Toast and WalletModal — SWE Implementation Prompt

---

## CONTEXT

This is the final prompt in the QFPay QDL redesign series. It covers the two
shared components that appear across all screens and haven't been addressed yet.

`Toast.tsx` — already has correct logic (max 3, error persistence, timing).
Needs QDL visual treatment only.

`WalletModal.tsx` — the first thing users see after tapping Connect Wallet on
Screen 1. Currently a functional but standard web3 modal. Needs to feel like
an entry into a ceremony, not a form.

**These two files are the only changes in this prompt.**

**What does NOT change:**
- All toast store logic — `showToast`, `addToast`, `removeToast`, `clearErrors`
- All wallet connection logic — `connectWallet`, `connectMetaMask`, `handleWalletSelect`
- `Skeleton.tsx` — already correct, no changes
- `useReducedMotion.ts` — already correct, no changes
- Any screen components, stores, or utilities

---

## FILE 1: `src/components/Toast.tsx` — Visual Treatment Only

### What Changes

The toast store logic, timing rules, and `showToast` export are **untouched**.
Only the rendered appearance changes.

**1. Error color — QDL register correction**

The current error style uses `qfpay-error` (`#E5484D` — a standard red).
QDL says errors are not alarming — they are honest. Shift the error toast to
use the same crimson family as the burn:

```typescript
// Replace getToastStyles():
const getToastStyles = (type: ToastMessage['type']) => {
  switch (type) {
    case 'success':
      return {
        background: 'rgba(0, 209, 121, 0.06)',
        border: '1px solid rgba(0, 209, 121, 0.15)',
        color: '#00D179',  // SUCCESS_GREEN
      }
    case 'warning':
      return {
        background: 'rgba(245, 158, 11, 0.06)',
        border: '1px solid rgba(245, 158, 11, 0.15)',
        color: '#F59E0B',  // qfpay-warning amber
      }
    case 'error':
      return {
        background: 'rgba(185, 28, 28, 0.06)',
        border: '1px solid rgba(185, 28, 28, 0.15)',
        color: '#B91C1C',  // BURN_CRIMSON — consistent with burn language
      }
  }
}
```

Use inline `style` objects instead of className strings — the current
`getToastStyles` returns a className string which requires Tailwind to have
these opacity utilities pre-generated. Inline styles are more reliable here.

**2. Surface quality — clear glass**

Replace the current `backdrop-blur-md` + className approach with clear glass:

```typescript
// Each toast motion.div style:
style={{
  background: toastStyle.background,
  border: toastStyle.border,
  borderRadius: 14,
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  padding: '12px 14px',
  boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
  color: toastStyle.color,
}}
```

**3. Icon replacement — remove Lucide icons**

Replace `CheckCircle`, `AlertTriangle`, `XCircle` with simple inline SVG
glyphs that match the QDL aesthetic — cleaner, no dependency:

```typescript
const ToastIcon = ({ type }: { type: ToastMessage['type'] }) => {
  const style = getToastStyles(type)
  switch (type) {
    case 'success':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
          <motion.path
            d="M3 8L6.5 11.5L13 4.5"
            stroke={style.color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
          />
        </svg>
      )
    case 'warning':
      return (
        <span className="flex-shrink-0 font-mono text-sm leading-none"
          style={{ color: style.color }}>!</span>
      )
    case 'error':
      return (
        <span className="flex-shrink-0 font-mono text-sm leading-none"
          style={{ color: style.color }}>×</span>
      )
  }
}
```

**4. Dismiss button — error toasts only (unchanged behavior, cleaner look)**

```typescript
// Replace the existing X button with:
{toast.type === 'error' && (
  <button
    onClick={() => toastStore.removeToast(toast.id)}
    className="flex-shrink-0 mt-0.5 transition-opacity hover:opacity-100"
    style={{ opacity: 0.4, color: getToastStyles('error').color }}
  >
    <span className="font-mono text-xs">✕</span>
  </button>
)}
```

**5. Position — keep centered top, adjust z-index**

Current `z-[60]` is correct — toasts appear above all screen content
including the `ConnectedPill` at `z-50`. Keep as-is.

### Complete Rewritten Toast Render Function

The `showToast` export, store creation, `listeners` set, and all logic
above the `Toast` component are **byte-for-byte unchanged**. Only the
`ToastIcon` component and the `Toast` render function change.

```typescript
// Replace from "const ToastIcon" to end of file:

const getToastStyles = (type: ToastMessage['type']) => {
  switch (type) {
    case 'success':
      return {
        background: 'rgba(0,209,121,0.06)',
        border: '1px solid rgba(0,209,121,0.15)',
        color: '#00D179',
      }
    case 'warning':
      return {
        background: 'rgba(245,158,11,0.06)',
        border: '1px solid rgba(245,158,11,0.15)',
        color: '#F59E0B',
      }
    case 'error':
      return {
        background: 'rgba(185,28,28,0.06)',
        border: '1px solid rgba(185,28,28,0.15)',
        color: '#B91C1C',
      }
  }
}

const ToastIcon = ({ type }: { type: ToastMessage['type'] }) => {
  const s = getToastStyles(type)
  if (type === 'success') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5">
        <motion.path
          d="M3 8L6.5 11.5L13 4.5"
          stroke={s.color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
        />
      </svg>
    )
  }
  return (
    <span
      className="flex-shrink-0 font-mono text-base leading-none mt-0.5"
      style={{ color: s.color }}
    >
      {type === 'warning' ? '!' : '×'}
    </span>
  )
}

export const Toast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    const updateToasts = () => setToasts([...toastStore.toasts])
    listeners.add(updateToasts)
    updateToasts()
    return () => { listeners.delete(updateToasts) }
  }, [])

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2
                    pointer-events-none w-full max-w-md px-4">
      <AnimatePresence>
        {toasts.map((toast) => {
          const s = getToastStyles(toast.type)
          return (
            <motion.div
              key={toast.id}
              style={{
                background: s.background,
                border: s.border,
                borderRadius: 14,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                padding: '11px 14px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
                color: s.color,
                pointerEvents: 'auto',
              }}
              className="flex items-start gap-3"
              initial={{
                opacity: 0,
                y: toast.type === 'error' ? 8 : -8,
                scale: 0.97,
              }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{
                opacity: 0,
                y: toast.type === 'error' ? 8 : -8,
                scale: 0.97,
              }}
              transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
            >
              <ToastIcon type={toast.type} />
              <p className="font-satoshi text-sm font-medium flex-1 leading-snug">
                {toast.message}
              </p>
              {toast.type === 'error' && (
                <button
                  onClick={() => toastStore.removeToast(toast.id)}
                  className="flex-shrink-0 transition-opacity hover:opacity-100 focus-ring"
                  style={{ opacity: 0.45, color: s.color, fontSize: '0.8rem' }}
                >
                  ✕
                </button>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
```

**Remove these imports** (no longer used):
```typescript
// Remove:
import { X, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
// Keep everything else
```

---

## FILE 2: `src/components/WalletModal.tsx` — QDL Treatment

### What Does NOT Change

```typescript
// These are untouched — purely presentational rewrite:
const { showWalletModal, setShowWalletModal, connecting, walletError,
  connectWallet, connectMetaMask, clearWalletError } = useWalletStore()

// handleWalletSelect — unchanged
// TalismanIcon, SubWalletIcon, MetaMaskIcon — all three SVG components unchanged
// Click-outside and Escape key handlers — unchanged
// modalRef — unchanged
```

### What Changes

The modal surface, typography hierarchy, wallet button design, and overall
entrance feel.

**1. Backdrop — deeper, more intentional**

```typescript
// Replace the backdrop motion.div:
<motion.div
  className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
  style={{ background: 'rgba(0,0,0,0.7)' }}
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.2 }}
  onClick={() => setShowWalletModal(false)}
>
```

Remove `backdrop-blur-sm` from the backdrop — blur is on the modal surface
itself. The backdrop is dark and clean.

**2. Modal surface — clear glass elevated**

```typescript
// Replace the modal container:
<motion.div
  ref={modalRef}
  className="w-full max-w-sm"
  style={{
    background: 'rgba(12, 16, 25, 0.95)',  // BG_SURFACE at high opacity
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 24,
    padding: '28px 24px 24px',
    boxShadow: '0 0 0 1px rgba(0,64,255,0.08), 0 24px 64px rgba(0,0,0,0.6)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
  }}
  initial={{ opacity: 0, scale: 0.94, y: 24 }}
  animate={{ opacity: 1, scale: 1, y: 0 }}
  exit={{ opacity: 0, scale: 0.94, y: 24 }}
  transition={{ type: 'spring', damping: 28, stiffness: 300 }}
  onClick={(e) => e.stopPropagation()}
>
```

The double box-shadow — a faint sapphire ring at `1px` plus a deep drop shadow —
gives the modal the "self-illuminating surface" quality. It appears to float
above the backdrop rather than sitting on it.

**3. Header — ceremony language**

Remove the "Connect Wallet" heading. Replace with a two-element header:

```typescript
// Replace header:
<div className="flex flex-col items-center text-center mb-8">
  {/* Logo mark */}
  <img
    src={logoMarkSvg}
    alt="QFPay"
    className="w-8 h-8 mb-5 opacity-60"
  />
  <h2 className="font-clash font-bold text-2xl text-white mb-2"
    style={{ letterSpacing: '-0.02em' }}>
    Connect your wallet
  </h2>
  <p className="font-satoshi text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
    You'll need a{' '}
    <span style={{ color: '#0040FF' }}>.qf</span>
    {' '}name to send payments
  </p>
</div>

// Add import at top:
import logoMarkSvg from '../assets/logo-mark.svg'
```

Remove the `X` close button from the header — the click-outside and Escape key
handlers already dismiss the modal. The close gesture doesn't need a visible
button. If the SWE feels strongly about accessibility, a small `×` can remain
in the top-right, but the centered logo + heading layout works without it.

**4. Error state — QDL crimson register**

```typescript
// Replace error div:
<div
  style={{
    padding: '12px 14px',
    borderRadius: 12,
    background: 'rgba(185,28,28,0.06)',
    border: '1px solid rgba(185,28,28,0.15)',
    marginBottom: 16,
  }}
>
  <p className="font-satoshi text-sm" style={{ color: '#B91C1C' }}>
    {walletError}
  </p>
</div>
```

**5. Connecting state — sapphire register**

```typescript
// Replace connecting div:
<div
  style={{
    padding: '12px 14px',
    borderRadius: 12,
    background: 'rgba(0,64,255,0.06)',
    border: '1px solid rgba(0,64,255,0.12)',
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  }}
>
  <Loader2 className="w-4 h-4 animate-spin flex-shrink-0"
    style={{ color: '#0040FF' }} />
  <div>
    <p className="font-satoshi text-sm font-medium" style={{ color: '#0040FF' }}>
      Waiting for authorization...
    </p>
    <p className="font-satoshi text-xs mt-0.5"
      style={{ color: 'rgba(255,255,255,0.3)' }}>
      Check your wallet extension
    </p>
  </div>
</div>
```

**6. Wallet buttons — clear glass with hover lift**

Replace the current `bg-white/[0.03]` buttons with the QDL clear glass treatment
and add a staggered entrance animation:

```typescript
<div className="flex flex-col gap-2">
  {[
    { type: 'talisman' as const, name: 'Talisman', icon: <TalismanIcon />,
      description: 'Polkadot & Ethereum' },
    { type: 'subwallet' as const, name: 'SubWallet', icon: <SubWalletIcon />,
      description: 'Multi-chain' },
    { type: 'metamask' as const, name: 'MetaMask', icon: <MetaMaskIcon />,
      description: 'EVM wallet' },
  ].map((wallet, i) => (
    <motion.button
      key={wallet.type}
      className="w-full flex items-center gap-4 focus-ring"
      style={{
        padding: '14px 16px',
        borderRadius: 14,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        textAlign: 'left',
        cursor: connecting ? 'not-allowed' : 'pointer',
        opacity: connecting ? 0.5 : 1,
      }}
      onClick={() => handleWalletSelect(wallet.type)}
      disabled={connecting}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: connecting ? 0.5 : 1, y: 0 }}
      transition={{ delay: i * 0.06, duration: 0.3, ease: EASE_OUT_EXPO }}
      whileHover={!connecting ? {
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderColor: 'rgba(0,64,255,0.25)',
        y: -1,
      } : undefined}
      whileTap={!connecting ? { scale: 0.99 } : undefined}
    >
      <div className="flex-shrink-0">{wallet.icon}</div>
      <div>
        <p className="font-satoshi font-medium text-sm"
          style={{ color: 'rgba(255,255,255,0.9)' }}>
          {wallet.name}
        </p>
        <p className="font-satoshi text-xs mt-0.5"
          style={{ color: 'rgba(255,255,255,0.35)' }}>
          {wallet.description}
        </p>
      </div>
    </motion.button>
  ))}
</div>
```

The `whileHover` adds a sapphire border tint and a 1px lift — the button
feels like it's responding to your cursor. This is the clearest signal
that it's interactive.

**7. Footer — minimal, honest**

```typescript
// Replace footer:
<div
  className="flex items-center justify-center gap-1.5 mt-6 pt-5"
  style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
>
  <p className="font-satoshi text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
    Don't have a wallet?{' '}
    <a
      href="https://talisman.xyz"
      target="_blank"
      rel="noopener noreferrer"
      className="hover:underline transition-opacity hover:opacity-80"
      style={{ color: '#0040FF' }}
    >
      Get Talisman
    </a>
  </p>
</div>
```

Remove the `Shield` icon — it's decorative noise. The footer is already
honest enough without it.

**8. Remove unused imports**

```typescript
// Remove:
import { X, Shield, Loader2 } from 'lucide-react'

// Replace with (keeping Loader2 only):
import { Loader2 } from 'lucide-react'
```

### Complete Rewritten WalletModal Structure

```typescript
import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useWalletStore } from '../stores/walletStore'
import { EASE_OUT_EXPO } from '../lib/animations'
import logoMarkSvg from '../assets/logo-mark.svg'

// TalismanIcon, SubWalletIcon, MetaMaskIcon — unchanged, paste as-is

export const WalletModal = () => {
  const {
    showWalletModal, setShowWalletModal, connecting, walletError,
    connectWallet, connectMetaMask, clearWalletError,
  } = useWalletStore()

  const modalRef = useRef<HTMLDivElement>(null)

  // Click-outside and Escape handlers — UNCHANGED
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowWalletModal(false)
      }
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowWalletModal(false)
    }
    if (showWalletModal) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showWalletModal, setShowWalletModal])

  // handleWalletSelect — UNCHANGED
  const handleWalletSelect = async (
    walletType: 'talisman' | 'subwallet' | 'metamask'
  ) => {
    clearWalletError()
    if (walletType === 'metamask') {
      await connectMetaMask()
    } else {
      await connectWallet(walletType)
    }
  }

  return (
    <AnimatePresence>
      {showWalletModal && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center
                     justify-center px-4 pb-safe-bottom sm:pb-0"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => setShowWalletModal(false)}
        >
          <motion.div
            ref={modalRef}
            className="w-full max-w-sm"
            style={{
              background: 'rgba(12,16,25,0.95)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 24,
              padding: '28px 24px 24px',
              boxShadow:
                '0 0 0 1px rgba(0,64,255,0.08), 0 24px 64px rgba(0,0,0,0.6)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 24 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-7">
              <img
                src={logoMarkSvg}
                alt="QFPay"
                className="w-7 h-7 mb-5 opacity-60"
              />
              <h2
                className="font-clash font-bold text-2xl text-white mb-2"
                style={{ letterSpacing: '-0.02em' }}
              >
                Connect your wallet
              </h2>
              <p className="font-satoshi text-sm"
                style={{ color: 'rgba(255,255,255,0.4)' }}>
                You'll need a{' '}
                <span style={{ color: '#0040FF' }}>.qf</span>
                {' '}name to send payments
              </p>
            </div>

            {/* Error */}
            <AnimatePresence>
              {walletError && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="overflow-hidden"
                >
                  <div style={{
                    padding: '12px 14px', borderRadius: 12,
                    background: 'rgba(185,28,28,0.06)',
                    border: '1px solid rgba(185,28,28,0.15)',
                  }}>
                    <p className="font-satoshi text-sm"
                      style={{ color: '#B91C1C' }}>
                      {walletError}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Connecting */}
            <AnimatePresence>
              {connecting && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="overflow-hidden"
                >
                  <div style={{
                    padding: '12px 14px', borderRadius: 12,
                    background: 'rgba(0,64,255,0.06)',
                    border: '1px solid rgba(0,64,255,0.12)',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0"
                      style={{ color: '#0040FF' }} />
                    <div>
                      <p className="font-satoshi text-sm font-medium"
                        style={{ color: '#0040FF' }}>
                        Waiting for authorization...
                      </p>
                      <p className="font-satoshi text-xs mt-0.5"
                        style={{ color: 'rgba(255,255,255,0.3)' }}>
                        Check your wallet extension
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Wallet buttons */}
            <div className="flex flex-col gap-2">
              {[
                { type: 'talisman' as const, name: 'Talisman',
                  icon: <TalismanIcon />, description: 'Polkadot & Ethereum' },
                { type: 'subwallet' as const, name: 'SubWallet',
                  icon: <SubWalletIcon />, description: 'Multi-chain' },
                { type: 'metamask' as const, name: 'MetaMask',
                  icon: <MetaMaskIcon />, description: 'EVM wallet' },
              ].map((wallet, i) => (
                <motion.button
                  key={wallet.type}
                  className="w-full flex items-center gap-4 focus-ring"
                  style={{
                    padding: '14px 16px', borderRadius: 14, textAlign: 'left',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    cursor: connecting ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() => handleWalletSelect(wallet.type)}
                  disabled={connecting}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: connecting ? 0.5 : 1, y: 0 }}
                  transition={{
                    delay: i * 0.06, duration: 0.3, ease: EASE_OUT_EXPO,
                  }}
                  whileHover={!connecting ? {
                    backgroundColor: 'rgba(255,255,255,0.07)',
                    borderColor: 'rgba(0,64,255,0.25)',
                    y: -1,
                  } : undefined}
                  whileTap={!connecting ? { scale: 0.99 } : undefined}
                >
                  <div className="flex-shrink-0">{wallet.icon}</div>
                  <div>
                    <p className="font-satoshi font-medium text-sm"
                      style={{ color: 'rgba(255,255,255,0.9)' }}>
                      {wallet.name}
                    </p>
                    <p className="font-satoshi text-xs mt-0.5"
                      style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {wallet.description}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-center mt-6 pt-5"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="font-satoshi text-xs"
                style={{ color: 'rgba(255,255,255,0.25)' }}>
                Don't have a wallet?{' '}
                <a
                  href="https://talisman.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                  style={{ color: '#0040FF' }}
                >
                  Get Talisman
                </a>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

---

## SUMMARY OF ALL CHANGES

| File | Action |
|------|--------|
| `src/components/Toast.tsx` | MODIFY — visual treatment, crimson errors, clear glass |
| `src/components/WalletModal.tsx` | MODIFY — QDL surface, ceremony header, wallet button lift |
| `src/components/ui/Skeleton.tsx` | NO CHANGE — already correct |
| `src/hooks/useReducedMotion.ts` | NO CHANGE — already correct |

---

## QUALITY BAR — DEFINITION OF DONE

**Toast:**
- [ ] Success toast: `#00D179` green text and border — not className based
- [ ] Warning toast: `#F59E0B` amber text and border
- [ ] Error toast: `#B91C1C` crimson text and border — NOT `#E5484D` red
- [ ] Error toast has manual dismiss `✕` button — success and warning do not
- [ ] Success toast auto-dismisses at 3s — unchanged
- [ ] Warning toast auto-dismisses at 7s — unchanged
- [ ] Error toast does NOT auto-dismiss — unchanged
- [ ] Max 3 toasts visible simultaneously — unchanged
- [ ] Success icon animates path length on mount
- [ ] `backdrop-filter: blur(12px)` on each toast — clear glass appearance
- [ ] `CheckCircle`, `AlertTriangle`, `XCircle`, `X` Lucide imports removed
- [ ] `showToast` export and store logic byte-for-byte unchanged
- [ ] Toasts still appear centered at top of viewport

**WalletModal:**
- [ ] Logo mark appears above heading — `logo-mark.svg` imported correctly
- [ ] Heading: "Connect your wallet" in Clash Display — not "Connect Wallet"
- [ ] Sub-heading: ".qf name" with sapphire `.qf` — explains the requirement
- [ ] Modal surface: `rgba(12,16,25,0.95)` with `blur(24px)` — deep clear glass
- [ ] Double box-shadow: faint sapphire ring + deep drop shadow
- [ ] Wallet buttons: staggered entrance with `0.06s` delay between each
- [ ] Wallet button hover: background brightens + sapphire border + 1px lift
- [ ] Error state: crimson `#B91C1C` — NOT `qfpay-error` red
- [ ] Connecting state: sapphire register — unchanged message copy
- [ ] Footer: no `Shield` icon — clean text link only
- [ ] `X` close button removed from header — click-outside/Escape still works
- [ ] `X`, `Shield` Lucide imports removed — `Loader2` kept
- [ ] `handleWalletSelect`, click-outside, Escape handlers unchanged
- [ ] `TalismanIcon`, `SubWalletIcon`, `MetaMaskIcon` SVGs unchanged
- [ ] Modal springs in from below on mobile (`items-end` on small screens)
- [ ] Modal centers on desktop (`sm:items-center`)
- [ ] Backdrop click dismisses — unchanged behavior

---

## SERIES COMPLETE

This is the final prompt in the QFPay QDL redesign series. The full set:

| Prompt | Screens / Components |
|--------|---------------------|
| Screen 1 | `DisconnectedView`, `ThresholdScene`, `NamePill` |
| Screen 2 | `IdentityScreen`, `RecipientScreen`, `ConnectedPill`, `App.tsx` |
| Screen 3 | `AmountScreen`, `sounds.ts` guard |
| Screen 4 | `ConfirmScreen`, `App.tsx` one-line change |
| Screen 5+6 | `AnimationSequence` |
| Polish | `Toast`, `WalletModal` |

All six prompts reference the same design decisions document
(`QFPay_QDL_Design_Decisions.md`) as the source of truth.

---

*QDL — Quantum Design Language. Interactions are ceremonies, not clicks.*
*Built for QF Network. qfpay.xyz*
