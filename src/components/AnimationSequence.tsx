import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { usePaymentStore } from '../stores/paymentStore';
import { useWalletStore } from '../stores/walletStore';
import { formatQF, getAvatar } from '../utils/qfpay';
import { EmberParticles } from './EmberParticles';
import { playBurnSound, playSendSound, playSuccessSound } from '../utils/sounds';
import { EASE_OUT_EXPO, EASE_SPRING } from '../lib/animations';

export const AnimationSequence = () => {
  const {
    phase,
    recipientAmountWei,
    burnAmountWei,
    recipientName,
    recipientAddress,
    recipientAvatar,
    confirmed,
    advanceToSending,
    advanceToSuccess,
    reset,
  } = usePaymentStore();

  const { qnsName: senderName } = useWalletStore();

  // Fetch sender avatar (not stored in walletStore, need to fetch)
  const [senderAvatar, setSenderAvatar] = useState<string | null>(null);
  useEffect(() => {
    if (senderName) {
      getAvatar(senderName).then((url) => {
        if (url) setSenderAvatar(url);
      });
    }
  }, [senderName]);

  const displayRecipient = recipientName
    ? `${recipientName}.qf` 
    : recipientAddress
      ? recipientAddress.slice(0, 8) + '...' + recipientAddress.slice(-4)
      : '';

  const displaySender = senderName ? `${senderName}.qf` : '';

  // Play sounds on phase entry
  useEffect(() => {
    if (phase === 'burn') playBurnSound();
    if (phase === 'sending') playSendSound();
    if (phase === 'success') playSuccessSound();
  }, [phase]);

  // Haptic on success
  useEffect(() => {
    if (phase === 'success' && navigator.vibrate) {
      navigator.vibrate([10, 50, 10]);
    }
  }, [phase]);

  // Auto-advance timers — calibrated for emotional pacing
  // Burn: 1800ms (fast enough to feel urgent, long enough to register)
  // Sending: 2200ms (enough for the avatar-to-avatar animation to land)
  useEffect(() => {
    if (phase === 'burn') {
      const timer = setTimeout(advanceToSending, 1800);
      return () => clearTimeout(timer);
    }
    if (phase === 'sending') {
      const timer = setTimeout(advanceToSuccess, 2200);
      return () => clearTimeout(timer);
    }
  }, [phase, advanceToSending, advanceToSuccess]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 relative">
      <AnimatePresence mode="wait">
        {/* ═══════════════════════════════════════════ */}
        {/* ACT 1: BURN                                */}
        {/* Crimson atmosphere + embers + dissolving #  */}
        {/* ═══════════════════════════════════════════ */}
        {phase === 'burn' && (
          <motion.div
            key="burn"
            className="text-center relative w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
          >
            {/* Crimson atmospheric overlay — pulses and fades with the phase */}
            <motion.div
              className="fixed inset-0 pointer-events-none z-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.8, 0.6, 0.3] }}
              transition={{ duration: 1.8, times: [0, 0.2, 0.5, 1], ease: 'easeOut' }}
              style={{
                background:
                  'radial-gradient(ellipse 70% 60% at 50% 55%, rgba(185, 28, 28, 0.25) 0%, rgba(185, 28, 28, 0.08) 40%, transparent 70%)',
              }}
            />

            {/* Ember particles — upgraded physics */}
            <EmberParticles count={50} spread={180} />

            {/* Burn amount — dissolves with blur and vertical drift */}
            <motion.div className="relative z-10">
              <motion.h1
                className="font-clash font-bold text-7xl sm:text-8xl md:text-9xl text-white mb-3"
                animate={{
                  opacity: [1, 1, 0.2],
                  y: [0, 0, -20],
                  filter: ['blur(0px)', 'blur(0px)', 'blur(6px)'],
                  scale: [1, 1, 0.97],
                }}
                transition={{
                  duration: 1.8,
                  times: [0, 0.4, 1],
                  ease: 'easeIn',
                }}
              >
                {formatQF(burnAmountWei)} <span className="text-white/40">QF</span>
              </motion.h1>

              {/* "burned" label with crimson accent */}
              <motion.p
                className="font-satoshi text-xl tracking-wide"
                style={{ color: '#DC2626' }}
                animate={{ opacity: [0, 1, 1, 0] }}
                transition={{
                  duration: 1.8,
                  times: [0, 0.15, 0.5, 1],
                  ease: 'easeOut',
                }}
              >
                burned forever
              </motion.p>
            </motion.div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* ACT 2: SEND                                */}
        {/* Sender avatar → amount → Recipient avatar  */}
        {/* ═══════════════════════════════════════════ */}
        {phase === 'sending' && (
          <motion.div
            key="sending"
            className="relative w-full max-w-lg mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
          >
            {/* Sender → Amount → Recipient layout */}
            <div className="flex items-center justify-center gap-6 sm:gap-10">
              {/* Sender identity */}
              <motion.div
                className="flex flex-col items-center gap-2 flex-shrink-0"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
              >
                {senderAvatar ? (
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-white/20">
                    <img
                      src={senderAvatar}
                      alt={senderName || ''}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center">
                    <span className="font-clash font-bold text-xl text-white">
                      {senderName ? senderName[0].toUpperCase() : '?'}
                    </span>
                  </div>
                )}
                {displaySender && (
                  <span className="font-satoshi text-xs text-white/50 max-w-[80px] truncate">
                    {displaySender}
                  </span>
                )}
              </motion.div>

              {/* Animated amount traveling from sender to recipient */}
              <motion.div className="flex flex-col items-center relative">
                {/* Travel line */}
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 h-px w-full"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
                />

                {/* Amount badge — enters from left, pulses at center */}
                <motion.div
                  className="relative z-10 px-5 py-2.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10"
                  initial={{ opacity: 0, scale: 0.8, x: -40 }}
                  animate={{
                    opacity: [0, 1, 1, 1],
                    scale: [0.8, 1.05, 1, 1],
                    x: [-40, 0, 0, 40],
                  }}
                  transition={{
                    duration: 2.0,
                    times: [0, 0.25, 0.6, 1],
                    ease: EASE_OUT_EXPO,
                  }}
                >
                  <span className="font-clash font-bold text-3xl sm:text-4xl text-white">
                    {formatQF(recipientAmountWei)}
                  </span>
                  <span className="font-clash text-lg text-white/40 ml-2">QF</span>
                </motion.div>
              </motion.div>

              {/* Recipient identity */}
              <motion.div
                className="flex flex-col items-center gap-2 flex-shrink-0"
                initial={{ opacity: 0.3, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6, duration: 0.5, ease: EASE_OUT_EXPO }}
              >
                {recipientAvatar ? (
                  <motion.div
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-white/20"
                    animate={{
                      borderColor: [
                        'rgba(255,255,255,0.2)',
                        'rgba(255,255,255,0.2)',
                        'rgba(0, 209, 121, 0.5)',
                      ],
                    }}
                    transition={{ duration: 2.0, times: [0, 0.7, 1] }}
                  >
                    <img
                      src={recipientAvatar}
                      alt={recipientName || ''}
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center"
                    animate={{
                      borderColor: [
                        'rgba(255,255,255,0.2)',
                        'rgba(255,255,255,0.2)',
                        'rgba(0, 209, 121, 0.5)',
                      ],
                    }}
                    transition={{ duration: 2.0, times: [0, 0.7, 1] }}
                  >
                    <span className="font-clash font-bold text-xl text-white">
                      {recipientName
                        ? recipientName[0].toUpperCase()
                        : recipientAddress
                          ? recipientAddress.slice(2, 4).toUpperCase()
                          : '?'}
                    </span>
                  </motion.div>
                )}
                <span className="font-satoshi text-xs text-white/50 max-w-[80px] truncate">
                  {displayRecipient}
                </span>
              </motion.div>
            </div>

            {/* "Sending" label below the flow */}
            <motion.p
              className="text-center font-satoshi text-sm text-white/30 mt-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            >
              Sending payment...
            </motion.p>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* ACT 3: SUCCESS                             */}
        {/* Checkmark with ring + summary + CTA        */}
        {/* ═══════════════════════════════════════════ */}
        {phase === 'success' && (
          <motion.div
            key="success"
            className="flex flex-col items-center text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          >
            {/* Checkmark with animated ring */}
            <motion.div
              className="relative mb-8"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                delay: 0.15,
                type: 'spring',
                stiffness: 180,
                damping: 14,
              }}
            >
              {/* Glow behind */}
              <motion.div
                className="absolute -inset-4 rounded-full"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1.2, opacity: [0, 0.8, 0.3] }}
                transition={{ delay: 0.2, duration: 0.8 }}
              />

              {/* SVG ring + checkmark */}
              <svg
                className="w-20 h-20 sm:w-24 sm:h-24 relative z-10"
                viewBox="0 0 24 24"
                fill="none"
              >
                {/* Circle ring — draws first */}
                <motion.circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: 0.25, duration: 0.6, ease: EASE_OUT_EXPO }}
                />
                {/* Checkmark — draws after ring completes */}
                <motion.path
                  d="M8 12.5l2.5 2.5L16 9.5"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: 0.75, duration: 0.4, ease: EASE_OUT_EXPO }}
                />
              </svg>
            </motion.div>

            {/* "Payment sent" — lands with weight */}
            <motion.h2
              className="font-clash font-bold text-4xl sm:text-5xl text-white mb-6"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.5, ease: EASE_OUT_EXPO }}
            >
              Payment sent
            </motion.h2>

            {/* Summary — who received what */}
            <motion.div
              className="mb-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.4 }}
            >
              <div className="flex items-center justify-center gap-3">
                {/* Recipient identity inline */}
                {recipientAvatar ? (
                  <img
                    src={recipientAvatar}
                    alt={recipientName || ''}
                    className="w-6 h-6 rounded-full object-cover border border-white/20"
                  />
                ) : recipientName ? (
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                    <span className="font-clash font-semibold text-[10px] text-white">
                      {recipientName[0].toUpperCase()}
                    </span>
                  </div>
                ) : null}
                <p className="font-satoshi text-lg text-white/80">
                  <span className="font-medium text-white">
                    {formatQF(recipientAmountWei)} QF
                  </span>
                  {' → '}
                  <span className="text-white/70">{displayRecipient}</span>
                </p>
              </div>
            </motion.div>

            {/* Burn note */}
            <motion.p
              className="font-satoshi text-sm text-white/35 mb-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.3 }}
            >
              {formatQF(burnAmountWei)} QF burned
            </motion.p>

            {/* Send Another button */}
            <motion.button
              className="px-10 py-3.5 bg-white/10 hover:bg-white/15 border border-white/15 text-white font-satoshi font-medium rounded-2xl transition-all focus-ring"
              onClick={reset}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4, duration: 0.4, ease: EASE_OUT_EXPO }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Send Another
            </motion.button>

            {/* On-chain confirmation status */}
            <motion.div
              className="mt-6 flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.8, duration: 0.5 }}
            >
              {confirmed === true ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-qfpay-green" />
                  <span className="font-mono text-xs text-white/40">
                    Confirmed on-chain
                  </span>
                </>
              ) : confirmed === null ? (
                <>
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-white/30"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <span className="font-mono text-xs text-white/30">
                    Confirming...
                  </span>
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                  <span className="font-mono text-xs text-white/25">
                    Transaction sent
                  </span>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
