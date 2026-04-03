import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useWalletStore } from '../stores/walletStore';
import { hapticMedium } from '../utils/haptics';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { EASE_OUT_EXPO } from '../lib/animations';
import { BRAND_BLUE } from '../lib/colors';

// ─── Wallet icons (reused from WalletModal — keep in sync) ──────────────────

const TalismanIcon = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="8" fill="#D5FF5C" />
    <path d="M14 6.5c-1.1 0-2.1.3-3 .8-.5.3-.8.8-.8 1.4v2.6c0 .3.1.6.3.8.2.2.5.3.8.3h.4c.3 0 .5-.1.7-.3l.5-.5c.3-.3.7-.5 1.1-.5s.8.2 1.1.5l.5.5c.2.2.4.3.7.3h.4c.3 0 .6-.1.8-.3.2-.2.3-.5.3-.8V8.7c0-.6-.3-1.1-.8-1.4-.9-.5-1.9-.8-3-.8z" fill="#111" />
    <path d="M9.2 14.5c-.3 0-.5.1-.7.3l-1 1c-.4.4-.4 1 0 1.4l3.8 3.8c.6.6 1.3.9 2.1 1h1.2c.8-.1 1.5-.4 2.1-1l3.8-3.8c.4-.4.4-1 0-1.4l-1-1c-.2-.2-.4-.3-.7-.3h-.3c-.3 0-.5.1-.7.3L16 15.6c-.5.5-1.2.8-2 .8s-1.5-.3-2-0.8l-1.8-1.8c-.2-.2-.4-.3-.7-.3h-.3z" fill="#111" />
  </svg>
);

const SubWalletIcon = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="8" fill="url(#sw-grad-dv)" />
    <path d="M9 10.5C9 9.67 9.67 9 10.5 9h7c.83 0 1.5.67 1.5 1.5v1c0 .83-.67 1.5-1.5 1.5h-4a2.5 2.5 0 000 5h4c.83 0 1.5.67 1.5 1.5v1c0 .83-.67 1.5-1.5 1.5h-7c-.83 0-1.5-.67-1.5-1.5v-1c0-.83.67-1.5 1.5-1.5h4a2.5 2.5 0 000-5h-4C9.67 13 9 12.33 9 11.5v-1z" fill="white" fillOpacity="0.95" />
    <defs>
      <linearGradient id="sw-grad-dv" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
        <stop stopColor="#004BFF" />
        <stop offset="1" stopColor="#38E08C" />
      </linearGradient>
    </defs>
  </svg>
);

const MetaMaskIcon = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="8" fill="#1A1A2E" />
    <path d="M21.5 7L15.4 11.5l1.1-2.8L21.5 7z" fill="#E2761B" stroke="#E2761B" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6.5 7l6 4.6-1-2.9L6.5 7z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M19.2 17.8l-1.6 2.5 3.5 1-.9-3.5h-1z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7.8 17.8l-.9 3.5 3.5-1-1.6-2.5h-1z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10.2 12.8l-1.3 2 4.5.2-.2-4.9-3 2.7z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17.8 12.8l-3.1-2.8-.1 5 4.5-.2-1.3-2z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10.4 20.3l2.7-1.3-2.3-1.8-.4 3.1z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14.9 19l2.7 1.3-.4-3.1-2.3 1.8z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17.6 20.3l-2.7-1.3.2 1.7v.7l2.5-1.1z" fill="#D7C1B3" stroke="#D7C1B3" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10.4 20.3l2.5 1.1v-.7l.2-1.7-2.7 1.3z" fill="#D7C1B3" stroke="#D7C1B3" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M13 16.2l-2.2-.7 1.6-.7.6 1.4z" fill="#233447" stroke="#233447" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M15 16.2l.6-1.4 1.6.7-2.2.7z" fill="#233447" stroke="#233447" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10.4 20.3l.4-2.5h-1l.6 2.5z" fill="#CD6116" stroke="#CD6116" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17.2 17.8l.4 2.5.6-2.5h-1z" fill="#CD6116" stroke="#CD6116" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M19.1 14.8l-4.5.2.4 1.2.6-1.4 1.6.7 1.9-.7z" fill="#CD6116" stroke="#CD6116" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10.8 15.5l1.6-.7.6 1.4.4-1.2-4.5-.2 1.9.7z" fill="#CD6116" stroke="#CD6116" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8.9 14.8l2 1.9-.1-.7-1.9-1.2z" fill="#E4751F" stroke="#E4751F" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17.2 16l-.1.7 2-1.9-1.9 1.2z" fill="#E4751F" stroke="#E4751F" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M13.4 15l-.4 1.2 1 3.1.2-2.3-0.8-2z" fill="#F6851B" stroke="#F6851B" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M15 15l-.8 2 .2 2.3 1-3.1L15 15z" fill="#F6851B" stroke="#F6851B" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ─── Wallet button config ─────────────────────────────────────────────────────

