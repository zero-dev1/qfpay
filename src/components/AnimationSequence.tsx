import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
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
    confirmationError,
    advanceToSending,
    advanceToSuccess,
    reset
  } = usePaymentStore();

  const [showConfirmationStatus, setShowConfirmationStatus] = useState(false);

  // Auto-advance phases
  useEffect(() => {
    if (phase === 'burn') {
      const timer = setTimeout(() => {
        advanceToSending();
      }, 1200);
      return () => clearTimeout(timer);
    }
    
    if (phase === 'sending') {
      const timer = setTimeout(() => {
        advanceToSuccess();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [phase, advanceToSending, advanceToSuccess]);

  // Show confirmation status after success screen appears
  useEffect(() => {
    if (phase === 'success') {
      const timer = setTimeout(() => {
        setShowConfirmationStatus(true);
      }, 2000); // Show after initial animations
      return () => clearTimeout(timer);
    } else {
      setShowConfirmationStatus(false);
    }
  }, [phase]);

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
            <h1 className="font-clash font-semibold text-6xl md:text-8xl text-white mb-4 relative z-10">
              {formatQF(burnAmountWei)} QF
            </h1>
            <p className="font-satoshi text-2xl text-qfpay-burn relative z-10">
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
            <h1 className="font-clash font-semibold text-6xl md:text-8xl text-white mb-4">
              {formatQF(recipientAmountWei)} QF
            </h1>
            <motion.p 
              className="font-satoshi text-2xl text-qfpay-green"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              → {recipientName ? `${recipientName}.qf` : recipientAddress?.slice(0, 8) + '...' + recipientAddress?.slice(-6)}
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
            <div className="mb-8">
              <motion.div 
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-qfpay-green flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
              >
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <motion.path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                  />
                </svg>
              </motion.div>
              <h2 className="font-clash font-semibold text-3xl text-white mb-2">
                Payment sent
              </h2>
            </div>

            <motion.div 
              className="bg-white/5 rounded-lg p-6 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.4 }}
            >
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-qfpay-secondary">Amount sent</span>
                  <span className="text-white font-medium">{formatQF(amountWei)} QF</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-qfpay-secondary">To</span>
                  <span className="text-white font-medium">
                    {recipientName ? `${recipientName}.qf` : recipientAddress?.slice(0, 8) + '...' + recipientAddress?.slice(-6)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-qfpay-secondary">Burned</span>
                  <span className="text-qfpay-burn font-medium">{formatQF(burnAmountWei)} QF</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-white/10">
                  <span className="text-qfpay-secondary">Status</span>
                  <AnimatePresence>
                    {showConfirmationStatus && (
                      <motion.span
                        key="status"
                        className={`font-medium ${
                          confirmed === true ? 'text-qfpay-green' : 
                          confirmed === false ? 'text-qfpay-warning' : 
                          'text-qfpay-secondary'
                        }`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        {confirmed === true ? 'Confirmed on-chain' : 
                         confirmed === false ? confirmationError || 'Transaction submitted' : 
                         'Processing...'}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>

            <motion.button
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-satoshi font-medium py-4 rounded-xl transition-colors"
              onClick={reset}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.3 }}
            >
              Send Another
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
