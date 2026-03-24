import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { usePaymentStore } from '../stores/paymentStore';
import { useWalletStore } from '../stores/walletStore';
import { getQFBalance, formatQF, calculateBurn } from '../utils/qfpay';
import { parseQFAmount, isValidAmountInput } from '../utils/parseAmount';
import { GAS_BUFFER } from '../config/contracts';
import { ArrowRight, ArrowLeft, X } from 'lucide-react';

export const AmountScreen = () => {
  const { recipientName, recipientAddress, setAmount, goToPreview, goBackToRecipient } = usePaymentStore();
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

  const displayRecipient = recipientName ? `${recipientName}.qf` : recipientAddress?.slice(0, 8) + '...' + recipientAddress?.slice(-4);

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
        onClick={goBackToRecipient}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <ArrowLeft className="w-5 h-5 text-white/40 hover:text-white/70" />
      </motion.button>

      {/* Sending to label */}
      <motion.p
        className="font-satoshi text-white/30 text-sm uppercase tracking-widest mb-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        Sending to
      </motion.p>

      <motion.p
        className="font-clash font-semibold text-xl text-qfpay-green mb-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        {displayRecipient}
      </motion.p>

      {/* Amount input */}
      <div className="relative w-full max-w-lg">
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
            className="bg-transparent border-none outline-none font-clash font-bold text-6xl sm:text-7xl md:text-8xl text-white text-right placeholder-white/15 caret-qfpay-blue w-full max-w-[70%]"
            autoComplete="off"
          />
          <span className="font-clash font-bold text-3xl sm:text-4xl text-white/20">QF</span>
        </div>

        {/* Quick amounts */}
        <div className="flex justify-center gap-3 mt-8">
          {[10, 50, 100, 500].map((amount) => (
            <button
              key={amount}
              className={`px-5 py-2 rounded-full text-sm font-satoshi transition-all ${
                amountInput === amount.toString()
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'bg-transparent text-white/30 border border-white/5 hover:border-white/15 hover:text-white/60'
              }`}
              onClick={() => setAmountInput(amount.toString())}
            >
              {amount}
            </button>
          ))}
        </div>
      </div>

      {/* Balance */}
      <motion.p
        className="font-mono text-sm text-white/20 mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Balance: {formatQF(balance)} QF
      </motion.p>

      {/* Insufficient balance error */}
      <AnimatePresence>
        {insufficientBalance && (
          <motion.div
            className="flex items-center gap-2 mt-4"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
          >
            <X className="w-4 h-4 text-qfpay-error" />
            <span className="font-satoshi text-qfpay-error text-sm">Insufficient balance</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Continue arrow */}
      <AnimatePresence>
        {canContinue && (
          <motion.button
            className="mt-12"
            onClick={() => {
              setAmount(amountInput, amountWei, burnAmount, recipientAmount, totalRequired);
              goToPreview();
            }}
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
