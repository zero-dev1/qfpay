# QFPay — QDL Design Decisions

---

> **QDL Philosophy:** Interactions are ceremonies, not clicks. Every state change
> must feel intentional, weighted, and earned. Each screen has one job, one emotion,
> and one moment of beauty. Nothing is repeated. Everything progresses.

---

## Design Constants

**Background:** `#060A14` — dark sapphire void. The constant across all screens
until Screen 5 breaks it deliberately.

**Brand color:** `#0040FF` — sapphire. Used for active states, the `.qf` suffix,
trail lines, and the Screen 5 completion bloom.

**Burn color:** Crimson `#C41E3A` — never full opacity, never an error state.
The universal signature of burn across every screen it appears. Consistent from
Screen 1 through Screen 6.

**Typography:** Clash Display for headlines and amounts. Satoshi for body and labels.
JetBrains Mono for addresses, balances, and technical values.

**Motion principle:** `layoutId` shared element transitions between screens wherever
possible. Elements travel — they don't cut or crossfade. The recipient avatar, the
connected pill, the checkmark — all travel via continuous motion across screens.

**The connected pill:** Present on every screen from Screen 2 onward, top-right,
always. The one constant UI element across the entire flow. Real avatar, name,
`.qf` in sapphire, square dot separator, balance in sapphire masked by default.

**Back navigation:** Swipe right (primary gesture) or back chevron `‹` top-left
at 25% opacity (secondary). Present from Screen 3 onward. Screen 2 has no back —
it is the home state.

**Haptics:** Light haptic on every keyboard key. Medium haptic on meaningful
interactions. Strong haptic on Send completion. All respect system haptic settings.

**Sound:** Web Audio API, synthesized — no external audio files. Three sounds on
Screen 5. All respect a global sound toggle in the connected pill dropdown.

**Reduced motion:** All phase machines and animations respect
`prefers-reduced-motion`. Static fallback states defined for every animated screen.

---

## Screen 1 — The Threshold
**State:** Wallet disconnected
**Job:** Make the user feel they are looking at a living network they are not yet part of
**Emotion:** You are on the outside. You want in.

### The Concept — The Network

Screen 1 does not demo a payment. It shows the world of identities that already
exists inside QFPay. Real-feeling `.qf` names drift slowly across the full
viewport. Occasionally a sapphire line illuminates between two of them — a
transfer happened. No amount shown. The line is enough. The user understands
before reading a word: people are sending each other money right now using
just their names.

This is more powerful than a demo because it answers the right question.
Not "how does this work?" but "who is already here?" The user wants to belong
to what they're looking at.

### Layout

Full viewport. No card. No container. The viewport is the stage.

Three zones:
- **Top** — logo mark centered, then headline below it
- **Middle** — the full viewport network of floating pills. This owns the space.
- **Bottom** — Connect Wallet button and trust line

### The Headline

Clash Display. Larger than originally planned — the pill network is the
backdrop, not a competing element, so the headline can breathe at
`clamp(2rem, 4vw, 3.5rem)`. White for "Instant money." and sapphire
for "Just a name." — the word "name" carries the brand color because
that is the product's core mechanic.

The headline is the title card for what the user is about to enter.
Not a label for a demo. A statement of what this world is.

### The 18 Network Identities

These are the names that appear as floating pills across the viewport.
They are chosen to feel like a real community — influencer handles,
casual users, crypto-native names, one that signals someone who hasn't
customised yet. This mix communicates that QFPay already has real people.

```
vector, memechi, steve, hwmedia, teddy, satoshiflipper,
altcoinsensei, soapy, patrick, drprofit, vitalik, cryptomonk,
overdose, amg, bino, nils, cryptouser28, sam
```

Each identity has a gradient color assigned for its avatar circle.
These are fixed — not random — so the same identity always looks the same.
The gradients use the existing Tailwind color palette, covering a range
of hues so the network looks visually diverse.

### The Three Depth Layers

The 18 pills are distributed across three depth layers to create a sense
that the network extends further than what is clearly visible.

