# QFPay — Build Specification
## Clean Build Implementation Guide for Claude Code

---

## Before You Start

Read `design.md` in the root folder first and fully. Every decision in this
file has a reason documented there. When something is ambiguous, `design.md`
is the authority on intent. This file is the authority on implementation.

---

## Step 0 — Clean Slate

### Files to Delete
Remove these files entirely before building anything:

```
src/components/DisconnectedView.tsx
src/components/ThresholdScene.tsx
src/components/NamePill.tsx
src/components/BurnParticle.tsx
src/components/IdentityScreen.tsx
src/components/RecipientScreen.tsx
src/components/AmountScreen.tsx
src/components/ConfirmScreen.tsx
src/components/AnimationSequence.tsx
src/components/EmberParticles.tsx
src/components/Toast.tsx
src/components/WalletModal.tsx
src/components/ConnectedPill.tsx
src/components/hero/ (entire folder)
src/components/ui/Skeleton.tsx
src/lib/recipientDemoNames.ts (if it exists)
```

### Files to Keep — Do Not Touch
```
src/stores/walletStore.ts
src/stores/paymentStore.ts
src/utils/ (entire folder)
src/config/ (entire folder)
src/abi/ (entire folder)
src/lib/animations.ts
src/lib/colors.ts
src/hooks/
src/assets/
src/index.css
tailwind.config.js
package.json
All config files (vite, tsconfig, etc)
contracts/
.papi/
```

### App.tsx — Keep But Update
`App.tsx` references deleted components. Update it to import from the new
component paths as you build them. Do not rebuild App.tsx routing logic —
the phase machine and screen routing stay exactly as-is. Only the import
statements and the connected pill / logout button swap need updating.

---

## Token Reference — Use These Everywhere

From `src/lib/colors.ts` — import and use, never hardcode:
- `BRAND_BLUE` = `#0040FF` — sapphire
- `BG_PRIMARY` = `#060A14` — the void
- `BG_SURFACE` = `#0C1019` — pill surfaces, modal backgrounds
- `BURN_CRIMSON` = `#B91C1C` — burn color (use at varying opacities)
- `SUCCESS_GREEN` = `#00D179` — arrival, confirmation

From `src/lib/animations.ts` — import and use:
- `EASE_OUT_EXPO` — primary easing curve
- `EASE_SPRING` — spring transitions
- `EASE_IN_OUT` — secondary easing

From `tailwind.config.js` — use class names:
- `font-clash` — Clash Display
- `font-satoshi` — Satoshi
- `font-mono` — JetBrains Mono
- `text-qfpay-text-primary`, `text-qfpay-text-secondary`, `text-qfpay-text-muted`

---

## The 18 Network Identities

These are fixed. Same name always gets the same gradient. Do not randomize.

```
vector        — blue-indigo gradient
memechi       — pink-rose gradient
steve         — slate-blue gradient
hwmedia       — violet-purple gradient
teddy         — orange-amber gradient
satoshiflipper — orange-red gradient
altcoinsensei — cyan-blue gradient
soapy         — teal-emerald gradient
patrick       — blue-cyan gradient
drprofit      — green-teal gradient
vitalik       — purple-violet gradient
cryptomonk   — indigo-blue gradient
overdose      — red-orange gradient
amg           — amber-yellow gradient
bino          — pink-fuchsia gradient
nils          — slate-gray gradient
cryptouser28  — blue-slate gradient
sam           — emerald-green gradient
```

Use Tailwind gradient pairs from the existing color palette. Keep them visually
diverse so the pill network looks varied, not monochromatic.

---

## Component Build Order

Build in this exact order. Each component is used by the next.

1. `NamePill` — used everywhere
2. `Toast` — needed before testing anything
3. `WalletModal` — needed before testing connection
4. `ConnectedPill` — used on Screens 2–3 and 6
5. `DisconnectedView` + `ThresholdScene` — Screen 1
6. `IdentityScreen` + `RecipientScreen` — Screen 2
7. `AmountScreen` — Screen 3
8. `ConfirmScreen` — Screen 4
9. `AnimationSequence` — Screens 5 and 6

---

## Component 1 — NamePill

**File:** `src/components/NamePill.tsx`

The foundational identity component. Used on every screen. Gets it right here
and it flows through everything else.

