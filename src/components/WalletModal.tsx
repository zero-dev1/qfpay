import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Loader2 } from 'lucide-react';
import { useWalletStore } from '../stores/walletStore';
import { EASE_OUT_EXPO } from '../lib/animations';

// ─── Inline SVG wallet icons ───

const TalismanIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="8" fill="#D5FF5C" />
    <path
      d="M14 6.5c-1.1 0-2.1.3-3 .8-.5.3-.8.8-.8 1.4v2.6c0 .3.1.6.3.8.2.2.5.3.8.3h.4c.3 0 .5-.1.7-.3l.5-.5c.3-.3.7-.5 1.1-.5s.8.2 1.1.5l.5.5c.2.2.4.3.7.3h.4c.3 0 .6-.1.8-.3.2-.2.3-.5.3-.8V8.7c0-.6-.3-1.1-.8-1.4-.9-.5-1.9-.8-3-.8z"
      fill="#111"
    />
    <path
      d="M9.2 14.5c-.3 0-.5.1-.7.3l-1 1c-.4.4-.4 1 0 1.4l3.8 3.8c.6.6 1.3.9 2.1 1h1.2c.8-.1 1.5-.4 2.1-1l3.8-3.8c.4-.4.4-1 0-1.4l-1-1c-.2-.2-.4-.3-.7-.3h-.3c-.3 0-.5.1-.7.3L16 15.6c-.5.5-1.2.8-2 .8s-1.5-.3-2-0.8l-1.8-1.8c-.2-.2-.4-.3-.7-.3h-.3z"
      fill="#111"
    />
  </svg>
);

const SubWalletIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="8" fill="url(#sw-grad)" />
    <path
      d="M9 10.5C9 9.67 9.67 9 10.5 9h7c.83 0 1.5.67 1.5 1.5v1c0 .83-.67 1.5-1.5 1.5h-4a2.5 2.5 0 000 5h4c.83 0 1.5.67 1.5 1.5v1c0 .83-.67 1.5-1.5 1.5h-7c-.83 0-1.5-.67-1.5-1.5v-1c0-.83.67-1.5 1.5-1.5h4a2.5 2.5 0 000-5h-4C9.67 13 9 12.33 9 11.5v-1z"
      fill="white"
      fillOpacity="0.95"
    />
    <defs>
      <linearGradient id="sw-grad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
        <stop stopColor="#004BFF" />
        <stop offset="1" stopColor="#38E08C" />
      </linearGradient>
    </defs>
  </svg>
);

const MetaMaskIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="8" fill="#1A1A2E" />
    <path d="M21.5 7L15.4 11.5l1.1-2.8L21.5 7z" fill="#E2761B" stroke="#E2761B" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6.5 7l6 4.6-1-2.9L6.5 7z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M19.2 17.8l-1.6 2.5 3.5 1-.9-3.5h-1z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7.8 17.8l-.9 3.5 3.5-1-1.6-2.5h-1z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10.2 12.8l-1.3 2 4.5.2-.2-4.9-3 2.7z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17.8 12.8l-3.1-2.8-.1 5 4.5-.2-1.3-2z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10.4 20.3l2.7-1.3-2.3-1.8-.4 3.1z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14.9 19l2.7 1.3-.4-3.1-2.3 1.8z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17.6 20.3l-2.7-1.3.2 1.7v.7l2.5-1.1z" fill="#D7C1B3" stroke="#D7C1B3" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10.4 20.3l2.5 1.1v-.7l.2-1.7-2.7 1.3z" fill="#D7C1B3" stroke="#D7C1B3" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M13 16.2l-2.2-.7 1.6-.7.6 1.4z" fill="#233447" stroke="#233447" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M15 16.2l.6-1.4 1.6.7-2.2.7z" fill="#233447" stroke="#233447" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10.4 20.3l.4-2.5h-1l.6 2.5z" fill="#CD6116" stroke="#CD6116" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17.2 17.8l.4 2.5.6-2.5h-1z" fill="#CD6116" stroke="#CD6116" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M19.1 14.8l-4.5.2.4 1.2.6-1.4 1.6.7 1.9-.7z" fill="#CD6116" stroke="#CD6116" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10.8 15.5l1.6-.7.6 1.4.4-1.2-4.5-.2 1.9.7z" fill="#CD6116" stroke="#CD6116" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8.9 14.8l2 1.9-.1-.7-1.9-1.2z" fill="#E4751F" stroke="#E4751F" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17.2 16l-.1.7 2-1.9-1.9 1.2z" fill="#E4751F" stroke="#E4751F" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M13.4 15l-.4 1.2 1 3.1.2-2.3-0.8-2z" fill="#F6851B" stroke="#F6851B" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M15 15l-.8 2 .2 2.3 1-3.1L15 15z" fill="#F6851B" stroke="#F6851B" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const WalletModal = () => {
  const {
    showWalletModal,
    setShowWalletModal,
    connecting,
    walletError,
    connectWallet,
    connectMetaMask,
    clearWalletError,
  } = useWalletStore();

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowWalletModal(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowWalletModal(false);
    };

    if (showWalletModal) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showWalletModal, setShowWalletModal]);

  const handleWalletSelect = async (walletType: 'talisman' | 'subwallet' | 'metamask') => {
    clearWalletError();
    if (walletType === 'metamask') {
      await connectMetaMask();
    } else {
      await connectWallet(walletType);
    }
  };

  return (
    <AnimatePresence>
      {showWalletModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={() => setShowWalletModal(false)}
        >
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="bg-qfpay-surface rounded-2xl sm:rounded-2xl border border-qfpay-border p-6 w-full max-w-md shadow-2xl shadow-black/40"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-clash font-semibold text-xl text-qfpay-text-primary">
                Connect Wallet
              </h2>
              <button
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-qfpay-text-secondary hover:text-qfpay-text-primary focus-ring"
                onClick={() => {
                  setShowWalletModal(false);
                  clearWalletError();
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Value prop */}
            <p className="font-satoshi text-sm text-qfpay-text-secondary mb-6">
              Connect your wallet to send payments using your .qf name.
            </p>

            {/* Error */}
            <AnimatePresence>
              {walletError && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 bg-qfpay-error/8 border border-qfpay-error/15 rounded-xl">
                    <p className="text-qfpay-error text-sm font-satoshi">{walletError}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Connecting state */}
            <AnimatePresence>
              {connecting && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 bg-qfpay-blue/8 border border-qfpay-blue/15 rounded-xl flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-qfpay-blue animate-spin flex-shrink-0" />
                    <div>
                      <p className="text-qfpay-blue text-sm font-satoshi font-medium">Waiting for authorization...</p>
                      <p className="text-qfpay-text-muted text-xs font-satoshi mt-0.5">Check your wallet extension</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Wallet buttons */}
            <div className="space-y-2.5">
              {[
                {
                  type: 'talisman' as const,
                  name: 'Talisman',
                  icon: <TalismanIcon />,
                  description: 'Polkadot & Ethereum',
                },
                {
                  type: 'subwallet' as const,
                  name: 'SubWallet',
                  icon: <SubWalletIcon />,
                  description: 'Multi-chain',
                },
                {
                  type: 'metamask' as const,
                  name: 'MetaMask',
                  icon: <MetaMaskIcon />,
                  description: 'EVM wallet',
                },
              ].map((wallet) => (
                <motion.button
                  key={wallet.type}
                  className="w-full flex items-center gap-4 p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-qfpay-border hover:border-qfpay-border-hover rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed focus-ring"
                  onClick={() => handleWalletSelect(wallet.type)}
                  disabled={connecting}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex-shrink-0 w-7 h-7">{wallet.icon}</div>
                  <div className="text-left">
                    <p className="font-satoshi font-medium text-qfpay-text-primary text-sm">{wallet.name}</p>
                    <p className="font-satoshi text-xs text-qfpay-text-muted">{wallet.description}</p>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-5 pt-4 border-t border-qfpay-border flex items-center justify-center gap-1.5">
              <Shield className="w-3 h-3 text-qfpay-text-muted" />
              <p className="font-satoshi text-xs text-qfpay-text-muted">
                Don't have a wallet?{' '}
                <a
                  href="https://talisman.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-qfpay-blue hover:underline"
                >
                  Get Talisman
                </a>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