**Foreground — 6 pills:** Full opacity. Full size. Slowest drift. These are
the pills that receive connection lines. They feel active and present.

**Midground — 6 pills:** 65% opacity. Slightly smaller. Medium drift speed.
Visible but receded. They fill the space without competing.

**Background — 6 pills:** 35% opacity. Smallest size. Fastest drift. These
create the sense of depth — the network goes further than the eye can
resolve clearly.

On mobile, reduce to 5 foreground, 4 midground, 3 background.

### The Drift Animation

Each pill drifts slowly and continuously in a unique direction. The motion
is so slow it reads as breathing rather than travelling. Each pill has a
fixed drift vector and duration — not random on every render — so the
layout is deterministic and stable across sessions.

The drift uses Framer Motion's `repeat: Infinity, repeatType: 'mirror'`
so pills gently oscillate back and forth. No pill ever leaves the viewport
entirely — the drift amplitude is kept small relative to screen size.

### The Connection Lines

Every 4 to 5 seconds, a sapphire line briefly illuminates between two
randomly selected foreground pills. This represents a transfer happening
right now in the network.

The line behavior:
- Appears with opacity rising to 60% over 300ms
- Holds for 800ms
- Fades out over 400ms
- Total visible duration approximately 1500ms
- A small sapphire dot travels along the line during the hold phase —
  moving from the source pill to the destination pill over 800ms
- No amount shown. No names on the line. Just the connection.
- Never the same pair twice in a row

The connection lines are the heartbeat of the network. They are not
decorative — they are evidence that this is alive.

### The Pill Component

The identity pill is the foundational identity component used across all
six screens. Its quality on Screen 1 sets the expectation for every
subsequent appearance.

Each pill:
- Dark rounded container — `#0C1019` fill (slightly lighter than the void,
  giving real material contrast)
- `1px solid rgba(255,255,255,0.10)` border
- Fully rounded — pill shape
- Avatar circle left — gradient background with initial letter. Real avatar
  image where available.
- Presence dot — bottom-right of avatar, emerald `#00D179`, 7px, pulses
  gently
- Name in Satoshi Medium, white at 90% opacity
- `.qf` suffix in sapphire `#0040FF` at 85% opacity
- No space between name and `.qf` — renders as `alice.qf`

Two sizes: `md` for foreground, `sm` for background and midground pills.
The size difference reinforces the depth illusion.

### Pill Entrance

When Screen 1 first loads, pills emerge with a staggered animation —
each one fading in and scaling up from slightly below full size. The
stagger delay is based on pill index so they appear sequentially rather
than all at once. The network assembles itself in front of the user
in approximately 2 seconds.

### The Connect Wallet Button

Shimmer treatment — rotating conic-gradient border at a 2 second cycle,
sapphire fill. Label: "Connect Wallet" in Clash Display. The button sits
at the bottom of the screen with generous breathing room above it.

This button is an invitation. It has presence but not gravity — that is
reserved for the Send button on Screen 4.

### The Trust Line

"Powered by QF Network · Sub-second finality · 0.1% deflationary burn"
in Satoshi, 11px, white at 30% opacity. Below the button. Always present.

### Reduced Motion Fallback

A static grid of pills arranged across the viewport. No drift. No
connection lines. The headline and button visible. The network concept
communicated through composition rather than motion.

---

## Screen 2 — Connected Home
**State:** Wallet connected, no recipient selected
**Job:** Recognize the user, orient them as the sender, ask the single question
**Emotion:** You are seen. Now — who do you want to reach?

### The Recognition Ceremony
Plays once on first connection. Cannot be skipped but completes in under 2 seconds.

**Beat 0 — The Threshold dissolves (300ms)**
The pill network fades. Pills drift slightly outward and dissolve. The
viewport clears to `#060A14`. This happens while wallet connection resolves.

**Beat 1 — Recognition (800ms)**
User's real avatar blooms at absolute center. Spring animation — scale `0.6` to `1`,
opacity `0` to `1`, blur `8px` to `0`. Weight. Presence.

