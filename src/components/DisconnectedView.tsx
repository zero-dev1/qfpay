import logoMark from '../assets/logo-mark.svg'
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
      {/* Header zone */}
      <div className="flex flex-col items-center pt-12 pb-2 z-10">
        <img src={logoMark} alt="QFPay" className="w-8 h-8 mb-6 opacity-70" />
        <h1
          className="font-clash font-bold text-white text-center leading-tight"
          style={{
            fontSize: 'clamp(1.1rem, 3vw, 1.75rem)',
            letterSpacing: '-0.02em',
            opacity: 0.92,
          }}
        >
          Instant money.{' '}
          <span style={{ color: '#0040FF' }}>Just a name.</span>
        </h1>
      </div>

      {/* Stage zone — owns the viewport, pills are absolute inside */}
      <div className="flex-1 relative z-10" style={{ minHeight: '60vh' }}>
        <ThresholdScene />
      </div>

      {/* CTA zone */}
      <div className="flex flex-col items-center pb-10 gap-5 z-10">
        <ShimmerButton onClick={handleConnect}>
          Connect Wallet
        </ShimmerButton>
        <p
          className="text-center"
          style={{
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.28)',
            letterSpacing: '0.04em',
          }}
        >
          Powered by QF Network · Sub-second finality · 0.1% deflationary burn
        </p>
      </div>
    </div>
  )
}
