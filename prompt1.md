# QFPay — Screen 1 Redesign
## SWE Implementation Prompt

---

## CONTEXT AND CURRENT STATE

The current `ThresholdScene.tsx` attempts a horizontal payment ceremony animation —
two name pills at opposite edges of a wide row, an amount flying between them.
It is broken: the amount renders at an enormous size and flies off the right edge,
the pills are barely visible, and the burn particle has no real presence.

The entire concept is also wrong for the product at this stage. The horizontal
ceremony tried to demo the transfer mechanic — but the actual transfer animation
lives on Screen 5, done properly in vertical layout. Screen 1 demoing a different
version of that same mechanic creates incoherence.

**The new concept for Screen 1: "The Network."**

Instead of a fake payment ceremony, show the world of `.qf` identities that exists
inside QFPay. Identity pills drifting slowly across the full viewport. Occasionally,
a sapphire line illuminates between two pills — a connection, a transfer, no amount
shown. The user is outside looking in at a network they're about to join.

---

## FILES TO CHANGE

### REWRITE — full replacement:
- `src/components/ThresholdScene.tsx`
- `src/components/NamePill.tsx`
- `src/components/DisconnectedView.tsx`

### ADD to `src/index.css`:
- One new keyframe (see CSS section below)

### DELETE — these files are dead after this change:
- `src/components/BurnParticle.tsx` — not used on Screen 1 in new design
- `src/components/hero/PaymentCeremony.tsx` — replaced entirely by ThresholdScene
- `src/components/hero/CeremonyAtmosphere.tsx` — no longer needed
- `src/components/hero/IdentityAnchor.tsx` — replaced by new NamePill

### DO NOT TOUCH:
- `src/components/hero/ShimmerButton.tsx` — already correct
- `src/lib/animations.ts` — use existing easing curves as-is
- `src/lib/colors.ts` — use existing tokens, do not add new ones
- `tailwind.config.js` — no changes needed
- Any store files, App.tsx, WalletModal.tsx, or other screen components

---

## COLOR AND TOKEN REFERENCE

Use these from `src/lib/colors.ts` and `tailwind.config.js` — do not hardcode
values that already exist as tokens:

```typescript
// From colors.ts — import and use these
BRAND_BLUE       = '#0040FF'   // sapphire — trail lines, .qf suffix, active states
BG_PRIMARY       = '#060A14'   // void background — the constant
BG_SURFACE       = '#0C1019'   // pill container fill (slightly lighter than void)
BURN_CRIMSON     = '#B91C1C'   // burn color — NOT used on Screen 1 (reserved for S3-S6)
SUCCESS_GREEN    = '#00D179'   // arrival state green
```

```javascript
// Tailwind tokens available (use className where possible):
'qfpay-blue'        // #0040FF
'qfpay-bg'          // #060A14
'qfpay-surface'     // #0C1019
'qfpay-border'      // rgba(0,64,255,0.08)
'qfpay-burn'        // #B91C1C — not used on Screen 1
'qfpay-green'       // #00D179
'font-clash'        // Clash Display
'font-satoshi'      // Satoshi
'font-mono'         // JetBrains Mono
```

---

## 1. `src/components/NamePill.tsx` — Full Rewrite

The current NamePill is a functional but low-quality component — gradient letter
avatar, minimal border, no depth. The new quality bar is Image 2 from the brief:
dark rounded container, real avatar area, name in clean type, presence dot, depth.

Since Screen 1 uses demo identities (not real wallet data), avatars are rendered
as rich gradient circles with a single letter. The pill structure must be ready for
real avatar images when used in later screens — accept an optional `avatarUrl` prop.

**Visual spec — matching the quality of the reference image:**
- Container: `BG_SURFACE` (`#0C1019`) fill — noticeably darker than the void,
  giving the pill real material presence against `#060A14`
- Border: `1px solid rgba(255,255,255,0.10)` — slightly brighter than before
- Border-radius: `9999px` (fully rounded pill)
- Padding: `8px 14px 8px 8px`
- No blur, no glassmorphism — the depth comes from the surface color contrast

**Avatar (left):**
- 32px circle, `border-radius: 50%`
- If `avatarUrl` provided: render `<img>` with `object-fit: cover`
- If no `avatarUrl`: gradient background (passed as `color` prop) with initial letter
  in Clash Display, 13px, bold, white