**Props:**
- `name` — string, the `.qf` name without suffix (e.g. `"alice"`)
- `color` — string, CSS gradient for avatar fallback
- `avatarUrl` — optional string, real image URL when available
- `state` — `'default' | 'dimmed' | 'connecting' | 'arriving'`
- `size` — `'sm' | 'md'` — sm for depth-layer background pills, md default

**Visual construction:**
- Container: `BG_SURFACE` fill, `1px solid rgba(255,255,255,0.10)` border,
  fully rounded pill, padding tighter on sm
- Avatar left: 32px on md, 26px on sm. Real image if `avatarUrl` present.
  Gradient circle with initial letter as fallback. Clash Display bold initial.
- Presence dot: 7px on md, 6px on sm. `SUCCESS_GREEN`. Absolute positioned
  bottom-right of avatar. White border to lift it off the surface. Gentle
  pulse animation using `animate-pulse-glow`.
- Name right: Satoshi Medium, white at 90%. `.qf` suffix in `BRAND_BLUE`
  at 85%. No space — renders as `alice.qf` not `alice .qf`
- Gap between avatar and name: 10px on md, 7px on sm

**State behavior:**
- `default` — as described above
- `dimmed` — opacity 0.35, transition 300ms
- `connecting` — border shifts to sapphire at 35% opacity, subtle glow
- `arriving` — green border, green glow, used during Screen 5 arrival

**Size sm** — avatar shrinks, font drops to `text-xs`, padding tightens.
Used for depth-layer pills on Screen 1 only.

---

## Component 2 — Toast

**File:** `src/components/Toast.tsx`

The toast store logic — `showToast`, `addToast`, `removeToast`, listeners,
timing rules — stays exactly as it exists in the original file. Copy the
store logic verbatim. Only rebuild the visual rendering.

**Timing rules (do not change):**
- Success: auto-dismisses at 3s
- Warning: auto-dismisses at 7s
- Error: never auto-dismisses, has manual dismiss button
- Max 3 toasts visible simultaneously

**Visual construction:**
- Clear glass surface: `blur(12px)`, `border-radius: 14px`
- Success color: `SUCCESS_GREEN` at 6% opacity background, 15% border, full text
- Warning color: amber `#F59E0B` same treatment
- Error color: `BURN_CRIMSON` `#B91C1C` same treatment — not red, crimson
- Icon: animated path-length checkmark for success. Simple `!` for warning.
  Simple `×` for error. No Lucide icons.
- Error toasts only have a manual dismiss `✕` button
- Entrance: success/warning slide from top. Error slides from bottom.
- Position: centered top, `z-index` above everything including ConnectedPill

---

## Component 3 — WalletModal

**File:** `src/components/WalletModal.tsx`

All wallet connection logic, `handleWalletSelect`, click-outside and Escape
handlers, `modalRef`, and all three wallet SVG icon components stay exactly
as they exist in the original file. Copy them verbatim. Only rebuild the
rendered surface.

**Visual construction:**
- Backdrop: `rgba(0,0,0,0.7)` — no backdrop blur on the backdrop itself
- Modal surface: `BG_SURFACE` at 95% opacity, `blur(24px)`,
  `border-radius: 24px`, `1px solid rgba(255,255,255,0.10)`
- Double box-shadow: faint sapphire ring at 1px plus deep drop shadow —
  gives the modal the self-illuminating quality
- Header: centered. Logo mark SVG above heading. "Connect your wallet" in
  Clash Display bold. Sub-text explains `.qf` name requirement with sapphire
  `.qf` inline.
- No `X` close button — click-outside and Escape already handle dismissal
- Error state: `BURN_CRIMSON` at 6% background, 15% border — same language
  as Toast errors. Never red.
- Connecting state: sapphire `BRAND_BLUE` treatment
- Wallet buttons: clear glass, `border-radius: 14px`, staggered entrance
  with 60ms delay between each. Hover lifts 1px and brightens border with
  sapphire tint.
- Footer: plain text link to talisman.xyz. No Shield icon.

---

## Component 4 — ConnectedPill

**File:** `src/components/ConnectedPill.tsx`

The persistent session indicator. Appears top-right on Screens 2, 3, and 6.
Hidden on Screens 4 and 5.

