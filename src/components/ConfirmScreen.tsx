import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check, CornerDownLeft, ChevronLeft } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useWalletStore } from '../stores/walletStore';
import { usePaymentStore } from '../stores/paymentStore';
import { formatQF, truncateAddress } from '../utils/qfpay';
import { writeContract } from '../utils/contractCall';
import { QFPAY_ROUTER_ADDRESS, ROUTER_ABI } from '../config/contracts';
import { isRetryableError, RETRY_MESSAGE_SHORT } from '../utils/errorHelpers';
import { showToast } from './Toast';
import { hapticLight, hapticMedium, hapticTick, hapticSuccess } from '../utils/haptics';
import { playSignedSound } from '../utils/sounds';
import { EASE_OUT_EXPO } from '../lib/animations';
import { BRAND_BLUE, BURN_CRIMSON } from '../lib/colors';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { AvatarFallback } from './AvatarFallback';

// ─── Constants ────────────────────────────────────────────────────────────────

const HOLD_DURATION = 1200;
const TICK_INTERVAL = 16;
const BUTTON_SIZE = 80;
const IDLE_ROTATION_DURATION = 5; // seconds per revolution

// ─── HoldToSignButton ─────────────────────────────────────────────────────────
// Circular button with conic-gradient-based clockwise fill.
// Idle: a bright wedge traces the border clockwise.
// Hold: the wedge leaves sapphire fill behind as it sweeps.
// Release: fill retracts counterclockwise with rubber-band easing.

