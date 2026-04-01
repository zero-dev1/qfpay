import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, useCallback } from 'react';
import { usePaymentStore } from '../stores/paymentStore';
import { resolveForward, getAvatar } from '../utils/qfpay';
import { detectAddressType, ss58ToEvmAddress } from '../utils/address';
import { useWalletStore } from '../stores/walletStore';
import { Loader2, Check, X } from 'lucide-react';
import { hapticLight, hapticDouble } from '../utils/haptics';
import { EASE_OUT_EXPO, EASE_SPRING } from '../lib/animations';
import { useReducedMotion } from '../hooks/useReducedMotion';
import {
  EXAMPLE_NAMES, TYPE_SPEED, DELETE_SPEED,
  PAUSE_AFTER_TYPE, PAUSE_AFTER_DELETE
} from '../lib/recipientDemoNames';

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
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
      onClick={handleScreenTap}
    >
      {/* Back button */}
      <motion.button
        className="fixed top-5 left-5 z-50 text-white/25 hover:text-white/50 transition-colors"
        style={{ fontSize: '1.5rem', lineHeight: 1 }}
        onClick={(e) => { e.stopPropagation(); hapticLight(); goBackToIdle() }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        whileTap={{ scale: 0.9 }}
      >
        ‹
      </motion.button>


      <div className="relative w-full max-w-lg">
        {/* Resolved identity display - ABOVE input */}
        <AnimatePresence>
          {resolved && recipientName && !error && (
            <motion.div
              className="flex flex-col items-center mb-6"
              initial={{ opacity: 0, scale: 0.5, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            >
              {/* Avatar — large, above input */}
              <div className="relative mb-3">
                {recipientAvatar ? (
                  <img
                    src={recipientAvatar}
                    alt={recipientName}
                    className="w-16 h-16 rounded-full object-cover border border-white/20"
                    onLoad={() => setAvatarLoaded(true)}
                    style={{ opacity: avatarLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <span className="font-clash font-bold text-2xl text-white">
                      {recipientName[0].toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Single pulse ring — plays once on mount */}
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ border: '1px solid rgba(0,64,255,0.4)' }}
                  initial={{ scale: 1, opacity: 0.4 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />

                {/* Continuous breathing */}
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ border: '1px solid rgba(0,64,255,0.2)' }}
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>

              {/* Name below avatar */}
              <motion.p
                className="font-satoshi font-medium text-sm"
                style={{ color: 'rgba(255,255,255,0.7)' }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3, ease: EASE_OUT_EXPO }}
              >
                {recipientName}
                <span style={{ color: 'rgba(0,64,255,0.85)' }}>.qf</span>
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
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
              ? 'rgba(229,72,77,0.8)'
              : resolved
                ? ['rgba(0,64,255,0.8)', 'rgba(255,255,255,0.9)']
                : 'rgba(255,255,255,0.15)',
          }}
          transition={{
            duration: resolved && !error ? 0.6 : 0.3,
            ease: EASE_OUT_EXPO,
          }}
        />

      </div>

      {/* Continue button */}
      <AnimatePresence>
        {canContinue && (
          <motion.button
            className="mt-10 flex items-center gap-2 focus-ring"
            style={{ color: 'rgba(255,255,255,0.5)' }}
            onClick={(e) => {
              e.stopPropagation()
              hapticLight()
              goToAmount()
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={EASE_SPRING}
            whileHover={{ color: 'rgba(255,255,255,0.9)' }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="font-satoshi font-medium text-base">Continue</span>
            <span style={{ fontSize: '1.2rem' }}>›</span>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
