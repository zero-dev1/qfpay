import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, useCallback } from 'react';
import { usePaymentStore } from '../stores/paymentStore';
import { resolveForward, getAvatar } from '../utils/qfpay';
import { detectAddressType, ss58ToEvmAddress } from '../utils/address';
import { useWalletStore } from '../stores/walletStore';
import { Loader2, Check, X, ArrowRight, ArrowLeft } from 'lucide-react';
import { hapticLight, hapticDouble } from '../utils/haptics';
import { EASE_OUT_EXPO, EASE_SPRING } from '../lib/animations';
import { useReducedMotion } from '../hooks/useReducedMotion';

const EXAMPLE_NAMES = ['memechi.qf', 'alice.qf', 'spin.qf', 'satoshi.qf', 'dev.qf'];
const TYPE_SPEED = 80;
const DELETE_SPEED = 40;
const PAUSE_AFTER_TYPE = 1500;
const PAUSE_AFTER_DELETE = 300;

export const RecipientScreen = () => {
  const {
    setRecipient,
    goToAmount,
    goBackToIdle,
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
  const [isActive, setIsActive] = useState(false);
  const [placeholder, setPlaceholder] = useState('');
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset avatar loaded state when recipient changes
  useEffect(() => {
    setAvatarLoaded(false);
  }, [recipientName]);

  // Auto-typing placeholder — unchanged logic, just runs when input is empty
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
  }, [input]);

  // Resolve input — unchanged logic
  const resolveInput = useCallback(async (value: string) => {
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

      // Self-send check
      if (senderAddress && resolvedAddress && resolvedAddress.toLowerCase() === senderAddress.toLowerCase()) {
        setError('Cannot send to yourself');
        setIsResolving(false);
        setRecipient(null, null);
        return;
      }

      // Fetch avatar if it's a .qf name
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
  }, [senderAddress, setRecipient]);

  useEffect(() => {
    const timer = setTimeout(() => resolveInput(input), 400);
    return () => clearTimeout(timer);
  }, [input, resolveInput]);

  const canContinue = resolved && recipientAddress;

  const handleScreenTap = () => {
    if (!isActive && !input) {
      setIsActive(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-6 cursor-text"
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
      onClick={handleScreenTap}
    >
      {/* Back button */}
      <motion.button
        className="fixed top-5 left-5 z-50 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12] backdrop-blur-md transition-all duration-200 focus-ring"
        onClick={(e) => { e.stopPropagation(); hapticLight(); goBackToIdle(); }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, ease: EASE_OUT_EXPO }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <ArrowLeft className="w-[18px] h-[18px] text-white/40" />
      </motion.button>

      <motion.p
        className="font-satoshi text-white/40 text-sm uppercase tracking-widest mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, ease: EASE_OUT_EXPO }}
      >
        Send to
      </motion.p>

      <div className="relative w-full max-w-lg">
        {/* Hidden real input */}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value.toLowerCase());
            if (!isActive) setIsActive(true);
          }}
          onFocus={() => setIsActive(true)}
          className="absolute inset-0 w-full opacity-0 z-10 cursor-text"
          autoComplete="off"
          spellCheck={false}
          aria-label="Recipient .qf name or address"
          role="combobox"
          aria-expanded={resolved && !!recipientName}
          aria-autocomplete="none"
        />

        {/* Display layer */}
        <div className="flex items-center justify-center min-h-[80px] relative">
          {input ? (
            <div className="flex items-center gap-4">
              <span className="font-clash font-bold text-4xl sm:text-5xl md:text-6xl text-white">
                {input}
              </span>
              <div className="flex-shrink-0">
                <AnimatePresence mode="wait">
                  {isResolving && (
                    <motion.div key="spinner" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                      <Loader2 className="w-7 h-7 text-white/40 animate-spin" />
                    </motion.div>
                  )}
                  {!isResolving && resolved && (
                    <motion.div key="check" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} transition={EASE_SPRING}>
                      <Check className="w-7 h-7 text-white" />
                    </motion.div>
                  )}
                  {!isResolving && error && (
                    <motion.div key="error" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                      <X className="w-7 h-7 text-red-300" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className="flex items-center">
              <span className="font-clash font-bold text-4xl sm:text-5xl md:text-6xl text-white/20">
                {reducedMotion ? 'alice.qf' : placeholder}
              </span>
              {!reducedMotion && (
                <motion.span
                  className="inline-block w-[3px] h-[1em] bg-white/20 ml-1 font-clash text-5xl"
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
                />
              )}
            </div>
          )}
        </div>

        {/* Underline */}
        <motion.div
          className="h-px mt-4 mx-auto"
          style={{ maxWidth: '80%' }}
          animate={{
            backgroundColor: error
              ? '#E5484D'
              : resolved
                ? ['rgba(0,64,255,0.8)', 'rgba(255,255,255,0.9)']
                : 'rgba(255,255,255,0.15)',
          }}
          transition={{
            duration: resolved && !error ? 0.6 : 0.3,
            ease: EASE_OUT_EXPO,
          }}
        />

        {/* ── RESOLVED IDENTITY CARD ── */}
        {/* This is the key new element — when a .qf name resolves, we show */}
        {/* the avatar + name as a confirmed identity, not just text feedback */}
        <div aria-live="polite" aria-atomic="true">
          <AnimatePresence>
            {resolved && recipientName && !error && (
              <motion.div
                className="flex items-center justify-center gap-3 mt-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
              >
                {/* Recipient avatar — THE product moment — spring overshoot */}
                <div className="relative">
                  {recipientAvatar ? (
                    <motion.div
                      className="w-10 h-10 rounded-full overflow-hidden border border-white/20"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{
                        scale: avatarLoaded ? 1 : 0,
                        opacity: avatarLoaded ? 1 : 0,
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                      <img
                        src={recipientAvatar}
                        alt={recipientName}
                        className="w-full h-full object-cover"
                        onLoad={() => setAvatarLoaded(true)}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                      <span className="font-clash font-semibold text-sm text-white">
                        {recipientName[0].toUpperCase()}
                      </span>
                    </motion.div>
                  )}
                </div>

                {/* Name slides in from behind the avatar */}
                <motion.div
                  className="flex items-center gap-1.5"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15, duration: 0.35, ease: EASE_OUT_EXPO }}
                >
                  <span className="font-satoshi font-medium text-white text-base">
                    {recipientName}
                  </span>
                  <span className="font-satoshi text-white/50 text-base">.qf</span>
                </motion.div>
              </motion.div>
            )}

            {/* Non-QNS address resolved — show truncated address */}
            {resolved && !recipientName && recipientAddress && !error && (
              <motion.p
                className="text-center font-mono text-white/50 text-sm mt-4"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
              >
                {recipientAddress.slice(0, 10)}...{recipientAddress.slice(-6)}
              </motion.p>
            )}

            {/* Error feedback */}
            {error && (
              <motion.p
                key="error-msg"
                className="text-center font-satoshi text-red-300 text-sm mt-4"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Continue button — upgraded from bare arrow to pill */}
      <AnimatePresence>
        {canContinue && (
          <motion.button
            className="mt-14 flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 transition-all focus-ring"
            onClick={(e) => {
              e.stopPropagation();
              hapticLight();
              goToAmount();
            }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={EASE_SPRING}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="font-satoshi font-medium text-white text-base">Continue</span>
            <ArrowRight className="w-4 h-4 text-white/70" />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