- Presence dot: 7px circle, `#00D179` (SUCCESS_GREEN), positioned bottom-right
  of avatar with `position: absolute`, slight white border `1.5px solid #060A14`
  to lift it off the surface. Pulses via `animate-pulse-glow` (already in CSS)

**Name (right of avatar):**
- `gap-2.5` between avatar and text
- Name: Satoshi Medium, `text-sm`, white at 90% opacity — `rgba(255,255,255,0.9)`
- `.qf` suffix: `BRAND_BLUE` `#0040FF` at 85% opacity — `rgba(0,64,255,0.85)`
- No space between name and `.qf` — renders as `alice.qf` not `alice .qf`

**States:**
```typescript
interface NamePillProps {
  name: string           // e.g. "alice" — rendered as "alice.qf"
  color: string          // gradient string for avatar fallback
  avatarUrl?: string     // optional real image — used in later screens
  state?: 'default' | 'dimmed' | 'connecting' | 'arriving'
  size?: 'sm' | 'md'    // sm = Screen 1 background pills, md = default
  className?: string
}
```

- `default`: as specified above
- `dimmed`: `opacity: 0.35`, transition 300ms
- `connecting`: border shifts to `rgba(0,64,255,0.35)`, subtle sapphire glow
  `box-shadow: 0 0 16px rgba(0,64,255,0.12)`
- `arriving`: border `rgba(0,209,121,0.4)`, glow `0 0 20px rgba(0,209,121,0.15)`

**Size variant `sm`:**
- Avatar: 26px
- Font: `text-xs`
- Padding: `6px 10px 6px 6px`
- Used for depth-layer background pills in ThresholdScene

```typescript
// NamePill.tsx
import { motion } from 'framer-motion'
import { BRAND_BLUE, SUCCESS_GREEN, BG_SURFACE } from '../lib/colors'

export interface NamePillProps {
  name: string
  color: string
  avatarUrl?: string
  state?: 'default' | 'dimmed' | 'connecting' | 'arriving'
  size?: 'sm' | 'md'
  className?: string
}

export function NamePill({
  name,
  color,
  avatarUrl,
  state = 'default',
  size = 'md',
  className = '',
}: NamePillProps) {
  const initial = name[0].toUpperCase()
  const isMd = size === 'md'

  const borderColor = {
    default: 'rgba(255,255,255,0.10)',
    dimmed: 'rgba(255,255,255,0.06)',
    connecting: `rgba(0,64,255,0.35)`,
    arriving: 'rgba(0,209,121,0.4)',
  }[state]

  const boxShadow = {
    default: 'none',
    dimmed: 'none',
    connecting: '0 0 16px rgba(0,64,255,0.12)',
    arriving: '0 0 20px rgba(0,209,121,0.15)',
  }[state]

  return (
    <motion.div
      className={`inline-flex items-center rounded-full ${className}`}
      style={{
        background: BG_SURFACE,
        border: `1px solid ${borderColor}`,
        boxShadow,
        padding: isMd ? '8px 14px 8px 8px' : '6px 10px 6px 6px',
        gap: isMd ? '10px' : '7px',
      }}
      animate={{ opacity: state === 'dimmed' ? 0.35 : 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="rounded-full object-cover"
            style={{ width: isMd ? 32 : 26, height: isMd ? 32 : 26 }}
          />
        ) : (
          <div
            className="rounded-full flex items-center justify-center font-clash font-bold text-white"
            style={{
              width: isMd ? 32 : 26,
              height: isMd ? 32 : 26,
              background: color,
              fontSize: isMd ? 13 : 11,
            }}
          >
            {initial}
          </div>
        )}
        {/* Presence dot */}
        <div
          className="absolute bottom-0 right-0 rounded-full animate-pulse-glow"
          style={{
            width: isMd ? 7 : 6,
            height: isMd ? 7 : 6,
            background: SUCCESS_GREEN,
            border: '1.5px solid #060A14',
          }}
        />
      </div>

      {/* Name */}
      <span
        className={`whitespace-nowrap font-satoshi font-medium ${isMd ? 'text-sm' : 'text-xs'}`}
        style={{ color: 'rgba(255,255,255,0.9)' }}
      >
        {name}
        <span style={{ color: `rgba(0,64,255,0.85)` }}>.qf</span>
      </span>
    </motion.div>
  )
}
```

