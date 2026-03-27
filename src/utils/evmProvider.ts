// src/utils/evmProvider.ts

import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type PublicClient,
  type WalletClient,
  type Transport,
  type Chain,
} from 'viem';
import { qfNetwork } from '../config/evmChain';

let publicClient: PublicClient | null = null;
let walletClient: WalletClient<Transport, Chain, { address: `0x${string}`; type: 'json-rpc' }> | null = null;

// Prevents re-entrant MetaMask event handling during connection setup
let reconnecting = false;
export function isReconnecting(): boolean { return reconnecting; }
export function setReconnecting(value: boolean): void { reconnecting = value; }

export function getEvmPublicClient(): PublicClient {
  if (!publicClient) {
    publicClient = createPublicClient({
      chain: qfNetwork,
      transport: http(),
    });
  }
  return publicClient;
}

export async function createEvmWalletClient(): Promise<
  WalletClient<Transport, Chain, { address: `0x${string}`; type: 'json-rpc' }>
> {
  if (!window.ethereum) throw new Error('MetaMask not installed');
  const [address] = (await window.ethereum.request({
    method: 'eth_requestAccounts',
  })) as string[];
  walletClient = createWalletClient({
    account: address as `0x${string}`,
    chain: qfNetwork,
    transport: custom(window.ethereum),
  });
  return walletClient;
}

/**
 * CRITICAL: Lazy recovery. If the singleton was killed (by disconnect/reconnect
 * race, by tab sleep, etc.), this silently reconstructs it using eth_accounts
 * (which doesn't prompt). Returns null ONLY if MetaMask is genuinely unavailable.
 */
export async function getOrCreateEvmWalletClient(): Promise<
  WalletClient<Transport, Chain, { address: `0x${string}`; type: 'json-rpc' }> | null
> {
  if (walletClient) return walletClient;
  if (!window.ethereum) return null;
  try {
    const accounts = (await window.ethereum.request({
      method: 'eth_accounts',
    })) as string[];
    if (!accounts || accounts.length === 0) return null;
    walletClient = createWalletClient({
      account: accounts[0] as `0x${string}`,
      chain: qfNetwork,
      transport: custom(window.ethereum),
    });
    return walletClient;
  } catch {
    return null;
  }
}

export async function isOnQFNetwork(): Promise<boolean> {
  if (!window.ethereum) return false;
  try {
    const chainId = (await window.ethereum.request({ method: 'eth_chainId' })) as string;
    return parseInt(chainId, 16) === qfNetwork.id;
  } catch { return false; }
}

export async function ensureQFNetwork(): Promise<void> {
  if (!window.ethereum) throw new Error('MetaMask not installed');
  const chainIdHex = `0x${qfNetwork.id.toString(16)}`;
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    });
  } catch (err: any) {
    if (err.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: chainIdHex,
          chainName: qfNetwork.name,
          nativeCurrency: qfNetwork.nativeCurrency,
          rpcUrls: [qfNetwork.rpcUrls.default.http[0]],
          blockExplorerUrls: [qfNetwork.blockExplorers.default.url],
        }],
      });
    } else { throw err; }
  }
}

export function destroyEvmClients(): void {
  publicClient = null;
  walletClient = null;
}

/**
 * MetaMask event watchers. Guarded by `reconnecting` flag.
 * DO NOT do full disconnect/reconnect on every event — that causes infinite loops.
 */
export function watchMetaMaskChanges(
  onAccountChange: (accounts: string[]) => void,
  onChainChange: (chainId: string) => void
): () => void {
  if (!window.ethereum) return () => {};
  const handleAccounts = (...args: unknown[]) => {
    if (reconnecting) return;
    onAccountChange(args[0] as string[]);
  };
  const handleChain = (...args: unknown[]) => {
    if (reconnecting) return;
    onChainChange(args[0] as string);
  };
  window.ethereum.on('accountsChanged', handleAccounts);
  window.ethereum.on('chainChanged', handleChain);
  return () => {
    window.ethereum?.removeListener('accountsChanged', handleAccounts);
    window.ethereum?.removeListener('chainChanged', handleChain);
  };
}