interface WalletOption {
  type: 'talisman' | 'subwallet' | 'metamask';
  name: string;
  icon: React.ReactNode;
}

const DESKTOP_WALLETS: WalletOption[] = [
  { type: 'metamask', name: 'MetaMask', icon: <MetaMaskIcon size={32} /> },
  { type: 'talisman', name: 'Talisman', icon: <TalismanIcon size={32} /> },
];

const MOBILE_WALLETS: WalletOption[] = [
  { type: 'metamask', name: 'MetaMask', icon: <MetaMaskIcon size={32} /> },
  { type: 'subwallet', name: 'SubWallet', icon: <SubWalletIcon size={32} /> },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function DisconnectedView() {
  const { connectWallet, connectMetaMask, connecting, walletError, clearWalletError } = useWalletStore();
  const reducedMotion = useReducedMotion();
  const isDesktop = useIsDesktop();
  const [connectingType, setConnectingType] = useState<string | null>(null);

  const wallets = isDesktop ? DESKTOP_WALLETS : MOBILE_WALLETS;

  const handleConnect = async (wallet: WalletOption) => {
    clearWalletError();
    setConnectingType(wallet.type);
    hapticMedium();
    if (wallet.type === 'metamask') {
      await connectMetaMask();
    } else {
      await connectWallet(wallet.type as 'talisman' | 'subwallet');
    }
    setConnectingType(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="h-[100svh] flex flex-col items-center bg-[#060A14] px-6 overflow-hidden"
      style={{ paddingTop: 'clamp(20vh, 28vh, 32vh)' }}
    >
      {/* Ambient background glow — slow breathing radial gradient */}
      {!reducedMotion && (
        <motion.div
          className="fixed inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 30%, rgba(0,64,255,0.04) 0%, transparent 70%)',
          }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Headline */}
      <h1
        className="font-clash font-semibold text-center px-4 w-full relative z-10"
        style={{
          fontSize: 'clamp(32px, 8vw, 72px)',
          lineHeight: 1.05,
          color: '#F0F2F8',
        }}
      >
        Pay anyone with{'\n'}just a{' '}
        <span style={{ color: BRAND_BLUE }}>name</span>.
      </h1>

      {/* Sub-line */}
      <p
        className="font-satoshi text-center relative z-10"
        style={{
          fontSize: 'clamp(13px, 2vw, 16px)',
          color: 'rgba(122,139,171,0.7)',
          marginTop: 'clamp(0.75rem, 1.5vh, 1.25rem)',
        }}
      >
        Sub-second finality · 0.1% deflationary burn · QF Network
      </p>

      {/* Wallet icon circles */}
      <motion.div
        className="flex items-center gap-6 relative z-10"
        style={{ marginTop: 'clamp(3rem, 6vh, 5rem)' }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: EASE_OUT_EXPO }}
      >
        {wallets.map((wallet, i) => (
          <motion.button
            key={wallet.type}
            className="flex flex-col items-center gap-2.5 select-none"
            onClick={() => handleConnect(wallet)}
            disabled={connecting}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: connecting && connectingType !== wallet.type ? 0.4 : 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.08, duration: 0.4, ease: EASE_OUT_EXPO }}
            whileTap={!connecting ? { scale: 0.92 } : undefined}
          >
            {/* Circle container */}
            <div
              className="flex items-center justify-center"
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                transition: 'border-color 0.2s ease',
              }}
            >
              {connecting && connectingType === wallet.type ? (
                <Loader2
                  className="w-5 h-5 animate-spin"
                  style={{ color: BRAND_BLUE }}
                />
              ) : (
                wallet.icon
              )}
            </div>

            {/* Label */}
            <span
              className="font-satoshi text-xs"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              {wallet.name}
            </span>
          </motion.button>
        ))}
      </motion.div>

      {/* Error message */}
      <AnimatePresence>
        {walletError && (
          <motion.p
            className="font-satoshi text-sm text-center relative z-10 max-w-sm"
            style={{
              color: 'rgba(245,158,11,0.85)',
              marginTop: 16,
            }}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
          >
            {walletError}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Footer links — platform-aware */}
      <p
        className="font-satoshi text-xs relative z-10"
        style={{
          color: 'rgba(255,255,255,0.20)',
          marginTop: 'clamp(2rem, 4vh, 3rem)',
        }}
      >
        Don't have a wallet?{' '}
        <a
          href="https://metamask.io"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: BRAND_BLUE }}
        >
          MetaMask
        </a>
        {' · '}
        <a
          href={isDesktop ? 'https://talisman.xyz' : 'https://subwallet.app'}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: BRAND_BLUE }}
        >
          {isDesktop ? 'Talisman' : 'SubWallet'}
        </a>
      </p>
    </motion.div>
  );
}
