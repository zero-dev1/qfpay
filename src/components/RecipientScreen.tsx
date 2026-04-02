import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, useCallback } from 'react';
import { usePaymentStore } from '../stores/paymentStore';
import { resolveForward, getAvatar } from '../utils/qfpay';
import { detectAddressType, ss58ToEvmAddress } from '../utils/address';
import { useWalletStore } from '../stores/walletStore';
import { hapticLight, hapticDouble } from '../utils/haptics';
import { EASE_OUT_EXPO, EASE_SPRING } from '../lib/animations';
import { BRAND_BLUE } from '../lib/colors';
import { CornerDownLeft } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import {
  EXAMPLE_NAMES,
  TYPE_SPEED,
  DELETE_SPEED,
  PAUSE_AFTER_TYPE,
  PAUSE_AFTER_DELETE,
} from '../lib/recipientDemoNames';

// ── Sonar ripple: 3 staggered rings that burst outward, pause, repeat ──
const RING_COUNT = 3;
const RING_STAGGER = 0.2;       // seconds between each ring start
const BURST_DURATION = 1.3;     // how long each ring's expand animation takes
const PAUSE_DURATION = 1.8;     // calm gap between bursts
const CYCLE = BURST_DURATION + RING_STAGGER * (RING_COUNT - 1) + PAUSE_DURATION;

const SonarRipple = () => {
  const reducedMotion = useReducedMotion();
  const [burstKey, setBurstKey] = useState(0);

  // Restart the burst on a cycle timer
  useEffect(() => {
    if (reducedMotion) return;
    const interval = setInterval(() => {
      setBurstKey((k) => k + 1);
    }, CYCLE * 1000);
    return () => clearInterval(interval);
  }, [reducedMotion]);

  if (reducedMotion) {
    // Static subtle ring for reduced motion
    return (
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: -4,
          border: '2px solid rgba(0,64,255,0.25)',
        }}
      />
    );
  }

  return (
    <>
      {Array.from({ length: RING_COUNT }).map((_, i) => (
        <motion.div
          key={`${burstKey}-${i}`}
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: -4,
            border: '2px solid #0040FF',
            boxShadow: '0 0 10px rgba(0,64,255,0.25), inset 0 0 6px rgba(0,64,255,0.08)',
          }}
          initial={{ scale: 1, opacity: 0.5 - i * 0.12 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{
            duration: BURST_DURATION,
            delay: i * RING_STAGGER,
            ease: [0.16, 1, 0.3, 1],
          }}
        />
      ))}
    </>
  );
};