Name appears below the avatar 200ms after it settles. Clash Display,
`clamp(1.8rem, 4vw, 3rem)`. The `.qf` suffix in sapphire.

Balance appears 200ms after the name. JetBrains Mono. Counts up from zero
to actual balance over 600ms. The count-up makes the number feel real and earned.

**Beat 2 — The Stage Assembles (600ms)**
The entire identity cluster — avatar, name, balance — contracts and travels
to top-right as a single unit via `layoutId`. This is not a crossfade. It physically
moves. Avatar shrinks from approximately 80px to 40px. The cluster becomes
the connected pill.

**Beat 3 — The Input Awakens (400ms)**
As the identity settles into the connected pill, the recipient input appears at center.
A single underline. Sapphire, 2px, `clamp(200px, 50vw, 400px)` wide.
The cursor blinks twice. Then the auto-typing demo begins.

### The Connected Pill (Top-Right)
**Always present from Screen 2 onward on every screen except Screen 4.**

Composition: real avatar (40px) · name · `.qf` in sapphire · square dot (4px white) ·
balance in sapphire.

Balance is masked by default — `•••• QF`. Tapping the pill reveals the balance
(character swap, monospace snap, instant). Tapping again masks it.

**Dropdown on tap of chevron** — appears below the pill, clear glass surface,
`border-radius: 12px`, spring animation 150ms. Items:
- `"Copy address"` — white at 60% opacity
- `"Disconnect"` — white at 45% opacity
- Sound toggle — with on/off state

Tapping outside dismisses instantly. Disconnect triggers reverse of the
recognition ceremony — identity dims, screen returns to threshold state.

### The Recipient Input
A single underline at center. No container, no pill, no border box. The underline
is the stage floor. The name being typed is the performer.

**Auto-typing demo** — cycles through names at human typing speed:
- Typing: 75ms per character, ±20ms random variance
- Backspace: 45ms per character
- Pause between names: 800ms
- Names cycle through the same 18 network identities from Screen 1

The typing IS the instruction. No label needed.

Stops instantly the moment the user begins real input.

### Name Resolution
Happens silently during typing. No spinner during active typing.

On resolution — the underline runs a sapphire wave left-to-right. The
recipient's real avatar materializes large above the input — spring entrance
from scale 0.5 and blur 12px to full presence. Their name appears below
confirming the match.

The resolved avatar has a single pulse ring on arrival, then continuous
breathing. Everything else on screen drops approximately 15% opacity.
The avatar is the tap target to advance to Screen 3.

Unresolved state: underline shifts amber. Brief pulse. No error text.

### The No-.qf Fork
When the connected wallet has no `.qf` name registered:

The wallet address blooms to center in JetBrains Mono. Below it, two lines
appear sequentially — an honest statement that a name is needed, followed by
a tappable link to `dotqf.xyz`. A shimmer CTA button: "Get my .qf name".
No recipient input appears until the user has a name.

---

## Screen 3 — The Amount
**State:** Recipient confirmed, amount not yet entered
**Job:** Ask how much, show exactly what happens, give complete control
**Emotion:** Focused. Decisive. Honest.

### Layout
Recipient avatar at top-center (48px, travels via layoutId from Screen 2).
Amount input centered below it. Burn line below the input. Custom keyboard
fixed to bottom of screen.

### The Amount Input
Large numeral in Clash Display, `clamp(2.5rem, 8vw, 6rem)`. `QF` trailing
in sapphire. Placeholder `0` at 20% opacity. Underline below in sapphire.

The custom QFPay keyboard appears immediately — no OS keyboard ever appears.
`inputMode="none"` on the hidden input.

### The Custom Keyboard
Full-width, fixed bottom. Brand surface — not OS chrome. Numbers in Clash
Display. Clear glass keys. Light haptic per key tap. Bottom row has four
columns: decimal, 0, MAX, backspace. MAX key has sapphire tint. Long-press
backspace clears entire input.

