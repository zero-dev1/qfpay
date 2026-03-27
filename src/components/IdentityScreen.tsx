import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useWalletStore } from '../stores/walletStore';
import { usePaymentStore } from '../stores/paymentStore';
import { getQFBalance, formatQF, truncateAddress } from '../utils/qfpay';
import { Send, ExternalLink, Flame } from 'lucide-react';
import logoMarkSvg from '../assets/logo-mark.svg';
import { hapticMedium } from '../utils/haptics';
import { EASE_OUT_EXPO, staggerContainer, staggerChild } from '../lib/animations';
import { Skeleton } from './ui/Skeleton';
import { useReducedMotion } from '../hooks/useReducedMotion';

export const IdentityScreen = () => {
  const { qnsName, address, ss58Address, avatarUrl } = useWalletStore();
  const { goToRecipient } = usePaymentStore();
  const [balance, setBalance] = useState<bigint | null>(null);
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (ss58Address) {
      getQFBalance(ss58Address).then(setBalance);
    }
  }, [ss58Address]);

  const hasQNS = !!qnsName;

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
    >
      {hasQNS ? (
        <motion.div
          className="flex flex-col items-center text-center"
          variants={staggerContainer(0.1)}
          initial="initial"
          animate="animate"
        >
          {/* Avatar with glow ring */}
          <motion.div className="relative mb-8" variants={staggerChild}>
            {/* Outer glow */}
            <div className={`absolute -inset-3 bg-qfpay-blue/10 rounded-full blur-xl ${
              reducedMotion ? 'opacity-50' : 'animate-pulse-glow'
            }`} />
            {/* Ring */}
            <div className="relative w-28 h-28 rounded-full p-[2px] bg-gradient-to-b from-qfpay-blue/40 to-qfpay-blue/10">
              <div className="w-full h-full rounded-full overflow-hidden bg-qfpay-bg">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={qnsName}
                    className={`w-full h-full object-cover transition-opacity duration-500 ${
                      avatarLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    onLoad={() => setAvatarLoaded(true)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-qfpay-blue/10">
                    <span className="font-clash font-bold text-4xl text-qfpay-blue">
                      {qnsName[0].toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>
            {/* Online status dot */}
            <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-qfpay-green border-[3px] border-qfpay-bg" />
          </motion.div>

          {/* Name */}
          <motion.h1
            className="font-clash font-bold text-4xl sm:text-5xl md:text-6xl tracking-tight mb-2"
            variants={staggerChild}
          >
            <span className="text-qfpay-text-primary">{qnsName}</span>
            <span className="text-qfpay-blue">.qf</span>
          </motion.h1>

          {/* Address truncated */}
          <motion.p
            className="font-mono text-xs text-qfpay-text-muted mb-8"
            variants={staggerChild}
          >
            {truncateAddress(address || '')}
          </motion.p>

          {/* Balance — crossfade from skeleton */}
          <motion.div className="mb-12 h-[76px] flex items-center" variants={staggerChild}>
            <AnimatePresence mode="wait">
              {balance !== null ? (
                <motion.div
                  key="balance"
                  className="flex items-baseline gap-3"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
                >
                  <span className="font-clash font-bold text-6xl sm:text-7xl text-qfpay-text-primary">
                    {formatQF(balance)}
                  </span>
                  <span className="font-clash text-2xl text-qfpay-text-muted">QF</span>
                </motion.div>
              ) : (
                <motion.div
                  key="skeleton"
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <Skeleton className="w-48 h-16" rounded="lg" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Burn stat — celebrated, not hidden */}
          <motion.div
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-orange-500/[0.08] bg-orange-500/[0.04] mb-12"
            variants={staggerChild}
          >
            <Flame className="w-3.5 h-3.5 text-orange-400/70" />
            <span className="font-satoshi text-sm text-orange-300/60">
              0.1% burned per transaction
            </span>
          </motion.div>

          {/* Send Payment button with breathing glow */}
          <motion.div className="relative" variants={staggerChild}>
            {/* Breathing ambient glow */}
            <motion.div
              className="absolute -inset-1 bg-qfpay-blue/20 rounded-2xl blur-xl"
              animate={
                reducedMotion
                  ? { opacity: 0.5 }
                  : {
                      opacity: [0.4, 0.7, 0.4],
                      scale: [1, 1.05, 1],
                    }
              }
              transition={
                reducedMotion
                  ? undefined
                  : {
                      duration: 3,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }
              }
            />
            <motion.button
              className="relative group flex items-center gap-3 bg-qfpay-blue hover:bg-qfpay-blue-hover text-white font-satoshi font-semibold text-lg px-10 py-4 rounded-2xl transition-all focus-ring"
              onClick={() => { hapticMedium(); goToRecipient(); }}
              whileHover={{
                scale: 1.02,
                boxShadow: '0 0 40px rgba(0, 64, 255, 0.3), 0 0 80px rgba(0, 64, 255, 0.1)',
              }}
              whileTap={{ scale: 0.98 }}
            >
              <Send className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
              Send Payment
            </motion.button>
          </motion.div>
        </motion.div>
      ) : (
        /* ─── No QNS Gate ─── */
        <motion.div
          className="flex flex-col items-center text-center max-w-md"
          variants={staggerContainer(0.1)}
          initial="initial"
          animate="animate"
        >
          {/* Logo in circle */}
          <motion.div
            className="relative w-24 h-24 rounded-full bg-qfpay-surface flex items-center justify-center mb-8 border border-qfpay-border"
            variants={staggerChild}
          >
            <img src={logoMarkSvg} alt="QFPay" className="w-12 h-12" />
          </motion.div>

          <motion.h2
            className="font-clash font-bold text-3xl sm:text-4xl text-qfpay-text-primary mb-4"
            variants={staggerChild}
          >
            You need a{' '}
            <span className="text-qfpay-blue">.qf</span> name
          </motion.h2>

          <motion.p
            className="font-satoshi text-qfpay-text-secondary text-base mb-3 leading-relaxed"
            variants={staggerChild}
          >
            QFPay uses your QNS identity to send and receive payments.
            Your name is your wallet — human-readable, memorable, and yours.
          </motion.p>

          <motion.p
            className="font-mono text-xs text-qfpay-text-muted mb-10"
            variants={staggerChild}
          >
            {truncateAddress(address || '')}
            {balance !== null && <> · {formatQF(balance)} QF</>}
          </motion.p>

          <motion.a
            href="https://dotqf.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2.5 bg-qfpay-blue hover:bg-qfpay-blue-hover text-white font-satoshi font-semibold text-lg px-10 py-4 rounded-2xl transition-colors focus-ring"
            variants={staggerChild}
            whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(0, 64, 255, 0.25)' }}
            whileTap={{ scale: 0.98 }}
          >
            Claim your .qf name
            <ExternalLink className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
          </motion.a>

          <motion.p
            className="mt-6 font-satoshi text-xs text-qfpay-text-muted"
            variants={staggerChild}
          >
            Takes 30 seconds · Powered by QNS
          </motion.p>
        </motion.div>
      )}
    </motion.div>
  );
};
