import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useWalletStore } from '../stores/walletStore';

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

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowWalletModal(false);
      }
    };

    if (showWalletModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={() => setShowWalletModal(false)}
        >
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-qfpay-card rounded-2xl border border-white/10 p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-clash font-semibold text-2xl text-white">
                Connect Wallet
              </h2>
              <button
                className="text-qfpay-secondary hover:text-white transition-colors"
                onClick={() => {
                  setShowWalletModal(false);
                  clearWalletError();
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Error Message */}
            {walletError && (
              <div className="mb-4 p-3 bg-qfpay-error/10 border border-qfpay-error/20 rounded-lg">
                <p className="text-qfpay-error text-sm">{walletError}</p>
              </div>
            )}

            {/* Connecting State */}
            {connecting && (
              <div className="mb-4 p-3 bg-qfpay-blue/10 border border-qfpay-blue/20 rounded-lg">
                <p className="text-qfpay-blue text-sm font-medium">Waiting for wallet authorization...</p>
                <p className="text-qfpay-secondary text-xs mt-1">Check your wallet extension for a popup</p>
              </div>
            )}

            {/* Wallet Buttons — NEVER disabled based on extension detection */}
            <div className="space-y-3">
              <button
                className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handleWalletSelect('talisman')}
                disabled={connecting}
              >
                <span className="font-satoshi text-white">Talisman</span>
              </button>

              <button
                className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handleWalletSelect('subwallet')}
                disabled={connecting}
              >
                <span className="font-satoshi text-white">SubWallet</span>
              </button>
            </div>

            {/* Footer help text */}
            <div className="mt-4 text-center">
              <p className="text-qfpay-secondary text-xs">
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
