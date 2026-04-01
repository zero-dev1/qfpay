import logoMark from '../assets/logo-mark.svg';
import { useWalletStore } from '../stores/walletStore';
import { hapticMedium } from '../utils/haptics';
import { ThresholdScene } from './ThresholdScene';
import { ShimmerButton } from './hero/ShimmerButton';

export function DisconnectedView() {
  const { setShowWalletModal } = useWalletStore();

  const handleConnect = () => {
    hapticMedium();
    setShowWalletModal(true);
  };

  return (
    <div className="flex flex-col min-h-screen w-full overflow-hidden">

      {/* ── Top zone — logo + headline ── */}
      <div className="flex flex-col items-center pt-12 pb-4 z-10 relative">
        <img src={logoMark} alt="QFPay" className="w-8 h-8 mb-6" style={{ opacity: 0.6 }} />
        <h1
          className="font-clash font-bold text-white text-center leading-tight"
          style={{
            fontSize: 'clamp(2rem, 4vw, 3.5rem)',
            letterSpacing: '-0.02em',
          }}
        >
          Instant money.{' '}
          <span style={{ color: '#0040FF' }}>Just a <span style={{ color: '#0040FF' }}>name</span>.</span>
        </h1>
      </div>

      {/* ── Middle zone — owns the viewport, ThresholdScene fills it ──
           position: relative is critical — pills are absolute children of this.
           min-height: 60vh ensures pills have real height to position into. ── */}
      <div
        className="flex-1 z-10"
        style={{ position: 'relative', minHeight: '60vh' }}
      >
        <ThresholdScene />
      </div>

      {/* ── Bottom zone — CTA button + trust line ── */}
      <div className="flex flex-col items-center pb-10 gap-5 z-10 relative">
        <ShimmerButton onClick={handleConnect}>
          Connect Wallet
        </ShimmerButton>
        <p
          className="font-satoshi text-center"
          style={{
            fontSize: '11px',
            color: 'rgba(255,255,255,0.28)',
            letterSpacing: '0.04em',
          }}
        >
          Powered by QF Network · Sub-second finality · 0.1% deflationary burn
        </p>
      </div>
    </div>
  );
}
