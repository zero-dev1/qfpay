import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { usePaymentStore } from '../stores/paymentStore';
import { formatQF } from '../utils/qfpay';
import { EmberParticles } from './EmberParticles';
import { playBurnSound, playSendSound, playSuccessSound } from '../utils/sounds';

export const AnimationSequence = () => {
  const {
    phase,
    recipientAmountWei,
    burnAmountWei,
    recipientName,
    recipientAddress,
    confirmed,
    advanceToSending,
    advanceToSuccess,
    reset,
  } = usePaymentStore();

  const displayRecipient = recipientName
    ? `${recipientName}.qf` 
    : recipientAddress
      ? recipientAddress.slice(0, 8) + '...' + recipientAddress.slice(-4)
      : '';

  // Play sounds on phase entry
  useEffect(() => {
    if (phase === 'burn') {
      playBurnSound();
    }
    if (phase === 'sending') {
      playSendSound();
    }
    if (phase === 'success') {
      playSuccessSound();
    }
  }, [phase]);

  // Auto-advance timers
  useEffect(() => {
    if (phase === 'burn') {
      const timer = setTimeout(advanceToSending, 2000);
      return () => clearTimeout(timer);
    }
    if (phase === 'sending') {
      const timer = setTimeout(advanceToSuccess, 2500);
      return () => clearTimeout(timer);
    }
  }, [phase, advanceToSending, advanceToSuccess]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <AnimatePresence mode="wait">

        {/* ── BURN PHASE ── */}
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
            <motion.h1
              className="font-clash font-bold text-7xl sm:text-8xl md:text-9xl text-white mb-4 relative z-10"
              animate={{
                opacity: [1, 1, 0.3],
                y: [0, 0, -15],
                filter: ['blur(0px)', 'blur(0px)', 'blur(3px)'],
              }}
              transition={{ duration: 2, times: [0, 0.5, 1], ease: 'easeIn' }}
            >
              {formatQF(burnAmountWei)} QF
            </motion.h1>
            <motion.p
              className="font-satoshi text-2xl text-white/60 relative z-10"
              animate={{ opacity: [1, 1, 0] }}
              transition={{ duration: 2, times: [0, 0.6, 1] }}
            >
              burned
            </motion.p>
          </motion.div>
        )}

        {/* ── SENDING PHASE ── */}
        {phase === 'sending' && (
          <motion.div
            key="sending"
            className="text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5 }}
          >
            <motion.h1
              className="font-clash font-bold text-7xl sm:text-8xl md:text-9xl text-white mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              {formatQF(recipientAmountWei)} QF
            </motion.h1>
            <motion.p
              className="font-satoshi text-2xl text-white/80"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              → {displayRecipient}
            </motion.p>
          </motion.div>
        )}

        {/* ── SUCCESS PHASE ── */}
        {phase === 'success' && (
          <motion.div
            key="success"
            className="text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            {/* Animated checkmark */}
            <motion.div
              className="mb-8"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
            >
              <svg className="w-20 h-20 mx-auto text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            <motion.h2
              className="font-clash font-bold text-4xl sm:text-5xl text-white mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              Payment sent
            </motion.h2>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.4 }}
            >
              <p className="font-satoshi text-xl text-white/70 mb-1">
                {formatQF(recipientAmountWei)} QF → {displayRecipient}
              </p>
              <p className="font-satoshi text-sm text-white/40">
                {formatQF(burnAmountWei)} QF burned
              </p>
            </motion.div>

            <motion.button
              className="mt-10 px-10 py-3.5 bg-transparent border border-white/30 hover:bg-white/10 text-white font-satoshi font-medium rounded-2xl transition-colors"
              onClick={reset}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.3 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Send Another
            </motion.button>

            <motion.p
              className="mt-6 text-sm text-white/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.5 }}
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