**Visual construction:**
- Same pill DNA as NamePill but wider — it contains balance information
- `BG_SURFACE` fill, `1px solid rgba(255,255,255,0.10)`, fully rounded
- Real avatar (40px). Presence dot bottom-right.
- Name in Satoshi Medium, `.qf` in `BRAND_BLUE`
- Square separator dot: 4px, white at 30%
- Balance in `BRAND_BLUE` at 80%, JetBrains Mono. Masked by default
  as `•••• QF`. Tapping the pill body toggles reveal — instant character swap.
- Chevron `▾` on the right — tapping opens dropdown

**Dropdown:**
- Clear glass, `border-radius: 12px`, spring entrance 150ms
- "Copy address" — copies wallet address to clipboard
- "Disconnect" — calls `disconnect()` from walletStore
- Sound toggle — reads/writes `localStorage` key `qfpay-sound-enabled`
- Tap outside to dismiss

**Balance loading:** calls `getQFBalance` on mount. Shows `··· QF` while loading.

**App.tsx integration:** Replace the current `LogOut` icon button with
`ConnectedPill`. Hidden during `preview`, `broadcasting`, `burn`, `sending`,
`success` phases.

---

## Component 5 — DisconnectedView + ThresholdScene

**Files:**
- `src/components/DisconnectedView.tsx`
- `src/components/ThresholdScene.tsx`

### DisconnectedView

Three zones in a `min-h-screen` flex column:

Top zone — logo mark centered (use `logo-mark.svg` from assets), headline
below it. Headline: `clamp(2rem, 4vw, 3.5rem)`, Clash Display bold.
"Instant money." in white. "Just a name." with sapphire on the word "name".

Middle zone — `flex-1`, `position: relative`, `min-height: 60vh`. This zone
owns the viewport and must have real height. `ThresholdScene` fills it with
`position: absolute, inset: 0`.

Bottom zone — `ShimmerButton` with "Connect Wallet" label. Trust line below.
`ShimmerButton` lives at `src/components/hero/ShimmerButton.tsx` — import
from there. Button calls `setShowWalletModal(true)` from walletStore and
`hapticMedium()`.

### ThresholdScene

The full network of 18 floating identity pills. Read `design.md` Screen 1
section carefully before building.

**The 18 identities with their gradients** — define as a constant array.
Each entry has: `id` (0–17), `name`, `color` (CSS gradient string).

**Three depth layer constants** — define fixed positions as percentage-based
`{ id, x, y }` objects. `x` and `y` are `left` and `top` percentages.
- Foreground: 6 pills, positions spread across the viewport with breathing room
- Midground: 6 pills, different positions, opacity 0.65
- Background: 6 pills, different positions, opacity 0.35

Positions must be spread enough that no two pills overlap on any common
screen size. Avoid the center 30% of the screen horizontally — that belongs
to the headline on desktop.

**Drift configs** — define as a constant array, one per pill. Each has:
`dx` (horizontal drift in px), `dy` (vertical drift in px), `duration` (seconds).
Foreground pills: duration 18–24s, amplitude ±12px.
Midground pills: duration 14–20s, amplitude ±10px.
Background pills: duration 12–16s, amplitude ±8px.
These are fixed values — not random on each render.

**Drift animation** — Framer Motion `animate` with `transition: { repeat: Infinity,
repeatType: 'mirror', ease: 'easeInOut', duration }`. Pills oscillate gently.

**Pill entrance** — staggered on mount. Each pill fades in and scales from 0.92
to 1 with a delay of `id * 120ms`. The network assembles over approximately
2 seconds.

**Connection lines** — every 4500ms, select two random foreground pill IDs
(different from the previous pair). Measure their current DOM positions using
`getBoundingClientRect` relative to the container. Draw an SVG line between
their centers. The line fades in over 300ms, holds for 800ms with a small
sapphire dot travelling along it, then fades out over 400ms. Use a single
absolutely positioned SVG covering the full scene container for all lines.
Store active connections in component state.

**Mobile** — reduce to 5 foreground, 4 midground, 3 background pills.
Use `window.innerWidth < 640` to switch between configurations. Halve
the drift amplitude on mobile.

**Reduced motion** — static layout. All pills visible at their base positions,
no drift, no connection lines. No entrance animation.

**Critical:** The `ThresholdScene` container must have `position: relative`
and real height. The parent `DisconnectedView` middle zone provides
`min-height: 60vh`. Pills use `position: absolute` with percentage-based
`left` and `top` — they need a parent with defined height or they all
collapse to the same point and disappear.

