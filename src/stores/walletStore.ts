import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { connectSubstrateWallet, disconnectWallet, detectWalletExtensions } from '../utils/wallet';
import { ensureAccountMapped } from '../utils/accountMapping';
import { resolveReverse } from '../utils/qfpay';

interface WalletState {
  // Connection state
  address: string | null;
  ss58Address: string | null;
  qnsName: string | null;
  displayName: string | null;
  walletName: string | null;
  signer: any; // PAPI signer
  connecting: boolean;
  accountMapped: boolean;
  showWalletModal: boolean;
  walletError: string | null;

  // Actions
  connect: (walletName: string) => Promise<void>;
  connectWallet: (walletName: string) => Promise<void>;
  disconnect: () => void;
  setShowWalletModal: (show: boolean) => void;
  setWalletError: (error: string | null) => void;
  clearWalletError: () => void;
  rehydrate: () => Promise<void>;
  getSigner: () => any;
}

const initialState = {
  address: null,
  ss58Address: null,
  qnsName: null,
  displayName: null,
  walletName: null,
  signer: null,
  connecting: false,
  accountMapped: false,
  showWalletModal: false,
  walletError: null,
};

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      ...initialState,

      connect: async (walletName: string) => {
        set({ connecting: true, walletError: null });
        
        try {
          const connection = await connectSubstrateWallet(walletName);
          
          // Ensure account is mapped
          const mapped = await ensureAccountMapped(connection.ss58Address);
          
          // Try to resolve reverse name
          let qnsName: string | null = null;
          try {
            qnsName = await resolveReverse(connection.address);
          } catch {
            // Name resolution failed, that's okay
          }

          // Store signer for contract calls
          // For now, we'll use the SS58 address as a placeholder signer
          // In a full implementation, this would be the actual PAPI signer
          const signer = connection.ss58Address;

          set({
            address: connection.address,
            ss58Address: connection.ss58Address,
            qnsName,
            displayName: qnsName || connection.address,
            walletName: connection.walletName,
            signer,
            accountMapped: mapped,
            connecting: false,
            showWalletModal: false,
            walletError: null,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Connection failed';
          set({
            connecting: false,
            walletError: message,
          });
        }
      },

      connectWallet: async (walletName: string) => {
        const extensions = detectWalletExtensions();
        
        if (walletName === 'talisman' && !extensions.talisman) {
          set({ walletError: 'Talisman wallet not found. Please install Talisman extension.' });
          return;
        }
        
        if (walletName === 'subwallet' && !extensions.subwallet) {
          set({ walletError: 'SubWallet not found. Please install SubWallet extension.' });
          return;
        }

        await get().connect(walletName);
      },

      disconnect: async () => {
        await disconnectWallet();
        set(initialState);
      },

      setShowWalletModal: (show: boolean) => {
        set({ showWalletModal: show, walletError: null });
      },

      setWalletError: (error: string | null) => {
        set({ walletError: error });
      },

      clearWalletError: () => {
        set({ walletError: null });
      },

      rehydrate: async () => {
        const state = get();
        if (state.address && state.ss58Address) {
          // Re-validate the connection
          try {
            const mapped = await ensureAccountMapped(state.ss58Address);
            set({ accountMapped: mapped });
          } catch {
            // Failed to rehydrate, clear state
            set(initialState);
          }
        }
      },

      getSigner: () => {
        return get().signer;
      },
    }),
    {
      name: 'qfpay-wallet-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // Delayed retry for slow extension injection (SubWallet in-app browser)
        setTimeout(() => {
          state?.rehydrate();
        }, 1500);
      },
    }
  )
);

// Rehydration on app start
if (typeof window !== 'undefined') {
  useWalletStore.persist.rehydrate();
}
