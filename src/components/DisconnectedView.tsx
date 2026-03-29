import { motion } from 'framer-motion';
import { useWalletStore } from '../stores/walletStore';
import logoMark from '../assets/logo-mark.svg';
import { hapticMedium } from '../utils/haptics';
import { EASE_OUT_EXPO, staggerContainer, staggerChild } from '../lib/animations';
import { PaymentCeremony } from './hero/PaymentCeremony';
import { ShimmerButton } from './hero/ShimmerButton';
import { useReducedMotion } from '../hooks/useReducedMotion';

export const DisconnectedView = () => {
  const { setShowWalletModal } = useWalletStore();
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className="relative flex flex-col items-center justify-center min-h-screen px-6 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6 }}
    >
      {/* Content — stagger all children */}
      <motion.div
        className="relative z-10 flex flex-col items-center text-center w-full max-w-3xl"
        variants={staggerContainer(0.12)}
        initial="initial"
        animate="animate"
      >
        {/* Logo mark with subtle glow */}
        <motion.div className="relative mb-10" variants={staggerChild}>
          <div className="absolute inset-0 w-14 h-14 bg-qfpay-blue/20 rounded-full blur-xl scale-150" />
          <img src={logoMark} alt="QFPay" className="relative w-14 h-14" />
        </motion.div>

        {/* Tagline line 1 — arrives with physical weight */}
        <motion.div className="mb-4" variants={staggerChild}>
          <motion.h1
            className="font-clash font-bold text-[clamp(2.5rem,8vw,5.5rem)] leading-[0.95] text-qfpay-text-primary"
            initial={{ opacity: 0, scale: 1.04, letterSpacing: '0.02em' }}
            animate={{ opacity: 1, scale: 1, letterSpacing: '-0.02em' }}
            transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
          >
            Instant money.
          </motion.h1>
        </motion.div>

        {/* Tagline line 2 — "name." has the blue clip-path reveal */}
        <motion.div className="mb-10" variants={staggerChild}>
          <h1 className="font-clash font-bold text-[clamp(2.5rem,8vw,5.5rem)] leading-[0.95] tracking-tight">
            <span className="text-qfpay-text-primary">Just a </span>
            <motion.span
              className="text-qfpay-blue inline-block"
              initial={{ clipPath: 'inset(0 100% 0 0)' }}
              animate={{ clipPath: 'inset(0 0% 0 0)' }}
              transition={{ delay: 0.3, duration: 0.6, ease: EASE_OUT_EXPO }}
            >
              name.
            </motion.span>
          </h1>
        </motion.div>

        {/* ═══ THE CEREMONY ═══ */}
        {/* Full-width payment animation — the emotional centerpiece */}
        <motion.div
          className="w-full mb-10"
          variants={staggerChild}
        >
          <PaymentCeremony />
        </motion.div>

        {/* Sub-tagline — bridges the ceremony to the CTA */}
        <motion.p
          className="font-satoshi text-lg sm:text-xl text-qfpay-text-secondary max-w-md mb-12"
          variants={staggerChild}
        >
          Send QF to anyone with a{' '}
          <span className="text-qfpay-blue font-medium">.qf name</span>
          , no addresses, no complexity.
        </motion.p>

        {/* CTA — shimmer border button */}
        <motion.div variants={staggerChild}>
          <ShimmerButton
            onClick={() => {
              hapticMedium();
              setShowWalletModal(true);
            }}
            reducedMotion={reducedMotion}
          >
            Connect Wallet
          </ShimmerButton>
        </motion.div>

        {/* Ecosystem note */}
        <motion.p
          className="mt-8 font-satoshi text-sm text-qfpay-text-muted"
          variants={staggerChild}
        >
          Powered by QF Network · Sub-second finality · 0.1% deflationary burn
        </motion.p>
      </motion.div>
    </motion.div>
  );
};
