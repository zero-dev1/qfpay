import { useWalletStore } from '../stores/walletStore'
import { hapticMedium } from '../utils/haptics'
import { ThresholdScene } from './ThresholdScene'
import { ShimmerButton } from './hero/ShimmerButton'

export function DisconnectedView() {
  const { setShowWalletModal } = useWalletStore()

  const handleConnect = () => {
    hapticMedium()
    setShowWalletModal(true)
  }

  return (
    <div
      className="relative flex flex-col min-h-screen w-full overflow-hidden"
      style={{ background: '#060A14' }}
    >

      {/* Header zone — top 15% */}
      <div className="flex flex-col items-center pt-16 pb-4 z-10">
        {/* Logo */}
        <div className="mb-8 opacity-70">
          {/* existing logo component or SVG */}
        </div>
        {/* Headline — small, above the scene */}
        <h1
          className="font-clash font-bold text-white text-center leading-tight"
          style={{
            fontSize: 'clamp(1.25rem, 3vw, 2rem)',
            letterSpacing: '-0.02em',
            opacity: 0.92,
          }}
        >
          Instant money.{' '}
          <span style={{ color: '#0040FF' }}>Just a name.</span>
        </h1>
      </div>

      {/* Stage zone — middle 55%, the ThresholdScene owns this */}
      <div className="flex-1 flex items-center relative z-10">
        <ThresholdScene />
      </div>

      {/* CTA zone — bottom 30% */}
      <div className="flex flex-col items-center pb-12 gap-6 z-10">
        <ShimmerButton onClick={handleConnect}>
          Connect Wallet
        </ShimmerButton>

        {/* Trust line */}
        <p
          className="text-center"
          style={{
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.3)',
            letterSpacing: '0.04em',
          }}
        >
          Powered by QF Network · Sub-second finality · 0.1% deflationary burn
        </p>
      </div>

    </div>
  )
}