### The Burn Line
Updates live on every keystroke. Format:
`[totalRequired] QF leaves your wallet · 🔥 [burnAmount] burns`

Left segment: white at 45% opacity.
Right segment (burn): crimson at 60% opacity with ember icon.
Wraps gracefully on mobile.

### Balance Display
JetBrains Mono, 11px, white at 30% opacity. Brightens as amount approaches
limit. Amber underline and inline "Insufficient balance" text if exceeded —
never a red card or modal. Amber is honest, not alarming.

### Continue Trigger
Sapphire wave on underline when valid amount entered. Forward chevron `›`
appears. Tap to advance. `hapticMedium` on continue.

---

## Screen 4 — The Review
**State:** Recipient and amount confirmed, awaiting commitment
**Job:** Present the complete truth of this transaction, then step back and wait
**Emotion:** Solemn confidence. You know exactly what's about to happen.

### Key Decisions
The connected pill does NOT appear on this screen. Screen 4 is inside the
ceremony. The world outside is temporarily irrelevant. Only the back chevron
remains as navigation.

### Layout — Three Rows, Two Dividers

Sender pill / divider / burn row / divider / recipient pill / Send button.

The dividers are `1px rgba(255,255,255,0.06)` — not section breaks but
thresholds. Reading top to bottom is watching the transaction happen in
slow motion before it fires.

### The Pills
Both sender and recipient use identical pill form — same clear glass,
same structure. The verb differentiates them.

Sender pill: avatar · name`.qf` · dot · `[totalRequired] QF leaving`
Recipient pill: avatar · name`.qf` · dot · `[recipientAmount] QF arriving`

### The Burn Row
Centered between the two dividers. No container. Crimson at 80% opacity.

`🔥 [burnAmount] QF burns forever`

The word `forever` appears here and only here in present tense. It is the
commitment register — this is about to happen and it is permanent.

### The Send Button
Wide pill, `border-radius: 100px`. Solid sapphire fill. Shimmer border at
4 second rotation — slower than the Connect Wallet button, heavier gravity.
Label: "Send" in Clash Display. Heartbeat pulse on 2 second loop.

**Press-and-hold — 800ms to fire.**
The button fill brightens radially from the press point as a progress
indicator. Three haptic beats: light on press, medium at halfway, medium
at completion. Release before completion: fill reverses, button pulses once.

First-visit only: the button auto-demonstrates by filling to 60% then
reversing. The button teaches itself without a label.

Desktop: click and hold. Same radial fill. Same haptic sequence.

---

## Screen 5 — The Transfer
**State:** Send initiated, transaction in flight
**Job:** Make the user feel something irreversible and beautiful happening
**Emotion:** Cinematic inevitability. Sacrifice. Completion.

### The Core Constraint
QF Network sub-second finality. The animation and transaction run in parallel.
The animation plays its designed duration. If the transaction confirms before
the animation completes it finishes its arc naturally. The UI never lies but
never shows a spinner.

### Layout — Vertical on All Screen Sizes
Sender pill top. Amount center. Recipient pill bottom. A vertical trail
connects all three on their shared axis.

Vertical is the intentional choice for all screen sizes. Directionality:
sender above, recipient below, money traveling downward. Gravity.

### The Background Color Ceremony
The background `#060A14` breaks twice, deliberately:

During burn: shifts to `#0F0608` — deep crimson void — over 300ms.
After burn: restores to `#060A14` over 400ms.
On completion: radial sapphire bloom expands from the checkmark's position,
filling the viewport with `#0040FF` over 400ms.

These two breaks are the emotional punctuation of the entire app.
Neither appears anywhere else. Both are earned.

### The Four Acts

**Act 1 — The Charge (0–600ms)**
Both pills appear. Trail draws upward from amount to sender pill — two
pulses, then holds lit. Amount materializes at center with letter-spacing
compression. Sender pill pulses.

