import { motion } from 'framer-motion';
import { useWalletStore } from '../stores/walletStore';
import { hapticMedium } from '../utils/haptics';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { ShimmerButton } from './hero/ShimmerButton';
import CeremonyPreview from './CeremonyPreview';

export function DisconnectedView() {
  const { setShowWalletModal } = useWalletStore();
  const reducedMotion = useReducedMotion();

  const openWalletModal = () => {
    hapticMedium();
    setShowWalletModal(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-[100svh] flex flex-col items-center justify-center bg-[#060A14] px-6 overflow-hidden"
      style={{ paddingTop: 'clamp(2rem, 6vh, 4.5rem)' }}
    >
      {/* Headline — completely static */}
      <h1
        className="font-clash font-semibold text-center px-4 w-full"
        style={{
          fontSize: 'clamp(32px, 8vw, 72px)',
          lineHeight: 1.05,
          color: '#F0F2F8',
        }}
      >
        Pay anyone with just a{' '}
        <span style={{ color: '#0040FF' }}>name</span>.
      </h1>

      {/* Sub-line — completely static */}
      <p
        className="font-satoshi text-center"
        style={{
          fontSize: 'clamp(13px, 2vw, 16px)',
          color: 'rgba(122,139,171,0.7)',
          marginTop: 'clamp(0.75rem, 1.5vh, 1.25rem)',
        }}
      >
        Sub-second finality · 0.1% deflationary burn · QF Network
      </p>

      {/* Glass Panel with Ceremony — generous top margin */}
      <div
        className="relative"
        style={{
          width: 'min(560px, 90vw)',
          aspectRatio: 'var(--panel-ratio)',
          marginTop: 'clamp(2rem, 4vh, 3.5rem)',
        }}
      >
        <CeremonyPreview />
      </div>

      {/* CTA — always alive */}
      <div style={{ marginTop: 'clamp(1.5rem, 3vh, 2.5rem)' }}>
        <ShimmerButton onClick={openWalletModal}>
          Connect Wallet
        </ShimmerButton>
      </div>
    </motion.div>
  );
}
