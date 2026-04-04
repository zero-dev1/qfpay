import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { PowerOff } from 'lucide-react';
import { useWalletStore } from '../stores/walletStore';
import { usePaymentStore } from '../stores/paymentStore';
import { getQFBalance, formatQF, truncateAddress } from '../utils/qfpay';
import { EASE_OUT_EXPO, EASE_SPRING } from '../lib/animations';
import { BRAND_BLUE, BURN_CRIMSON, SUCCESS_GREEN, BG_PRIMARY } from '../lib/colors';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { hapticLight } from '../utils/haptics';
import { ShimmerButton } from './hero/ShimmerButton';

type CeremonyPhase = 'blooming' | 'naming' | 'contracting';

interface IdentityScreenProps {
  onCeremonyComplete?: () => void;
}

export const IdentityScreen = ({ onCeremonyComplete }: IdentityScreenProps) => {
  const { qnsName, address, ss58Address, avatarUrl, disconnect } = useWalletStore();
  const { goToRecipient } = usePaymentStore();
  const reducedMotion = useReducedMotion();

  const hasQNS = !!qnsName;

  const [ceremonyPhase, setCeremonyPhase] = useState<CeremonyPhase>('blooming');
  const ceremonyFired = useRef(false);

  // ── QNS lookup timeout ──
  const [timedOut, setTimedOut] = useState(false);
  const [showSlowWarning, setShowSlowWarning] = useState(false);

  // ── Balance ──
  const [balance, setBalance] = useState<bigint | null>(null);
  const [displayBalance, setDisplayBalance] = useState('0');

  // ── Load balance ──
  useEffect(() => {
    const addr = ss58Address || address;
    if (addr) getQFBalance(addr).then(setBalance);
  }, [ss58Address, address]);

  // ── Balance count-up ──
  useEffect(() => {
    if (balance === null) return;
    const target = Number(formatQF(balance).replace(/,/g, ''));
    if (target === 0) {
      setDisplayBalance('0');
      return;
    }
    const duration = 600;
    const steps = 30;
    const interval = duration / steps;
    let current = 0;
    const step = target / steps;
    const id = setInterval(() => {
      current = Math.min(current + step, target);
      setDisplayBalance(
        current >= target
          ? formatQF(balance)
          : Math.floor(current).toLocaleString()
      );
      if (current >= target) clearInterval(id);
    }, interval);
    return () => clearInterval(id);
  }, [balance]);

  // ── Reset ceremony guard on every mount so reconnects replay ──
  useEffect(() => {
    ceremonyFired.current = false;
    setCeremonyPhase('blooming');
    setTimedOut(false);
    setShowSlowWarning(false);
  }, []);

  // ── QNS lookup timeout: 6s warning, 12s timeout ──
  useEffect(() => {
    if (!address || qnsName) return;

    const warningTimer = setTimeout(() => setShowSlowWarning(true), 6000);
    const timeoutTimer = setTimeout(() => setTimedOut(true), 12000);

    return () => {
      clearTimeout(warningTimer);
      clearTimeout(timeoutTimer);
    };
  }, [address, qnsName]);

  // ── Ceremony sequencing — auto-advances to RecipientScreen when done ──
  useEffect(() => {
    if (!qnsName) return;
    if (ceremonyFired.current) return;
    ceremonyFired.current = true;

    // Clear any pending timeout state
    setTimedOut(false);
    setShowSlowWarning(false);

    if (reducedMotion) {
      onCeremonyComplete?.();
      goToRecipient();
      return;
    }

    const t1 = setTimeout(() => setCeremonyPhase('naming'), 600);
    const t2 = setTimeout(() => setCeremonyPhase('contracting'), 1200);
    const t3 = setTimeout(() => {
      onCeremonyComplete?.();
      goToRecipient();
    }, 2200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [qnsName, reducedMotion, onCeremonyComplete, goToRecipient]);

  // ── Loading — waiting for QNS resolution (with progressive timeout) ──
  if (address && !qnsName && !timedOut) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center h-[100svh] overflow-hidden w-full"
        style={{ background: BG_PRIMARY }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
      >
        <motion.p
          className="font-satoshi text-sm"
          style={{ color: 'rgba(255,255,255,0.35)' }}
          animate={{ opacity: [0.35, 0.6, 0.35] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          Looking for your .qf name…
        </motion.p>

        {/* Amber warning — appears at 6 seconds */}
        <AnimatePresence>
          {showSlowWarning && (
            <motion.p
              className="font-satoshi text-xs mt-4"
              style={{ color: '#F59E0B' }}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
            >
              Taking longer than usual…
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // ── No QNS (either !hasQNS on mount, or timed out) ──
  if (!hasQNS) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center h-[100svh] overflow-hidden px-6 text-center"
        style={{ background: BG_PRIMARY }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
      >
        {/* Truncated address — smaller, calmer */}
        <motion.p
          className="font-mono text-sm mb-6"
          style={{ color: 'rgba(255,255,255,0.40)' }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
        >
          {truncateAddress(address || '')}
        </motion.p>

        {/* Headline */}
        <motion.p
          className="font-satoshi font-medium text-base mb-2"
          style={{ color: 'rgba(255,255,255,0.80)' }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4, ease: EASE_OUT_EXPO }}
        >
          You need a <span style={{ color: BRAND_BLUE }}>.qf</span> name to send payments
        </motion.p>

        {/* Subline with link */}
        <motion.p
          className="font-satoshi text-sm mb-10"
          style={{ color: 'rgba(255,255,255,0.40)' }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4, ease: EASE_OUT_EXPO }}
        >
          Register one at{' '}
          <a
            href="https://dotqf.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
            style={{ color: BRAND_BLUE }}
          >
            dotqf.xyz
          </a>
        </motion.p>

        {/* Register CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4, ease: EASE_OUT_EXPO }}
        >
          <ShimmerButton
            onClick={() => window.open('https://dotqf.xyz', '_blank')}
          >
            Get my .qf name
          </ShimmerButton>
        </motion.div>

        {/* Disconnect button — round, white bg, PowerOff icon in crimson */}
        <motion.button
          className="mt-8 flex flex-col items-center gap-2 select-none"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4, ease: EASE_OUT_EXPO }}
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            hapticLight();
            disconnect();
          }}
        >
          <div
            className="flex items-center justify-center"
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.95)',
            }}
          >
            <PowerOff className="w-5 h-5" style={{ color: BURN_CRIMSON }} />
          </div>
          <span className="font-satoshi text-[11px]" style={{ color: 'rgba(255,255,255,0.30)' }}>
            Disconnect
          </span>
        </motion.button>
      </motion.div>
    );
  }

  // ── Has QNS — ceremony ONLY (no settled state) ──

  return (
    <motion.div
      className="flex flex-col items-center justify-center h-[100svh] overflow-hidden px-6 select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
    >
      <motion.div
        className="flex flex-col items-center text-center"
      >
        {/* Avatar — spring entrance */}
        <motion.div
          className="relative mb-6"
          initial={{ scale: 0.6, opacity: 0, filter: 'blur(8px)' }}
          animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
          transition={{ ...EASE_SPRING }}
        >
          <motion.div
            layoutId="user-avatar"
            className="relative rounded-full overflow-hidden flex-shrink-0"
            style={{
              width: 80,
              height: 80,
              background: avatarUrl ? 'transparent' : 'rgba(0,64,255,0.12)',
              outline: '2px solid rgba(0,64,255,0.20)',
              outlineOffset: 2,
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={qnsName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span
                  className="font-clash font-bold text-3xl"
                  style={{ color: BRAND_BLUE }}
                >
                  {qnsName[0].toUpperCase()}
                </span>
              </div>
            )}
          </motion.div>

          {/* Presence dot */}
          <div
            className="absolute bottom-1 right-1 rounded-full animate-pulse-glow"
            style={{
              width: 12,
              height: 12,
              background: SUCCESS_GREEN,
              border: '2.5px solid #060A14',
            }}
          />
        </motion.div>

        {/* Name — appears after blooming */}
        <AnimatePresence>
          {(ceremonyPhase === 'naming' || ceremonyPhase === 'contracting') && (
            <motion.h1
              layoutId="user-name"
              className="font-clash font-bold tracking-tight mb-3"
              style={{
                fontSize: 'clamp(2rem, 6vw, 3.5rem)',
                letterSpacing: '-0.02em',
              }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
            >
              <span className="text-white">{qnsName}</span>
              <span style={{ color: BRAND_BLUE }}>.qf</span>
            </motion.h1>
          )}
        </AnimatePresence>

        {/* Balance count-up — appears after name */}
        <AnimatePresence>
          {(ceremonyPhase === 'naming' || ceremonyPhase === 'contracting') && (
            <motion.div
              className="flex items-baseline gap-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.2,
                duration: 0.4,
                ease: EASE_OUT_EXPO,
              }}
            >
              <span className="font-mono font-medium text-4xl text-white">
                {displayBalance}
              </span>
              <span
                className="font-mono text-lg"
                style={{ color: 'rgba(255,255,255,0.30)' }}
              >
                QF
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};
