// src/utils/evmContractCall.ts

import { getEvmPublicClient, getOrCreateEvmWalletClient, ensureQFNetwork } from './evmProvider';
import { qfNetwork } from '../config/evmChain';
import type { TxResult } from './contractCall';

export async function evmCallContract<T = any>(
  contractAddress: string,
  abi: any[],
  functionName: string,
  args: any[] = []
): Promise<T> {
  const client = getEvmPublicClient();
  return (await client.readContract({
    address: contractAddress as `0x${string}`,
    abi,
    functionName,
    args,
  })) as T;
}

export async function evmWriteContract(
  contractAddress: string,
  abi: any[],
  functionName: string,
  args: any[],
  value: bigint = 0n,
  verifyOnChain?: () => Promise<boolean>
): Promise<TxResult> {
  const walletClient = await getOrCreateEvmWalletClient();
  if (!walletClient) throw new Error('MetaMask not connected. Please reconnect your wallet.');

  try {
    await ensureQFNetwork();
  } catch (err: any) {
    if (err?.code === 4001) throw new Error('Transaction rejected by user');
    throw new Error('Please switch MetaMask to QF Network and try again.');
  }

  try {
    const txHash = await walletClient.writeContract({
      address: contractAddress as `0x${string}`,
      abi,
      functionName,
      args,
      value,
      chain: qfNetwork,
    });

    const confirmation = new Promise<{ confirmed: boolean; error?: string }>(async (resolve) => {
      try {
        const receipt = await getEvmPublicClient().waitForTransactionReceipt({
          hash: txHash,
          timeout: 30_000,
        });
        resolve(
          receipt.status === 'success'
            ? { confirmed: true }
            : { confirmed: false, error: 'Transaction reverted' }
        );
      } catch {
        if (verifyOnChain) {
          try {
            const ok = await verifyOnChain();
            resolve({ confirmed: ok, error: ok ? undefined : 'not_confirmed' });
          } catch {
            resolve({ confirmed: false, error: 'verification_failed' });
          }
        } else {
          resolve({ confirmed: false, error: 'not_confirmed' });
        }
      }
    });

    return { txHash, confirmation };
  } catch (err: any) {
    const msg = err?.message ?? '';
    if (
      msg.includes('User denied') ||
      msg.includes('User rejected') ||
      msg.includes('ACTION_REJECTED') ||
      err.code === 4001
    ) {
      throw new Error('Transaction rejected by user');
    }
    if (msg.includes('chain') && (msg.includes('mismatch') || msg.includes('switch'))) {
      throw new Error('Please switch MetaMask to QF Network and try again.');
    }
    throw new Error(`Transaction failed: ${msg}`);
  }
}

export async function evmGetBalance(address: string): Promise<bigint> {
  try {
    return await getEvmPublicClient().getBalance({ address: address as `0x${string}` });
  } catch {
    return 0n;
  }
}
