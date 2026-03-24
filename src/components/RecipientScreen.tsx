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
  const [isActive, setIsActive] = useState(false);
  const [placeholder, setPlaceholder] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-typing — runs when input is empty and not actively typing
  useEffect(() => {
    if (input) return;

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

  // Resolve input
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
      transition={{ duration: 0.4, ease: 'easeOut' }}
      onClick={handleScreenTap}
    >
      {/* Back button */}
      <motion.button
        className="fixed top-6 left-6 z-50 p-2.5 rounded-full hover:bg-white/10 transition-colors"
        onClick={(e) => { e.stopPropagation(); goBackToIdle(); }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <ArrowLeft className="w-5 h-5 text-white/50 hover:text-white" />
      </motion.button>

      <motion.p
        className="font-satoshi text-white/40 text-sm uppercase tracking-widest mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
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
                    <motion.div key="check" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                      <Check className="w-7 h-7 text-white" />
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
          ) : (
            <div className="flex items-center">
              <span className="font-clash font-bold text-4xl sm:text-5xl md:text-6xl text-white/20">
                {placeholder}
              </span>
              <motion.span
                className="inline-block w-[3px] h-[1em] bg-white/20 ml-1 font-clash text-5xl"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
              />
            </div>
          )}
        </div>

        {/* Underline */}
        <motion.div
          className="h-px mt-4 mx-auto"
          style={{ maxWidth: '80%' }}
          animate={{
            backgroundColor: error ? '#E5484D' : resolved ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.15)',
          }}
          transition={{ duration: 0.3 }}
        />

        {/* Feedback */}
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
          {resolved && recipientName && (
            <motion.p
              className="text-center font-satoshi text-white/80 text-sm mt-3"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
            >
              {recipientName}.qf
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Continue arrow — plain, no circle */}
      <AnimatePresence>
        {canContinue && (
          <motion.button
            className="mt-16"
            onClick={(e) => { e.stopPropagation(); goToAmount(); }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <motion.div
              animate={{
                y: [0, 6, 0],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ArrowRight className="w-10 h-10 text-white" />
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
