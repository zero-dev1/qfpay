import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { usePaymentStore } from '../stores/paymentStore';
import { useWalletStore } from '../stores/walletStore';
import { getQFBalance, formatQF, calculateBurn } from '../utils/qfpay';
import { parseQFAmount, isValidAmountInput } from '../utils/parseAmount';
import { GAS_BUFFER } from '../config/contracts';
import { ArrowRight, ArrowLeft, AlertCircle, Flame } from 'lucide-react';
import { EASE_OUT_EXPO, EASE_SPRING } from '../lib/animations';

export const AmountScreen = () => {
  const {
    recipientName,
    recipientAddress,
    recipientAvatar,
    setAmount,
    goToPreview,
    goBackToRecipient,
  } = usePaymentStore();
  const { ss58Address } = useWalletStore();

  const [amountInput, setAmountInput] = useState('');
  const [balance, setBalance] = useState<bigint>(0n);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ss58Address) {
      getQFBalance(ss58Address).then(setBalance);
    }
  }, [ss58Address]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const amountWei = amountInput ? parseQFAmount(amountInput) : 0n;
  const { burnAmount, recipientAmount, totalRequired } = calculateBurn(amountWei);
  const insufficientBalance = amountWei > 0n && totalRequired + GAS_BUFFER > balance;
  const canContinue = amountWei > 0n && !insufficientBalance && recipientAddress;

  const displayRecipient = recipientName
    ? `${recipientName}.qf` 
    : recipientAddress
      ? recipientAddress.slice(0, 8) + '...' + recipientAddress.slice(-4)
      : '';

  const QUICK_AMOUNTS = [10, 50, 100, 500];

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-6"
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
    >
      {/* Back button */}
      <motion.button
        className="fixed top-5 left-5 z-50 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12] backdrop-blur-md transition-all duration-200 focus-ring"
        onClick={goBackToRecipient}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, ease: EASE_OUT_EXPO }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <ArrowLeft className="w-[18px] h-[18px] text-white/40" />
      </motion.button>

      {/* Recipient identity — with avatar if available */}
      <motion.div
        className="flex items-center gap-3 mb-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.4, ease: EASE_OUT_EXPO }}
      >
        <p className="font-satoshi text-white/40 text-sm uppercase tracking-widest">
          Sending to
        </p>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.08] border border-white/[0.08]">
          {/* Recipient avatar chip */}
          {recipientAvatar ? (
            <img
              src={recipientAvatar}
              alt={recipientName || ''}
              className="w-5 h-5 rounded-full object-cover"
            />
          ) : recipientName ? (
            <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center">
              <span className="font-clash font-semibold text-[10px] text-white">
                {recipientName[0].toUpperCase()}
              </span>
            </div>
          ) : null}
          <span className="font-satoshi font-medium text-sm text-white">
            {displayRecipient}
          </span>
        </div>
      </motion.div>

      {/* Amount input */}
      <motion.div
        className="relative w-full max-w-lg"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: EASE_OUT_EXPO }}
      >
        <div className="flex items-baseline justify-center gap-3">
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={amountInput}
            onChange={(e) => {
              if (isValidAmountInput(e.target.value)) {
                setAmountInput(e.target.value);
              }
            }}
            placeholder="0"
            className="bg-transparent border-none outline-none font-clash font-bold text-6xl sm:text-7xl md:text-8xl text-white text-right placeholder-white/15 caret-white w-full max-w-[70%]"
            autoComplete="off"
          />
          <span className="font-clash font-bold text-3xl sm:text-4xl text-white/30">QF</span>
        </div>

        {/* Quick amounts — animated pill selector */}
        <div className="flex justify-center gap-2.5 mt-8">
          {QUICK_AMOUNTS.map((amount, i) => {
            const isSelected = amountInput === amount.toString();
            return (
              <motion.button
                key={amount}
                className="relative px-5 py-2.5 rounded-full text-sm font-satoshi font-medium transition-colors focus-ring"
                onClick={() => setAmountInput(amount.toString())}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.2 + i * 0.04,
                  duration: 0.35,
                  ease: EASE_OUT_EXPO,
                }}
                whileTap={{ scale: 0.95 }}
              >
                {/* Animated background indicator — morphs between pills */}
                {isSelected && (
                  <motion.div
                    className="absolute inset-0 bg-white rounded-full"
                    layoutId="pill-highlight"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span
                  className={`relative z-10 transition-colors duration-200 ${
                    isSelected
                      ? 'text-[#0040FF]'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  {amount}
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Balance + burn info */}
      <motion.div
        className="flex flex-col items-center gap-2 mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, ease: EASE_OUT_EXPO }}
      >
        <p className="font-mono text-sm text-white/25">
          Balance: {formatQF(balance)} QF
        </p>

        {/* Live burn calculation — visible and celebrated */}
        <AnimatePresence>
          {amountWei > 0n && !insufficientBalance && (
            <motion.div
              className="flex items-center gap-2 text-orange-300/50"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
            >
              <Flame className="w-3.5 h-3.5 text-orange-400/60" />
              <span className="font-mono text-xs">
                {formatQF(burnAmount)} QF burned
              </span>
              <span className="text-white/15">·</span>
              <span className="font-mono text-xs text-white/35">
                {formatQF(recipientAmount)} QF received
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Insufficient balance */}
      <AnimatePresence>
        {insufficientBalance && (
          <motion.div
            className="flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-red-500/10 border border-red-400/15"
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
          >
            <AlertCircle className="w-4 h-4 text-red-300 flex-shrink-0" />
            <span className="font-satoshi text-red-300 text-sm">
              Insufficient balance
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Continue button — matches RecipientScreen pattern */}
      <AnimatePresence>
        {canContinue && (
          <motion.button
            className="mt-12 flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 transition-all focus-ring"
            onClick={() => {
              setAmount(amountInput, amountWei, burnAmount, recipientAmount, totalRequired);
              goToPreview();
            }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={EASE_SPRING}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="font-satoshi font-medium text-white text-base">
              Review
            </span>
            <ArrowRight className="w-4 h-4 text-white/70" />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
