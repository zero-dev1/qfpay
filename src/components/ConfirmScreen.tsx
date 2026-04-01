import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useWalletStore } from '../stores/walletStore';
import { usePaymentStore } from '../stores/paymentStore';
import { formatQF } from '../utils/qfpay';
import { writeContract } from '../utils/contractCall';
import { QFPAY_ROUTER_ADDRESS, ROUTER_ABI } from '../config/contracts';
import { isRetryableError, RETRY_MESSAGE_SHORT } from '../utils/errorHelpers';
import { showToast } from './Toast';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { EASE_OUT_EXPO } from '../lib/animations';
import { BG_SURFACE, BRAND_BLUE, BURN_CRIMSON } from '../lib/colors';

// ─── Pill helper ─────────────────────────────────────────────────────────────

function ReviewPill({
  avatarUrl, name, fallbackAddress, amountLabel, verb,
}: {
  avatarUrl: string | null;
  name: string | null;
  fallbackAddress: string | null;
  amountLabel: string;
  verb: string;
}) {
  const displayName = name
    || (fallbackAddress
      ? fallbackAddress.slice(0, 8) + '...' + fallbackAddress.slice(-4)
      : '?');
  const initial = name
    ? name[0].toUpperCase()
    : fallbackAddress
      ? fallbackAddress.slice(2, 4).toUpperCase()
      : '?';

  return (
    <div
      className="inline-flex items-center gap-3"
      style={{
        background: BG_SURFACE,
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 9999,
        padding: '10px 20px 10px 10px',
      }}
    >
      {/* Avatar — 40px */}
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName}
          className="rounded-full object-cover flex-shrink-0"
          style={{ width: 40, height: 40, border: '1px solid rgba(255,255,255,0.15)' }}
        />
      ) : (
        <div
          className="rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            width: 40, height: 40,
            background: 'linear-gradient(135deg, rgba(0,64,255,0.25), rgba(0,64,255,0.08))',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <span className="font-clash font-bold text-sm text-white">{initial}</span>
        </div>
      )}

      {/* name.qf */}
      <span className="font-satoshi font-medium text-sm flex-shrink-0" style={{ color: 'rgba(255,255,255,0.90)' }}>
        {name
          ? <>{name}<span style={{ color: `${BRAND_BLUE}d9` }}>.qf</span></>
          : displayName}
      </span>

      {/* Square separator dot */}
      <div style={{
        width: 4, height: 4, borderRadius: 1,
        background: 'rgba(255,255,255,0.25)',
        flexShrink: 0,
      }} />

      {/* Amount · verb — JetBrains Mono */}
      <span className="font-mono text-sm" style={{ color: 'rgba(255,255,255,0.70)' }}>
        {amountLabel}{' '}
        <span style={{ color: 'rgba(255,255,255,0.30)' }}>{verb}</span>
      </span>
    </div>
  );
}

const Divider = () => (
  <div className="flex justify-center my-3">
    <div style={{ width: 2, height: 32, borderRadius: 1, background: 'rgba(255,255,255,0.08)' }} />
  </div>
);

// ─── ConfirmScreen ────────────────────────────────────────────────────────────

