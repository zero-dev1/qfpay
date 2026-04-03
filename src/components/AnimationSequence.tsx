import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { usePaymentStore } from '../stores/paymentStore';
import { useWalletStore } from '../stores/walletStore';
import { formatQF } from '../utils/qfpay';
import { hapticBurn, hapticImpact, hapticSuccess } from '../utils/haptics';
import { playBurnSound, playSendSound, playSuccessSound } from '../utils/sounds';
import { EASE_OUT_EXPO, EASE_SPRING } from '../lib/animations';
import { BRAND_BLUE, BURN_CRIMSON, SUCCESS_GREEN } from '../lib/colors';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { NamePill } from './NamePill';
import { AvatarFallback } from './AvatarFallback';
import { generateAvatarGradient } from '../utils/avatarFallback';
import { ShimmerButton } from './hero/ShimmerButton';

// ─── Recipient color lookup (matches ThresholdScene identities) ───────────────
const RECIPIENT_COLORS: Record<string, string> = {
  vector: 'linear-gradient(135deg, #3B82F6, #4338CA)',
  memechi: 'linear-gradient(135deg, #EC4899, #E11D48)',
  steve: 'linear-gradient(135deg, #94A3B8, #3B82F6)',
  hwmedia: 'linear-gradient(135deg, #8B5CF6, #9333EA)',
  teddy: 'linear-gradient(135deg, #FB923C, #F59E0B)',
  satoshiflipper: 'linear-gradient(135deg, #F97316, #DC2626)',
  altcoinsensei: 'linear-gradient(135deg, #22D3EE, #3B82F6)',
  soapy: 'linear-gradient(135deg, #2DD4BF, #10B981)',
  patrick: 'linear-gradient(135deg, #60A5FA, #06B6D4)',
  drprofit: 'linear-gradient(135deg, #22C55E, #14B8A6)',
  vitalik: 'linear-gradient(135deg, #A855F7, #7C3AED)',
  cryptomonk: 'linear-gradient(135deg, #6366F1, #2563EB)',
  overdose: 'linear-gradient(135deg, #EF4444, #EA580C)',
  amg: 'linear-gradient(135deg, #FBBF24, #EAB308)',
  bino: 'linear-gradient(135deg, #EC4899, #C026D3)',
  nils: 'linear-gradient(135deg, #94A3B8, #6B7280)',
  cryptouser28: 'linear-gradient(135deg, #60A5FA, #64748B)',
  sam: 'linear-gradient(135deg, #34D399, #22C55E)',
};
const FALLBACK_COLOR = 'linear-gradient(135deg, #10B981, #0D9488)';

// ─── AnimationSequence ────────────────────────────────────────────────────────

