// src/components/AnimationSequence.tsx
// Three-act payment ceremony: Burn → Send → Success
// Uses useAnimate for sequential orchestration — no setTimeout chains.

import { useAnimate, motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { usePaymentStore } from '../stores/paymentStore';
import { useWalletStore } from '../stores/walletStore';
import { formatQF } from '../utils/qfpay';
import { hapticBurn, hapticSuccess, hapticLight } from '../utils/haptics';
import { playBurnSound, playSendSound, playSuccessSound } from '../utils/sounds';
import { EASE_OUT_EXPO } from '../lib/animations';
import { BRAND_BLUE, BURN_CRIMSON, SUCCESS_GREEN, BG_PRIMARY } from '../lib/colors';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { AvatarFallback } from './AvatarFallback';
import { Share2, Flame, Send, PowerOff } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const BURN_BG = '#0F0608';
const SEND_BG = BG_PRIMARY;
const SUCCESS_BG = BRAND_BLUE;
const SETTLED_BG = '#080D1A';

// Timing (ms) — let each act breathe
const BURN_FADE_IN = 400;
const BURN_AMOUNT_IN = 500;
const BURN_HOLD = 1200;
const BURN_DISSOLVE = 500;
const EMBER_DRIFT = 600;
const INTER_ACT_PAUSE = 300;

const SEND_FADE_IN = 400;
const SEND_AMOUNT_IN = 500;
const SEND_HOLD = 1100;
const SEND_DISSOLVE = 400;

const SUCCESS_CHECKMARK_DRAW = 500;
const SUCCESS_RIPPLE_EXPAND = 600;
const SUCCESS_SAPPHIRE_HOLD = 1200;
const SUCCESS_BG_COOL = 1000;
const SUCCESS_CHECKMARK_LIFT = 500;

const ACTION_BUTTON_SIZE = 48;

// ─── AnimationSequence ────────────────────────────────────────────────────────

export const AnimationSequence = () => {
  const [scope, animate] = useAnimate();
  const reducedMotion = useReducedMotion();

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

  const { qnsName: senderName, disconnect } = useWalletStore();

  // ── Derived values ──
  const displayRecipient = recipientName
    ? `${recipientName}.qf` 
    : recipientAddress
      ? recipientAddress.slice(0, 8) + '...' + recipientAddress.slice(-4)
      : '?';

  const [receiptTime, setReceiptTime] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const sequenceRunRef = useRef<{ burn: boolean; sending: boolean; success: boolean }>({
    burn: false, sending: false, success: false,
  });

  // ── BURN PHASE ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'burn' || sequenceRunRef.current.burn) return;
    sequenceRunRef.current.burn = true;

    if (reducedMotion) {
      setTimeout(advanceToSending, 300);
      return;
    }

    const run = async () => {
      try {
        // Fade in background to crimson
        await animate(scope.current, { backgroundColor: BURN_BG }, { duration: BURN_FADE_IN / 1000, ease: EASE_OUT_EXPO as any });

        // Scale in burn amount
        await animate('[data-id="burn-amount"]', {
          opacity: 1,
          scale: 1,
          filter: 'blur(0px)',
        }, { duration: BURN_AMOUNT_IN / 1000, ease: EASE_OUT_EXPO as any });

        // Sound + haptic at peak visibility
        playBurnSound();
        hapticBurn();

        // Hold — let it sit
        await animate('[data-id="burn-amount"]', { opacity: 1 }, { duration: BURN_HOLD / 1000 });

        // Fire ember dots (don't await — fire and forget)
        animate('[data-id="ember-1"]', { opacity: [0.6, 0], y: [0, -36], x: [0, -8] }, { duration: EMBER_DRIFT / 1000, ease: 'easeOut' });
        animate('[data-id="ember-2"]', { opacity: [0.5, 0], y: [0, -44], x: [0, 6] }, { duration: EMBER_DRIFT / 1000, ease: 'easeOut', delay: 0.08 });
        animate('[data-id="ember-3"]', { opacity: [0.4, 0], y: [0, -30], x: [0, 12] }, { duration: EMBER_DRIFT / 1000, ease: 'easeOut', delay: 0.15 });

        // Dissolve burn amount — upward drift + fade
        await animate('[data-id="burn-amount"]', {
          opacity: 0,
          y: -24,
        }, { duration: BURN_DISSOLVE / 1000, ease: EASE_OUT_EXPO as any });

        // Pause between acts — silence
        await animate(scope.current, { backgroundColor: BURN_BG }, { duration: INTER_ACT_PAUSE / 1000 });

        // Advance to sending
        advanceToSending();
      } catch {
        // Animation interrupted (component unmounted) — safe to ignore
      }
    };

    run();
  }, [phase, reducedMotion, animate, scope, advanceToSending]);

  // ── SENDING PHASE ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'sending' || sequenceRunRef.current.sending) return;
    sequenceRunRef.current.sending = true;

    if (reducedMotion) {
      setTimeout(advanceToSuccess, 300);
      return;
    }

    const run = async () => {
      try {
        // Cool background from crimson to sapphire-dark
        await animate(scope.current, { backgroundColor: SEND_BG }, { duration: SEND_FADE_IN / 1000, ease: EASE_OUT_EXPO as any });

        // Scale in send amount
        await animate('[data-id="send-amount"]', {
          opacity: 1,
          scale: 1,
          filter: 'blur(0px)',
        }, { duration: SEND_AMOUNT_IN / 1000, ease: EASE_OUT_EXPO as any });

        // Sound
        playSendSound();

        // Hold
        await animate('[data-id="send-amount"]', { opacity: 1 }, { duration: SEND_HOLD / 1000 });

        // Clean dissolve — upward drift + fade (no particles, directional)
        await animate('[data-id="send-amount"]', {
          opacity: 0,
          y: -20,
        }, { duration: SEND_DISSOLVE / 1000, ease: EASE_OUT_EXPO as any });

        // Advance to success
        advanceToSuccess();
      } catch {
        // Animation interrupted
      }
    };

    run();
  }, [phase, reducedMotion, animate, scope, advanceToSuccess]);

  // ── SUCCESS PHASE ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'success' || sequenceRunRef.current.success) return;
    sequenceRunRef.current.success = true;

    playSuccessSound();
    hapticSuccess();
    setReceiptTime(new Date().toLocaleTimeString());

    if (reducedMotion) {
      setShowSuccess(true);
      return;
    }

    const run = async () => {
      try {
        // 1. Draw checkmark center-screen (on dark bg still)
        await animate('[data-id="success-check"]', {
          opacity: 1,
          scale: 1,
        }, { duration: SUCCESS_CHECKMARK_DRAW / 1000, type: 'spring' as any, stiffness: 260, damping: 25 });

        // Draw the SVG path
        animate('[data-id="check-path"]', { pathLength: 1 }, { duration: 0.4, ease: EASE_OUT_EXPO as any });

        // 2. Sapphire ripple expands from center via clip-path
        await animate('[data-id="sapphire-ripple"]', {
          clipPath: 'circle(80% at 50% 50%)',
        }, { duration: SUCCESS_RIPPLE_EXPAND / 1000, ease: EASE_OUT_EXPO as any });

        // 3. Hold — pure sapphire + checkmark, nothing else
        await animate('[data-id="sapphire-ripple"]', { opacity: 1 }, { duration: SUCCESS_SAPPHIRE_HOLD / 1000 });

        // 4. Cool background: fade the ripple overlay out to reveal settled bg underneath
        animate(scope.current, { backgroundColor: SETTLED_BG }, { duration: 0.01 });
        await animate('[data-id="sapphire-ripple"]', {
          opacity: 0,
        }, { duration: SUCCESS_BG_COOL / 1000, ease: 'easeOut' });

        // 5. Lift checkmark to upper zone
        await animate('[data-id="success-check"]', {
          y: '-35vh',
        }, { duration: SUCCESS_CHECKMARK_LIFT / 1000, ease: EASE_OUT_EXPO as any });

        // 6. Reveal success content
        setShowSuccess(true);
      } catch {
        setShowSuccess(true);
      }
    };

    run();
  }, [phase, reducedMotion, animate, scope]);

  // ── Reduced motion: static success ──
  if (reducedMotion && phase === 'success') {
    return (
      <div
        className="flex flex-col items-center justify-center h-[100svh] overflow-hidden px-6"
        style={{ background: SETTLED_BG }}
      >
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" className="mb-6">
          <path d="M14 28L24 38L42 18" stroke="white" strokeWidth="3"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="flex items-center gap-4 mt-8">
          <button
            className="flex flex-col items-center gap-2 select-none"
            onClick={reset}
          >
            <div
              className="flex items-center justify-center"
              style={{
                width: ACTION_BUTTON_SIZE,
                height: ACTION_BUTTON_SIZE,
                borderRadius: '50%',
                background: BRAND_BLUE,
              }}
            >
              <Send className="w-5 h-5 text-white" />
            </div>
            <span className="font-satoshi text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Send again
            </span>
          </button>
          <button
            className="flex flex-col items-center gap-2 select-none"
            onClick={() => { hapticLight(); disconnect(); }}
          >
            <div
              className="flex items-center justify-center"
              style={{
                width: ACTION_BUTTON_SIZE,
                height: ACTION_BUTTON_SIZE,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.95)',
              }}
            >
              <PowerOff className="w-5 h-5" style={{ color: BURN_CRIMSON }} />
            </div>
            <span className="font-satoshi text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Disconnect
            </span>
          </button>
        </div>
      </div>
    );
  }

  // ─── Main Render ────────────────────────────────────────────────────────────

  return (
    <div
      ref={scope}
      className="relative flex flex-col items-center justify-center h-[100svh] overflow-hidden px-6"
      style={{ backgroundColor: BG_PRIMARY }}
    >

      {/* ══════════════════════════════════════════════════════════════════════
          ACT 1 — BURN
          Center-screen: burn amount in amber/crimson
          ══════════════════════════════════════════════════════════════════════ */}
      <div
        data-id="burn-amount"
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
        style={{ opacity: 0, scale: 0.85, filter: 'blur(8px)' }}
      >
        <span
          className="font-clash font-bold"
          style={{
            fontSize: 'clamp(2.5rem, 10vw, 5rem)',
            letterSpacing: '-0.02em',
            color: '#F59E0B',
          }}
        >
          {formatQF(burnAmountWei)}
        </span>
        <span
          className="font-satoshi font-medium mt-2 inline-flex items-center gap-1.5"
          style={{
            fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)',
            color: `${BURN_CRIMSON}cc`,
          }}
        >
          <Flame className="w-4 h-4" style={{ color: BURN_CRIMSON }} />
          QF burned forever
        </span>

        {/* Ember dots — positioned relative to the amount, start invisible */}
        <div className="relative" style={{ width: 0, height: 0 }}>
          <div data-id="ember-1" className="absolute rounded-full" style={{ width: 4, height: 4, background: '#F59E0B', opacity: 0, top: -20, left: -16 }} />
          <div data-id="ember-2" className="absolute rounded-full" style={{ width: 3, height: 3, background: '#EF4444', opacity: 0, top: -16, left: 8 }} />
          <div data-id="ember-3" className="absolute rounded-full" style={{ width: 3, height: 3, background: '#F59E0B', opacity: 0, top: -24, left: 20 }} />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ACT 2 — SEND
          Center-screen: sent amount in white/sapphire
          ══════════════════════════════════════════════════════════════════════ */}
      <div
        data-id="send-amount"
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
        style={{ opacity: 0, scale: 0.9, filter: 'blur(8px)' }}
      >
        <span
          className="font-clash font-bold"
          style={{
            fontSize: 'clamp(2.5rem, 10vw, 5rem)',
            letterSpacing: '-0.02em',
            color: 'rgba(255,255,255,0.95)',
          }}
        >
          {formatQF(recipientAmountWei)}
        </span>
        <span
          className="font-satoshi font-medium mt-2"
          style={{
            fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)',
            color: `${BRAND_BLUE}aa`,
          }}
        >
          QF sent
        </span>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ACT 3 — SUCCESS
          Checkmark draws center, sapphire ripple, lifts up.
          Receipt + actions appear below.
          ══════════════════════════════════════════════════════════════════════ */}

      {/* Sapphire ripple overlay — clip-path expands from center */}
      <div
        data-id="sapphire-ripple"
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          backgroundColor: SUCCESS_BG,
          clipPath: 'circle(0% at 50% 50%)',
        }}
      />

      {/* Checkmark — always in DOM, starts invisible, sits above ripple */}
      <div
        data-id="success-check"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
        style={{ opacity: 0, scale: 0.6 }}
      >
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <motion.path
            data-id="check-path"
            d="M16 32L27 43L48 20"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            style={{ pathLength: 0 }}
          />
        </svg>
      </div>

      {/* Success content — receipt, actions, status. Mounts after checkmark lifts. */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            key="success-content"
            className="flex flex-col items-center text-center relative z-10 w-full px-4"
            style={{ paddingTop: '20vh' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: EASE_OUT_EXPO as any }}
          >

            {/* ── Receipt Card ── */}
            <motion.div
              className="relative w-full max-w-sm mx-auto mb-6 selectable"
              style={{
                background: 'rgba(0,64,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 20,
                padding: '24px 20px 20px',
              }}
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.1,
                type: 'spring',
                stiffness: 200,
                damping: 24,
              }}
            >
              {/* Share button — top right */}
              <motion.button
                className="absolute top-4 right-4 flex-shrink-0"
                style={{ color: 'rgba(255,255,255,0.25)' }}
                whileTap={{ scale: 0.85 }}
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
                <Share2 className="w-4 h-4" />
              </motion.button>

              {/* Recipient avatar — centered, hero of the receipt */}
              <div className="flex justify-center mb-3">
                <AvatarFallback
                  name={recipientName}
                  address={recipientAddress}
                  avatarUrl={recipientAvatar}
                  size={48}
                  borderColor="rgba(255,255,255,0.10)"
                />
              </div>

              {/* Recipient name */}
              <p className="font-satoshi font-medium text-sm text-center mb-5" style={{ color: 'rgba(255,255,255,0.70)' }}>
                {recipientName ? (
                  <>
                    <span>{recipientName}</span>
                    <span style={{ color: `${BRAND_BLUE}d9` }}>.qf</span>
                  </>
                ) : displayRecipient}
              </p>

              {/* Sent amount — the hero of the card */}
              <div className="flex items-baseline justify-center gap-2 mb-5">
                <span
                  className="font-clash font-bold"
                  style={{ fontSize: 28, letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.90)' }}
                >
                  {formatQF(recipientAmountWei)}
                </span>
                <span
                  className="font-clash font-bold"
                  style={{ fontSize: 16, color: `${BRAND_BLUE}cc` }}
                >
                  QF
                </span>
              </div>

              {/* Metadata lines */}
              <div className="flex flex-col items-center gap-1">
                <span className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  from {senderName ? (
                    <>{senderName}<span style={{ color: `${BRAND_BLUE}99` }}>.qf</span></>
                  ) : 'you'}
                </span>
                <span className="font-mono text-xs inline-flex items-center gap-1" style={{ color: `${BURN_CRIMSON}99` }}>
                  <Flame className="w-3 h-3" style={{ color: BURN_CRIMSON }} />
                  {formatQF(burnAmountWei)} QF burned
                </span>
              </div>

              {/* Timestamp */}
              <p className="font-mono mt-3 text-center" style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)' }}>
                {receiptTime}
              </p>
            </motion.div>

            {/* Action buttons — round icon buttons side by side */}
            <motion.div
              className="flex items-start gap-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4, ease: EASE_OUT_EXPO as any }}
            >
              {/* Send again */}
              <motion.button
                className="flex flex-col items-center gap-2 select-none"
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  hapticLight();
                  reset();
                }}
              >
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: ACTION_BUTTON_SIZE,
                    height: ACTION_BUTTON_SIZE,
                    borderRadius: '50%',
                    background: BRAND_BLUE,
                  }}
                >
                  <Send className="w-5 h-5 text-white" />
                </div>
                <span className="font-satoshi text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Send again
                </span>
              </motion.button>

              {/* Disconnect */}
              <motion.button
                className="flex flex-col items-center gap-2 select-none"
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  hapticLight();
                  disconnect();
                }}
              >
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: ACTION_BUTTON_SIZE,
                    height: ACTION_BUTTON_SIZE,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.95)',
                  }}
                >
                  <PowerOff className="w-5 h-5" style={{ color: BURN_CRIMSON }} />
                </div>
                <span className="font-satoshi text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Disconnect
                </span>
              </motion.button>
            </motion.div>

            {/* On-chain confirmation status */}
            <motion.div
              className="mt-5 flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
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
    </div>
  );
};
