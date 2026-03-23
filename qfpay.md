QFPay — Product Spec v1.0
1. Overview
QFPay is a standalone single-page dApp on QF Network for sending native QF tokens to anyone using their .qf name. It is the second dApp released on the QF ecosystem after QNS (QF Name Service). QFPay resolves .qf names via QNS infrastructure, routes payments through a dedicated router contract that atomically burns 0.1% of every transaction, and delivers a premium, animation-driven experience designed to make sending crypto feel instant and effortless.

Tagline: Instant money. Just a name.

Domain: TBD (e.g., qfpay.xyz)

Repo: Separate from QNS. New standalone repository.

2. Brand Identity
QFPay has its own visual identity, distinct from QNS, while sharing the QF ecosystem's foundational design system.

Primary color: Deep bold blue — #0052FF (Coinbase-adjacent, tuned for dark backgrounds). Hover state: #0047E1.

Background: #0A0A0A (ecosystem-consistent).

Card/surface backgrounds: #111111.

Borders: border-white/5, border-white/10.

Success green: #00D179 (shared ecosystem green, used in the send phase of the animation sequence).

Burn red: #C13333 (warm crimson/ember, not error-red — used in the burn phase of the animation sequence).

Error red: #E5484D (UI errors, validation failures).

Warning amber: #F5A623.

