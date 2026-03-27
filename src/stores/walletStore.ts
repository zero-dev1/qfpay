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

// ─── Helper: retry QNS resolution (PAPI may not be ready during rehydration) ───
async function resolveNameWithRetry(
  evmAddr: string,
  maxAttempts = 3,
  delayMs = 2000
): Promise<string | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const name = await resolveReverse(evmAddr);
      if (name) return name;
    } catch {}
    if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

interface WalletState {
  address: `0x${string}` | null;
  ss58Address: string | null;
  qnsName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  connecting: boolean;
  walletConnection: WalletConnection | null;
  walletName: string | null;
  providerType: 'substrate' | 'evm' | null;
  accountMapped: boolean;
  showWalletModal: boolean;
  walletError: string | null;
  _rehydrating: boolean;
  _mmConnecting: boolean;

  connect: () => Promise<void>;
  connectWallet: (walletType: 'talisman' | 'subwallet') => Promise<void>;
  connectMetaMask: () => Promise<void>;
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
      avatarUrl: null,
      connecting: false,
      walletConnection: null,
      walletName: null,
      providerType: null,
      accountMapped: false,
      showWalletModal: false,
      walletError: null,
      _rehydrating: false,
      _mmConnecting: false,

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
            providerType: 'substrate',
          });

          // Resolve QNS name + avatar in background
          resolveReverse(evmAddr).then(async (name) => {
            if (name) {
              set({ qnsName: name, displayName: name });
              // Fetch avatar now — persisted for ConfirmScreen & AnimationSequence
              try {
                const { getAvatar } = await import('../utils/qfpay');
                const url = await getAvatar(name);
                if (url) set({ avatarUrl: url });
              } catch {
                // Non-critical — fallback to initial
              }
            }
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
              providerType: null,
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
            providerType: null,
            accountMapped: false,
          });
        } finally {
          set({ connecting: false });
        }
      },

      disconnect: () => {
        const { providerType } = get();

        // Always call Substrate disconnect (no-op if currentConnection is null)
        disconnectWallet();

        // Clean up EVM clients if MetaMask
        if (providerType === 'evm') {
          (window as any).__qfpay_mm_cleanup?.();
          delete (window as any).__qfpay_mm_cleanup;
          import('../utils/evmProvider').then(({ destroyEvmClients, setReconnecting }) => {
            setReconnecting(false);
            destroyEvmClients();
          });
        }

        set({
          address: null,
          ss58Address: null,
          qnsName: null,
          displayName: null,
          avatarUrl: null,
          walletConnection: null,
          walletName: null,
          providerType: null,
          accountMapped: false,
          showWalletModal: false,
          walletError: null,
          connecting: false,
          _rehydrating: false,
          _mmConnecting: false,
        });
      },

      refreshName: async () => {
        const { address, qnsName: existingName } = get();
        if (!address) return;
        try {
          const name = await resolveReverse(address);
          if (name) {
            set({ qnsName: name, displayName: name });
          } else if (!existingName) {
            // Only clear if we don't already have an optimistic name
            const { ss58Address } = get();
            set({
              qnsName: null,
              displayName: ss58Address
                ? truncateAddress(ss58Address)
                : truncateAddress(address),
            });
          }
          // If chain returns null but we have an optimistic name, preserve it
        } catch {
          // On error, preserve whatever we have
        }
      },

      setShowWalletModal: (show: boolean) => {
        set({ showWalletModal: show, walletError: null });
      },

      clearWalletError: () => {
        set({ walletError: null });
      },

      // ─── MetaMask connection ───
      connectMetaMask: async () => {
        if (get()._mmConnecting) return;
        set({ _mmConnecting: true });

        const isRehydrating = get()._rehydrating;
        const setError = (error: string) => {
          if (!isRehydrating) set({ walletError: error });
        };

        set({ connecting: true, walletError: null });

        try {
          if (!window.ethereum) {
            setError('MetaMask not detected. Please install MetaMask.');
            set({ connecting: false, _mmConnecting: false });
            return;
          }

          const { ensureQFNetwork, createEvmWalletClient, setReconnecting } = await import(
            '../utils/evmProvider'
          );
          setReconnecting(true);

          // Ensure user is on QF Network (prompts add/switch if needed)
          try {
            await ensureQFNetwork();
          } catch (err: any) {
            if (err?.code === 4001) {
              setError('Please switch to QF Network to continue.');
              set({ connecting: false, _mmConnecting: false });
              setReconnecting(false);
              return;
            }
            throw err;
          }

          const walletClient = await createEvmWalletClient();
          const evmAddr = walletClient.account?.address as `0x${string}`;
          if (!evmAddr) throw new Error('No account returned from MetaMask');

          set({
            address: evmAddr,
            ss58Address: null,
            displayName: `${evmAddr.slice(0, 6)}...${evmAddr.slice(-4)}`,
            walletName: 'metamask',
            providerType: 'evm',
            accountMapped: true, // MetaMask doesn't need account mapping
            showWalletModal: false,
            walletConnection: null,
          });

          setReconnecting(false);

          // Resolve QNS name + avatar in background with retry
          resolveNameWithRetry(evmAddr, 3, 2000).then(async (name) => {
            if (name) {
              set({ qnsName: name, displayName: name });
              try {
                const { getAvatar } = await import('../utils/qfpay');
                const url = await getAvatar(name);
                if (url) set({ avatarUrl: url });
              } catch {}
            }
          });

          // Set up MetaMask event watchers — clean up any previous ones first
          (window as any).__qfpay_mm_cleanup?.();

          const { watchMetaMaskChanges } = await import('../utils/evmProvider');
          const cleanup = watchMetaMaskChanges(
            // ── accountsChanged handler ──
            (accounts) => {
              if (accounts.length === 0) {
                // Real disconnect — user removed the site from MetaMask
                get().disconnect();
              } else {
                const newAddr = accounts[0] as `0x${string}`;
                if (newAddr.toLowerCase() !== get().address?.toLowerCase()) {
                  // Account actually changed — soft update (rebuild client, re-resolve name)
                  import('../utils/evmProvider').then(
                    async ({ createEvmWalletClient: recreate }) => {
                      try {
                        await recreate();
                        set({
                          address: newAddr,
                          displayName: `${newAddr.slice(0, 6)}...${newAddr.slice(-4)}`,
                          qnsName: null,
                          avatarUrl: null,
                        });
                        resolveNameWithRetry(newAddr, 3, 2000).then(async (name) => {
                          if (name) {
                            set({ qnsName: name, displayName: name });
                            try {
                              const { getAvatar } = await import('../utils/qfpay');
                              const url = await getAvatar(name);
                              if (url) set({ avatarUrl: url });
                            } catch {}
                          }
                        });
                      } catch {
                        get().disconnect();
                      }
                    }
                  );
                }
                // Same account → no-op
              }
            },
            // ── chainChanged handler ──
            async (chainId: string) => {
              if (parseInt(chainId, 16) === 3426) {
                // Switched back to QF Network — silently rebuild wallet client
                try {
                  const { createEvmWalletClient: recreate } = await import(
                    '../utils/evmProvider'
                  );
                  await recreate();
                } catch {}
              }
              // Wrong chain → don't disconnect. ensureQFNetwork() before every write handles it.
            }
          );
          (window as any).__qfpay_mm_cleanup = cleanup;
        } catch (error: any) {
          const msg = error?.message || '';
          if (
            msg.includes('User rejected') ||
            msg.includes('User denied') ||
            error?.code === 4001
          ) {
            setError('Connection rejected. Please try again.');
          } else if (msg.includes('MetaMask not')) {
            setError(msg);
          } else {
            setError(msg || 'Failed to connect MetaMask');
          }
          const { destroyEvmClients, setReconnecting } = await import('../utils/evmProvider');
          setReconnecting(false);
          destroyEvmClients();
          set({
            address: null,
            ss58Address: null,
            qnsName: null,
            displayName: null,
            avatarUrl: null,
            walletConnection: null,
            walletName: null,
            providerType: null,
            accountMapped: false,
          });
        } finally {
          set({ connecting: false, _mmConnecting: false });
        }
      },
    }),
    {
      name: 'qfpay-wallet-storage',
      version: 3,
      migrate: (_persistedState: any, version: number) => {
        // Clear stale sessions from v1 or v2 (they lack providerType)
        if (version < 3) return {} as any;
        return _persistedState;
      },
      partialize: (state) => ({
        address: state.address,
        ss58Address: state.ss58Address,
        qnsName: state.qnsName,
        displayName: state.displayName,
        walletName: state.walletName,
        accountMapped: state.accountMapped,
        avatarUrl: state.avatarUrl,
        providerType: state.providerType,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          if (state?.address && state?.walletName) {
            useWalletStore.setState({ _rehydrating: true });

            if (state.walletName === 'metamask') {
              // ── MetaMask rehydration ──
              state
                .connectMetaMask()
                .then(() => {
                  useWalletStore.setState({ _rehydrating: false });
                })
                .catch(() => {
                  useWalletStore.setState({ _rehydrating: false });
                  state.disconnect();
                });
            } else {
              // ── Substrate rehydration (existing retry cascade — preserved exactly) ──
              const walletType = state.walletName as 'talisman' | 'subwallet';
              const extensionId = walletType === 'talisman' ? 'talisman' : 'subwallet-js';

              const attemptRehydration = () => {
                const available = getAvailableWallets();
                if (!available.includes(extensionId)) {
                  return false;
                }
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
                            useWalletStore.setState({ _rehydrating: false });
                            state.disconnect();
                          }
                        }, 1500);
                      }
                    }, 1000);
                  }
                }, 500);
              }
            }
          }
        };
      },
    }
  )
);