---

## Component 6 — IdentityScreen

**File:** `src/components/IdentityScreen.tsx`

Uses: `useWalletStore` for `qnsName`, `address`, `ss58Address`, `avatarUrl`.
Uses: `usePaymentStore` for `goToRecipient`.
Uses: `getQFBalance`, `formatQF`, `truncateAddress` from `utils/qfpay`.
Uses: `ShimmerButton` from `hero/ShimmerButton`.

### Has .qf Name — Recognition Ceremony

The ceremony plays once per session. Track with `sessionStorage` key
`qfpay-ceremony-played`. On subsequent visits show settled state immediately.

**Ceremony phases:** `blooming → naming → contracting → settled`

Timing: blooming 0–600ms, naming 600–1200ms, contracting 1200–1800ms,
settled from 1800ms onward.

During blooming and naming: avatar at center, large (~80px), spring entrance
from scale 0.6 and blur 8px. Name appears 200ms after avatar with
`clamp(2rem, 6vw, 3.5rem)` Clash Display. Balance counts up from 0 to actual
value over 600ms using setInterval.

During contracting: the cluster animates toward top-right and fades out.
Simultaneously, ConnectedPill (in App.tsx top-right) fades in with a delay
that makes the two feel connected. Use `sessionStorage` key
`qfpay-ceremony-played` to give ConnectedPill a 1400ms entrance delay on
first connection only.

Settled state: auto-typing input at center. Entire screen is a tap target
that calls `goToRecipient()` with `hapticMedium()`. See RecipientScreen for
auto-typing implementation — share constants via `src/lib/recipientDemoNames.ts`.

### No .qf Name Fork

Address blooms to center in JetBrains Mono. Two lines appear sequentially:
honest statement about needing a name, then tappable `dotqf.xyz` link in
sapphire. ShimmerButton: "Get my .qf name". No input appears.

---

## Component 7 — RecipientScreen

**File:** `src/components/RecipientScreen.tsx`

Uses: `usePaymentStore` for `setRecipient`, `goToAmount`, `goBackToIdle`,
`recipientAddress`, `recipientName`, `recipientAvatar`.
Uses: `resolveForward`, `getAvatar`, `detectAddressType`, `ss58ToEvmAddress`
from their existing utility files.
Uses: `hapticLight`, `hapticDouble` from haptics.

### Resolution Logic — Copy Verbatim

The entire name resolution logic from the original `RecipientScreen.tsx`
is correct and must be copied exactly — the `resolveInput` callback,
the `detectAddressType` switch, the self-send check, the avatar fetch,
the `setRecipient` call, the error states. Do not rewrite this logic.

### Visual Layer — Build Fresh

Back chevron `‹` top-left, 25% opacity, `hapticLight` + `goBackToIdle`.

No "Send to" label.

Auto-typing placeholder: same constants from `src/lib/recipientDemoNames.ts`.
Stops instantly on real input.

Input display: large Clash Display above a sapphire underline. Hidden real
input with `opacity: 0` receives actual keypresses.

Resolution feedback: no spinner during typing. On resolution, underline runs
sapphire wave. Recipient avatar materializes **above** the input — large
(64px), spring entrance from scale 0.5 and blur 12px. Single pulse ring
expands on arrival. Continuous breathing after. Everything else dims 15%.
Recipient name appears below the avatar.

The resolved avatar is the tap target to advance. `hapticDouble` fires on
resolution. `hapticLight` fires on advance tap.

Continue: chevron `›` appears below underline when resolved. Tap advances
to Screen 3 with `hapticLight` + `goToAmount`.

Add `layoutId="recipient-avatar"` to the resolved avatar — shared element
transition carries it to Screen 3.

Unresolved: underline turns amber. No error card.

Error text ("Not found", "Cannot send to yourself") appears inline in amber
below the underline. Satoshi 13px.

Screen entrance: slide up from `y: 40` to `y: 0`. Exit: slide to `y: -20`.

---

## Component 8 — AmountScreen

**File:** `src/components/AmountScreen.tsx`

