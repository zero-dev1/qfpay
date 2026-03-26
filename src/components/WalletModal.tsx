import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Loader2 } from 'lucide-react';
import { useWalletStore } from '../stores/walletStore';
import { EASE_OUT_EXPO, SCALE_IN } from '../lib/animations';

// Inline SVG wallet icons — no external dependencies
const TalismanIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#D5FF5C" />
    <path d="M12 5C8.13 5 5 8.13 5 12s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm0 2.5a2 2 0 110 4 2 2 0 010-4zm0 9a5.5 5.5 0 01-4.39-2.19c.02-1.46 2.93-2.26 4.39-2.26s4.37.8 4.39 2.26A5.5 5.5 0 0112 16.5z" fill="#111" />
  </svg>
);

const SubWalletIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#004BFF" />
    <path d="M7 8h10v2H7V8zm0 3h10v2H7v-2zm0 3h7v2H7v-2z" fill="white" />
  </svg>
);

export const WalletModal = () => {
  const {
    showWalletModal,
    setShowWalletModal,
    connecting,
    walletError,
    connectWallet,
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

  const handleWalletSelect = async (walletType: 'talisman' | 'subwallet') => {
    clearWalletError();
    await connectWallet(walletType);
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
              Connect a Substrate wallet to send payments using your .qf name.
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
                { type: 'talisman' as const, name: 'Talisman', icon: <TalismanIcon />, description: 'Polkadot & Ethereum' },
                { type: 'subwallet' as const, name: 'SubWallet', icon: <SubWalletIcon />, description: 'Multi-chain' },
              ].map((wallet) => (
                <motion.button
                  key={wallet.type}
                  className="w-full flex items-center gap-4 p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-qfpay-border hover:border-qfpay-border-hover rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed focus-ring"
                  onClick={() => handleWalletSelect(wallet.type)}
                  disabled={connecting}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex-shrink-0">{wallet.icon}</div>
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
