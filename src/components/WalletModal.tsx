import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useWalletStore } from '../stores/walletStore';
import { detectWalletExtensions } from '../utils/wallet';

export const WalletModal = () => {
  const { 
    showWalletModal, 
    setShowWalletModal, 
    connecting, 
    walletError, 
    connectWallet,
    setWalletError 
  } = useWalletStore();

  const extensions = detectWalletExtensions();

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 30,
      },
    },
    exit: {
      scale: 0.9,
      opacity: 0,
      transition: {
        duration: 0.2,
      },
    },
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShowWalletModal(false);
      setWalletError(null);
    }
  };

  const handleWalletClick = (walletName: 'talisman' | 'subwallet') => {
    connectWallet(walletName);
  };

  return (
    <AnimatePresence>
      {showWalletModal && (
        <motion.div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={handleBackdropClick}
        >
          <motion.div
            className="bg-qfpay-card rounded-2xl border border-white/10 p-6 w-full max-w-md"
            variants={modalVariants}
            exit="exit"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-clash font-semibold text-2xl text-white">
                Connect Wallet
              </h2>
              <button
                className="text-qfpay-secondary hover:text-white transition-colors"
                onClick={() => {
                  setShowWalletModal(false);
                  setWalletError(null);
                }}
              >
                <X size={20} />
              </button>
            </div>

            {walletError && (
              <div className="mb-4 p-3 bg-qfpay-error/10 border border-qfpay-error/20 rounded-lg">
                <p className="text-qfpay-error text-sm">{walletError}</p>
              </div>
            )}

            <div className="space-y-3">
              <button
                className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handleWalletClick('talisman')}
                disabled={connecting || !extensions.talisman}
              >
                <span className="font-satoshi text-white">Talisman</span>
                {!extensions.talisman && (
                  <span className="text-qfpay-secondary text-sm">Not installed</span>
                )}
              </button>

              <button
                className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handleWalletClick('subwallet')}
                disabled={connecting || !extensions.subwallet}
              >
                <span className="font-satoshi text-white">SubWallet</span>
                {!extensions.subwallet && (
                  <span className="text-qfpay-secondary text-sm">Not installed</span>
                )}
              </button>
            </div>

            {!extensions.talisman && !extensions.subwallet && (
              <div className="mt-4 p-3 bg-qfpay-warning/10 border border-qfpay-warning/20 rounded-lg">
                <p className="text-qfpay-warning text-sm">
                  No wallet extensions detected. Please install Talisman or SubWallet, or open this page in their in-app browser.
                </p>
              </div>
            )}

            {connecting && (
              <div className="mt-4 text-center">
                <p className="text-qfpay-secondary text-sm">Connecting to wallet...</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
