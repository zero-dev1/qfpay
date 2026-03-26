import { motion } from 'framer-motion';
import { useWalletStore } from '../stores/walletStore';
import logoMark from '../assets/logo-mark.svg';
import { EASE_OUT_EXPO, staggerContainer, staggerChild } from '../lib/animations';
import { HeroBackground } from './ui/HeroBackground';
import { PaymentVignette } from './ui/PaymentVignette';

export const DisconnectedView = () => {
  const { setShowWalletModal } = useWalletStore();

  return (
    <motion.div
      className="relative flex flex-col items-center justify-center min-h-screen px-6 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6 }}
    >
      {/* Atmospheric background */}
      <HeroBackground />

      {/* Content — stagger all children */}
      <motion.div
        className="relative z-10 flex flex-col items-center text-center max-w-2xl"
        variants={staggerContainer(0.12)}
        initial="initial"
        animate="animate"
      >
        {/* Logo mark with subtle glow */}
        <motion.div className="relative mb-10" variants={staggerChild}>
          {/* Glow behind logo */}
          <div className="absolute inset-0 w-14 h-14 bg-qfpay-blue/20 rounded-full blur-xl scale-150" />
          <img
            src={logoMark}
            alt="QFPay"
            className="relative w-14 h-14"
          />
        </motion.div>

        {/* Tagline — the hero moment */}
        {/* Each word enters separately for typographic weight */}
        <motion.div className="mb-4" variants={staggerChild}>
          <h1 className="font-clash font-bold text-[clamp(2.5rem,8vw,5.5rem)] leading-[0.95] tracking-tight text-qfpay-text-primary">
            Instant money.
          </h1>
        </motion.div>
        <motion.div className="mb-8" variants={staggerChild}>
          <h1 className="font-clash font-bold text-[clamp(2.5rem,8vw,5.5rem)] leading-[0.95] tracking-tight">
            <span className="text-qfpay-text-primary">Just a </span>
            <span className="text-qfpay-blue">name.</span>
          </h1>
        </motion.div>

        {/* Sub-tagline — bridges emotional gap */}
        <motion.p
          className="font-satoshi text-lg sm:text-xl text-qfpay-text-secondary max-w-md mb-12"
          variants={staggerChild}
        >
          Send QF to anyone with a{' '}
          <span className="text-qfpay-blue font-medium">.qf name</span>
          {' '}— no addresses, no complexity.
        </motion.p>

        {/* Animated payment vignette — shows the product working */}
        <motion.div className="mb-14" variants={staggerChild}>
          <PaymentVignette />
        </motion.div>

        {/* Connect button with glow + border animation */}
        <motion.div className="relative" variants={staggerChild}>
          {/* Ambient glow behind button */}
          <div className="absolute -inset-1 bg-qfpay-blue/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <motion.button
            className="relative bg-qfpay-blue hover:bg-qfpay-blue-hover text-white font-satoshi font-semibold text-lg px-14 py-4 rounded-2xl transition-colors focus-ring"
            onClick={() => setShowWalletModal(true)}
            whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(0, 64, 255, 0.3)' }}
            whileTap={{ scale: 0.98 }}
          >
            Connect Wallet
          </motion.button>
        </motion.div>

        {/* Subtle ecosystem note */}
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