Uses: `usePaymentStore` for `recipientName`, `recipientAddress`, `recipientAvatar`,
`setAmount`, `goToPreview`, `goBackToRecipient`.
Uses: `useWalletStore` for `ss58Address`, `address`.
Uses: `getQFBalance`, `formatQF`, `calculateBurn`, `truncateAddress` from utils.
Uses: `parseQFAmount`, `isValidAmountInput` from `utils/parseAmount`.
Uses: `GAS_BUFFER` from `config/contracts`.
Uses: `hapticLight`, `hapticMedium` from haptics.

### Calculation Logic — Copy Verbatim

```
amountWei = parseQFAmount(amountInput)
{ burnAmount, recipientAmount, totalRequired } = calculateBurn(amountWei)
insufficientBalance = amountWei > 0n && totalRequired + GAS_BUFFER > balance
canContinue = amountWei > 0n && !insufficientBalance && recipientAddress
maxSendableWei = balance > GAS_BUFFER
  ? ((balance - GAS_BUFFER) * 10000n) / 10010n : 0n
```

These calculations are correct. Do not alter them.

### Visual Layer

Back chevron `‹` top-left.

Recipient presence top-center: avatar via `layoutId="recipient-avatar"` (48px),
name`.qf` below in Satoshi.

Balance line: JetBrains Mono 11px, white at 30% base opacity. Brightens toward
100% as amount approaches balance limit. Color shifts to amber if insufficient.

Amount display: large Clash Display, `clamp(3rem, 10vw, 6rem)`. `QF` trailing
in sapphire. Placeholder `0` at 20% opacity. Underline below. Sapphire wave
animation on underline when `canContinue` becomes true.

No OS keyboard. `inputMode="none"` on hidden input.

**Custom keyboard:** fixed bottom, full width, clear glass keys, Clash Display
numbers, `border-radius: 12px` per key. Three rows of digits plus bottom row
with decimal, 0, MAX, backspace. MAX has sapphire tint. Each key: `hapticLight`
on tap, scale 0.96 on press. Long-press backspace (500ms) clears entire input.
`paddingBottom` on the main container compensates for keyboard height.

Burn line below underline — appears as soon as any amount is typed:
`[totalRequired] QF leaves your wallet · 🔥 [burnAmount] burns`
Left in white at 45%. Right in `BURN_CRIMSON` at 60%.

Insufficient balance: amber inline text below burn line. No card, no modal.

Continue trigger `›`: appears when `canContinue`. `hapticMedium` on tap.
`setAmount(...)` called with all 5 args before `goToPreview()`.

Screen entrance: slide up from `y: 40`. Exit: slide to `y: -20`.

---

## Component 9 — ConfirmScreen

**File:** `src/components/ConfirmScreen.tsx`

Uses: `useWalletStore` for `address`, `ss58Address`, `qnsName`, `avatarUrl`,
`providerType`.
Uses: `usePaymentStore` for all payment state and navigation actions.
Uses: `writeContract` from `utils/contractCall`.
Uses: `QFPAY_ROUTER_ADDRESS`, `ROUTER_ABI` from `config/contracts`.
Uses: `isRetryableError`, `RETRY_MESSAGE_SHORT` from `utils/errorHelpers`.
Uses: `showToast` from `Toast`.
Uses: `hapticLight`, `hapticMedium` from haptics.
Uses: `formatQF` from utils.

### Transaction Logic — Copy Verbatim

The entire `handleConfirm` async function from the original `ConfirmScreen.tsx`
is correct and must be copied exactly. This includes:
- The `providerType` check (evm vs substrate)
- The dynamic import of `evmWriteContract`
- The `writeContract` call with exact arguments
- The `setBroadcasting`, `startAnimation`, `setConfirmation` sequence
- The 400ms delay between `confirmed` button state and `startAnimation`
- All error handling, toast calls, and `goBackToAmount` calls

The `buttonState` machine (`idle | signing | confirmed`) stays as-is.

### Visual Layer

No ConnectedPill on this screen. Back chevron `‹` top-left, hidden during
`broadcasting` phase.

Three rows separated by two dividers:

Sender pill: `BG_SURFACE` fill, fully rounded, avatar (40px), name`.qf`,
square separator dot, `[totalRequired] QF leaving` in JetBrains Mono.

Divider: `1px rgba(255,255,255,0.06)`.

Burn row: centered, no container. `🔥 [burnAmount] QF burns forever` in
`BURN_CRIMSON` at 80%. The word `forever` appears here in present tense —
this is the commitment register.