**Act 2 — The Burn (600–1100ms)**
Background shifts to crimson. Amount color shifts to amber. Amount counts
DOWN from departure total (e.g. 100.1 QF) to received amount (100 QF)
with easeOut timing — fast then decelerating. Holds amber for 200ms.
Background restores. Color returns to white. Sender dims.

The countdown is correct at all scales — works for 0.1 and 5,000,000.
The crimson background and burn sound carry the emotional weight.

**Act 3 — The Send (1100–1800ms)**
Trail draws downward from amount to recipient. Two pulses, then holds lit.
Recipient pill brightens with sapphire anticipation, then blooms green.

**Act 4 — The Resolution (1800–2400ms)**
Amount fades. Checkmark draws at center — emerald stroke, 350ms path
animation. Checkmark holds. Everything else dissolves. Checkmark remains
alone in the void. Sapphire radial bloom begins. Screen 6 assembles
around the checkmark.

### Sounds
Burn sound at Act 2 start. Send sound at Act 3 start. Success sound
at completion. All respect the global sound toggle.

---

## Screen 6 — Success and Receipt
**State:** Transaction confirmed
**Job:** Confirm, honor the burn, surface the artifact
**Emotion:** Quiet triumph. Something mattered here.

### Why Screens 6 and 7 Were Merged
The success screen was repeating information the user already gave the app.
Repetition dressed as ceremony. The checkmark on Screen 5 is already the
confirmation. Screen 6 is the denouement assembling in place — confirmation
plus meaning plus artifact plus exit. Nothing redundant.

### Opening State
Inherited from Screen 5. Sapphire background `#0040FF`. White checkmark
already present. Screen 6 does not announce itself — it inherits the moment.

### Assembly Sequence

800ms of stillness. The checkmark breathes.

Burn epitaph fades in — crimson, centered, below checkmark:
`🔥 [burnAmount] QF burned forever`
Past tense. Permanent. Holds alone for 600ms.

Background cools slowly from `#0040FF` toward `#080D1A` over 1500ms.
Users won't consciously notice. The ceremony is becoming a record.

Receipt card slides up from below — clear glass surface, `border-radius: 20px`.
Contains: sender pill, sapphire arrow, recipient pill, amount and burn amount,
timestamp, share icon. The burn amount is in crimson.

Two action buttons appear below the card:
- "Send again" — shimmer button, returns to Screen 2 input state
- "Done" — plain text, returns to Screen 2 connected home

Both reach the same destination. Different emotional registers.
The product accommodates both without judgment.

### The Screenshot Composition
The final state is designed to be screenshot-worthy and shareable.
The burn epitaph is the hook. The receipt card is the frame.
This is the community moment — QF holders sharing their burn contribution.

### Back Navigation
The back chevron leads to Screen 2 connected home — not back through the
flow. A completed transaction cannot be undone.

---

## Burn Color — Full App Audit

Crimson `#C41E3A` appears at these moments across all six screens:

| Screen | Context | Opacity |
|--------|---------|---------|
| Screen 3 | Burn line — `🔥 burns` segment | 60% |
| Screen 4 | Burn row — `🔥 QF burns forever` | 80% |
| Screen 5 | Amount countdown during burn phase | 85% |
| Screen 5 | Background shift to `#0F0608` | — |
| Screen 6 | Burn epitaph — `🔥 QF burned forever` | 80% |
| Screen 6 | Receipt card burn amount | 65% |

Never full opacity. Never an error state. Always the same color family.

---

## Flow Summary

| Screen | Name | User's Question Answered |
|--------|------|--------------------------|
| 1 | The Threshold | What is this? Who is already here? |
| 2 | Connected Home | I'm the sender. Who am I sending to? |
| 3 | The Amount | How much? |
| 4 | The Review | Is this exactly what I'm doing? |
| 5 | The Transfer | Is it happening? |
| 6 | Success and Receipt | Did it work? What just happened? |

Six screens. Each with one undeniable job. Nothing repeated. Everything necessary.

---

*QDL — Quantum Design Language. Interactions are ceremonies, not clicks.*
*Built for QF Network. qfpay.xyz*
