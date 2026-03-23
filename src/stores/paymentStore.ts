import { create } from 'zustand';

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
