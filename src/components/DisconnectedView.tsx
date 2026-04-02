import { useWalletStore } from '../stores/walletStore';
import { hapticMedium } from '../utils/haptics';
import { ShimmerButton } from './hero/ShimmerButton';
import CeremonyPreview from './CeremonyPreview';

export function DisconnectedView() {
  const { setShowWalletModal } = useWalletStore();

  const openWalletModal = () => {
    hapticMedium();
    setShowWalletModal(true);
  };

  return (
    <div className="relative flex flex-col items-center min-h-[100svh] bg-[#060A14] px-6 overflow-hidden"
      style={{ paddingTop: 'clamp(1.5rem, 5vh, 3.5rem)' }}
    >

      {/* Headline block */}
      <div className="text-center" style={{ marginBottom: 'clamp(1.5rem, 3vh, 2.5rem)' }}>
        <h1 className="font-clash font-semibold text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.1] tracking-tight text-[#F0F2F8]">
          Pay anyone with just a{' '}
          <span className="text-[#0040FF]">name</span>.
        </h1>
        <p className="mt-4 font-satoshi text-base text-[rgba(122,139,171,0.7)] tracking-wide">
          Sub-second finality · 0.1% deflationary burn · QF Network
        </p>
      </div>

      {/* Preview Panel */}
      <div className="flex-1 flex items-center justify-center w-full" style={{ maxWidth: 'min(520px, 90vw)' }}>
        <CeremonyPreview />
      </div>

      {/* CTA */}
      <div style={{ marginTop: 'clamp(1rem, 2.5vh, 2rem)', marginBottom: 'clamp(1rem, 2.5vh, 2rem)' }}>
        <ShimmerButton onClick={openWalletModal}>
          Connect Wallet
        </ShimmerButton>
      </div>

    </div>
  );
}
