# master.md — QFPay Build Instructions

> **This file is the single source of truth for building QFPay.**
> Read this ENTIRE file before writing any code. Follow it sequentially.
> The product spec lives at `./qfpay.md` — reference it for all product details, UX flows, and design tokens.

---

## 0. CRITICAL RULES — READ FIRST

1. **Do NOT use ethers.js, @polkadot/api, or viem RPC/wallet clients.** Chain interaction uses `polkadot-api` (PAPI) exclusively. viem is used ONLY for `encodeFunctionData` and `decodeFunctionResult`. Violating this will break everything.

2. **Do NOT use MetaMask.** Wallets are Talisman and SubWallet via `polkadot-api/pjs-signer`.

3. **Do NOT invent patterns.** The wallet connection, contract calls, account mapping, PAPI client, and error handling are all ported from the QNS codebase. The working code is provided below. Use it.

4. **Do NOT add pages, routing, scrolling, navbars, or footers.** QFPay is a single-screen app. One full-viewport page. One centered card. That's it.

5. **Read `./qfpay.md` for all product details** including brand colors, tagline, UX states, animation sequence, and design tokens. This master.md covers architecture and implementation.

---

## 1. PROJECT SETUP

### 1.1 Initialize

```bash
npm create vite@latest qfpay -- --template react-ts
cd qfpay
1.2 Install Dependencies
Copynpm install polkadot-api viem zustand framer-motion lucide-react react-dom
npm install -D tailwindcss postcss autoprefixer @types/node @types/react @types/react-dom typescript
npx tailwindcss init -p
1.3 Install PAPI Descriptors
QFPay connects to QF Network (Substrate chain). PAPI needs generated chain descriptors.

Copynpx papi add qf -w wss://mainnet.qfnode.net
npx papi generate
This creates .papi/descriptors/ with the chain type information. Add to package.json dependencies:

Copy{
  "dependencies": {
    "@polkadot-api/descriptors": "file:.papi/descriptors"
  }
}
Then npm install again.

1.4 Build Script
In package.json, set the build script to regenerate descriptors:

Copy{
  "scripts": {
    "dev": "vite",
    "build": "npx papi generate && tsc -b && vite build",
    "preview": "vite preview"
  }
}
1.5 Vite Config
Copy// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
  },
})
1.6 Tailwind Config
Copy// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'qfpay-blue': '#0052FF',
        'qfpay-blue-hover': '#0047E1',
        'qfpay-bg': '#0A0A0A',
        'qfpay-card': '#111111',
        'qfpay-burn': '#C13333',
        'qfpay-green': '#00D179',
        'qfpay-error': '#E5484D',
        'qfpay-warning': '#F5A623',
        'qfpay-secondary': '#8A8A8A',
      },
      fontFamily: {
        clash: ['"Clash Display"', 'sans-serif'],
        satoshi: ['Satoshi', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
1.7 Global CSS
Copy/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://api.fontshare.com/v2/css?f[]=clash-display@500,600&f[]=satoshi@400,500,700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');

body {
  background-color: #0A0A0A;
  color: #FFFFFF;
  font-family: 'Satoshi', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
1.8 Environment Variables
Create .env:

# QF Network RPC (Substrate WebSocket)
VITE_QF_RPC_URL=wss://mainnet.qfnode.net

# QNS Resolver address (for name resolution — get from QNS team)
VITE_QNS_RESOLVER_ADDRESS=0x0000000000000000000000000000000000000000

# QFPay Router address (deployed separately — update after deployment)
VITE_QFPAY_ROUTER_ADDRESS=0x0000000000000000000000000000000000000000
2. PROJECT STRUCTURE
qfpay/
├── .env
├── .env.example
├── qfpay.md                        # Product spec (already exists)
├── master.md                       # This file
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── index.html
├── contracts/
│   └── QFPayRouter.sol             # Router contract source
├── scripts/
│   ├── compile-revive.sh           # Compile with resolc
│   └── deploy-substrate.ts         # Deploy to QF Network
├── src/
│   ├── main.tsx                    # Entry point
│   ├── index.css                   # Tailwind + fonts
│   ├── App.tsx                     # Root component — single page
│   ├── abi/
│   │   ├── QFPayRouter.json        # Router ABI
│   │   └── QNSResolver.json        # Resolver ABI (subset)
│   ├── config/
│   │   └── contracts.ts            # Contract addresses + ABIs
│   ├── utils/
│   │   ├── papiClient.ts           # PAPI client singleton
│   │   ├── wallet.ts               # Wallet connection
│   │   ├── accountMapping.ts       # SS58 → EVM mapping
│   │   ├── contractCall.ts         # Read/write contract helpers
│   │   ├── qfpay.ts               # Name resolution + balance + formatting
│   │   ├── errorHelpers.ts         # Retryable error detection
│   │   ├── parseAmount.ts          # String → bigint decimal parser
│   │   └── address.ts             # Address utilities
│   ├── stores/
│   │   ├── walletStore.ts          # Zustand wallet state
│   │   └── paymentStore.ts         # Zustand payment flow state
│   └── components/
│       ├── DisconnectedView.tsx     # Landing / connect wallet
│       ├── SendForm.tsx             # Recipient + amount inputs
│       ├── PreviewStep.tsx          # Confirm before sending
│       ├── AnimationSequence.tsx    # Burn → Send → Success fullscreen
│       ├── WalletModal.tsx          # Wallet selection modal
│       ├── Toast.tsx                # Toast notification system
│       └── EmberParticles.tsx       # Burn phase particle effect
3. SMART CONTRACT
3.1 QFPayRouter.sol
Create contracts/QFPayRouter.sol with the exact Solidity source from qfpay.md Section 5. Copy it verbatim — do not modify the contract logic.

3.2 Router ABI
After the contract is compiled (or manually), create src/abi/QFPayRouter.json:

Copy[
  {
    "type": "constructor",
    "inputs": [{ "name": "_burnAddress", "type": "address" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "send",
    "inputs": [{ "name": "to", "type": "address" }],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "burnAddress",
    "inputs": [],
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "burnBasisPoints",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "admin",
    "inputs": [],
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setBurnBasisPoints",
    "inputs": [{ "name": "newBps", "type": "uint256" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setBurnAddress",
    "inputs": [{ "name": "newBurn", "type": "address" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setAdmin",
    "inputs": [{ "name": "newAdmin", "type": "address" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "Payment",
    "inputs": [
      { "name": "from", "type": "address", "indexed": true },
      { "name": "to", "type": "address", "indexed": true },
      { "name": "amount", "type": "uint256", "indexed": false },
      { "name": "burned", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "receive",
    "stateMutability": "payable"
  }
]
Copy
3.3 QNS Resolver ABI (subset for QFPay)
Create src/abi/QNSResolver.json:

Copy[
  {
    "type": "function",
    "name": "addr",
    "inputs": [{ "name": "node", "type": "bytes32" }],
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "reverseResolve",
    "inputs": [{ "name": "_addr", "type": "address" }],
    "outputs": [{ "name": "", "type": "string" }],
    "stateMutability": "view"
  }
]
3.4 Compilation and Deployment
Copy scripts/compile-revive.sh and scripts/deploy-substrate.ts from the QNS repo pattern. The compile script runs resolc targeting PolkaVM. The deploy script uses PAPI to submit revive.instantiate. The constructor argument for QFPayRouter is the burn address (same one QNS uses — get from QNS team).

Contract deployment is a separate step done manually. The frontend does NOT deploy contracts. Just have the ABI files and address placeholders ready.

4. CORE UTILITY FILES — PORT FROM QNS
These files are the foundation. They are battle-tested on QF Network. Port them with minimal changes. Below is each file with QFPay-specific modifications noted.

4.1 src/utils/papiClient.ts
Copy exactly from QNS. No changes needed.

Copyimport { createClient, type PolkadotClient, type TypedApi } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws-provider";
import { qf } from "@polkadot-api/descriptors";

const QF_RPC_URL = import.meta.env.VITE_QF_RPC_URL || "wss://mainnet.qfnode.net";

let client: PolkadotClient | null = null;
let typedApi: TypedApi<typeof qf> | null = null;

export function getClient(): PolkadotClient {
  if (!client) {
    client = createClient(getWsProvider(QF_RPC_URL));
  }
  return client;
}

export function getTypedApi(): TypedApi<typeof qf> {
  if (!typedApi) {
    typedApi = getClient().getTypedApi(qf);
  }
  return typedApi;
}

export function destroyClient(): void {
  if (client) {
    client.destroy();
    client = null;
    typedApi = null;
  }
}
Copy
4.2 src/utils/wallet.ts
Copy exactly from QNS. No changes needed. This handles:

Extension detection
connectSubstrateWallet(walletName)
deriveEVMAddress(ss58) — keccak256 of public key, last 20 bytes
getCurrentConnection() / disconnectWallet()
Copy// Copy the FULL file from QNS: src/utils/wallet.ts
// It is provided in the QNS repo and was retrieved during planning.
// Do NOT modify the wallet connection logic.
4.3 src/utils/accountMapping.ts
Copy exactly from QNS. Handles ensureAccountMapped(ss58Address) — checks local cache, then on-chain, then submits Revive.map_account if needed.

Copy// Copy the FULL file from QNS: src/utils/accountMapping.ts
// No modifications needed for QFPay.
4.4 src/utils/contractCall.ts
Copy exactly from QNS. This provides:

callContract(address, abi, functionName, args) — read calls via ReviveApi.call()
writeContract(address, abi, functionName, args, signer, value, verifyOnChain?) — write calls with two-phase confirmation (broadcast → confirmation)
sendTransfer(toEvmAddress, amount, signerAddress, verifyOnChain?) — native transfer (used as fallback, but QFPay primarily uses the router contract)
The writeContract function returns { txHash, confirmation } where:

txHash resolves on broadcast (instant) — this triggers the animation sequence
confirmation resolves later (on-chain finality or 30s timeout)
Copy// Copy the FULL file from QNS: src/utils/contractCall.ts
// The only change: update the import path for walletStore if the store file moves.
// The dynamic import inside writeContract references '../stores/walletStore' — keep this path.
4.5 src/utils/errorHelpers.ts
Copy exactly from QNS.

Copyconst RETRYABLE_PATTERNS = [
  'BadProof',
  'Priority is too low',
  'Transaction is outdated',
  'Transaction has a bad signature',
  '1010:',
  '1014:',
  'WouldBlock',
];

export function isRetryableError(message: string | undefined | null): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return RETRYABLE_PATTERNS.some(p => lower.includes(p.toLowerCase()));
}

export const RETRY_MESSAGE = "Almost there! The network needs one more try. Tap below to send again — no extra cost until it goes through.";
export const RETRY_MESSAGE_SHORT = "Network hiccup — just tap to try again!";
5. QFPAY-SPECIFIC UTILITY FILES
5.1 src/config/contracts.ts
Copyimport QFPayRouterABI from '../abi/QFPayRouter.json';
import QNSResolverABI from '../abi/QNSResolver.json';

export const QFPAY_ROUTER_ADDRESS = (
  import.meta.env.VITE_QFPAY_ROUTER_ADDRESS || '0x0000000000000000000000000000000000000000'
) as `0x${string}`;

export const QNS_RESOLVER_ADDRESS = (
  import.meta.env.VITE_QNS_RESOLVER_ADDRESS || '0x0000000000000000000000000000000000000000'
) as `0x${string}`;

export const ROUTER_ABI = QFPayRouterABI as any[];
export const RESOLVER_ABI = QNSResolverABI as any[];

// Burn basis points: 10 = 0.1%
export const BURN_BASIS_POINTS = 10n;
export const BASIS_POINTS_DENOMINATOR = 10000n;

// Gas buffer: 0.5 QF — user must have at least this much beyond send amount
export const GAS_BUFFER = 500000000000000000n; // 0.5 * 1e18

// QF has 18 decimals
export const QF_DECIMALS = 18;

// ETH JSON-RPC endpoint for balance queries
export const QF_ETH_RPC = 'https://archive.mainnet.qfnode.net/eth';
5.2 src/utils/qfpay.ts
This is the QFPay-specific utility file. It handles name resolution, balance queries, and formatting. Derived from QNS's qns.ts but stripped to only what QFPay needs.

Copyimport { keccak256, encodePacked, type Hex } from 'viem';
import { callContract } from './contractCall';
import { getTypedApi } from './papiClient';
import {
  QNS_RESOLVER_ADDRESS,
  RESOLVER_ABI,
  QF_ETH_RPC,
  BURN_BASIS_POINTS,
  BASIS_POINTS_DENOMINATOR,
} from '../config/contracts';

// ─── Name hashing (ENS-style) ───────────────────────────────────────

export function namehash(name: string): Hex {
  if (!name) return '0x0000000000000000000000000000000000000000000000000000000000000000';
  const labels = name.split('.').reverse();
  let node: Hex = '0x0000000000000000000000000000000000000000000000000000000000000000';
  for (const label of labels) {
    const labelH = keccak256(new TextEncoder().encode(label) as unknown as Hex);
    node = keccak256(encodePacked(['bytes32', 'bytes32'], [node, labelH]));
  }
  return node;
}

export function labelHash(label: string): Hex {
  return keccak256(new TextEncoder().encode(label) as unknown as Hex);
}

// ─── Name validation ─────────────────────────────────────────────────

export function validateNameLocal(name: string): { valid: boolean; error: string | null } {
  if (name.length < 3) return { valid: false, error: 'Name must be at least 3 characters' };
  if (name.length > 64) return { valid: false, error: 'Name must be 64 characters or less' };
  if (!/^[a-z0-9-]+$/.test(name)) return { valid: false, error: 'Only lowercase letters, numbers, and hyphens' };
  if (name.startsWith('-')) return { valid: false, error: 'Cannot start with a hyphen' };
  if (name.endsWith('-')) return { valid: false, error: 'Cannot end with a hyphen' };
  return { valid: true, error: null };
}

// ─── Name resolution ─────────────────────────────────────────────────

export async function resolveForward(name: string): Promise<string | null> {
  try {
    const fullName = name.endsWith('.qf') ? name : `${name}.qf`;
    const node = namehash(fullName);
    const addr = await callContract<string>(QNS_RESOLVER_ADDRESS, RESOLVER_ABI, 'addr', [node]);
    if (!addr || addr === '0x0000000000000000000000000000000000000000') return null;
    return addr;
  } catch {
    return null;
  }
}

export async function resolveReverse(address: string): Promise<string | null> {
  try {
    const name = await callContract<string>(QNS_RESOLVER_ADDRESS, RESOLVER_ABI, 'reverseResolve', [address]);
    if (!name || name === '') return null;
    return name.endsWith('.qf') ? name.slice(0, -3) : name;
  } catch {
    return null;
  }
}

// ─── Balance ─────────────────────────────────────────────────────────

export async function getQFBalance(address: string): Promise<bigint> {
  try {
    if (address.startsWith('0x') && address.length === 42) {
      const response = await fetch(QF_ETH_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getBalance',
          params: [address, 'latest'],
        }),
      });
      const json = await response.json();
      if (json.result) return BigInt(json.result);
      return 0n;
    }
    const typedApi = getTypedApi();
    const accountInfo = await typedApi.query.System.Account.getValue(address);
    return accountInfo?.data?.free ?? 0n;
  } catch {
    return 0n;
  }
}

// ─── Formatting ──────────────────────────────────────────────────────

export function formatQF(wei: bigint): string {
  const qf = Number(wei) / 1e18;
  if (qf >= 1000) return qf.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (qf >= 1) return qf.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (qf >= 0.01) return qf.toLocaleString('en-US', { maximumFractionDigits: 4 });
  return qf.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

export function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ─── Burn calculation ────────────────────────────────────────────────

export function calculateBurn(amount: bigint): { burnAmount: bigint; recipientAmount: bigint } {
  const burnAmount = (amount * BURN_BASIS_POINTS) / BASIS_POINTS_DENOMINATOR;
  const recipientAmount = amount - burnAmount;
  return { burnAmount, recipientAmount };
}
Copy
5.3 src/utils/parseAmount.ts
Proper string-to-bigint decimal parsing. Avoids floating point errors.

Copy/**
 * Parse a decimal string amount into wei (bigint with 18 decimals).
 * Example: "100.5" → 100500000000000000000n
 */
export function parseQFAmount(amount: string): bigint {
  const trimmed = amount.trim();
  if (!trimmed || trimmed === '.' || trimmed === '0.') return 0n;

  const parts = trimmed.split('.');
  const whole = parts[0] || '0';
  let decimal = parts[1] || '';

  // Pad or truncate to 18 decimal places
  if (decimal.length > 18) {
    decimal = decimal.slice(0, 18);
  } else {
    decimal = decimal.padEnd(18, '0');
  }

  const combined = whole + decimal;
  // Remove leading zeros but keep at least one digit
  const cleaned = combined.replace(/^0+/, '') || '0';
  return BigInt(cleaned);
}

/**
 * Validate amount input string.
 * Returns true if it's a valid positive decimal number.
 */
export function isValidAmountInput(value: string): boolean {
  if (!value) return true; // empty is valid (not submittable, but valid input)
  return /^\d*\.?\d*$/.test(value) && value !== '.';
}
Copy
5.4 src/utils/address.ts
Copyimport { getSs58AddressInfo } from 'polkadot-api';
import { keccak256 } from 'viem';

/**
 * Convert SS58 address to EVM address (same derivation as wallet.ts).
 */
export function ss58ToEvmAddress(ss58: string): string {
  const info = getSs58AddressInfo(ss58);
  if (!info.isValid) throw new Error('Invalid SS58 address');
  const pubKeyHex = '0x' + Array.from(info.publicKey).map(b => b.toString(16).padStart(2, '0')).join('');
  const hash = keccak256(pubKeyHex as `0x${string}`);
  return '0x' + hash.slice(-40);
}

/**
 * Detect input type: 'qf-name' | 'evm-address' | 'ss58-address' | 'invalid'
 */
export function detectAddressType(input: string): 'qf-name' | 'evm-address' | 'ss58-address' | 'invalid' {
  const trimmed = input.trim().toLowerCase();

  // EVM address: 0x + 40 hex chars
  if (/^0x[0-9a-f]{40}$/.test(trimmed)) return 'evm-address';

  // SS58 address: starts with 5, 47-48 chars, alphanumeric
  if (/^5[a-zA-Z0-9]{46,47}$/.test(input.trim())) return 'ss58-address';

  // .qf name: strip .qf suffix if present, validate
  const name = trimmed.endsWith('.qf') ? trimmed.slice(0, -3) : trimmed;
  if (/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(name) || /^[a-z0-9]{3}$/.test(name)) return 'qf-name';

  return 'invalid';
}
Copy
6. STORES
6.1 src/stores/walletStore.ts
Port from QNS wallet store. Key changes for QFPay:

Remove QNS-specific fields: ownedNames, registration-related state
Keep: address, ss58Address, qnsName, displayName, walletName, connecting, accountMapped, showWalletModal, walletError
Change persist storage key to 'qfpay-wallet-storage'
Change the resolveReverse import to use '../utils/qfpay' instead of '../utils/qns'
Keep the FULL rehydration logic with retry (SubWallet in-app browser needs the 1500ms delayed retry)
Keep zombie state prevention (clear state if rehydration fails)
The file is structurally identical to the QNS version. Copy the full QNS walletStore.ts and make these search-and-replace changes:

'../utils/qns' → '../utils/qfpay'
'qns-wallet-storage' → 'qfpay-wallet-storage'
Remove any QNS-specific state fields if they exist (check for fields like ownedNames)
6.2 src/stores/paymentStore.ts
New store for the payment flow state machine.

Copyimport { create } from 'zustand';

export type PaymentPhase =
  | 'idle'           // form visible, no transaction in progress
  | 'preview'        // showing confirmation preview
  | 'broadcasting'   // wallet popup open, waiting for signature
  | 'burn'           // animation phase A — burn
  | 'sending'        // animation phase B — send
  | 'success'        // animation phase C — done
  | 'error';         // something failed before broadcast

export interface PaymentState {
  phase: PaymentPhase;
  recipientName: string | null;       // e.g. "sam" (without .qf)
  recipientAddress: string | null;    // resolved EVM address
  amount: string;                     // display string e.g. "100"
  amountWei: bigint;                  // parsed bigint
  burnAmountWei: bigint;
  recipientAmountWei: bigint;
  txHash: string | null;
  confirmed: boolean | null;          // null = pending, true = confirmed, false = failed/timeout
  confirmationError: string | null;
  error: string | null;

  setRecipient: (name: string | null, address: string | null) => void;
  setAmount: (amount: string, amountWei: bigint, burnWei: bigint, recipientWei: bigint) => void;
  goToPreview: () => void;
  goBackToForm: () => void;
  setBroadcasting: () => void;
  startAnimation: (txHash: string) => void;
  advanceToSending: () => void;
  advanceToSuccess: () => void;
  setConfirmation: (confirmed: boolean, error?: string) => void;
  setError: (error: string) => void;
  reset: () => void;
}

const initialState = {
  phase: 'idle' as PaymentPhase,
  recipientName: null,
  recipientAddress: null,
  amount: '',
  amountWei: 0n,
  burnAmountWei: 0n,
  recipientAmountWei: 0n,
  txHash: null,
  confirmed: null,
  confirmationError: null,
  error: null,
};

export const usePaymentStore = create<PaymentState>()((set) => ({
  ...initialState,

  setRecipient: (name, address) => set({ recipientName: name, recipientAddress: address }),

  setAmount: (amount, amountWei, burnWei, recipientWei) =>
    set({ amount, amountWei, burnAmountWei: burnWei, recipientAmountWei: recipientWei }),

  goToPreview: () => set({ phase: 'preview' }),

  goBackToForm: () => set({ phase: 'idle' }),

  setBroadcasting: () => set({ phase: 'broadcasting' }),

  startAnimation: (txHash) => set({ phase: 'burn', txHash }),

  advanceToSending: () => set({ phase: 'sending' }),

  advanceToSuccess: () => set({ phase: 'success' }),

  setConfirmation: (confirmed, error) =>
    set({ confirmed, confirmationError: error || null }),

  setError: (error) => set({ phase: 'error', error }),

  reset: () => set(initialState),
}));
Copy
7. COMPONENTS
7.1 src/App.tsx — Root Component
This is the single-page shell. It renders the current state and manages the full-viewport background color transitions.

Structure:
- A `motion.div` wrapper covering the full viewport (min-h-screen w-full)
- Its `backgroundColor` is animated based on `paymentStore.phase`:
  - idle / preview / broadcasting / error → '#0A0A0A'
  - burn → '#C13333'
  - sending → '#00D179'
  - success → '#0052FF'
- Transition: `{ duration: 0.6, ease: 'easeInOut' }`
- Inside: conditionally render the current view based on wallet connection + payment phase
- Toast container rendered above everything (fixed position)
Logic:

if (!walletConnected) → <DisconnectedView />
if (phase === 'idle') → <SendForm />
if (phase === 'preview') → <PreviewStep />
if (phase === 'broadcasting') → <PreviewStep /> with loading state on button
if (phase in ['burn', 'sending', 'success']) → <AnimationSequence />
if (phase === 'error') → <SendForm /> with error toast
Use AnimatePresence with mode="wait" to transition between views.

7.2 src/components/DisconnectedView.tsx
The landing state. See qfpay.md Screen 1 for exact design.

QFPay wordmark (Clash Display 600)
Tagline: "Instant money. Just a name." (Satoshi 400, #8A8A8A)
"Connect Wallet" button (#0052FF)
On click: walletStore.connect() → opens wallet modal
Entrance: staggered fade-in + slide-up via Framer Motion
7.3 src/components/WalletModal.tsx
Modal overlay for wallet selection. Port the pattern from QNS.

Two options: Talisman and SubWallet
Each is a button showing the wallet name
On click: walletStore.connectWallet('talisman' | 'subwallet')
Show loading state while connecting
Show error messages (from walletStore.walletError)
Close on backdrop click or X button
Mobile: if no wallet extensions detected, show message "Open this page in SubWallet or Talisman's in-app browser"
7.4 src/components/SendForm.tsx
The main interaction. See qfpay.md Screen 2 for design.

Key behaviors:

Recipient input with 400ms debounced resolution
Uses detectAddressType() to determine input type
For .qf names: calls resolveForward(), shows green checkmark on success
For 0x addresses: validates hex format, uses directly
For SS58 addresses: converts via ss58ToEvmAddress(), uses result
Self-send check: compare resolved address with walletStore.address
Amount input with isValidAmountInput() validation
Quick amount buttons (10, 50, 100, 500) that set the amount
Balance fetched on mount and after send via getQFBalance(walletStore.ss58Address)
Burn/recipient preview calculated via calculateBurn()
Send button: disabled when invalid, calls paymentStore.goToPreview()
7.5 src/components/PreviewStep.tsx
Confirmation screen. See qfpay.md Screen 3.

Displays amount, recipient name, burn breakdown
"Back" button → paymentStore.goBackToForm()
"Confirm" button → triggers the actual transaction:
Copyasync function handleConfirm() {
  paymentStore.setBroadcasting();
  try {
    const { txHash, confirmation } = await writeContract(
      QFPAY_ROUTER_ADDRESS,
      ROUTER_ABI,
      'send',
      [recipientAddress],
      null, // signer pulled from connection internally
      amountWei
    );

    // Broadcast received — start animation
    paymentStore.startAnimation(txHash);

    // Track confirmation in background
    confirmation.then(({ confirmed, error }) => {
      paymentStore.setConfirmation(confirmed, error);
    });
  } catch (err: any) {
    const msg = err?.message || 'Transaction failed';
    if (isRetryableError(msg)) {
      // Show amber toast with retry message
      showToast('warning', RETRY_MESSAGE_SHORT);
      paymentStore.goBackToForm();
    } else {
      showToast('error', msg);
      paymentStore.goBackToForm();
    }
  }
}
Copy
7.6 src/components/AnimationSequence.tsx
The signature experience. This component takes over the full viewport during the animation.

It does NOT manage the background color — that's handled by the motion.div in App.tsx via the payment phase. This component only manages the content within each phase.

Structure:
- AnimatePresence mode="wait"
- Key changes based on paymentStore.phase
- Phase 'burn':
  - Large burn amount text (Clash Display, 72-80px)
  - "burned" subtitle
  - <EmberParticles /> component
  - After 1.2s → paymentStore.advanceToSending()
- Phase 'sending':
  - Large recipient amount text
  - "→ sam.qf" with spring entrance
  - After 1.0s → paymentStore.advanceToSuccess()
- Phase 'success':
  - Animated SVG checkmark (path drawing)
  - "Payment sent" heading
  - Amount and recipient summary
  - Burn summary
  - "Send Another" button → paymentStore.reset()
  - Confirmation status (updates when paymentStore.confirmed changes)
Use useEffect with setTimeout to advance phases:

CopyuseEffect(() => {
  if (phase === 'burn') {
    const timer = setTimeout(() => advanceToSending(), 1200);
    return () => clearTimeout(timer);
  }
  if (phase === 'sending') {
    const timer = setTimeout(() => advanceToSuccess(), 1000);
    return () => clearTimeout(timer);
  }
}, [phase]);
7.7 src/components/EmberParticles.tsx
Particle effect for the burn phase. 20 particles with:

Random x offset: -40 to +40px from center
Random y travel: -100 to -250px upward
Random size: 2-4px (circles)
Random delay: 0-0.5s
Random duration: 0.8-1.5s
Colors randomly from: #F5A623, #FF6B35, #E85D26, #FFD700
Each particle is a motion.div with absolute positioning
Animate: y (downward start to upward), opacity (1 → 0), slight x drift
Copyconst particles = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: (Math.random() - 0.5) * 80,
  yEnd: -(100 + Math.random() * 150),
  size: 2 + Math.random() * 2,
  delay: Math.random() * 0.5,
  duration: 0.8 + Math.random() * 0.7,
  color: ['#F5A623', '#FF6B35', '#E85D26', '#FFD700'][Math.floor(Math.random() * 4)],
}));
7.8 src/components/Toast.tsx
Toast notification system. Three types: success (green), warning (amber), error (red).

Fixed position top-center
Max 3 visible, stacked vertically
Success: auto-dismiss 3s
Warning: auto-dismiss 7s
Error: manual dismiss only, replaces previous error
Entrance: slide down + fade in
Exit: slide up + fade out
Manage with a simple Zustand store or React context
8. EXECUTION ORDER
Build in this exact sequence. Verify each step works before proceeding.

Phase 1: Skeleton + Wallet (Day 1)
Initialize project (Section 1)
Create all config and utility files (Sections 4 + 5)
Create wallet store (Section 6.1)
Create payment store (Section 6.2)
Build DisconnectedView + WalletModal
Build App.tsx shell with wallet-connected conditional rendering
Verify: App loads, shows landing page, wallet connects, address displays, persists on reload
Phase 2: Send Form + Resolution (Day 2)
Build SendForm component with recipient input
Wire up name resolution (debounced resolveForward)
Wire up address detection and validation
Wire up balance fetching
Wire up amount input with burn calculation
Build Toast component
Verify: Can type a .qf name, see it resolve, enter amount, see burn preview, see balance
Phase 3: Transaction Flow (Day 3)
Build PreviewStep component
Wire up writeContract call to QFPayRouter.send()
Handle broadcast → start animation
Handle confirmation in background
Handle errors (pre-broadcast and post-broadcast)
Verify: Full transaction flow works end-to-end on QF Network (requires deployed router contract and QNS resolver)
Phase 4: Animation Sequence (Day 3-4)
Build EmberParticles component
Build AnimationSequence component with three phases
Wire up background color transitions in App.tsx
Wire up phase timing (1.2s → 1.0s → persist)
Wire up confirmation status on success screen
Wire up "Send Another" reset flow
Verify: Full animation plays on successful broadcast, background colors transition, confirmation updates
Phase 5: Polish (Day 4-5)
Responsive testing (mobile, SubWallet in-app browser)
Error edge cases (disconnection mid-transaction, timeout, network errors)
Entrance animations on all components
Input focus states, hover states, disabled states
Loading states during resolution and broadcasting
Haptic feedback (optional, if navigator.vibrate available)
Verify: All states feel polished, no broken edge cases
9. TESTING CHECKLIST
Before declaring done, verify each scenario:

 Fresh page load → disconnected state renders
 Connect Talisman → wallet connects, address shows, balance loads
 Connect SubWallet → same
 Refresh page → wallet rehydrates automatically
 Type valid .qf name → resolves, green checkmark, address preview
 Type unregistered .qf name → "Name not found"
 Type own name → "Cannot send to yourself"
 Type 0x address → accepted directly
 Type SS58 address → converted and accepted
 Enter amount > balance → "Insufficient balance", button disabled
 Enter valid amount → burn and recipient preview show correctly
 Press Send → Preview screen shows
 Press Back on preview → returns to form
 Press Confirm → wallet popup, sign, broadcast → animation plays
 Animation: burn (red bg) → send (green bg) → success (blue bg)
 Ember particles appear during burn phase
 Checkmark draws on success
 Confirmation text appears when on-chain confirmation arrives
 "Send Another" resets to form on dark background
 Reject in wallet → error toast, return to form
 Network error → appropriate toast, retry guidance
 Mobile: full flow works in SubWallet in-app browser
 Multiple sends in a row without page refresh
 Disconnect → clears all state, returns to landing
10. IMPORTANT GOTCHAS
PAPI descriptors must be generated before build. If you see type errors about qf imports from @polkadot-api/descriptors, run npx papi generate.

The writeContract function dynamically imports walletStore. Make sure the import path '../stores/walletStore' is correct relative to where contractCall.ts lives.

Account mapping (ensureAccountMapped) can trigger a wallet popup on first use. This is expected. The wallet store handles this during connection.

The router contract address will be 0x000...000 until deployed. The UI should gracefully handle this — if the router address is all zeros, disable the send button and show "QFPay router not yet deployed."

Balance queries use the SS58 address (via Substrate storage), not the EVM address. The getQFBalance function handles both formats but prefer SS58 for balance checks (it's the canonical identity).

The QNS Resolver address must match the one used by QNS. Get it from the QNS team or from the QNS .env / contracts.ts. If it's wrong, name resolution will silently return null for everything.

viem is a dependency but only for ABI encoding. Do NOT create any viem publicClient, walletClient, or transport. If you see createPublicClient or createWalletClient anywhere in the codebase, it's wrong.

Framer Motion v12+ uses motion/react import path, not framer-motion/motion. Check the installed version and import accordingly. The QNS repo uses framer-motion package with ^12.38.0.

The burn animation color (#C13333) is NOT the same as error red (#E5484D). They serve completely different purposes. Don't mix them up.

When testing locally without a deployed router contract, you can temporarily use sendTransfer (direct native transfer without burn) to validate the flow. Swap back to writeContract + router when the contract is deployed.