export const AnimationSequence = () => {
  const {
    phase,
    recipientAmountWei,
    burnAmountWei,
    recipientName,
    recipientAddress,
    recipientAvatar,
    confirmed,
    advanceToSending,
    advanceToSuccess,
    reset,
  } = usePaymentStore();

  const { qnsName: senderName, avatarUrl: senderAvatar } = useWalletStore();
  const reducedMotion = useReducedMotion();

  // ── Derived ──
  const departureAmountWei = recipientAmountWei + burnAmountWei;

  const displayRecipient = recipientName
    ? `${recipientName}.qf`
    : recipientAddress
      ? recipientAddress.slice(0, 8) + '...' + recipientAddress.slice(-4)
      : '?';

  const recipientColor = recipientName
    ? (RECIPIENT_COLORS[recipientName.toLowerCase()] ?? FALLBACK_COLOR)
    : FALLBACK_COLOR;

  // ── Screen 5 animation state ──
  const [bgColor,           setBgColor]           = useState('#060A14');
  const [senderDimmed,      setSenderDimmed]      = useState(false);
  const [recipientArriving, setRecipientArriving] = useState(false);
  const [showCheckmark,     setShowCheckmark]     = useState(false);
  const [pillsVisible,      setPillsVisible]      = useState(true);
  const [trailVisible,      setTrailVisible]      = useState(false);
  const [displayAmount,     setDisplayAmount]     = useState(
    Number(departureAmountWei) / 1e18
  );
  const [amountColor, setAmountColor]   = useState<string>('rgba(255,255,255,0.95)');
  const [receiptTime, setReceiptTime]   = useState('');

  const countdownAFRef = useRef<number | null>(null);

  // ── BURN PHASE ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'burn') return;

    if (reducedMotion) {
      setTimeout(advanceToSending, 400);
      return;
    }

    const startValue = Number(departureAmountWei) / 1e18;
    const endValue   = Number(recipientAmountWei)  / 1e18;
    const difference = startValue - endValue;

    const timers: ReturnType<typeof setTimeout>[] = [

      // Act 1 — Charge (0–600ms): trail draws upward
      setTimeout(() => setTrailVisible(true), 100),

      // Act 2 — Burn (600ms): bg shifts to crimson, sound, haptic, countdown starts
      setTimeout(() => {
        setBgColor('#0F0608');
        playBurnSound();
        hapticBurn();
        setAmountColor('#F59E0B');

        const COUNTDOWN_DURATION = 700;
        const startTime = performance.now();
        const tick = () => {
          const elapsed  = performance.now() - startTime;
          const progress = Math.min(elapsed / COUNTDOWN_DURATION, 1);
          const eased    = progress * (2 - progress); // easeOut
          setDisplayAmount(startValue - difference * eased);
          if (progress < 1) {
            countdownAFRef.current = requestAnimationFrame(tick);
          } else {
            setDisplayAmount(endValue);
            countdownAFRef.current = null;
          }
        };
        countdownAFRef.current = requestAnimationFrame(tick);
      }, 600),

      // Hold amber 200ms after countdown ends (600 + 700 = 1300ms)
      // then restore background and color
      setTimeout(() => {
        setBgColor('#060A14');
        setAmountColor('rgba(255,255,255,0.95)');
        setSenderDimmed(true);
      }, 1500),

      // End of burn phase
      setTimeout(advanceToSending, 1800),
    ];

    return () => {
      timers.forEach(clearTimeout);
      if (countdownAFRef.current) cancelAnimationFrame(countdownAFRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── SENDING PHASE ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'sending') return;

    if (reducedMotion) {
      setTimeout(advanceToSuccess, 400);
      return;
    }

    // Act 3 — Send: trail draws down, recipient brightens
    playSendSound();

    const timers: ReturnType<typeof setTimeout>[] = [
      // Act 4 — Resolution: checkmark at 800ms
      setTimeout(() => {
        hapticImpact();
        setShowCheckmark(true);
        setRecipientArriving(true);
      }, 800),

      // Pills fade out at 1000ms
      setTimeout(() => setPillsVisible(false), 1000),

      // Advance to success at 2200ms
      setTimeout(advanceToSuccess, 2200),
    ];

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── SUCCESS PHASE ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'success') return;

    playSuccessSound();
    hapticSuccess();
    setBgColor(BRAND_BLUE);          // sapphire bloom
    setReceiptTime(new Date().toLocaleTimeString());
  }, [phase]);

  // ─── Reduced motion — static success state ────────────────────────────────
  if (reducedMotion && phase === 'success') {
    return (
      <div
        className="flex flex-col items-center justify-center h-[100svh] overflow-hidden px-6"
        style={{ background: BRAND_BLUE }}
      >
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" className="mb-6">
          <path d="M14 28L24 38L42 18"
            stroke={`${SUCCESS_GREEN}e6`} strokeWidth="3"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="font-satoshi font-medium text-base mb-8"
          style={{ color: `${BURN_CRIMSON}cc` }}>
          🔥 {formatQF(burnAmountWei)} QF burned forever
        </p>
        <div className="flex flex-col items-center gap-3">
          <ShimmerButton onClick={reset}>Send again</ShimmerButton>
          <button className="font-satoshi text-sm" style={{ color: 'rgba(255,255,255,0.50)' }} onClick={reset}>Done</button>
        </div>
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <motion.div
      className="relative flex flex-col items-center justify-center h-[100svh] overflow-hidden px-6"
      animate={{ backgroundColor: bgColor }}
      transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
    >

      {/* ── SCREEN 5 — burn and sending phases ────────────────────────────── */}
      <AnimatePresence>
        {(phase === 'burn' || phase === 'sending') && (
          <motion.div
            key="screen5"
            className="relative w-full flex flex-col items-center"
            style={{ minHeight: '72vh' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{    opacity: 0, transition: { duration: 0.3 } }}
            transition={{ duration: 0.4 }}
          >
            {/* ── Sender pill — top ── */}
            <AnimatePresence>
              {pillsVisible && (
                <motion.div
                  className="absolute left-1/2 -translate-x-1/2"
                  style={{ top: '10%' }}
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y:   0  }}
                  exit={{    opacity: 0, y:  -8, transition: { duration: 0.35 } }}
                  transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
                >
                  <NamePill
                    name={senderName || 'you'}
                    color={generateAvatarGradient(senderName || 'you')}
                    avatarUrl={senderAvatar ?? undefined}
                    state={senderDimmed ? 'dimmed' : 'default'}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Vertical trail ── */}
            <AnimatePresence>
              {trailVisible && pillsVisible && (
                <motion.svg
                  className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
                  style={{ top: '18%', height: '64%', width: 2, overflow: 'visible' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{    opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.line
                    x1="1" y1="0%" x2="1" y2="100%"
                    stroke={`rgba(0,64,255,0.30)`}
                    strokeWidth="1.5"
                    strokeDasharray="4 6"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.55, ease: EASE_OUT_EXPO }}
                  />
                </motion.svg>
              )}
            </AnimatePresence>

            {/* ── Amount — center stage ── */}
            <AnimatePresence>
              {!showCheckmark && (
                <motion.div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10 pointer-events-none"
                  initial={{ scale: 0.7, opacity: 0, filter: 'blur(8px)' }}
                  animate={
                    phase === 'sending'
                      ? { scale: 1, opacity: [1, 1, 0], filter: 'blur(0px)', y: [0, 0, 160] }
                      : { scale: 1, opacity: 1,        filter: 'blur(0px)' }
                  }
                  transition={
                    phase === 'sending'
                      ? {
                          scale:   { duration: 0.4, ease: EASE_OUT_EXPO },
                          filter:  { duration: 0.4 },
                          opacity: { duration: 0.8, times: [0, 0.4, 1] },
                          y:       { duration: 0.8, ease: [0.25, 0.1, 0.25, 1], times: [0, 0.1, 1] },
                        }
                      : { duration: 0.5, ease: EASE_OUT_EXPO }
                  }
                  exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
                >
                  <span
                    className="font-clash font-bold"
                    style={{
                      fontSize: 'clamp(2.5rem, 8vw, 5rem)',
                      letterSpacing: '-0.02em',
                      color: amountColor,
                      transition: 'color 0.15s ease',
                    }}
                  >
                    {formatQF(BigInt(Math.max(0, Math.round(displayAmount * 1e18))))}
                  </span>
                  <span
                    className="font-clash font-bold block"
                    style={{
                      fontSize: 'clamp(1rem, 2.5vw, 1.5rem)',
                      color: `${BRAND_BLUE}cc`,
                      marginTop: 2,
                    }}
                  >
                    QF
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Checkmark — emerald stroke, path-length animation ── */}
            <AnimatePresence>
              {showCheckmark && (
                <motion.div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1,   opacity: 1 }}
                  exit={{    scale: 0.6, opacity: 0 }}
                  transition={{ ...EASE_SPRING }}
                >
                  <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                    <motion.path
                      d="M15 30L26 41L45 19"
                      stroke={`${SUCCESS_GREEN}e6`}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                    />
                  </svg>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Recipient pill — bottom ── */}
            <AnimatePresence>
              {pillsVisible && (
                <motion.div
                  className="absolute left-1/2 -translate-x-1/2"
                  style={{ bottom: '10%' }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y:  0  }}
                  exit={{    opacity: 0, y:  8, transition: { duration: 0.35 } }}
                  transition={{ delay: 0.15, duration: 0.4, ease: EASE_OUT_EXPO }}
                >
                  <NamePill
                    name={recipientName || recipientAddress?.slice(0, 8) || '?'}
                    color={generateAvatarGradient(recipientName || recipientAddress?.slice(0, 8) || '?')}
                    avatarUrl={recipientAvatar ?? undefined}
                    state={recipientArriving ? 'arriving' : 'default'}
                  />
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SCREEN 6 — success phase ───────────────────────────────────────── */}
      <AnimatePresence>
        {phase === 'success' && (
          <motion.div
            key="screen6"
            className="flex flex-col items-center text-center relative z-10 w-full px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          >
            {/* Background cools from sapphire toward dark over 1500ms — 800ms delay */}
            <motion.div
              className="fixed inset-0 pointer-events-none z-0"
              style={{ background: '#080D1A' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.5, ease: 'easeOut', delay: 0.8 }}
            />

            {/* Checkmark — persists from Screen 5 */}
            <motion.div
              className="relative z-10 mb-6"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1,    opacity: 1 }}
              transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
            >
              <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                <path
                  d="M15 30L26 41L45 19"
                  stroke={`${SUCCESS_GREEN}e6`}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.div>

            {/* Burn epitaph — 800ms delay. Past tense: "burned" not "burns" */}
            <motion.p
              className="relative z-10 font-satoshi font-medium text-base mb-8"
              style={{ color: `${BURN_CRIMSON}cc` }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.4, ease: EASE_OUT_EXPO }}
            >
              🔥 {formatQF(burnAmountWei)} QF burned forever
            </motion.p>

            {/* Receipt card — slides up at 1400ms, spring */}
            <motion.div
              className="relative z-10 w-full max-w-sm mx-auto mb-8 selectable"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 20,
                padding: '16px 18px',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0  }}
              transition={{
                delay: 1.4,
                type: 'spring',
                stiffness: 200,
                damping: 24,
              }}
            >
              {/* Sender → Recipient row */}
              <div className="flex items-center gap-3 mb-4">
                {/* Sender chip */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <AvatarFallback
                    name={senderName}
                    address={null}
                    avatarUrl={senderAvatar}
                    size={24}
                  />
                  <span className="font-satoshi text-xs truncate" style={{ color: 'rgba(255,255,255,0.65)' }}>
                    {senderName ? <>{senderName}<span style={{ color: `${BRAND_BLUE}d9` }}>.qf</span></> : 'you'}
                  </span>
                </div>

                {/* Sapphire arrow */}
                <div style={{ height: 1, flex: '0 0 20px', background: `rgba(0,64,255,0.45)` }} />

                {/* Recipient chip */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                  <span className="font-satoshi text-xs truncate" style={{ color: 'rgba(255,255,255,0.65)' }}>
                    {recipientName
                      ? <>{recipientName}<span style={{ color: `${BRAND_BLUE}d9` }}>.qf</span></>
                      : displayRecipient}
                  </span>
                  <AvatarFallback
                    name={recipientName}
                    address={recipientAddress}
                    avatarUrl={recipientAvatar}
                    size={24}
                  />
                </div>
              </div>

              {/* Amount + burn row */}
              <div className="flex items-center justify-between">
                <div className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {formatQF(recipientAmountWei)} QF ·{' '}
                  <span style={{ color: `${BURN_CRIMSON}a6` }}>
                    🔥 {formatQF(burnAmountWei)} burned
                  </span>
                </div>
                {/* Share icon */}
                <button
                  className="ml-2 flex-shrink-0 hover:opacity-80 transition-opacity"
                  style={{ color: 'rgba(255,255,255,0.30)', fontSize: '1rem' }}
                  onClick={async () => {
                    const text = `Sent ${formatQF(recipientAmountWei)} QF to ${
                      recipientName ? recipientName + '.qf' : displayRecipient
                    } · ${formatQF(burnAmountWei)} QF burned forever · qfpay.xyz`;
                    if (navigator.share) {
                      await navigator.share({ text });
                    } else {
                      navigator.clipboard.writeText(text);
                    }
                  }}
                  aria-label="Share"
                >
                  ↗
                </button>
              </div>

              {/* Timestamp */}
              <p className="font-mono mt-2" style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)' }}>
                {receiptTime}
              </p>
            </motion.div>

            {/* Action buttons — 2000ms delay */}
            <motion.div
              className="relative z-10 flex flex-col items-center gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y:  0  }}
              transition={{ delay: 2.0, duration: 0.4, ease: EASE_OUT_EXPO }}
            >
              <ShimmerButton onClick={reset}>Send again</ShimmerButton>
              <button
                className="font-satoshi text-sm focus-ring"
                style={{ color: 'rgba(255,255,255,0.50)' }}
                onClick={reset}
              >
                Done
              </button>
            </motion.div>

            {/* ── On-chain confirmation status — copied exactly from original ── */}
            <motion.div
              className="relative z-10 mt-6 flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.4, duration: 0.5 }}
            >
              {confirmed === true ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: SUCCESS_GREEN }} />
                  <span className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.40)' }}>
                    Confirmed on-chain
                  </span>
                </>
              ) : confirmed === null ? (
                <>
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.30)' }}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <span className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.30)' }}>
                    Confirming...
                  </span>
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.20)' }} />
                  <span className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    Transaction sent
                  </span>
                </>
              )}
            </motion.div>

          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};
