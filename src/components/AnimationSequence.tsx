import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { usePaymentStore } from '../stores/paymentStore';
import { formatQF } from '../utils/qfpay';
import { EmberParticles } from './EmberParticles';

export const AnimationSequence = () => {
  const { 
    phase, 
    amountWei, 
    burnAmountWei, 
    recipientAmountWei, 
    recipientName,
    recipientAddress,
    confirmed,
    advanceToSending,
    advanceToSuccess,
    reset
  } = usePaymentStore();

  const displayRecipientName = recipientName 
    ? `${recipientName}.qf` 
    : recipientAddress 
      ? recipientAddress.slice(0, 8) + '...' + recipientAddress.slice(-6) 
      : '';

  // Auto-advance phases
  useEffect(() => {
    if (phase === 'burn') {
      const timer = setTimeout(advanceToSending, 1200);
      return () => clearTimeout(timer);
    }
    if (phase === 'sending') {
      const timer = setTimeout(advanceToSuccess, 1000);
      return () => clearTimeout(timer);
    }
  }, [phase, advanceToSending, advanceToSuccess]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <AnimatePresence mode="wait">
        {phase === 'burn' && (
          <motion.div
            key="burn"
            className="text-center relative"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.6 }}
          >
            <EmberParticles />
            <h1 className="font-clash font-bold text-7xl md:text-8xl text-white mb-4 relative z-10">
              {formatQF(burnAmountWei)} QF
            </h1>
            <p className="font-satoshi text-2xl text-white/70 relative z-10">
              burned
            </p>
          </motion.div>
        )}

        {phase === 'sending' && (
          <motion.div
            key="sending"
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-clash font-bold text-7xl md:text-8xl text-white mb-4">
              {formatQF(recipientAmountWei)} QF
            </h1>
            <motion.p 
              className="font-satoshi text-2xl text-white/80"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              → {displayRecipientName}
            </motion.p>
          </motion.div>
        )}

        {phase === 'success' && (
          <motion.div
            key="success"
            className="text-center max-w-md"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.6 }}
          >
            {/* Checkmark */}
            <motion.div
              className="mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
            >
              <svg
                className="w-16 h-16 mx-auto text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <motion.path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                />
              </svg>
            </motion.div>

            {/* Title */}
            <h2 className="font-clash font-bold text-4xl text-white mb-4">
              Payment sent
            </h2>

            {/* Summary */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              <p className="font-satoshi text-lg text-white/70 mb-1">
                {formatQF(amountWei)} QF to {displayRecipientName}
              </p>
              <p className="font-satoshi text-sm text-white/50">
                {formatQF(burnAmountWei)} QF burned
              </p>
            </motion.div>

            {/* Send Another button */}
            <motion.button
              className="mt-8 px-10 py-3.5 bg-transparent border border-white/30 hover:bg-white/10 text-white font-satoshi font-medium rounded-xl transition-colors"
              onClick={reset}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.3 }}
            >
              Send Another
            </motion.button>

            {/* Confirmation status */}
            <motion.p
              className="mt-6 text-sm text-white/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.4 }}
            >
              {confirmed === true 
                ? 'Confirmed on-chain ✓' 
                : confirmed === null 
                  ? 'Confirming...' 
                  : 'Transaction sent — confirming...'}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
