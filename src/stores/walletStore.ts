import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { truncateAddress, resolveReverse } from '../utils/qfpay';
import { ensureAccountMapped, METADATA_HASH_ERROR, USER_CANCELLED } from '../utils/accountMapping';
import {
  connectSubstrateWallet,
  disconnectWallet,
  getAvailableWallets,
  type WalletConnection,
} from '../utils/wallet';

interface WalletState {
  address: `0x${string}` | null;
  ss58Address: string | null;
  qnsName: string | null;
  displayName: string | null;
  connecting: boolean;
  walletConnection: WalletConnection | null;
  walletName: string | null;
  accountMapped: boolean;
  showWalletModal: boolean;
  walletError: string | null;
  _rehydrating: boolean;

  connect: () => Promise<void>;
  connectWallet: (walletType: 'talisman' | 'subwallet') => Promise<void>;
  disconnect: () => void;
  refreshName: () => Promise<void>;
  setShowWalletModal: (show: boolean) => void;
  clearWalletError: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      address: null,
      ss58Address: null,
      qnsName: null,
      displayName: null,
      connecting: false,
      walletConnection: null,
      walletName: null,
      accountMapped: false,
      showWalletModal: false,
      walletError: null,
      _rehydrating: false,

      connect: async () => {
        set({ showWalletModal: true });
      },

      connectWallet: async (walletType: 'talisman' | 'subwallet') => {
        const isRehydrating = get()._rehydrating;
        const setError = (error: string) => {
          if (!isRehydrating) {
            set({ walletError: error });
          }
        };
        
        set({ connecting: true, walletError: null });

        try {
          const walletName = walletType === 'talisman' ? 'talisman' : 'subwallet-js';
          const connection = await Promise.race([
            connectSubstrateWallet(walletName),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Wallet connection timed out after 10 seconds.')), 10_000)
            ),
          ]);

          set({ walletConnection: connection });

          const evmAddr = connection.evmAddress as `0x${string}`;
          const ss58Addr = connection.address;

          set({
            address: evmAddr,
            ss58Address: ss58Addr,
            displayName: truncateAddress(ss58Addr),
            walletName: walletType,
          });

          // Resolve QNS name in background
          resolveReverse(evmAddr).then(name => {
            if (name) set({ qnsName: name, displayName: name });
          }).catch(() => {});

          // Map account
          try {
            await ensureAccountMapped(ss58Addr);
            set({ accountMapped: true, showWalletModal: false });
          } catch (mapErr: any) {
            const msg = mapErr?.message ?? '';

            if (msg === METADATA_HASH_ERROR || msg.includes('METADATA_HASH_ERROR')) {
              setError(
                'QF Network requires CheckMetadataHash to be disabled. ' +
                'In Talisman: Settings → Networks & Tokens → Manage Networks → QF Network → uncheck metadata hash verification. Then reconnect.',
              );
              set({ accountMapped: false });
              return;
            }

            if (msg === USER_CANCELLED || msg.includes('USER_CANCELLED')) {
              set({ accountMapped: false, showWalletModal: false });
              return;
            }

            disconnectWallet();
            setError('Account setup incomplete — please try connecting again.');
            set({
              accountMapped: false,
              address: null,
              ss58Address: null,
              qnsName: null,
              displayName: null,
              walletConnection: null,
              walletName: null,
            });
            return;
          }
        } catch (error: any) {
          const msg = error.message || '';
          if (msg.includes('No accounts found') || msg.includes('no accounts')) {
            setError('No accounts found. Please create an account in your wallet extension.');
          } else if (msg.includes('extension') || msg.includes('not installed') || msg.includes('Cannot read properties')) {
            setError('Please install Talisman or SubWallet to use this dApp.');
          } else if (msg.includes('timed out')) {
            setError(msg);
          } else {
            setError(msg || 'Failed to connect wallet');
          }
          disconnectWallet();
          set({
            address: null,
            ss58Address: null,
            qnsName: null,
            displayName: null,
            walletConnection: null,
            walletName: null,
            accountMapped: false,
          });
        } finally {
          set({ connecting: false });
        }
      },

      disconnect: () => {
        disconnectWallet();
        set({
          address: null,
          ss58Address: null,
          qnsName: null,
          displayName: null,
          walletConnection: null,
          walletName: null,
          accountMapped: false,
          showWalletModal: false,
          walletError: null,
          connecting: false,
          _rehydrating: false,
        });
      },

      refreshName: async () => {
        const { address } = get();
        if (!address) return;
        try {
          const name = await resolveReverse(address);
          if (name) {
            set({ qnsName: name, displayName: name });
          } else {
            const { ss58Address } = get();
            set({
              qnsName: null,
              displayName: ss58Address ? truncateAddress(ss58Address) : truncateAddress(address),
            });
          }
        } catch {
          const { ss58Address } = get();
          set({
            qnsName: null,
            displayName: ss58Address ? truncateAddress(ss58Address) : truncateAddress(address),
          });
        }
      },

      setShowWalletModal: (show: boolean) => {
        set({ showWalletModal: show, walletError: null });
      },

      clearWalletError: () => {
        set({ walletError: null });
      },
    }),
    {
      name: 'qfpay-wallet-storage',
      version: 2,
      migrate: (_persistedState: any, version: number) => {
        if (version < 2) return {} as any;
        return _persistedState;
      },
      partialize: (state) => ({
        address: state.address,
        ss58Address: state.ss58Address,
        qnsName: state.qnsName,
        displayName: state.displayName,
        walletName: state.walletName,
        accountMapped: state.accountMapped,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          if (state?.address && state?.walletName) {
            const walletType = state.walletName as 'talisman' | 'subwallet';
            const extensionId = walletType === 'talisman' ? 'talisman' : 'subwallet-js';
            
            const attemptRehydration = () => {
              const available = getAvailableWallets();
              if (!available.includes(extensionId)) {
                return false;
              }
              useWalletStore.setState({ _rehydrating: true });
              state.connectWallet(walletType).then(() => {
                useWalletStore.setState({ _rehydrating: false });
              }).catch(() => {
                useWalletStore.setState({ _rehydrating: false });
                state.disconnect();
              });
              return true;
            };
            
            if (!attemptRehydration()) {
              setTimeout(() => {
                if (!attemptRehydration()) {
                  setTimeout(() => {
                    if (!attemptRehydration()) {
                      setTimeout(() => {
                        if (!attemptRehydration()) {
                          state.disconnect();
                        }
                      }, 1500);
                    }
                  }, 1000);
                }
              }, 500);
            }
          }
        };
      },
    }
  )
);