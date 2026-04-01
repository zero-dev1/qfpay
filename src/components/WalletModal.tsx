import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useWalletStore } from '../stores/walletStore';
import { EASE_OUT_EXPO } from '../lib/animations';
import { BRAND_BLUE, BG_SURFACE, BURN_CRIMSON } from '../lib/colors';
import logoMarkSvg from '../assets/logo-mark.svg';

// ─── Wallet icons — copied verbatim ──────────────────────────────────────────

const TalismanIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="8" fill="#D5FF5C" />
    <path
      d="M14 6.5c-1.1 0-2.1.3-3 .8-.5.3-.8.8-.8 1.4v2.6c0 .3.1.6.3.8.2.2.5.3.8.3h.4c.3 0 .5-.1.7-.3l.5-.5c.3-.3.7-.5 1.1-.5s.8.2 1.1.5l.5.5c.2.2.4.3.7.3h.4c.3 0 .6-.1.8-.3.2-.2.3-.5.3-.8V8.7c0-.6-.3-1.1-.8-1.4-.9-.5-1.9-.8-3-.8z"
      fill="#111"
    />
    <path
      d="M9.2 14.5c-.3 0-.5.1-.7.3l-1 1c-.4.4-.4 1 0 1.4l3.8 3.8c.6.6 1.3.9 2.1 1h1.2c.8-.1 1.5-.4 2.1-1l3.8-3.8c.4-.4.4-1 0-1.4l-1-1c-.2-.2-.4-.3-.7-.3h-.3c-.3 0-.5.1-.7.3L16 15.6c-.5.5-1.2.8-2 .8s-1.5-.3-2-0.8l-1.8-1.8c-.2-.2-.4-.3-.7-.3h-.3z"
      fill="#111"
    />
  </svg>
);

const SubWalletIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="8" fill="url(#sw-grad)" />
    <path
      d="M9 10.5C9 9.67 9.67 9 10.5 9h7c.83 0 1.5.67 1.5 1.5v1c0 .83-.67 1.5-1.5 1.5h-4a2.5 2.5 0 000 5h4c.83 0 1.5.67 1.5 1.5v1c0 .83-.67 1.5-1.5 1.5h-7c-.83 0-1.5-.67-1.5-1.5v-1c0-.83.67-1.5 1.5-1.5h4a2.5 2.5 0 000-5h-4C9.67 13 9 12.33 9 11.5v-1z"
      fill="white"
      fillOpacity="0.95"
    />
    <defs>
      <linearGradient id="sw-grad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
        <stop stopColor="#004BFF" />
        <stop offset="1" stopColor="#38E08C" />
      </linearGradient>
    </defs>
  </svg>
);

const MetaMaskIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
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

// ─── Wallet options ───────────────────────────────────────────────────────────

