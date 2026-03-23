import { keccak256 } from 'viem';

export interface WalletConnection {
  address: string;
  ss58Address: string;
  walletName: string;
}

export async function connectSubstrateWallet(walletName: string): Promise<WalletConnection> {
  try {
    // Placeholder implementation for Phase 1
    // Will implement proper PAPI wallet connection later
    console.log(`Connecting to ${walletName}`);
    
    // Mock connection for now
    const mockAddress = '0x1234567890123456789012345678901234567890';
    const mockSs58Address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    
    return {
      address: mockAddress,
      ss58Address: mockSs58Address,
      walletName,
    };
  } catch (error) {
    console.error('Wallet connection error:', error);
    throw error;
  }
}

export function deriveEVMAddress(publicKey: Uint8Array): string {
  const pubKeyHex = '0x' + Array.from(publicKey).map(b => b.toString(16).padStart(2, '0')).join('');
  const hash = keccak256(pubKeyHex as `0x${string}`);
  return '0x' + hash.slice(-40);
}

export async function getCurrentConnection(): Promise<WalletConnection | null> {
  // Placeholder - will implement with store
  return null;
}

export async function disconnectWallet(): Promise<void> {
  console.log('Wallet disconnected');
}

export function detectWalletExtensions(): { talisman: boolean; subwallet: boolean } {
  if (typeof window === 'undefined') {
    return { talisman: false, subwallet: false };
  }
  
  return {
    talisman: !!(window as any).talismanEth,
    subwallet: !!(window as any).subwallet,
  };
}
