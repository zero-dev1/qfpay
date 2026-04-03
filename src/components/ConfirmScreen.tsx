import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check, CornerDownLeft } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useWalletStore } from '../stores/walletStore';
import { usePaymentStore } from '../stores/paymentStore';
import { formatQF, truncateAddress } from '../utils/qfpay';
import { writeContract } from '../utils/contractCall';
import { QFPAY_ROUTER_ADDRESS, ROUTER_ABI } from '../config/contracts';
import { isRetryableError, RETRY_MESSAGE_SHORT } from '../utils/errorHelpers';
import { showToast } from './Toast';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { EASE_OUT_EXPO } from '../lib/animations';
import { BRAND_BLUE, BURN_CRIMSON } from '../lib/colors';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useIsDesktop } from '../hooks/useIsDesktop';

// ─── HoldToSendButton — extracted as standalone to prevent re-mount on parent re-render ───

function HoldToSendButton({
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

  // Reduced-motion: static filled button
  if (reducedMotion) {
    return (
      <motion.button
        className="relative select-none font-satoshi font-semibold"
        style={{
          width: 'clamp(260px, 80%, 320px)',
          height: 56,
          borderRadius: 9999,
          background: BRAND_BLUE,
          border: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
        onPointerDown={buttonState === 'idle' ? onPointerDown : undefined}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4, ease: EASE_OUT_EXPO }}
      >
        <span className="relative z-10 text-base text-white">
          {buttonState === 'confirmed' ? (
            <Check className="w-5 h-5 inline" />
          ) : buttonState === 'signing' ? (
            <Loader2 className="w-5 h-5 inline animate-spin" />
          ) : isDesktop ? (
            <span className="inline-flex items-center gap-2">
              Send
              <CornerDownLeft className="w-3.5 h-3.5 opacity-50" />
            </span>
          ) : (
            'Send'
          )}
        </span>
      </motion.button>
    );
  }

  return (
    <motion.button
      className="relative overflow-hidden select-none font-satoshi font-semibold"
      style={{
        width: 'clamp(260px, 80%, 320px)',
        height: 56,
        borderRadius: 9999,
        border: '1px solid rgba(255,255,255,0.10)',
        background: 'transparent',
        WebkitTapHighlightColor: 'transparent',
      }}
      onPointerDown={buttonState === 'idle' ? onPointerDown : undefined}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      whileTap={buttonState === 'idle' ? { scale: 0.97 } : undefined}
      initial={{ opacity: 0, y: 12 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: pulsing ? [1, 1.03, 1] : 1,
      }}
      transition={{ delay: 0.35, duration: 0.4, ease: EASE_OUT_EXPO }}
    >
      {/* Idle shimmer border — subtle rotating glow on the edge */}
      {isIdle && (
        <div
          className="absolute -inset-[1px] pointer-events-none"
          style={{ borderRadius: 9999, overflow: 'hidden' }}
        >
          <motion.div
            className="w-full h-full"
            style={{
              background:
                'conic-gradient(from 0deg, rgba(0,64,255,0.02) 0%, rgba(100,160,255,0.3) 8%, rgba(0,64,255,0.02) 16%, rgba(0,64,255,0.02) 100%)',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      )}

      {/* Idle sweep fill — dissolves at end of cycle */}
      {isIdle && (
        <motion.div
          className="absolute inset-0"
          style={{ background: BRAND_BLUE, borderRadius: 9999 }}
          animate={{
            x: ['-100%', '0%', '0%'],
            opacity: [0, 0.7, 0],
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: 'easeInOut',
            times: [0, 0.65, 1],
            repeatDelay: 0.8,
          }}
        />
      )}

      {/* Active hold fill */}
      {(isHolding || (holdProgress > 0 && buttonState === 'idle')) && (
        <motion.div
          className="absolute inset-0"
          style={{ background: BRAND_BLUE, borderRadius: 9999 }}
          animate={{
            x: `${-100 + holdProgress * 100}%`,
          }}
          transition={
            isHolding
              ? { duration: 0 }
              : { duration: 0.3, ease: [0.25, 1, 0.5, 1] }
          }
        />
      )}

      {/* Confirmed state fill */}
      {buttonState === 'confirmed' && (
        <motion.div
          className="absolute inset-0"
          style={{ background: BRAND_BLUE, borderRadius: 9999 }}
          initial={{ opacity: 0.8 }}
          animate={{ opacity: 1 }}
        />
      )}

      {/* Signing spinner overlay */}
      {buttonState === 'signing' && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: BRAND_BLUE, borderRadius: 9999 }}
        >
          <Loader2 className="w-5 h-5 text-white animate-spin" />
        </motion.div>
      )}

      {/* Label — base layer at 25% always visible */}
      <span
        className="relative z-10 text-base pointer-events-none"
        style={{
          color:
            isHolding || buttonState !== 'idle'
              ? 'rgba(255,255,255,0.95)'
              : 'rgba(255,255,255,0.25)',
          transition: 'color 0.15s ease',
        }}
      >
        {buttonState === 'confirmed' ? (
          <Check className="w-5 h-5 inline" />
        ) : buttonState === 'signing' ? (
          ''
        ) : isDesktop ? (
          <span className="inline-flex items-center gap-2">
            Send
            <CornerDownLeft
              className="w-3.5 h-3.5"
              style={{
                opacity: isHolding ? 0.8 : 0.4,
                transition: 'opacity 0.15s ease',
              }}
            />
          </span>
        ) : (
          'Send'
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
  const halfwayHapticRef = useRef(false);
  const isHoldingRef = useRef(false);
  const holdProgressRef = useRef(0);

  const reducedMotion = useReducedMotion();
  const isDesktop = useIsDesktop();
  const isBroadcasting = phase === 'broadcasting';
  const HOLD_DURATION = 1200;
  const TICK_INTERVAL = 16;

  // Keep refs in sync with state
  useEffect(() => {
    isHoldingRef.current = isHolding;
  }, [isHolding]);
  useEffect(() => {
    holdProgressRef.current = holdProgress;
  }, [holdProgress]);

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
      await new Promise((resolve) => setTimeout(resolve, 400));

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

  // ── Press-and-hold logic — refs prevent dependency thrashing ──────────────
  const startHold = useCallback(() => {
    if (buttonState !== 'idle') return;
    setIsHolding(true);
    halfwayHapticRef.current = false;
    hapticLight();
    let elapsed = 0;
    holdTimerRef.current = setInterval(() => {
      elapsed += TICK_INTERVAL;
      const progress = Math.min(elapsed / HOLD_DURATION, 1);
      setHoldProgress(progress);
      if (progress >= 0.5 && !halfwayHapticRef.current) {
        halfwayHapticRef.current = true;
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
    // Pulse once if released early
    if (isHoldingRef.current && holdProgressRef.current > 0 && holdProgressRef.current < 1) {
      setPulsing(true);
      setTimeout(() => setPulsing(false), 350);
      // Pause sweep for 500ms after release
      setSweepPaused(true);
      setTimeout(() => setSweepPaused(false), 500);
    }
    setIsHolding(false);
    setHoldProgress(0);
    halfwayHapticRef.current = false;
  }, []); // No state deps — uses refs

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
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
    const target = HOLD_DURATION * 0.6;
    const up = setInterval(() => {
      elapsed += TICK_INTERVAL;
      setHoldProgress(Math.min(elapsed / HOLD_DURATION, 0.6));
      if (elapsed >= target) {
        clearInterval(up);
        const down = setInterval(() => {
          setHoldProgress((prev) => {
            const next = prev - 0.04;
            if (next <= 0) {
              clearInterval(down);
              return 0;
            }
            return next;
          });
        }, TICK_INTERVAL);
      }
    }, TICK_INTERVAL);
    return () => clearInterval(up);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <motion.div
      className="flex flex-col items-center justify-center h-[100svh] overflow-hidden px-6"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
    >
      {/* Back chevron — hidden during broadcasting */}
      <AnimatePresence>
        {!isBroadcasting && (
          <motion.button
            className="fixed top-5 left-5 z-50 transition-opacity hover:opacity-60 focus-ring"
            style={{ fontSize: '1.75rem', lineHeight: 1, color: 'rgba(255,255,255,0.25)' }}
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
            ‹
          </motion.button>
        )}
      </AnimatePresence>

      {/* Recipient avatar — 56px, shared layoutId */}
      <motion.div layoutId="recipient-avatar" className="mb-3">
        {recipientAvatar ? (
          <img
            src={recipientAvatar}
            alt={recipientName || 'Recipient'}
            className="rounded-full object-cover"
            style={{
              width: 56,
              height: 56,
              border: '1.5px solid rgba(255,255,255,0.15)',
            }}
          />
        ) : (
          <div
            className="rounded-full flex items-center justify-center"
            style={{
              width: 56,
              height: 56,
              background:
                'linear-gradient(135deg, rgba(0,64,255,0.25), rgba(0,64,255,0.08))',
              border: '1.5px solid rgba(255,255,255,0.12)',
            }}
          >
            <span className="font-clash font-bold text-lg text-white">
              {(recipientName || '?')[0].toUpperCase()}
            </span>
          </div>
        )}
      </motion.div>

      {/* Recipient name.qf */}
      <motion.p
        className="font-satoshi font-medium text-sm mb-6"
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
        className="flex items-baseline justify-center gap-2 mb-4"
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

      {/* Sapphire underline */}
      <motion.div
        style={{
          width: 'clamp(200px, 60%, 360px)',
          height: 2,
          borderRadius: 1,
          backgroundColor: BRAND_BLUE,
        }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.2, duration: 0.4, ease: EASE_OUT_EXPO }}
      />

      {/* Footnotes */}
      <motion.div
        className="flex flex-col items-center gap-1 mt-4 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <span
          className="font-satoshi text-[13px] selectable"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          {formatQF(totalRequiredWei)} QF leaves your wallet
        </span>
        <span
          className="font-satoshi text-[13px]"
          style={{ color: `${BURN_CRIMSON}99` }}
        >
          🔥 {formatQF(burnAmountWei)} QF burns
        </span>
      </motion.div>

      {/* HoldToSendButton */}
      <HoldToSendButton
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
    </motion.div>
  );
};