function HoldToSignButton({
  holdProgress,
  buttonState,
  isHolding,
  pulsing,
  sweepPaused,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  reducedMotion,
  isDesktop,
}: {
  holdProgress: number;
  buttonState: 'idle' | 'signing' | 'confirmed';
  isHolding: boolean;
  pulsing: boolean;
  sweepPaused: boolean;
  onPointerDown: () => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  reducedMotion: boolean;
  isDesktop: boolean;
}) {

  const isIdle = buttonState === 'idle' && !isHolding && holdProgress === 0 && !sweepPaused;


  // Compute the conic gradient for the current state
  const fillDegrees = holdProgress * 360;


  // Reduced-motion: static filled circle
  if (reducedMotion) {
    return (
      <motion.button
        className="relative select-none font-satoshi font-semibold flex items-center justify-center"
        style={{
          width: BUTTON_SIZE,
          height: BUTTON_SIZE,
          borderRadius: '50%',
          background: BRAND_BLUE,
          border: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
        onPointerDown={buttonState === 'idle' ? onPointerDown : undefined}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.35, duration: 0.4, ease: EASE_OUT_EXPO }}
      >
        <span className="relative z-10 text-sm text-white font-semibold">
          {buttonState === 'confirmed' ? (
            <Check className="w-5 h-5" />
          ) : buttonState === 'signing' ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            'Sign'
          )}
        </span>
      </motion.button>
    );
  }

  // Build the conic gradient string
  const buildGradient = () => {
    if (buttonState === 'confirmed') {
      return BRAND_BLUE;
    }

    if (buttonState === 'signing') {
      return BRAND_BLUE;
    }

    // Holding or retracting: filled arc + glowing leading edge
    if (isHolding || holdProgress > 0) {
      const fillEnd = fillDegrees;
      const glowStart = fillEnd;
      const glowEnd = Math.min(fillEnd + 12, 360);
      
      return `conic-gradient(from 0deg, ${BRAND_BLUE} 0deg, ${BRAND_BLUE} ${fillEnd}deg, rgba(100,160,255,0.6) ${glowStart}deg, rgba(100,160,255,0.6) ${glowEnd}deg, transparent ${glowEnd}deg, transparent 360deg)`;
    }

    // Idle: just a thin bright wedge tracing the border
    // This is handled by the CSS animation on the idle shimmer div
    return 'transparent';
  };

  return (
    <motion.button
      className="relative select-none font-satoshi font-semibold flex items-center justify-center"
      style={{
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        borderRadius: '50%',
        border: '1.5px solid rgba(255,255,255,0.10)',
        background: 'transparent',
        WebkitTapHighlightColor: 'transparent',
        overflow: isIdle ? 'visible' : 'hidden',
      }}
      onPointerDown={buttonState === 'idle' ? onPointerDown : undefined}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      whileTap={buttonState === 'idle' ? { scale: 0.94 } : undefined}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: 1,
        scale: pulsing ? [1, 1.06, 1] : 1,
      }}
      transition={{ delay: 0.35, duration: 0.4, ease: EASE_OUT_EXPO }}
    >
      {/* Idle shimmer — rotating bright wedge on the border ring ONLY */}
      {isIdle && (
        <motion.div
          className="absolute pointer-events-none"
          style={{
            // Position slightly outside to overlap the border
            inset: -1,
            borderRadius: '50%',
            background: `conic-gradient(from 0deg, transparent 0deg, transparent 340deg, rgba(100,160,255,0.40) 350deg, rgba(140,180,255,0.55) 355deg, rgba(100,160,255,0.40) 360deg)`,
            // Mask: punch out everything except the outer 2.5px ring
            mask: 'radial-gradient(circle at center, transparent 0%, transparent calc(50% - 3px), black calc(50% - 1.5px), black 50%, transparent calc(50% + 0.5px))',
            WebkitMask: 'radial-gradient(circle at center, transparent 0%, transparent calc(50% - 3px), black calc(50% - 1.5px), black 50%, transparent calc(50% + 0.5px))',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: IDLE_ROTATION_DURATION, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* Hold fill — conic gradient that grows clockwise */}
      {(isHolding || (holdProgress > 0 && buttonState === 'idle')) && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: '50%',
            background: buildGradient(),
          }}
          transition={
            isHolding
              ? { duration: 0 }
              : { duration: 0.3, ease: [0.25, 1, 0.5, 1] } // Rubber-band retract
          }
        />
      )}

      {/* Confirmed / signing full fill */}
      {(buttonState === 'confirmed' || buttonState === 'signing') && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: '50%',
            background: BRAND_BLUE,
          }}
          initial={{ opacity: 0.8 }}
          animate={{ opacity: 1 }}
        />
      )}

      {/* Label */}
      <span
        className="relative z-10 text-sm pointer-events-none select-none flex items-center justify-center"
        style={{
          color:
            isHolding || holdProgress > 0.3 || buttonState !== 'idle'
              ? 'rgba(255,255,255,0.95)'
              : 'rgba(255,255,255,0.25)',
          transition: 'color 0.15s ease',
        }}
      >
        {buttonState === 'confirmed' ? (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <Check className="w-5 h-5" />
          </motion.div>
        ) : buttonState === 'signing' ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <Loader2 className="w-5 h-5 animate-spin" />
          </motion.div>
        ) : isDesktop ? (
          <span className="flex flex-col items-center gap-0.5">
            <span>Sign</span>
            <CornerDownLeft className="w-3 h-3" style={{ opacity: isHolding ? 0.8 : 0.35 }} />
          </span>
        ) : (
          'Sign'
        )}
      </span>
    </motion.button>
  );
}

// ─── ConfirmScreen ────────────────────────────────────────────────────────────

