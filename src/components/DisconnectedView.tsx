import { motion } from 'framer-motion';
import { useWalletStore } from '../stores/walletStore';

export const DisconnectedView = () => {
  const { setShowWalletModal } = useWalletStore();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 12,
      },
    },
  };

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className="text-center mb-8"
        variants={itemVariants}
      >
        <h1 className="font-clash font-semibold text-6xl md:text-7xl text-white mb-4">
          QFPay
        </h1>
        <p className="font-satoshi text-xl text-qfpay-secondary">
          Instant money. Just a name.
        </p>
      </motion.div>

      <motion.button
        className="font-satoshi font-medium text-lg px-8 py-4 bg-qfpay-blue hover:bg-qfpay-blue-hover text-white rounded-xl transition-colors duration-200"
        variants={itemVariants}
        onClick={() => setShowWalletModal(true)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        Connect Wallet
      </motion.button>
    </motion.div>
  );
};
