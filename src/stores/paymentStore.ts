import { create } from 'zustand';

export type PaymentPhase =
  | 'idle'           // identity screen (post-connect)
  | 'recipient'      // full-screen recipient input
  | 'amount'         // full-screen amount input
  | 'preview'        // confirmation screen
  | 'broadcasting'   // wallet popup open, waiting for signature
  | 'burn'           // animation phase A — burn
  | 'sending'        // animation phase B — send
  | 'success'        // animation phase C — done
  | 'error';         // something failed before broadcast

export interface PaymentState {
  phase: PaymentPhase;
  recipientName: string | null;
  recipientAddress: string | null;
  recipientAvatar: string | null;
  amount: string;
  amountWei: bigint;
  burnAmountWei: bigint;
  recipientAmountWei: bigint;
  totalRequiredWei: bigint;
  txHash: string | null;
  confirmed: boolean | null;
  confirmationError: string | null;
  error: string | null;

  setRecipient: (name: string | null, address: string | null, avatar?: string | null) => void;
  setAmount: (amount: string, amountWei: bigint, burnWei: bigint, recipientWei: bigint, totalWei: bigint) => void;
  goToRecipient: () => void;
  goToAmount: () => void;
  goToPreview: () => void;
  goBackToRecipient: () => void;
  goBackToAmount: () => void;
  goBackToIdle: () => void;
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
  recipientAvatar: null,
  amount: '',
  amountWei: 0n,
  burnAmountWei: 0n,
  recipientAmountWei: 0n,
  totalRequiredWei: 0n,
  txHash: null,
  confirmed: null,
  confirmationError: null,
  error: null,
};

export const usePaymentStore = create<PaymentState>()((set) => ({
  ...initialState,

  setRecipient: (name, address, avatar) => set({
    recipientName: name,
    recipientAddress: address,
    recipientAvatar: avatar ?? null,
  }),

  setAmount: (amount, amountWei, burnWei, recipientWei, totalWei) =>
    set({ amount, amountWei, burnAmountWei: burnWei, recipientAmountWei: recipientWei, totalRequiredWei: totalWei }),

  goToRecipient: () => set({ phase: 'recipient' }),
  goToAmount: () => set({ phase: 'amount' }),
  goToPreview: () => set({ phase: 'preview' }),
  goBackToRecipient: () => set({ phase: 'recipient' }),
  goBackToAmount: () => set({ phase: 'amount' }),
  goBackToIdle: () => set({ phase: 'idle' }),

  setBroadcasting: () => set({ phase: 'broadcasting' }),

  startAnimation: (txHash) => set({ phase: 'burn', txHash }),

  advanceToSending: () => set({ phase: 'sending' }),

  advanceToSuccess: () => set({ phase: 'success' }),

  setConfirmation: (confirmed, error) =>
    set({ confirmed, confirmationError: error || null }),

  setError: (error) => set({ phase: 'error', error }),

  reset: () => set(initialState),
}));