export const ConfirmScreen = () => {
  const {
    address,
    ss58Address,
    qnsName: senderName,
    avatarUrl: senderAvatar,
    providerType,
  } = useWalletStore();

  const {
    phase,
    recipientName,
    recipientAddress,
    recipientAvatar,
    recipientAmountWei,
    burnAmountWei,
    totalRequiredWei,
    goBackToAmount,
    setBroadcasting,
    startAnimation,
    setConfirmation,
    setError,
  } = usePaymentStore();

  const [buttonState, setButtonState] = useState<'idle' | 'signing' | 'confirmed'>('idle');
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const [sweepPaused, setSweepPaused] = useState(false);

  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const impactHapticRef = useRef(false);
  const isHoldingRef = useRef(false);
  const holdProgressRef = useRef(0);
  const retractRafRef = useRef<number | null>(null);

  const reducedMotion = useReducedMotion();
  const isDesktop = useIsDesktop();
  const isBroadcasting = phase === 'broadcasting';

  // Keep refs in sync with state
  useEffect(() => { isHoldingRef.current = isHolding; }, [isHolding]);
  useEffect(() => { holdProgressRef.current = holdProgress; }, [holdProgress]);

  // ── handleConfirm ─────────────────────────────────────────────────────────
  const handleConfirm = useCallback(async () => {
    if (!recipientAddress || !address) {
      setError('Missing recipient or sender information');
      return;
    }

    setButtonState('signing');
    setBroadcasting();
    hapticMedium();

    try {
      let txHash: string;
      let confirmation: Promise<{ confirmed: boolean; error?: string }>;

      if (providerType === 'evm') {
        const { evmWriteContract } = await import('../utils/evmContractCall');
        const result = await evmWriteContract(
          QFPAY_ROUTER_ADDRESS,
          ROUTER_ABI,
          'send',
          [recipientAddress, recipientAmountWei],
          totalRequiredWei
        );
        txHash = result.txHash;
        confirmation = result.confirmation;
      } else {
        const result = await writeContract(
          QFPAY_ROUTER_ADDRESS,
          ROUTER_ABI,
          'send',
          [recipientAddress, recipientAmountWei],
          null,
          totalRequiredWei
        );
        txHash = result.txHash;
        confirmation = result.confirmation;
      }

      setButtonState('confirmed');
      playSignedSound();
      hapticSuccess();
      await new Promise((resolve) => setTimeout(resolve, 600)); // increased from 400 to 600 for breath

      startAnimation(txHash);

      const fallbackTimer = setTimeout(() => {
        setConfirmation(true);
      }, 3000);

      confirmation.then(({ confirmed, error }) => {
        clearTimeout(fallbackTimer);
        setConfirmation(confirmed, error);
      });
    } catch (err: unknown) {
      setButtonState('idle');
      const msg = (err as { message?: string })?.message || 'Transaction failed';

      if (isRetryableError(msg)) {
        showToast('warning', RETRY_MESSAGE_SHORT);
        goBackToAmount();
      } else if (msg.includes('not connected') || msg.includes('reconnect')) {
        showToast('error', 'Wallet connection lost. Please disconnect and reconnect.');
        goBackToAmount();
      } else if (msg.includes('switch MetaMask') || msg.includes('QF Network')) {
        showToast('error', 'Please switch MetaMask to QF Network.');
        goBackToAmount();
      } else {
        showToast('error', msg);
        goBackToAmount();
      }
    }
  }, [
    recipientAddress, address, providerType, recipientAmountWei,
    totalRequiredWei, setBroadcasting, startAnimation, setConfirmation,
    setError, goBackToAmount,
  ]);

  // ── Press-and-hold logic ──────────────────────────────────────────────────
  const startHold = useCallback(() => {
    if (buttonState !== 'idle') return;
    // Cancel any ongoing retract animation
    if (retractRafRef.current) {
      cancelAnimationFrame(retractRafRef.current);
      retractRafRef.current = null;
    }
    setIsHolding(true);
    impactHapticRef.current = false;
    hapticLight();

    let elapsed = 0;
    let lastTickAt = 0; // track last tick time for interval-based haptics

    holdTimerRef.current = setInterval(() => {
      elapsed += TICK_INTERVAL;
      const progress = Math.min(elapsed / HOLD_DURATION, 1);
      setHoldProgress(progress);

      // Rhythmic haptic ticks during hold — every 200ms
      if (elapsed - lastTickAt >= 200) {
        lastTickAt = elapsed;
        hapticTick();
      }

      // Stronger impact at 75%
      if (progress >= 0.75 && !impactHapticRef.current) {
        impactHapticRef.current = true;
        hapticMedium();
      }

      if (progress >= 1) {
        clearInterval(holdTimerRef.current!);
        holdTimerRef.current = null;
        setIsHolding(false);
        setHoldProgress(0);
        hapticMedium();
        handleConfirm();
      }
    }, TICK_INTERVAL);
  }, [buttonState, handleConfirm]);

  const cancelHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    const wasHolding = isHoldingRef.current;
    const hadProgress = holdProgressRef.current;

    setIsHolding(false);

    if (wasHolding && hadProgress > 0 && hadProgress < 1) {
      // Animate retract: progress decreases over 300ms with rubber-band easing
      const startProgress = hadProgress;
      const startTime = performance.now();
      const RETRACT_DURATION = 300;

      const retractTick = () => {
        const elapsed = performance.now() - startTime;
        const t = Math.min(elapsed / RETRACT_DURATION, 1);
        // Ease-out: fast start, gentle deceleration
        const eased = 1 - Math.pow(1 - t, 3);
        const current = startProgress * (1 - eased);

        setHoldProgress(current);

        if (t < 1) {
          retractRafRef.current = requestAnimationFrame(retractTick);
        } else {
          setHoldProgress(0);
          retractRafRef.current = null;
          // Pulse feedback
          setPulsing(true);
          setTimeout(() => setPulsing(false), 350);
          // Pause idle shimmer for 500ms
          setSweepPaused(true);
          setTimeout(() => setSweepPaused(false), 500);
        }
      };

      retractRafRef.current = requestAnimationFrame(retractTick);
    } else {
      setHoldProgress(0);
    }

    impactHapticRef.current = false;
  }, []); // No state deps — uses refs

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
      if (retractRafRef.current) cancelAnimationFrame(retractRafRef.current);
    };
  }, []);

  // ── Desktop Enter hold listener ─────────────────────────────────────────────
  useEffect(() => {
    if (!isDesktop) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && buttonState === 'idle' && !e.repeat) {
        e.preventDefault();
        startHold();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        cancelHold();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [isDesktop, buttonState, startHold, cancelHold]);

  // ── Escape key — go back ──────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && buttonState === 'idle') {
        e.preventDefault();
        hapticLight();
        goBackToAmount();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [buttonState, goBackToAmount]);

  // ── First-visit teaching demo ─────────────────────────────────────────────
  useEffect(() => {
    const taught = sessionStorage.getItem('qfpay-send-taught');
    if (taught || buttonState !== 'idle') return;
    sessionStorage.setItem('qfpay-send-taught', 'true');
    let elapsed = 0;
    const target = HOLD_DURATION * 0.55;
    const up = setInterval(() => {
      elapsed += TICK_INTERVAL;
      setHoldProgress(Math.min(elapsed / HOLD_DURATION, 0.55));
      if (elapsed >= target) {
        clearInterval(up);
        // Retract demo
        const startProgress = 0.55;
        const startTime = performance.now();
        const tick = () => {
          const e = performance.now() - startTime;
          const t = Math.min(e / 400, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          setHoldProgress(startProgress * (1 - eased));
          if (t < 1) {
            requestAnimationFrame(tick);
          } else {
            setHoldProgress(0);
          }
        };
        requestAnimationFrame(tick);
      }
    }, TICK_INTERVAL);
    return () => clearInterval(up);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <motion.div
      className="flex flex-col items-center h-[100svh] overflow-hidden px-6"
      style={{ paddingTop: '12vh' }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
    >
      {/* Back chevron — hidden during broadcasting */}
      <AnimatePresence>
        {!isBroadcasting && (
          <motion.button
            className="fixed top-5 left-5 z-50 focus-ring"
            style={{ color: 'rgba(255,255,255,0.25)' }}
            onClick={() => {
              hapticLight();
              goBackToAmount();
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Back"
          >
            <ChevronLeft className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Sapphire Card ── */}
      <motion.div
        className="relative w-full flex flex-col items-center"
        style={{
          maxWidth: 380,
          background: 'linear-gradient(to bottom, rgba(0,64,255,0.10) 0%, rgba(0,64,255,0.04) 40%, rgba(6,10,20,0.95) 100%)',
          borderTop: '1px solid rgba(0,64,255,0.28)',
          borderLeft: '1px solid rgba(0,64,255,0.16)',
          borderRight: '1px solid rgba(0,64,255,0.16)',
          borderBottom: '1px solid rgba(0,64,255,0.06)',
          borderRadius: 24,
          padding: '44px 24px 40px',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,64,255,0.10), 0 2px 12px rgba(0,64,255,0.07), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.45, ease: EASE_OUT_EXPO }}
      >
        {/* Diagonal shimmer sweep — sapphire, adapted from QNS pricing cards */}
        {!reducedMotion && (
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none z-0 confirm-card-shimmer"
          />
        )}

        {/* Recipient avatar — 56px, shared layoutId */}
        <motion.div layoutId="recipient-avatar" className="relative z-10 mb-3">
          <AvatarFallback
            name={recipientName}
            address={recipientAddress}
            avatarUrl={recipientAvatar}
            size={56}
            borderColor="rgba(255,255,255,0.12)"
          />
        </motion.div>

        {/* Recipient name.qf */}
        <motion.p
          className="relative z-10 font-satoshi font-medium text-sm mb-8"
          style={{ color: 'rgba(255,255,255,0.70)' }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35, ease: EASE_OUT_EXPO }}
        >
          {recipientName ? (
            <>
              <span>{recipientName}</span>
              <span style={{ color: `${BRAND_BLUE}d9` }}>.qf</span>
            </>
          ) : (
            truncateAddress(recipientAddress || '')
          )}
        </motion.p>

        {/* Hero amount */}
        <motion.div
          className="relative z-10 flex items-baseline justify-center gap-2 mb-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4, ease: EASE_OUT_EXPO }}
        >
          <span
            className="font-clash font-bold selectable"
            style={{
              fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
              letterSpacing: '-0.02em',
              color: 'rgba(255,255,255,0.95)',
            }}
          >
            {formatQF(recipientAmountWei)}
          </span>
          <span
            className="font-clash font-bold"
            style={{
              fontSize: 'clamp(1.25rem, 3vw, 2rem)',
              color: `${BRAND_BLUE}cc`,
            }}
          >
            QF
          </span>
        </motion.div>

        {/* Footnotes — inside card */}
        <motion.div
          className="relative z-10 flex flex-col items-center gap-1 mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          <span
            className="font-satoshi text-[13px] selectable"
            style={{ color: 'rgba(255,255,255,0.30)' }}
          >
            {formatQF(totalRequiredWei)} QF leaves your wallet
          </span>
          <span
            className="font-satoshi text-[13px]"
            style={{ color: `${BURN_CRIMSON}80` }}
          >
            🔥 {formatQF(burnAmountWei)} QF burns
          </span>
        </motion.div>
      </motion.div>

      {/* ── Circular HoldToSign button — below the card ── */}
      <div className="mt-12">
        <HoldToSignButton
          holdProgress={holdProgress}
          buttonState={buttonState}
          isHolding={isHolding}
          pulsing={pulsing}
          sweepPaused={sweepPaused}
          onPointerDown={startHold}
          onPointerUp={cancelHold}
          onPointerLeave={cancelHold}
          reducedMotion={reducedMotion}
          isDesktop={isDesktop}
        />
      </div>

      {/* Shimmer keyframe — CSS animation, not Framer, for performance */}
      <style>{`
        @keyframes confirmShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .confirm-card-shimmer {
          background: linear-gradient(
            110deg,
            transparent 20%,
            rgba(0,64,255,0.05) 40%,
            rgba(0,64,255,0.10) 50%,
            rgba(0,64,255,0.05) 60%,
            transparent 80%
          );
          background-size: 200% 100%;
          animation: confirmShimmer 5.5s infinite;
        }
      `}</style>
    </motion.div>
  );
};
