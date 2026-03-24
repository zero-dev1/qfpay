import { keccak256, encodePacked, type Hex } from 'viem';
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

export function calculateBurn(intendedAmount: bigint): { burnAmount: bigint; recipientAmount: bigint; totalRequired: bigint } {
  const burnAmount = (intendedAmount * BURN_BASIS_POINTS) / BASIS_POINTS_DENOMINATOR;
  const recipientAmount = intendedAmount; // Recipient gets exactly what they expect
  const totalRequired = intendedAmount + burnAmount; // Sender pays amount + burn
  return { burnAmount, recipientAmount, totalRequired };
}

// ─── QNS Text Records (avatar, etc.) ────────────────────────────────

export async function getTextRecord(name: string, key: string): Promise<string | null> {
  try {
    const fullName = name.endsWith('.qf') ? name : `${name}.qf`;
    const node = namehash(fullName);
    const value = await callContract<string>(QNS_RESOLVER_ADDRESS, RESOLVER_ABI, 'text', [node, key]);
    if (!value || value === '') return null;
    return value;
  } catch {
    return null;
  }
}

export async function getAvatar(name: string): Promise<string | null> {
  return getTextRecord(name, 'avatar');
}
