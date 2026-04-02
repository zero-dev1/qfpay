import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useWalletStore } from '../stores/walletStore';
import { usePaymentStore } from '../stores/paymentStore';
import { getQFBalance, formatQF, truncateAddress } from '../utils/qfpay';
import { hapticMedium } from '../utils/haptics';
import { EASE_OUT_EXPO, EASE_SPRING } from '../lib/animations';
import { BRAND_BLUE, SUCCESS_GREEN, BG_PRIMARY } from '../lib/colors';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { ShimmerButton } from './hero/ShimmerButton';
import {
  EXAMPLE_NAMES, TYPE_SPEED, DELETE_SPEED,
  PAUSE_AFTER_TYPE, PAUSE_AFTER_DELETE,
} from '../lib/recipientDemoNames';

type CeremonyPhase = 'blooming' | 'naming' | 'contracting' | 'settled';

interface IdentityScreenProps {
  onCeremonyComplete?: () => void;
}

export const IdentityScreen = ({ onCeremonyComplete }: IdentityScreenProps) => {
  const { qnsName, address, ss58Address, avatarUrl } = useWalletStore();
  const { goToRecipient } = usePaymentStore();
  const reducedMotion = useReducedMotion();

  const hasQNS = !!qnsName;

  // ── Ceremony phase machine ──
  const [ceremonyPhase, setCeremonyPhase] = useState<CeremonyPhase>('blooming');

  // Tracks whether the ceremony has already been triggered in this mount cycle.
  // Prevents re-running if qnsName reference changes after ceremony has fired.
  const ceremonyFired = useRef(false);

  // ── Balance ──
  const [balance,        setBalance]        = useState<bigint | null>(null);
  const [displayBalance, setDisplayBalance] = useState('0');

  // ── Auto-typing placeholder ──
  const [placeholder, setPlaceholder] = useState('');
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load balance ──
  useEffect(() => {
    const addr = ss58Address || address;
    if (addr) getQFBalance(addr).then(setBalance);
  }, [ss58Address, address]);

  // ── Balance count-up — 600ms, using setInterval ──
  useEffect(() => {
    if (balance === null) return;
    const target = Number(formatQF(balance).replace(/,/g, ''));
    if (target === 0) { setDisplayBalance('0'); return; }
    const duration = 600;
    const steps    = 30;
    const interval = duration / steps;
    let current    = 0;
    const step     = target / steps;
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

  // ── Ceremony sequencing ──
  // Fires once — when qnsName first becomes truthy in this mount cycle.
  // Dependency on qnsName (not []) so it correctly re-evaluates after the async
  // QNS resolution that happens after wallet connect.
  useEffect(() => {
    // Nothing to do until qnsName resolves
    if (!qnsName) return;
    // Only trigger the ceremony once per mount
    if (ceremonyFired.current) return;
    ceremonyFired.current = true;

    if (reducedMotion) {
      setCeremonyPhase('settled');
      return;
    }

    // Timing: blooming 0–600ms · naming 600–1200ms · contracting 1200–1800ms · settled 1800ms+
    const t1 = setTimeout(() => setCeremonyPhase('naming'),      600);
    const t2 = setTimeout(() => setCeremonyPhase('contracting'), 1200);
    const t3 = setTimeout(() => setCeremonyPhase('settled'),     1800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [qnsName, reducedMotion]);

  // ── Auto-typing demo — only when settled ──
  useEffect(() => {
    if (ceremonyPhase !== 'settled' || !hasQNS || reducedMotion) return;
    let nameIndex  = 0;
    let charIndex  = 0;
    let isDeleting = false;

    const tick = () => {
      const current = EXAMPLE_NAMES[nameIndex];
      if (!isDeleting) {
        charIndex++;
        setPlaceholder(current.slice(0, charIndex));
        if (charIndex === current.length) {
          animRef.current = setTimeout(() => { isDeleting = true; tick(); }, PAUSE_AFTER_TYPE);
          return;
        }
        animRef.current = setTimeout(tick, TYPE_SPEED);
      } else {
        charIndex--;
        setPlaceholder(current.slice(0, charIndex));
        if (charIndex === 0) {
          isDeleting  = false;
          nameIndex   = (nameIndex + 1) % EXAMPLE_NAMES.length;
          animRef.current = setTimeout(tick, PAUSE_AFTER_DELETE);
          return;
        }
        animRef.current = setTimeout(tick, DELETE_SPEED);
      }
    };
    tick();
    return () => { if (animRef.current) clearTimeout(animRef.current); };
  }, [ceremonyPhase, hasQNS, reducedMotion]);

  // ── Notify parent when ceremony is fully done ──
  useEffect(() => {
    if (ceremonyPhase === 'settled') {
      onCeremonyComplete?.();
    }
  }, [ceremonyPhase, onCeremonyComplete]);

  const handleScreenTap = () => {
    if (!hasQNS) return;
    hapticMedium();
    goToRecipient();
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  // address is set but qnsName hasn't resolved yet.
  // Render an invisible placeholder so the ceremony fires correctly once
  // qnsName arrives, rather than immediately jumping to the no-QNS branch.
  if (address && !qnsName) {
    return (
      <div
        className="min-h-screen w-full"
        style={{ background: BG_PRIMARY }}
      />
    );
  }

  // ── No QNS fork ──────────────────────────────────────────────────────────
  // Only reached when qnsName has definitively resolved to null (i.e. the
  // wallet is connected and PAPI confirmed no name for this address).

  if (!hasQNS) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center min-h-screen px-6 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
      >
        {/* Address blooms to center in JetBrains Mono */}
        <motion.div
          className="font-mono text-xl sm:text-2xl mb-8 break-all"
          style={{ color: 'rgba(255,255,255,0.70)' }}
          initial={{ scale: 0.7, opacity: 0, filter: 'blur(8px)' }}
          animate={{ scale: 1,   opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
        >
          {truncateAddress(address || '')}
        </motion.div>

        {/* Honest statement */}
        <motion.p
          className="font-satoshi font-medium text-base mb-3"
          style={{ color: 'rgba(255,255,255,0.80)' }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4, ease: EASE_OUT_EXPO }}
        >
          You need a <span style={{ color: BRAND_BLUE }}>.qf</span> name to send payments.
        </motion.p>

        {/* Tappable dotqf.xyz link */}
        <motion.p
          className="font-satoshi text-sm mb-10"
          style={{ color: 'rgba(255,255,255,0.40)' }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.4, ease: EASE_OUT_EXPO }}
        >
          Get one at{' '}
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

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.4, ease: EASE_OUT_EXPO }}
        >
          <ShimmerButton onClick={() => window.open('https://dotqf.xyz', '_blank')}>
            Get my .qf name
          </ShimmerButton>
        </motion.div>
      </motion.div>
    );
  }

  // ── Has QNS — ceremony + settled state ──────────────────────────────────────

  const isCeremony = ceremonyPhase === 'blooming'
    || ceremonyPhase === 'naming'
    || ceremonyPhase === 'contracting';

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-6 cursor-pointer select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
      onClick={handleScreenTap}
    >
      <AnimatePresence mode="wait">

        {/* ── Ceremony — blooming / naming / contracting ── */}
        {isCeremony && (
          <motion.div
            key="ceremony"
            className="flex flex-col items-center text-center"
            exit={{
              opacity: 0,
              transition: { duration: 0.4, ease: EASE_OUT_EXPO },
            }}
          >
            {/* Avatar — ~80px, spring entrance from scale 0.6 and blur 8px */}
            <motion.div
              className="relative mb-6"
              initial={{ scale: 0.6, opacity: 0, filter: 'blur(8px)' }}
              animate={{ scale: 1,   opacity: 1, filter: 'blur(0px)' }}
              transition={{ ...EASE_SPRING }}
            >
              <motion.div
                layoutId="user-avatar"
                className="relative rounded-full overflow-hidden flex-shrink-0"
                style={{
                  width: 80, height: 80,
                  background: avatarUrl
                    ? 'transparent'
                    : `rgba(0,64,255,0.12)`,
                  outline: `2px solid rgba(0,64,255,0.20)`,
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
                  width: 12, height: 12,
                  background: SUCCESS_GREEN,
                  border: '2.5px solid #060A14',
                }}
              />
            </motion.div>

            {/* Name — appears 200ms after avatar settles */}
            <AnimatePresence>
              {(ceremonyPhase === 'naming' || ceremonyPhase === 'contracting') && (
                <motion.h1
                  layoutId="user-name"
                  className="font-clash font-bold tracking-tight mb-3"
                  style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)', letterSpacing: '-0.02em' }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
                >
                  <span className="text-white">{qnsName}</span>
                  <span style={{ color: BRAND_BLUE }}>.qf</span>
                </motion.h1>
              )}
            </AnimatePresence>

            {/* Balance count-up — appears 200ms after name */}
            <AnimatePresence>
              {(ceremonyPhase === 'naming' || ceremonyPhase === 'contracting') && (
                <motion.div
                  className="flex items-baseline gap-2"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4, ease: EASE_OUT_EXPO }}
                >
                  <span className="font-mono font-medium text-4xl text-white">
                    {displayBalance}
                  </span>
                  <span className="font-mono text-lg" style={{ color: 'rgba(255,255,255,0.30)' }}>
                    QF
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── Settled — auto-typing invitation over sapphire underline ── */}
        {ceremonyPhase === 'settled' && (
          <motion.div
            key="settled"
            className="flex flex-col items-center w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
          >
            {/* Auto-typing display */}
            <div className="flex items-center justify-center" style={{ minHeight: 72 }}>
              <span
                className="font-clash font-bold text-center"
                style={{
                  fontSize: 'clamp(2rem, 8vw, 4rem)',
                  letterSpacing: '-0.02em',
                  color: 'rgba(255,255,255,0.75)',
                }}
              >
                {reducedMotion ? EXAMPLE_NAMES[0] : placeholder}
              </span>

              {/* Blinking cursor */}
              {!reducedMotion && (
                <motion.span
                  className="inline-block ml-[3px] flex-shrink-0"
                  style={{
                    width: 3,
                    height: '0.85em',
                    borderRadius: 1,
                    background: BRAND_BLUE,
                    opacity: 0.7,
                  }}
                  animate={{ opacity: [0.7, 0] }}
                  transition={{ duration: 0.55, repeat: Infinity, repeatType: 'reverse' }}
                />
              )}
            </div>

            {/* Sapphire underline — 2px, clamp(200px, 50vw, 400px) */}
            <div
              style={{
                width: 'clamp(200px, 50vw, 400px)',
                height: 2,
                borderRadius: 1,
                background: BRAND_BLUE,
                opacity: 0.35,
                marginTop: 12,
              }}
            />
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  );
};
