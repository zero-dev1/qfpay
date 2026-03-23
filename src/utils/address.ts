import { getSs58AddressInfo } from 'polkadot-api';
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