export const RecipientScreen = () => {
  const {
    setRecipient,
    goToAmount,
    recipientAddress,
    recipientName,
    recipientAvatar,
  } = usePaymentStore();
  const { address: senderAddress } = useWalletStore();
  const reducedMotion = useReducedMotion();

  const [input, setInput] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placeholder, setPlaceholder] = useState('');
  const [avatarLoaded, setAvatarLoaded] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auto-focus the input on mount — this IS the typing screen ──
  useEffect(() => {
    // Small delay to let the enter animation start, then grab focus
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  // ── Reset avatar loaded state when recipient changes ──
  useEffect(() => {
    setAvatarLoaded(false);
  }, [recipientName]);

  // ── Auto-typing placeholder — stops on real input ──
  useEffect(() => {
    if (input || reducedMotion) return;

    let nameIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    const tick = () => {
      const currentName = EXAMPLE_NAMES[nameIndex];

      if (!isDeleting) {
        charIndex++;
        setPlaceholder(currentName.slice(0, charIndex));
        if (charIndex === currentName.length) {
          animationRef.current = setTimeout(() => {
            isDeleting = true;
            tick();
          }, PAUSE_AFTER_TYPE);
          return;
        }
        animationRef.current = setTimeout(tick, TYPE_SPEED);
      } else {
        charIndex--;
        setPlaceholder(currentName.slice(0, charIndex));
        if (charIndex === 0) {
          isDeleting = false;
          nameIndex = (nameIndex + 1) % EXAMPLE_NAMES.length;
          animationRef.current = setTimeout(tick, PAUSE_AFTER_DELETE);
          return;
        }
        animationRef.current = setTimeout(tick, DELETE_SPEED);
      }
    };

    animationRef.current = setTimeout(tick, 500);
    return () => {
      if (animationRef.current) clearTimeout(animationRef.current);
    };
  }, [input, reducedMotion]);

  // ── Resolve input ──
  const resolveInput = useCallback(
    async (value: string) => {
      if (!value.trim()) {
        setRecipient(null, null);
        setResolved(false);
        setError(null);
        return;
      }

      const addressType = detectAddressType(value);
      setIsResolving(true);
      setResolved(false);
      setError(null);

      try {
        let resolvedAddress: string | null = null;
        let resolvedName: string | null = null;

        switch (addressType) {
          case 'qf-name':
            resolvedAddress = await resolveForward(value);
            if (resolvedAddress) {
              resolvedName = value.replace('.qf', '');
            } else {
              setError('Not found');
              setIsResolving(false);
              setRecipient(null, null);
              return;
            }
            break;
          case 'evm-address':
            resolvedAddress = value;
            break;
          case 'ss58-address':
            resolvedAddress = ss58ToEvmAddress(value);
            break;
          default:
            setError('Invalid');
            setIsResolving(false);
            setRecipient(null, null);
            return;
        }

        if (
          senderAddress &&
          resolvedAddress &&
          resolvedAddress.toLowerCase() === senderAddress.toLowerCase()
        ) {
          setError('Cannot send to yourself');
          setIsResolving(false);
          setRecipient(null, null);
          return;
        }

        let avatar: string | null = null;
        if (resolvedName) {
          avatar = await getAvatar(resolvedName);
        }

        setRecipient(resolvedName, resolvedAddress, avatar);
        setResolved(true);
        setError(null);
        hapticDouble();
      } catch {
        setError('Resolution failed');
        setRecipient(null, null);
      } finally {
        setIsResolving(false);
      }
    },
    [senderAddress, setRecipient]
  );

  // ── Debounce resolution ──
  useEffect(() => {
    const timer = setTimeout(() => resolveInput(input), 400);
    return () => clearTimeout(timer);
  }, [input, resolveInput]);

  const canContinue = resolved && recipientAddress;

  const handleAdvance = () => {
    hapticLight();
    goToAmount();
  };

  // ── Desktop: Enter key to advance when resolved ──
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && canContinue) {
        e.preventDefault();
        handleAdvance();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canContinue]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tap anywhere to focus input (if not already focused) ──
  const handleScreenTap = () => {
    inputRef.current?.focus();
  };

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-6 cursor-text"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
      onClick={handleScreenTap}
    >
      {/* NO BACK BUTTON — this is the first step. 
          User can disconnect via ConnectedPill in top-right corner. */}

      <div className="relative w-full max-w-lg flex flex-col items-center">
        {/* ── Resolved avatar ── */}
        <AnimatePresence>
          {resolved && recipientName && !error && (
            <motion.div
              className="flex flex-col items-center mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                layoutId="recipient-avatar"
                className="relative mb-3 cursor-pointer"
                initial={{ scale: 0.5, filter: 'blur(12px)', opacity: 0 }}
                animate={{ scale: 1, filter: 'blur(0px)', opacity: 1 }}
                transition={{ ...EASE_SPRING }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (canContinue) handleAdvance();
                }}
                whileTap={{ scale: 0.92 }}
              >
                {recipientAvatar ? (
                  <img
                    src={recipientAvatar}
                    alt={recipientName}
                    className="rounded-full object-cover"
                    style={{
                      width: 64,
                      height: 64,
                      border: '2px solid rgba(0,64,255,0.35)',
                      opacity: avatarLoaded ? 1 : 0,
                      transition: 'opacity 0.3s',
                    }}
                    onLoad={() => setAvatarLoaded(true)}
                  />
                ) : (
                  <div
                    className="rounded-full flex items-center justify-center"
                    style={{
                      width: 64,
                      height: 64,
                      background: 'rgba(255,255,255,0.08)',
                      border: '2px solid rgba(0,64,255,0.35)',
                    }}
                  >
                    <span className="font-clash font-bold text-2xl text-white">
                      {recipientName[0].toUpperCase()}
                    </span>
                  </div>
                )}

                {/* ── Sonar ripple rings ── */}
                <SonarRipple />
              </motion.div>

              <motion.p
                className="font-satoshi font-medium text-sm"
                style={{ color: 'rgba(255,255,255,0.70)' }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.12,
                  duration: 0.3,
                  ease: EASE_OUT_EXPO,
                }}
              >
                {recipientName}
                <span style={{ color: `${BRAND_BLUE}d9` }}>.qf</span>
              </motion.p>

              {/* Return key hint — desktop only, appears after resolution */}
              {window.innerWidth >= 1024 && (
                <motion.button
                  className="inline-flex items-center gap-2 font-satoshi select-none mt-4"
                  style={{
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.40)',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.10)',
                    borderRadius: 10,
                    padding: '6px 14px',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s ease, color 0.2s ease',
                  }}
                  onClick={(e) => { e.stopPropagation(); handleAdvance(); }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.3, ease: EASE_OUT_EXPO }}
                  whileHover={{
                    borderColor: 'rgba(255,255,255,0.25)',
                    color: 'rgba(255,255,255,0.70)',
                  }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="Continue"
                >
                  <CornerDownLeft className="w-3.5 h-3.5" />
                  <span>Return</span>
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Input area ── */}
        <motion.div
          className="relative w-full flex flex-col items-center"
          animate={{ opacity: resolved && !error ? 0.85 : 1 }}
          transition={{ duration: 0.3 }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.toLowerCase())}
            className="absolute inset-0 w-full z-10"
            style={{ opacity: 0, cursor: 'text' }}
            autoComplete="off"
            spellCheck={false}
            aria-label="Recipient .qf name or address"
          />

          <div
            className="flex items-center justify-center w-full overflow-hidden"
            style={{ height: 80 }}
          >
            {input ? (
              <span
                className="font-clash font-bold text-center"
                style={{
                  fontSize: 'clamp(2.25rem, 8vw, 4rem)',
                  letterSpacing: '-0.02em',
                  color: error
                    ? 'rgba(255,255,255,0.60)'
                    : 'rgba(255,255,255,0.95)',
                }}
              >
                {input}
              </span>
            ) : (
              <div className="flex items-center">
                <span
                  className="font-clash font-bold text-center"
                  style={{
                    fontSize: 'clamp(2.25rem, 8vw, 4rem)',
                    letterSpacing: '-0.02em',
                    color: 'rgba(255,255,255,0.20)',
                  }}
                >
                  {reducedMotion ? EXAMPLE_NAMES[0] : placeholder}
                </span>
                {!reducedMotion && (
                  <motion.span
                    className="inline-block ml-[3px] flex-shrink-0"
                    style={{
                      width: 3,
                      height: '0.85em',
                      borderRadius: 1,
                      background: BRAND_BLUE,
                      opacity: 0.6,
                    }}
                    animate={{ opacity: [0.6, 0] }}
                    transition={{
                      duration: 0.55,
                      repeat: Infinity,
                      repeatType: 'reverse',
                    }}
                  />
                )}
              </div>
            )}
          </div>

          <motion.div
            style={{
              width: 'clamp(200px, 70%, 400px)',
              height: 2,
              borderRadius: 1,
              marginTop: 12,
            }}
            animate={{
              backgroundColor: error
                ? 'rgba(245,158,11,0.70)'
                : resolved
                  ? BRAND_BLUE
                  : 'rgba(0,64,255,0.30)',
              scaleX: resolved && !error ? [0.6, 1] : 1,
            }}
            transition={{
              backgroundColor: { duration: 0.3, ease: EASE_OUT_EXPO },
              scaleX: { duration: 0.4, ease: EASE_OUT_EXPO },
            }}
          />

          <AnimatePresence>
            {error && (
              <motion.p
                className="font-satoshi mt-2 text-center"
                style={{ fontSize: 13, color: 'rgba(245,158,11,0.85)' }}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

                  </motion.div>
      </div>
    </motion.div>
  );
};