---

## 2. `src/components/ThresholdScene.tsx` — Full Rewrite

**The concept:** 10 identity pills distributed across the full viewport, drifting
slowly at two depth layers. Every 4–5 seconds, a sapphire line briefly illuminates
between two randomly selected pills. No amount. No phase machine. No complex timing.
Just a living network of identities.

### The 10 Demo Identities

```typescript
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
```

### Pill Positioning — Two Depth Layers

Divide the 10 pills into two layers. Positions are fixed percentages — no random
on every render, defined as constants so layout is deterministic and stable.

**Foreground layer (6 pills) — full opacity, md size, slower drift:**
```typescript
const FOREGROUND_PILLS = [
  { id: 0, x: 8,  y: 20 },   // top-left zone
  { id: 1, x: 72, y: 12 },   // top-right zone
  { id: 2, x: 18, y: 58 },   // mid-left
  { id: 3, x: 62, y: 52 },   // mid-right
  { id: 4, x: 38, y: 78 },   // bottom-center-left
  { id: 5, x: 78, y: 72 },   // bottom-right
]
```

**Background layer (4 pills) — 45% opacity, sm size, slightly faster drift:**
```typescript
const BACKGROUND_PILLS = [
  { id: 6, x: 45, y: 8  },   // top-center
  { id: 7, x: 88, y: 38 },   // right-mid
  { id: 8, x: 5,  y: 82 },   // bottom-left
  { id: 9, x: 55, y: 88 },   // bottom-center-right
]
```

The `x` and `y` values are viewport percentages for `left` and `top` CSS properties.
Each pill is `position: absolute`.

### Drift Animation

Each pill drifts independently. Use Framer Motion's `animate` with `transition`
set to `repeat: Infinity, repeatType: 'mirror'`. Each pill has a unique drift
vector and duration — hardcoded per pill so it's deterministic, not random.

```typescript
const DRIFT_CONFIGS = [
  { dx: 12, dy: -8,  duration: 18 },  // pill 0
  { dx: -10, dy: 10, duration: 22 },  // pill 1
  { dx: 8,  dy: 12,  duration: 16 },  // pill 2
  { dx: -14, dy: -6, duration: 20 },  // pill 3
  { dx: 10, dy: -10, duration: 24 },  // pill 4
  { dx: -8, dy: 8,   duration: 19 },  // pill 5
  { dx: 6,  dy: 14,  duration: 15 },  // pill 6 (bg)
  { dx: -12, dy: -10,duration: 21 },  // pill 7 (bg)
  { dx: 14, dy: 6,   duration: 17 },  // pill 8 (bg)
  { dx: -6, dy: -12, duration: 23 },  // pill 9 (bg)
]
```

The drift `dx`/`dy` are pixel offsets (small — pills hover in place, not travel).
`transition: { duration, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }`

### The Connection Lines

Every 4500ms, pick two random foreground pill indices (not the same index twice in
a row). Draw an SVG line between their current DOM positions using `getBoundingClientRect`.

**Connection behavior:**
- Line appears with opacity `0` → `0.6` over `300ms`
- Holds at `0.6` for `800ms`
- Fades out `0.6` → `0` over `400ms`
- Total connection duration: `1500ms`
- Stroke: `rgba(0,64,255,0.6)`, `strokeWidth: 1`, no dasharray — solid line
- A small sapphire glow travels along the line during the hold phase:
  a 4px circle `rgba(0,64,255,0.8)` that animates from the source pill to the
  destination pill over `800ms` using `offsetDistance` or simple x/y interpolation

**The SVG for connections:**
Render a single `<svg>` with `position: absolute, inset: 0, width: 100%, height: 100%,
pointerEvents: none, zIndex: 1` covering the scene container. Lines are rendered
inside it and removed when their animation completes.

**Position measurement:**
Use a `ref` map — `pillRefs.current[id]` for each pill. On connection trigger,
call `getBoundingClientRect()` on both pills and compute center points relative
to the container's `getBoundingClientRect()`.

```typescript
// Connection line state
interface Connection {
  id: string
  x1: number; y1: number
  x2: number; y2: number
  phase: 'entering' | 'holding' | 'leaving'
}
```

### Implementation Structure