Text: White (#FFFFFF) for primary, #8A8A8A for secondary, gray-500/gray-600 for tertiary.

Fonts: Clash Display (600 weight for headings), Satoshi (400/500/700 for body, labels, inputs). JetBrains Mono for addresses and numeric displays. All loaded via FontShare and Google Fonts.

Corners: rounded-xl for buttons and inputs, rounded-2xl / rounded-[24px] for the main card.

Animations: Framer Motion (motion.dev) for all transitions, state changes, entrance animations, and the core payment sequence.

Responsive: Mobile-first. Must work in SubWallet and Talisman in-app browsers.

3. Tech Stack
Must match QNS exactly. This is non-negotiable — same chain, same wallet infrastructure.

Chain: QF Network — Substrate-based L1 with pallet-revive (PolkaVM). Contracts are Solidity compiled with resolc (Revive compiler).

Frontend: React + TypeScript + Vite + Tailwind CSS + Framer Motion + Zustand for state management.

Chain interaction: polkadot-api (PAPI). NOT @polkadot/api, NOT ethers.js, NOT viem RPC client.

Read calls: typedApi.apis.ReviveApi.call()

Write calls: typedApi.tx.Revive.call().signAndSubmit()

ABI encoding/decoding: viem utilities only (encodeFunctionData, decodeFunctionResult). No viem RPC or wallet client.

Wallets: Talisman and SubWallet (Substrate wallets) via polkadot-api/pjs-signer. NOT MetaMask.

Address model: Users have SS58 (Substrate) addresses. A one-time Revive.map_account call maps their SS58 to a deterministic on-chain EVM address. All contract interactions use the EVM address. Mapping handled during wallet connection.

RPC: wss://rpc.qfnetwork.io (Substrate/PAPI). https://archive.mainnet.qfnode.net/eth (ETH JSON-RPC balance queries).

4. Contract Architecture
4.1 QNS Resolver (existing, read-only)
Used for .qf name resolution. Address and ABI sourced from the QNS repo (src/config/contracts.ts).

Functions used:

addr(bytes32 node) view returns (address) — forward resolution (name → EVM address)
reverseResolve(address) view returns (string) — reverse resolution (address → name, for displaying sender's .qf name)
4.2 QFPay Router (new contract, to be deployed)
Handles atomic payment + burn in a single transaction. See full Solidity source in the context document (Section 5).

Key behavior:

Receives native QF via send(address to) with msg.value
Calculates burn: (msg.value * burnBasisPoints) / 10000 where burnBasisPoints = 10 (0.1%)
Sends burn amount to designated burn address
Sends remainder to recipient
Emits Payment(from, to, amount, burned) event
Admin functions for adjusting burn rate (max 1%) and burn address — not exposed in QFPay UI
Deployment: Compiled with resolc, deployed via Substrate deployment script (same pattern as QNS contracts). Burn address passed at construction time (same burn address QNS uses).

5. Wallet Connection
Ported directly from QNS codebase. Key files to extract and adapt:

src/utils/wallet.ts — connectSubstrateWallet, getCurrentConnection, disconnectWallet, deriveEVMAddress, mapAccountIfNeeded
src/stores/walletStore.ts — Zustand store (simplified: address, ss58Address, walletName, qnsName, displayName, connection state, rehydration)
src/utils/contractCall.ts — callContract (read), writeContract (write with two-phase confirmation), sendTransfer
src/utils/papiClient.ts — PAPI client singleton, getTypedApi()
src/utils/accountMapping.ts — SS58 to EVM mapping
Connection handles:

Extension detection (Talisman/SubWallet)
Account selection
SS58 to EVM mapping via Revive.map_account (one-time)
Persist across reloads via Zustand persist middleware
Rehydration with retry for slow extension injection
Zombie state prevention (failed rehydration → clear state)
Mobile detection (no extension → message to open in wallet's in-app browser)
6. Name Resolution
Input handling: User types a name like sam or sam.qf. The .qf suffix is stripped if present.

Validation: 3-64 characters, lowercase alphanumeric + hyphens, no leading/trailing hyphens.

Resolution flow:

Compute namehash: keccak256(abi.encodePacked(keccak256(abi.encodePacked(bytes32(0), keccak256("qf"))), keccak256("sam")))
Call QNSResolver.addr(bytes32 node) → returns EVM address
If address is 0x0000...0000 or call fails → name not registered
Utilities to port from QNS:

namehash(name), labelHash(label), resolveForward(name), resolveReverse(address), getQFBalance(), formatQF(), truncateAddress(), validateNameLocal()
Debounce: Name resolution triggers 400ms after user stops typing.

7. Transaction Flow
7.1 Frontend Flow
User enters recipient (.qf name, 0x address, or SS58 address)
Name resolves to EVM address via QNS Resolver
User enters amount
UI shows burn preview (0.1% of amount) and recipient-receives preview
User taps "Send" → Preview screen appears
User taps "Confirm" on preview → transaction fires
writeContract calls QFPayRouter.send(recipientAddress) with msg.value = total amount
On broadcast (txHash received) → animation sequence begins immediately
Background confirmation resolves → subtle on-chain confirmation indicator
7.2 Two-Phase Confirmation Pattern (from QNS)
writeContract returns { txHash: string; confirmation: Promise<{ confirmed: boolean; error?: string }> }

txHash resolves immediately on PAPI broadcast → triggers animation sequence
confirmation resolves later via txBestBlocksState/finalized
30-second timeout fallback
On confirmation success: subtle "Confirmed on-chain" indicator on success screen
On confirmation failure/timeout: amber warning message, no dramatic reversal
7.3 Input Validation
Recipient field accepts:

.qf names (with or without suffix) → resolve via QNS
0x addresses (40-char hex) → use directly
SS58 addresses (starts with 5, 47-48 chars) → convert via ss58ToEvmAddress()
Validation states:

Resolving: subtle loading indicator
Resolved: green checkmark + truncated address preview
Not found: "Name not found" error
Self-send: "Cannot send to yourself"
Amount field:

Numeric only, allow decimals, max 18 decimal precision
String-based decimal parsing to bigint (avoid floating point)
Balance check: parsedAmount + gasBuffer (0.5 QF) > userBalance → disable send, show "Insufficient balance"
Quick amount buttons: 10, 50, 100, 500
8. UX Flow & Animation Sequence
8.1 Page Structure
Single page. No routing. No scroll. The entire app is one centered card on a full-viewport dark background. No navbar. No footer. No "about" section. No feature explanations. The product is the interface.

8.2 States
State 1 — Disconnected (landing)

Full viewport, #0A0A0A background
QFPay logo/wordmark centered
Tagline: "Instant money. Just a name."
"Connect Wallet" button in QFPay blue (#0052FF)
Subtle ambient glow or gentle particle drift around the card area — alive but quiet
State 2 — Connected (ready to send)

Card appears (centered, #111111 background, rounded-2xl, border-white/5)
Sender info at top: .qf name if they have one, otherwise truncated address
Balance display: "X QF available"
Recipient input field with placeholder "Enter .qf name or address"
Amount input field with "QF" label
Quick amount buttons (10, 50, 100, 500)
Burn preview line: "0.1% burn: X QF"
Recipient receives line: "Receives: X QF"
"Send" button — QFPay blue, disabled until valid recipient + amount
Insufficient balance: red text, greyed button
State 3 — Preview (confirm before send)

Card content transitions (Framer Motion, smooth crossfade or slide)
Summary display:
"Sending [amount] QF to [name].qf"
Burn amount highlighted
Recipient receives amount
"Confirm" button (blue) and "Back" button (ghost/outline)
This is the last touch before the transaction — calm, deliberate, clear
State 4 — Animation Sequence (post-broadcast)

This is the signature experience. Full-viewport background transitions. Each phase is a full-screen moment.

Phase A — Burn (1.2s)

Background transitions from #0A0A0A → #C13333 (warm ember crimson)
Transition: ease-in-out, ~600ms
Burn amount appears large, centered (Clash Display, 48-64px)
Text example: "0.1 QF burned"
Particle/ember effect: the burn amount text or a visual element dissolves upward — small particles drifting up and fading, like embers rising
Emotional register: power, fuel, contribution — not loss
Phase B — Send (1.0s)

Background transitions from #C13333 → #00D179 (ecosystem emerald green)
Transition: ease-in-out, ~500ms
Recipient info appears large, centered
Text example: "99.9 QF → sam.qf"
The .qf name is prominent — this is the moment of connection
Emotional register: arrival, identity, the name system working
Phase C — Success (0.8s + persist)

Background transitions from #00D179 → #0052FF (QFPay blue)
Transition: ease-in-out, ~500ms
Clean checkmark animation (confident, not celebratory — draws in, not explodes)
Summary: amount, recipient name, burn amount
"Send Another" button (white text on transparent/outline)
Subtle "Confirmed on-chain" text appears when confirmation resolves (no fanfare, just appears)
If confirmation fails/times out: amber text replaces confirmation area — "Transaction submitted but not yet confirmed"
Total sequence: ~3.3 seconds from broadcast to resting success state.

Phase transitions use Framer Motion's animate on the root/body-level wrapper with backgroundColor and transition: { duration: 0.5-0.6, ease: "easeInOut" }. Content within each phase uses AnimatePresence with staggered children for text entrance.

8.3 Error Path
If the transaction fails before broadcast (user rejection, insufficient gas, etc.):

No animation sequence fires
Red toast appears with friendly error message
Form remains in preview state, user can retry or go back
If broadcast succeeds but confirmation fails:

Animation sequence has already played
Amber warning replaces the confirmation indicator on the success screen
No dramatic reversal of the animation — the emotional experience is preserved
User can "Send Another" or check their wallet for status
8.4 Toast System (from QNS)
Success: green, 3s auto-dismiss
Warning: amber, 7s auto-dismiss
Error: red, no auto-dismiss, manual close
Error toasts replace previous error (no stacking)
Max 3 toasts visible, stacked vertically
9. Error Handling
Ported from QNS src/utils/errorHelpers.ts.

Retryable errors (amber warning toast, "Network hiccup — try again"):

BadProof, Priority is too low, Transaction is outdated, 1010:, 1014:, WouldBlock
Non-retryable errors (red error toast):

Insufficient balance, user rejection, contract revert
10. What Is NOT Included in v1
No profile pages or editing
No name registration or management
No multi-token support (native QF only; token support in v2 after QFPad)
No transaction history
No MetaMask support
No admin dashboard
No scroll, no additional sections, no "how it works"
No confetti
11. Deployment
Separate repository from QNS
Separate domain
Same hosting/deployment pipeline as QNS
PAPI chain descriptors generated via npx papi generate
Router contract compiled with resolc, deployed via Substrate script
12. QNS Code to Port
From the QNS repo (https://github.com/zero-dev1/qns), copy and trim:

src/utils/contractCall.ts — full (callContract, writeContract, sendTransfer, TxResult)
src/utils/wallet.ts — full
src/stores/walletStore.ts — simplified (drop ownedNames, keep connection logic)
src/utils/papiClient.ts — full
src/utils/accountMapping.ts — full
src/utils/qns.ts — only: namehash, labelHash, resolveForward, resolveReverse, getQFBalance, formatQF, truncateAddress, validateNameLocal
src/utils/errorHelpers.ts — full
src/utils/haptics.ts — full
src/utils/address.ts — ss58ToEvmAddress
13. Timeline
Phase 1b in the Dapp Labs staggered launch framework. Target: 3-5 days focused build after QNS launch stabilizes. Exact sequencing decided with the group.

14. Design References
Coinbase design system (deep blue on dark, clean typography, confident minimalism)
Cash App Fall Release (awwwards Honorable Mention March 2026 — animation-driven, single-purpose clarity)
Stripe Payment UX (progressive disclosure, calm confidence, micro-interactions that guide without distracting)
Awwwards dynamic background transitions (full-viewport color shifts as narrative beats)
Micro-interaction principles: tap feedback feels alive, success moments are confident not celebratory, transitions support the story, premium is calm
