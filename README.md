# QFPay

**Instant money. Just a name.**

QFPay is the flagship payment dApp for [QF Network](https://qfnetwork.org). Send QF tokens to anyone using their `.qf` name — no wallet addresses, no complexity.

Built to match Awwwards-level design standards with a cinematic payment flow: burn → send → success.

## Stack

- **React 19** + TypeScript + Vite
- **Framer Motion** — physics-based animations, `layoutId` shared elements, spring interactions
- **Tailwind CSS** — design tokens, responsive, dark-first
- **Zustand** — minimal state management (wallet + payment phase machine)
- **Polkadot API (PAPI)** — QF Network substrate integration
- **Web Audio API** — synthesized UI sounds (no external audio files)
- **PWA** — installable, offline-aware, safe-area aware

## Design

Typography: Clash Display + Satoshi + JetBrains Mono  
Color: Sapphire Blue `#0040FF` on blue-tinted dark `#060A14`  
Motion: 3 shared easing curves, `prefers-reduced-motion` respected throughout

## Features

- **`.qf` name resolution** — type a name, see their avatar, send payment
- **Deflationary burn** — 0.1% burned per transaction, visualized with ember particles
- **Cinematic animation sequence** — burn → send → success with sound design
- **Mouse-reactive hero** — parallax orbs respond to cursor on desktop
- **Wallet persistence** — reconnects automatically via Talisman or SubWallet

## Links

- **QFPay**: [qfpay.xyz](https://qfpay.xyz)
- **QNS (Name Service)**: [dotqf.xyz](https://dotqf.xyz)
- **QF Network**: [qfnetwork.org](https://qfnetwork.org)

---

Built with obsessive attention to detail for QF Network.