```typescript
// ThresholdScene.tsx
import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { NamePill } from './NamePill'
import { useReducedMotion } from '../hooks/useReducedMotion'

// ... constants above ...

export const ThresholdScene = memo(function ThresholdScene() {
  const reducedMotion = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const pillRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const [connections, setConnections] = useState<Connection[]>([])
  const [lastConnectedPair, setLastConnectedPair] = useState<[number, number] | null>(null)

  // Connection trigger — every 4500ms
  useEffect(() => {
    if (reducedMotion) return

    const trigger = () => {
      // Pick two different foreground pills, avoid repeating last pair
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

      // Phase the connection through entering → holding → leaving → remove
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
    // Fire once after 1500ms on mount so screen isn't empty too long
    const initial = setTimeout(trigger, 1500)

    return () => {
      clearInterval(interval)
      clearTimeout(initial)
    }
  }, [reducedMotion, lastConnectedPair])

  // Reduced motion: static layout, no drift, no connections
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

      {/* Connection lines SVG */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 1 }}
      >
        <AnimatePresence>
          {connections.map(conn => (
            <motion.g key={conn.id}>
              {/* The line */}
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
              {/* Travelling glow dot */}
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

      {/* Foreground pills */}
      {FOREGROUND_PILLS.map((pos) => {
        const drift = DRIFT_CONFIGS[pos.id]
        const identity = NETWORK_IDENTITIES[pos.id]
        return (
          <motion.div
            key={pos.id}
            ref={(el) => { if (el) pillRefs.current.set(pos.id, el) }}
            className="absolute"
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, zIndex: 2 }}
            animate={{ x: drift.dx, y: drift.dy }}
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

      {/* Background pills — dimmer, sm size */}
      {BACKGROUND_PILLS.map((pos) => {
        const drift = DRIFT_CONFIGS[pos.id]
        const identity = NETWORK_IDENTITIES[pos.id]
        return (
          <motion.div
            key={pos.id}
            className="absolute"
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, opacity: 0.45, zIndex: 1 }}
            animate={{ x: drift.dx, y: drift.dy }}
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
```

---

## 3. `src/components/DisconnectedView.tsx` — Targeted Update

The current `DisconnectedView.tsx` is already structurally correct from the
previous prompt pass — three zones, correct imports, correct `ShimmerButton` path.
It just needs two fixes:

**Fix 1 — The logo placeholder.** Replace the empty `<div className="mb-8 opacity-70">` 
with the actual logo asset:

```typescript
import logoMark from '../assets/logo-mark.svg'

// Replace the logo div with:
<img src={logoMark} alt="QFPay" className="w-8 h-8 mb-8 opacity-70" />
```

**Fix 2 — The stage zone height.** The `ThresholdScene` now needs real viewport
height to distribute pills correctly. Change the stage zone:

```typescript
// Change from:
<div className="flex-1 flex items-center relative z-10">

// To:
<div className="flex-1 relative z-10" style={{ minHeight: '60vh' }}>
```

This gives the scene real vertical space. The pills use `position: absolute` with
percentage-based `top` values — they need a parent with defined height.

**The complete updated DisconnectedView.tsx:**

```typescript
import logoMark from '../assets/logo-mark.svg'
import { useWalletStore } from '../stores/walletStore'
import { hapticMedium } from '../utils/haptics'
import { ThresholdScene } from './ThresholdScene'
import { ShimmerButton } from './hero/ShimmerButton'

export function DisconnectedView() {
  const { setShowWalletModal } = useWalletStore()

  const handleConnect = () => {
    hapticMedium()
    setShowWalletModal(true)
  }

  return (
    <div
      className="relative flex flex-col min-h-screen w-full overflow-hidden"
      style={{ background: '#060A14' }}
    >
      {/* Header zone */}
      <div className="flex flex-col items-center pt-12 pb-2 z-10">
        <img src={logoMark} alt="QFPay" className="w-8 h-8 mb-6 opacity-70" />
        <h1
          className="font-clash font-bold text-white text-center leading-tight"
          style={{
            fontSize: 'clamp(1.1rem, 3vw, 1.75rem)',
            letterSpacing: '-0.02em',
            opacity: 0.92,
          }}
        >
          Instant money.{' '}
          <span style={{ color: '#0040FF' }}>Just a name.</span>
        </h1>
      </div>

      {/* Stage zone — owns the viewport, pills are absolute inside */}
      <div className="flex-1 relative z-10" style={{ minHeight: '60vh' }}>
        <ThresholdScene />
      </div>

      {/* CTA zone */}
      <div className="flex flex-col items-center pb-10 gap-5 z-10">
        <ShimmerButton onClick={handleConnect}>
          Connect Wallet
        </ShimmerButton>
        <p
          className="text-center"
          style={{
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.28)',
            letterSpacing: '0.04em',
          }}
        >
          Powered by QF Network · Sub-second finality · 0.1% deflationary burn
        </p>
      </div>
    </div>
  )
}
```

