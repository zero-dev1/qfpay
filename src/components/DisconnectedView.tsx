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
    <div className="relative flex flex-col items-center min-h-screen bg-[#060A14] px-6 overflow-hidden"
      style={{ paddingTop: 'clamp(2.5rem, 8vh, 5rem)' }}
    >

      {/* Headline block */}
      <div className="text-center mb-8 md:mb-10">
        <h1 className="font-clash font-semibold text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.1] tracking-tight text-[#F0F2F8]">
          Pay anyone with just a{' '}
          <span className="text-[#0040FF]">name</span>.
        </h1>
        <p className="mt-4 font-satoshi text-base text-[rgba(122,139,171,0.7)] tracking-wide">
          Sub-second finality · 0.1% deflationary burn · QF Network
        </p>
      </div>

      {/* Preview Panel */}
      <CeremonyPreview />

      {/* CTA */}
      <div className="mt-8 md:mt-10 pb-10">
        <ShimmerButton onClick={openWalletModal}>
          Connect Wallet
        </ShimmerButton>
      </div>

    </div>
  );
}
