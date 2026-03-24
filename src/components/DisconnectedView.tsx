import { motion } from 'framer-motion';
import { useWalletStore } from '../stores/walletStore';

export const DisconnectedView = () => {
  const { setShowWalletModal } = useWalletStore();

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.5 }}
    >
      <motion.h1
        className="font-clash font-bold text-6xl sm:text-7xl md:text-8xl text-white mb-4 tracking-tight"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6 }}
      >
        QFPay
      </motion.h1>

      <motion.p
        className="font-satoshi text-lg sm:text-xl text-white/40 mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        Instant money. Just a name.
      </motion.p>

      <motion.button
        className="bg-qfpay-blue hover:bg-qfpay-blue-hover text-white font-satoshi font-semibold text-lg px-12 py-4 rounded-2xl transition-colors"
        onClick={() => setShowWalletModal(true)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        Connect Wallet
      </motion.button>
    </motion.div>
  );
};