---

## 4. `src/index.css` — Add One Keyframe

Add this after the existing `void-breath` keyframe. Do not remove or modify
any existing keyframes — `shimmer-rotate`, `pulse-glow`, `burn-drift`,
`void-breath` must all remain.

```css
/* Network scene — pill entrance on mount */
@keyframes pill-emerge {
  from {
    opacity: 0;
    transform: scale(0.92);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: scale(1);
    filter: blur(0px);
  }
}
```

Use this for each pill's mount animation — staggered by `animation-delay`
based on pill index (`index * 120ms`). Apply as inline style on each pill's
wrapper `motion.div`:

```typescript
style={{
  animationName: 'pill-emerge',
  animationDuration: '600ms',
  animationDelay: `${pos.id * 120}ms`,
  animationFillMode: 'both',
  animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)', // EASE_OUT_EXPO
}}
```

---

## MOBILE BEHAVIOUR — 375px

At mobile widths the pill positions remain percentage-based so they scale
naturally. Two adjustments needed:

**1. Prevent pill clipping at edges.** Pills at `x: 8%` or `x: 88%` can
partially overflow at 375px. Add `overflow-hidden` to the scene container
(already present on the parent `DisconnectedView` but confirm it's on the
`ThresholdScene` container div too).

**2. Reduce drift amplitude on mobile.** The `dx`/`dy` values are `px` units.
At 375px a 14px drift is proportionally larger than on desktop. Detect mobile
and halve the drift values:

```typescript
const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
const driftScale = isMobile ? 0.5 : 1

// Apply when setting animate:
animate={{ x: drift.dx * driftScale, y: drift.dy * driftScale }}
```

---

## QUALITY BAR — DEFINITION OF DONE

Verify each before considering this complete:

- [ ] All 10 pills visible on initial load — none clipped, none overlapping badly
- [ ] Pills mount with staggered emerge animation — not all popping in at once
- [ ] Foreground pills (6) are clearly more prominent than background pills (4)
- [ ] Background pills are `sm` size and `0.45` opacity — visibly receded
- [ ] Drift motion is slow and continuous — feels like breathing, not sliding
- [ ] Connection line appears between two pills every ~4.5 seconds
- [ ] Travelling glow dot moves along the connection line during hold phase
- [ ] Connection line fully disappears before next connection triggers
- [ ] No console errors about missing refs or null getBoundingClientRect calls
- [ ] `NamePill` renders with presence dot bottom-right of avatar
- [ ] `.qf` suffix renders in sapphire `#0040FF` — not white, not green
- [ ] `ShimmerButton` shimmer border is actively rotating — not static
- [ ] Logo mark renders above the headline — not an empty div
- [ ] Stage zone has real height — pills are not all collapsed to top of screen
- [ ] Mobile at 375px — pills visible, nothing overflows noticeably
- [ ] Reduced motion — static grid of pills, no drift, no connections
- [ ] No TypeScript errors from deleted components
  (PaymentCeremony, CeremonyAtmosphere, IdentityAnchor no longer imported anywhere)
- [ ] `BurnParticle.tsx` can be deleted — confirm no remaining imports

---

## WHAT THIS SCREEN COMMUNICATES

Before reading a word, the user should feel:

> *"There are people here already. They're connected to each other.
> I'm on the outside looking in. I want to be part of this."*

The pills are not decoration. They are identities. The connection lines are not
animation. They are evidence of a living network. The quality of the pills — real
surface, presence dot, sapphire `.qf` suffix — tells the user what their own
identity will look like once they connect.

Screen 1 is a promise. Everything from Screen 2 onward is that promise kept.

---

*QDL — Quantum Design Language. Interactions are ceremonies, not clicks.*
*Built for QF Network. qfpay.xyz*