Divider: `1px rgba(255,255,255,0.06)`.

Recipient pill: same structure as sender. `[recipientAmount] QF arriving`.

Assembly: each row fades in sequentially with explicit delay offsets (not
staggerContainer). Sender 0ms, divider 100ms, burn 150ms, divider 200ms,
recipient 250ms. Send button always last at 400ms delay.

**Send button:** wide pill, `border-radius: 100px`, sapphire fill, shimmer
border at 4s rotation, "Send" in Clash Display, heartbeat pulse on 2s loop.

Press-and-hold 800ms. Use `setInterval` at ~60fps to track progress 0–1.
Radial fill brightens from left as progress indicator. Three haptics: light
on press, medium at 400ms, medium at completion. Release before complete:
progress snaps to 0, button pulses once. First visit only: auto-demo fills
to 60% then reverses — use `sessionStorage` key `qfpay-send-taught`.

During `signing`: Loader2 spinner + "Signing..." label.
During `confirmed`: checkmark + "Sent" label.

Desktop: pointer events handle click-and-hold identically to touch.

Screen entrance: scale from 0.96 to 1.

---

## Component 10 — AnimationSequence

**File:** `src/components/AnimationSequence.tsx`

Uses: `usePaymentStore` for `phase`, `recipientAmountWei`, `burnAmountWei`,
`recipientName`, `recipientAddress`, `recipientAvatar`, `confirmed`,
`advanceToSending`, `advanceToSuccess`, `reset`.
Uses: `useWalletStore` for `qnsName`, `avatarUrl`.
Uses: `formatQF` from utils.
Uses: `hapticBurn`, `hapticImpact`, `hapticSuccess` from haptics.
Uses: `playBurnSound`, `playSendSound`, `playSuccessSound` from sounds.
Uses: `NamePill` component.
Uses: `ShimmerButton` for "Send again" button on Screen 6.

Before using sound functions: add an `isSoundEnabled()` guard at the top of
`utils/sounds.ts` that reads `localStorage.getItem('qfpay-sound-enabled') !== 'false'`.
Each exported sound function checks this before playing.

### Phase Timing — Do Not Change

```
burn phase:    1800ms → advanceToSending (reducedMotion: 400ms)
sending phase: 2200ms → advanceToSuccess (reducedMotion: 400ms)
success phase: no auto-advance
```

### Derived Value

`departureAmountWei = recipientAmountWei + burnAmountWei`

This is the amount that left the sender's wallet. It equals `totalRequiredWei`.
Compute it here — AnimationSequence does not need `totalRequiredWei` from store.

### Screen 5 — burn and sending phases

**Layout:** Vertical. Sender pill top, amount center, recipient pill bottom.
All centered on the same vertical axis. Full viewport height. No card.

**State flags to track:** `senderDimmed`, `recipientArriving`, `showCheckmark`,
`pillsVisible`, `trailVisible`, `displayAmount` (float for countdown),
`amountColor` (white or amber).

**Background:** Animate the root div's `backgroundColor`. Burn phase: `#0F0608`.
Sending phase: `#060A14`. Success phase: `#0040FF` via radial bloom.

**Act 1 — Charge (burn phase, 0–600ms):**
Pills appear with staggered entrance. Trail draws from sender down to amount.
Amount materializes at center with spring from scale 0.7 and blur 8px.
Amount shows `departureAmountWei` (e.g. 100.1 QF) in white.

**Act 2 — Burn (burn phase, 600–1800ms):**
At 600ms: background shifts to `#0F0608`, `playBurnSound()`, `hapticBurn()`.
Amount color shifts to amber. Countdown begins using `requestAnimationFrame`
— interpolate from `Number(departureAmountWei)/1e18` down to
`Number(recipientAmountWei)/1e18` over 700ms with easeOut. Display using
`formatQF(BigInt(Math.round(displayAmount * 1e18)))`. Amount holds amber
200ms then returns to white. Background restores to `#060A14`. Sender dims.

**Act 3 — Send (sending phase, 0–800ms):**
`playSendSound()` at start. Amount travels downward toward recipient pill
via `y` animation over 800ms. Trail draws from center down to recipient.

**Act 4 — Resolution (sending phase, 800–2200ms):**
At 800ms: `hapticImpact()`, checkmark draws at center (emerald, path-length
animation), `setRecipientArriving(true)`, `setPillsVisible(false)`.
Pills fade out. Checkmark holds alone. Sapphire radial bloom expands from
center. `advanceToSuccess` fires at 2200ms.

