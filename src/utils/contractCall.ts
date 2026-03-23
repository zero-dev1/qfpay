import { type Abi } from 'viem';

// Placeholder implementation for Phase 1-3
// Will implement proper PAPI contract calls in later phases

export async function callContract<T = any>(
  address: string,
  abi: Abi,
  functionName: string,
  args: any[] = []
): Promise<T> {
  console.log(`Mock call: ${functionName} to ${address}`, args);
  
  // Return mock data for common calls
  if (functionName === 'addr') {
    return '0x1234567890123456789012345678901234567890' as T;
  }
  if (functionName === 'reverseResolve') {
    return 'test' as T;
  }
  
  return null as T;
}

export interface TxResult {
  txHash: string;
  confirmation: Promise<{ confirmed: boolean; error?: string }>;
}

export async function writeContract(
  address: string,
  abi: Abi,
  functionName: string,
  args: any[],
  signer: any,
  value: bigint = 0n,
  verifyOnChain: boolean = true
): Promise<TxResult> {
  console.log(`Mock write: ${functionName} to ${address}`, args, value);
  
  // Simulate wallet popup delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Generate realistic mock transaction hash
  const mockTxHash = '0x' + Array.from({length: 64}, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  
  const confirmation = new Promise<{ confirmed: boolean; error?: string }>(async (resolve) => {
    if (!verifyOnChain) {
      resolve({ confirmed: true });
      return;
    }

    try {
      // Simulate blockchain confirmation delay (5-15 seconds)
      const confirmationDelay = 5000 + Math.random() * 10000;
      
      setTimeout(() => {
        // 90% chance of success, 10% chance of timeout/failure for realism
        if (Math.random() < 0.9) {
          resolve({ confirmed: true });
        } else {
          resolve({ confirmed: false, error: 'Transaction confirmation timeout' });
        }
      }, confirmationDelay);
      
    } catch (error) {
      resolve({ confirmed: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  return { txHash: mockTxHash, confirmation };
}

export async function sendTransfer(
  toEvmAddress: string,
  amount: bigint,
  signerAddress: string,
  verifyOnChain: boolean = true
): Promise<TxResult> {
  console.log(`Mock transfer: ${amount} to ${toEvmAddress}`);
  
  const mockTxHash = '0x' + Array.from({length: 64}, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  
  const confirmation = Promise.resolve({ confirmed: true });
  
  return { txHash: mockTxHash, confirmation };
}
