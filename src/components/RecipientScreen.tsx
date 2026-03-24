import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, useCallback } from 'react';
import { usePaymentStore } from '../stores/paymentStore';
import { resolveForward, getAvatar } from '../utils/qfpay';
import { detectAddressType, ss58ToEvmAddress } from '../utils/address';
import { useWalletStore } from '../stores/walletStore';
import { Loader2, Check, X, ArrowRight, ArrowLeft } from 'lucide-react';

const EXAMPLE_NAMES = ['memechi.qf', 'alice.qf', 'spin.qf', 'satoshi.qf', 'dev.qf'];
const TYPE_SPEED = 80;
const DELETE_SPEED = 40;
const PAUSE_AFTER_TYPE = 1500;
const PAUSE_AFTER_DELETE = 300;

export const RecipientScreen = () => {
  const { setRecipient, goToAmount, goBackToIdle, recipientAddress, recipientName } = usePaymentStore();
  const { address: senderAddress } = useWalletStore();

  const [input, setInput] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [placeholder, setPlaceholder] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-typing placeholder animation
  useEffect(() => {
    if (isFocused || input) return;

    let nameIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let currentText = '';

    const tick = () => {
      const currentName = EXAMPLE_NAMES[nameIndex];

      if (!isDeleting) {
        currentText = currentName.slice(0, charIndex + 1);
        charIndex++;
        setPlaceholder(currentText);

        if (charIndex === currentName.length) {
          isDeleting = false;
          animationRef.current = setTimeout(() => {
            isDeleting = true;
            tick();
          }, PAUSE_AFTER_TYPE);
          return;
        }
        animationRef.current = setTimeout(tick, TYPE_SPEED);
      } else {
        currentText = currentName.slice(0, charIndex - 1);
        charIndex--;
        setPlaceholder(currentText);

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
  }, [isFocused, input]);

  // Resolve input with debounce
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

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-6"
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Back button */}
      <motion.button
        className="fixed top-6 left-6 z-50 p-2.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        onClick={goBackToIdle}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <ArrowLeft className="w-5 h-5 text-white/40 hover:text-white/70" />
      </motion.button>

      <motion.p
        className="font-satoshi text-white/30 text-sm uppercase tracking-widest mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        Send to
      </motion.p>

      {/* Main input area */}
      <div className="relative w-full max-w-lg">
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.toLowerCase())}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="w-full bg-transparent border-none outline-none font-clash font-bold text-4xl sm:text-5xl md:text-6xl text-white text-center placeholder-transparent caret-qfpay-blue"
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />

          {/* Animated placeholder — only visible when input is empty and not focused */}
          {!input && !isFocused && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              onClick={() => inputRef.current?.focus()}
            >
              <span className="font-clash font-bold text-4xl sm:text-5xl md:text-6xl text-white/20">
                {placeholder}
                <motion.span
                  className="inline-block w-[3px] h-[0.8em] bg-white/20 ml-0.5 align-middle"
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
                />
              </span>
            </div>
          )}

          {/* Status indicator to the right of text */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            <AnimatePresence mode="wait">
              {isResolving && (
                <motion.div key="spinner" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                  <Loader2 className="w-7 h-7 text-white/30 animate-spin" />
                </motion.div>
              )}
              {!isResolving && resolved && (
                <motion.div key="check" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                  <Check className="w-7 h-7 text-qfpay-green" />
                </motion.div>
              )}
              {!isResolving && error && (
                <motion.div key="error" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                  <X className="w-7 h-7 text-qfpay-error" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Underline */}
        <motion.div
          className="h-px mt-4 mx-auto"
          style={{ maxWidth: '80%' }}
          animate={{
            backgroundColor: error ? '#E5484D' : resolved ? '#00D179' : 'rgba(255,255,255,0.1)',
          }}
          transition={{ duration: 0.3 }}
        />

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.p
              className="text-center font-satoshi text-qfpay-error text-sm mt-3"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Resolved name display */}
        <AnimatePresence>
          {resolved && recipientName && (
            <motion.p
              className="text-center font-satoshi text-qfpay-green text-sm mt-3"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
            >
              {recipientName}.qf
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Continue arrow */}
      <AnimatePresence>
        {canContinue && (
          <motion.button
            className="mt-16"
            onClick={goToAmount}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <motion.div
              className="w-16 h-16 rounded-full bg-qfpay-blue flex items-center justify-center"
              animate={{
                scale: [1, 1.08, 1],
                boxShadow: [
                  '0 0 0 0 rgba(0, 82, 255, 0.4)',
                  '0 0 0 12px rgba(0, 82, 255, 0)',
                  '0 0 0 0 rgba(0, 82, 255, 0)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowRight className="w-7 h-7 text-white" />
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