export const ConfirmScreen = () => {
  const {
    address, ss58Address,
    qnsName: senderName,
    avatarUrl: senderAvatar,
    providerType,
  } = useWalletStore();

  const {
    phase,
    recipientName, recipientAddress, recipientAvatar,
    recipientAmountWei, burnAmountWei, totalRequiredWei,
    goBackToAmount, setBroadcasting, startAnimation, setConfirmation, setError,
  } = usePaymentStore();

  const [buttonState,  setButtonState]  = useState<'idle' | 'signing' | 'confirmed'>('idle');
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding,    setIsHolding]    = useState(false);
  const [pulsing,      setPulsing]      = useState(false);

  const holdTimerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const halfwayHapticRef   = useRef(false);

  const isBroadcasting = phase === 'broadcasting';
  const HOLD_DURATION  = 800;
  const TICK_INTERVAL  = 16;

  // ── handleConfirm — copied verbatim ─────────────────────────────────────────
  const handleConfirm = async () => {
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
  };

  // ── Press-and-hold logic — copied verbatim ──────────────────────────────────
  const startHold = () => {
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
  };

  const cancelHold = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    // Pulse once if released early (before completion)
    if (isHolding && holdProgress > 0 && holdProgress < 1) {
      setPulsing(true);
      setTimeout(() => setPulsing(false), 350);
    }
    setIsHolding(false);
    setHoldProgress(0);
    halfwayHapticRef.current = false;
  };

  useEffect(() => {
    return () => { if (holdTimerRef.current) clearInterval(holdTimerRef.current); };
  }, []);

  // ── First-visit teaching demo — copied verbatim ─────────────────────────────
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
          setHoldProgress(prev => {
            const next = prev - 0.04;
            if (next <= 0) { clearInterval(down); return 0; }
            return next;
          });
        }, TICK_INTERVAL);
      }
    }, TICK_INTERVAL);
    return () => clearInterval(up);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-6"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1  }}
      exit={   { opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
    >
      {/* ── Back chevron — hidden during broadcasting ── */}
      <AnimatePresence>
        {!isBroadcasting && (
          <motion.button
            className="fixed top-5 left-5 z-50 transition-opacity hover:opacity-60 focus-ring"
            style={{ fontSize: '1.75rem', lineHeight: 1, color: 'rgba(255,255,255,0.25)' }}
            onClick={() => { hapticLight(); goBackToAmount(); }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{    opacity: 0 }}
            transition={{ duration: 0.25 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Back"
          >
            ‹
          </motion.button>
        )}
      </AnimatePresence>

      <div className="w-full">

        {/* ── Sender pill — delay 0ms ── */}
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0, duration: 0.35, ease: EASE_OUT_EXPO }}
        >
          <ReviewPill
            avatarUrl={senderAvatar}
            name={senderName}
            fallbackAddress={address}
            amountLabel={`${formatQF(totalRequiredWei)} QF`}
            verb="leaving"
          />
        </motion.div>

        {/* ── Connector 1 — delay 100ms ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.10, duration: 0.3 }}
        >
          <Divider />
        </motion.div>

        {/* ── Burn pill — delay 150ms ── */}
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35, ease: EASE_OUT_EXPO }}
        >
          <div
            className="inline-flex items-center gap-2"
            style={{
              background: 'rgba(185,28,28,0.08)',
              border: '1px solid rgba(185,28,28,0.25)',
              borderRadius: 9999,
              padding: '10px 20px',
            }}
          >
            <span
              className="font-satoshi font-medium text-base"
              style={{ color: `${BURN_CRIMSON}cc` }}
            >
              🔥 {formatQF(burnAmountWei)} QF burns{' '}
              <span style={{ color: `${BURN_CRIMSON}cc` }}>forever</span>
            </span>
          </div>
        </motion.div>

        {/* ── Connector 2 — delay 200ms ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.20, duration: 0.3 }}
        >
          <Divider />
        </motion.div>

        {/* ── Recipient pill — delay 250ms ── */}
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35, ease: EASE_OUT_EXPO }}
        >
          <ReviewPill
            avatarUrl={recipientAvatar}
            name={recipientName}
            fallbackAddress={recipientAddress}
            amountLabel={`${formatQF(recipientAmountWei)} QF`}
            verb="arriving"
          />
        </motion.div>

        {/* ── Send button — delay 400ms ── */}
        <motion.div
          className="flex justify-center mt-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0  }}
          transition={{ delay: 0.40, duration: 0.4, ease: EASE_OUT_EXPO }}
        >
          {/* Heartbeat pulse — 2s loop, pauses while holding or signing */}
          <motion.div
            animate={
              buttonState === 'idle' && !isHolding
                ? { scale: [1, 1.02, 1] }
                : { scale: 1 }
            }
            transition={{
              duration: 2,
              repeat: buttonState === 'idle' && !isHolding ? Infinity : 0,
              ease: 'easeInOut',
            }}
          >
            {/* Cancel pulse wrapper — fires once on early release */}
            <motion.div
              animate={pulsing ? { scale: [1, 1.04, 0.98, 1] } : { scale: 1 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              {/* Outer wrapper — no overflow:hidden so shimmer border is visible */}
              <motion.div
                className="relative"
                style={{
                  width: 'clamp(200px, 60vw, 320px)',
                  height: 56,
                  borderRadius: 100,
                  cursor: buttonState === 'idle' ? 'pointer' : 'default',
                  userSelect: 'none',
                }}
                onPointerDown={startHold}
                onPointerUp={cancelHold}
                onPointerLeave={cancelHold}
                whileTap={buttonState === 'idle' ? { scale: 0.98 } : undefined}
              >
                {/* Shimmer border — outside overflow:hidden, so the 1px ring shows */}
                <div
                  className="absolute -inset-[1px] pointer-events-none"
                  style={{ borderRadius: 100, overflow: 'hidden' }}
                >
                  <div
                    className="w-full h-full animate-shimmer-rotate"
                    style={{
                      background: buttonState !== 'idle'
                        ? 'transparent'
                        : 'conic-gradient(from var(--shimmer-angle, 0deg), rgba(0,64,255,0.05) 0%, rgba(120,170,255,0.45) 10%, rgba(0,64,255,0.05) 20%, rgba(0,64,255,0.05) 100%)',
                      animationDuration: '4s',
                    }}
                  />
                </div>

                {/* Button surface — overflow:hidden clips the fill progress */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ borderRadius: 100, background: BRAND_BLUE }}
                >
                  {/* Fill progress — brightens from left */}
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      background: '#2060FF',
                      transformOrigin: 'left center',
                      borderRadius: 100,
                    }}
                    animate={{ scaleX: holdProgress }}
                    transition={{ duration: 0.05 }}
                  />

                  {/* Label — idle / signing / confirmed */}
                  <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <AnimatePresence mode="wait">
                      {buttonState === 'idle' && (
                        <motion.span
                          key="idle"
                          className="font-clash font-bold text-white"
                          style={{ fontSize: 18, letterSpacing: '-0.02em' }}
                          initial={{ opacity: 0, y:  4 }}
                          animate={{ opacity: 1, y:  0 }}
                          exit={   { opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                        >
                          Send
                        </motion.span>
                      )}
                      {buttonState === 'signing' && (
                        <motion.span
                          key="signing"
                          className="flex items-center gap-2 font-satoshi font-medium text-white"
                          style={{ fontSize: 15 }}
                          initial={{ opacity: 0, y:  4 }}
                          animate={{ opacity: 1, y:  0 }}
                          exit={   { opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                        >
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Signing…
                        </motion.span>
                      )}
                      {buttonState === 'confirmed' && (
                        <motion.span
                          key="confirmed"
                          className="flex items-center gap-2 font-satoshi font-medium text-white"
                          style={{ fontSize: 15 }}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={   { opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        >
                          <Check className="w-4 h-4" />
                          Sent
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>

      </div>
    </motion.div>
  );
};