const WALLETS = [
  { type: 'talisman'  as const, name: 'Talisman',  icon: <TalismanIcon  />, description: 'Polkadot & Ethereum' },
  { type: 'subwallet' as const, name: 'SubWallet', icon: <SubWalletIcon />, description: 'Multi-chain' },
  { type: 'metamask'  as const, name: 'MetaMask',  icon: <MetaMaskIcon  />, description: 'EVM wallet' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const WalletModal = () => {
  const {
    showWalletModal, setShowWalletModal, connecting, walletError,
    connectWallet, connectMetaMask, clearWalletError,
  } = useWalletStore();

  const modalRef = useRef<HTMLDivElement>(null);

  // ── Click-outside and Escape handlers — copied verbatim ──
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowWalletModal(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowWalletModal(false);
    };
    if (showWalletModal) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showWalletModal, setShowWalletModal]);

  // ── handleWalletSelect — copied verbatim ──
  const handleWalletSelect = async (
    walletType: 'talisman' | 'subwallet' | 'metamask'
  ) => {
    clearWalletError();
    if (walletType === 'metamask') {
      await connectMetaMask();
    } else {
      await connectWallet(walletType);
    }
  };

  return (
    <AnimatePresence>
      {showWalletModal && (
        // ── Backdrop — rgba only, no blur ──
        <motion.div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => setShowWalletModal(false)}
        >
          {/* ── Modal surface ── */}
          <motion.div
            ref={modalRef}
            className="w-full max-w-sm"
            style={{
              background: `${BG_SURFACE}F2`,           // 95% opacity
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 24,
              padding: '28px 24px 24px',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              // Double shadow: faint sapphire ring + deep drop
              boxShadow: `0 0 0 1px rgba(0,64,255,0.08), 0 24px 64px rgba(0,0,0,0.60)`,
            }}
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={   { opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Header ── */}
            <div className="flex flex-col items-center text-center mb-7">
              <img
                src={logoMarkSvg}
                alt="QFPay"
                className="w-7 h-7 mb-5"
                style={{ opacity: 0.55 }}
              />
              <h2
                className="font-clash font-bold text-2xl text-white mb-2"
                style={{ letterSpacing: '-0.02em' }}
              >
                Connect your wallet
              </h2>
              <p className="font-satoshi text-sm" style={{ color: 'rgba(255,255,255,0.40)' }}>
                You'll need a{' '}
                <span style={{ color: BRAND_BLUE }}>.qf</span>
                {' '}name to send payments
              </p>
            </div>

            {/* ── Error state — BURN_CRIMSON treatment ── */}
            <AnimatePresence>
              {walletError && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
                  exit={   { opacity: 0, height: 0, marginBottom: 0 }}
                  className="overflow-hidden"
                >
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: `rgba(185,28,28,0.06)`,
                    border: `1px solid rgba(185,28,28,0.15)`,
                  }}>
                    <p className="font-satoshi text-sm" style={{ color: BURN_CRIMSON }}>
                      {walletError}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Connecting state — BRAND_BLUE treatment ── */}
            <AnimatePresence>
              {connecting && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
                  exit={   { opacity: 0, height: 0, marginBottom: 0 }}
                  className="overflow-hidden"
                >
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: `rgba(0,64,255,0.06)`,
                    border: `1px solid rgba(0,64,255,0.12)`,
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <Loader2
                      className="w-4 h-4 animate-spin flex-shrink-0"
                      style={{ color: BRAND_BLUE }}
                    />
                    <div>
                      <p className="font-satoshi text-sm font-medium" style={{ color: BRAND_BLUE }}>
                        Waiting for authorization…
                      </p>
                      <p className="font-satoshi text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.30)' }}>
                        Check your wallet extension
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Wallet buttons — staggered 60ms, hover lifts + sapphire border ── */}
            <div className="flex flex-col gap-2">
              {WALLETS.map((wallet, i) => (
                <motion.button
                  key={wallet.type}
                  className="w-full flex items-center gap-4 text-left"
                  style={{
                    padding: '14px 16px',
                    borderRadius: 14,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    cursor: connecting ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() => handleWalletSelect(wallet.type)}
                  disabled={connecting}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: connecting ? 0.45 : 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.3, ease: EASE_OUT_EXPO }}
                  whileHover={!connecting ? {
                    backgroundColor: 'rgba(255,255,255,0.07)',
                    borderColor: `rgba(0,64,255,0.25)`,
                    y: -1,
                  } : undefined}
                  whileTap={!connecting ? { scale: 0.99 } : undefined}
                >
                  <div className="flex-shrink-0">{wallet.icon}</div>
                  <div>
                    <p className="font-satoshi font-medium text-sm" style={{ color: 'rgba(255,255,255,0.90)' }}>
                      {wallet.name}
                    </p>
                    <p className="font-satoshi text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {wallet.description}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* ── Footer — plain text link only, no icons ── */}
            <div
              className="flex items-center justify-center mt-6 pt-5"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="font-satoshi text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                Don't have a wallet?{' '}
                <a
                  href="https://talisman.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                  style={{ color: BRAND_BLUE }}
                >
                  Get Talisman
                </a>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