### Screen 6 — success phase

`playSuccessSound()` and `hapticSuccess()` fire when phase becomes `success`.

Background opens at `#0040FF` (inherited from bloom). Cools to `#080D1A`
over 1500ms with 800ms delay.

Assembly with delays:
- Checkmark: immediately visible (persists from Screen 5)
- Burn epitaph (800ms delay): `🔥 [burnAmount] QF burned forever` in crimson.
  Past tense. `burned` not `burns`.
- Receipt card (1400ms delay, spring): clear glass, `border-radius: 20px`.
  Contains compact sender and recipient representation, sapphire arrow between
  them, amount and burn amount (crimson), timestamp, share icon.
  Share icon: `navigator.share` if available, otherwise clipboard copy.
- Action buttons (2000ms delay): "Send again" shimmer button calls `reset()`.
  "Done" plain text calls `reset()`.
- On-chain confirmation status: copy this exactly from the original
  `AnimationSequence.tsx` — the pulsing dot and "Confirming..." / "Confirmed
  on-chain" text. Do not rewrite this.

---

## Shared Library — recipientDemoNames

**File:** `src/lib/recipientDemoNames.ts`

Create this file with the auto-typing constants used by both IdentityScreen
and RecipientScreen:

- `EXAMPLE_NAMES` — array of names from the 18 network identities, cycling
  order, with `.qf` suffix included
- `TYPE_SPEED` — 80ms per character
- `DELETE_SPEED` — 40ms per character
- `PAUSE_AFTER_TYPE` — 1500ms
- `PAUSE_AFTER_DELETE` — 300ms

Both screens import from here. Never duplicate these constants.

---

## App.tsx Updates

After building all components, update `App.tsx`:

Replace the `LogOut` button block with `ConnectedPill` wrapped in
`AnimatePresence`. Hide it when:
`phase === 'burn' || phase === 'sending' || phase === 'success' || phase === 'preview' || phase === 'broadcasting'`

Update `isAnimating` to include `preview` and `broadcasting`.

Update all component imports to point to the new files.

Keep all routing logic, phase machine usage, background color animation,
offline indicator, and WalletModal/Toast exactly as-is.

---

## Testing Checklist — Screen by Screen

**Screen 1:**
- All 18 pills visible on load, none overlapping badly
- Three depth layers visible — foreground clear, background dim
- Drift is slow and continuous, like breathing
- Connection lines appear every ~4.5 seconds between foreground pills
- Sapphire dot travels along each connection line
- Headline is readable above the pill network
- Connect Wallet button shimmer border rotating
- Mobile: fewer pills, nothing clips

**Screen 2:**
- Recognition ceremony plays on first connect, not again
- Avatar blooms at center, name appears, balance counts up
- Identity contracts toward top-right, ConnectedPill appears
- Auto-typing demo starts after ceremony
- Name resolution: avatar appears above input when resolved
- Pulse ring on resolved avatar, everything else dims
- No-.qf fork: address bloom, honest invitation, no input

**Screen 3:**
- No OS keyboard appears on mobile
- Custom keyboard covers bottom, all keys functional
- Amount updates as keys pressed
- Burn line appears immediately when amount typed
- Burn line crimson, not orange
- MAX key fills correct maximum amount
- Continue `›` appears when valid

**Screen 4:**
- No ConnectedPill visible
- Three rows with two dividers clearly visible
- Sender pill shows `leaving`, recipient shows `arriving`
- Burn row shows `burns forever` in crimson
- Press-and-hold: fill progresses over 800ms
- Release before complete: resets with pulse
- First visit: auto-demo plays

**Screen 5:**
- Background shifts to crimson during burn — clearly visible
- Amount counts down during burn phase
- Background restores after burn
- Sapphire bloom on completion
- Vertical layout on all screen sizes

**Screen 6:**
- Opens in sapphire world
- 800ms stillness before anything appears
- Burn epitaph: `burned` not `burns`
- Receipt card slides up
- "Send again" and "Done" both work
- On-chain confirmation status matches transaction state

---

*QDL — Quantum Design Language. Interactions are ceremonies, not clicks.*
*Built for QF Network. qfpay.xyz*
