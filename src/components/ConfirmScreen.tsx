import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowLeft, Flame, ArrowDown, Check } from 'lucide-react';
import { useState } from 'react';
import { useWalletStore } from '../stores/walletStore';
import { usePaymentStore } from '../stores/paymentStore';
import { formatQF } from '../utils/qfpay';
import { writeContract } from '../utils/contractCall';
import { QFPAY_ROUTER_ADDRESS, ROUTER_ABI } from '../config/contracts';
import { isRetryableError, RETRY_MESSAGE_SHORT } from '../utils/errorHelpers';
import { showToast } from './Toast';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { EASE_OUT_EXPO, staggerContainer, staggerChild } from '../lib/animations';

export const ConfirmScreen = () => {
  const { address, ss58Address, qnsName: senderName, avatarUrl: senderAvatar, providerType } =
    useWalletStore();
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
  const isBroadcasting = phase === 'broadcasting';
  const displayRecipient = recipientName
    ? `${recipientName}.qf` 
    : recipientAddress
      ? recipientAddress.slice(0, 8) + '...' + recipientAddress.slice(-4)
      : '';

  const displaySender = senderName ? `${senderName}.qf` : 'You';

  const handleConfirm = async () => {
    // Guard: need recipient and a connected wallet (address works for both providers)
    if (!recipientAddress || !address) {
      setError('Missing recipient or sender information');
      return;
    }

    setButtonState('signing');
    setBroadcasting();

    // Haptic feedback
    hapticMedium();

    try {
      let txHash: string;
      let confirmation: Promise<{ confirmed: boolean; error?: string }>;

      if (providerType === 'evm') {
        // ── MetaMask path: viem writeContract ──
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
        // ── Substrate path: PAPI writeContract (unchanged) ──
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

      // Brief checkmark flash before transitioning
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
    } catch (err: any) {
      setButtonState('idle');
      const msg = err?.message || 'Transaction failed';

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

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-6"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
    >
      {/* Back button — hidden during broadcasting */}
      <AnimatePresence>
        {!isBroadcasting && (
          <motion.button
            className="fixed top-5 left-5 z-50 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12] backdrop-blur-md transition-all duration-200 focus-ring"
            onClick={() => { hapticLight(); goBackToAmount(); }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-[18px] h-[18px] text-white/40" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Label */}
      <motion.p
        className="font-satoshi text-white/40 text-sm uppercase tracking-widest mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, ease: EASE_OUT_EXPO }}
      >
        Confirm Payment
      </motion.p>

      {/* ── Receipt Card ── */}
      <motion.div
        className="w-full max-w-sm"
        variants={staggerContainer(0.08)}
        initial="initial"
        animate="animate"
      >
        {/* Amount — hero element */}
        <motion.div className="text-center mb-8" variants={staggerChild}>
          <h1 className="font-clash font-bold text-7xl sm:text-8xl text-white leading-none">
            {formatQF(recipientAmountWei)}
          </h1>
          <p className="font-clash text-xl text-white/40 mt-1">QF</p>
        </motion.div>

        {/* Sender → Recipient flow */}
        <motion.div
          className="bg-white/[0.06] backdrop-blur-sm rounded-2xl border border-white/[0.08] p-5 mb-4"
          variants={staggerChild}
        >
          {/* From */}
          <div className="flex items-center gap-3">
            {senderAvatar ? (
              <img
                src={senderAvatar}
                alt={senderName || 'You'}
                className="w-9 h-9 rounded-full object-cover border border-white/15 flex-shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                <span className="font-clash font-semibold text-xs text-white">
                  {senderName ? senderName[0].toUpperCase() : 'Y'}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-satoshi text-xs text-white/40">From</p>
              <p className="font-satoshi font-medium text-sm text-white truncate">
                {displaySender}
              </p>
            </div>
          </div>

          {/* Arrow divider */}
          <div className="flex justify-center my-3">
            <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center">
              <ArrowDown className="w-4 h-4 text-white/40" />
            </div>
          </div>

          {/* To */}
          <div className="flex items-center gap-3">
            {recipientAvatar ? (
              <img
                src={recipientAvatar}
                alt={recipientName || ''}
                className="w-9 h-9 rounded-full object-cover border border-white/15 flex-shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                <span className="font-clash font-semibold text-xs text-white">
                  {recipientName
                    ? recipientName[0].toUpperCase()
                    : recipientAddress
                      ? recipientAddress.slice(2, 4).toUpperCase()
                      : '?'}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-satoshi text-xs text-white/40">To</p>
              <p className="font-satoshi font-medium text-sm text-white truncate">
                {displayRecipient}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Burn breakdown — celebrated, not hidden */}
        <motion.div
          className="rounded-xl border border-white/[0.06] overflow-hidden mb-8"
          variants={staggerChild}
        >
          {/* Burn row — warm accent */}
          <div className="flex items-center justify-between px-4 py-3 bg-orange-500/[0.03] border-b border-white/[0.04]">
            <div className="flex items-center gap-2">
              <Flame className="w-3.5 h-3.5 text-orange-400/60" />
              <span className="font-satoshi text-xs text-orange-300/60">
                Burn (0.1%)
              </span>
            </div>
            <span className="font-mono text-xs text-orange-300/50">
              {formatQF(burnAmountWei)} QF
            </span>
          </div>
          {/* Total row */}
          <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02]">
            <span className="font-satoshi text-xs text-white/40">
              Total deducted
            </span>
            <span className="font-mono text-xs text-white/70 font-medium">
              {formatQF(totalRequiredWei)} QF
            </span>
          </div>
        </motion.div>

        {/* Confirm button */}
        <motion.div variants={staggerChild}>
          <motion.button
            className="w-full bg-white text-[#0040FF] font-satoshi font-semibold text-lg py-4 rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 focus-ring"
            onClick={handleConfirm}
            disabled={buttonState !== 'idle'}
            whileHover={buttonState === 'idle' ? { scale: 1.01, boxShadow: '0 0 30px rgba(255, 255, 255, 0.15)' } : undefined}
            whileTap={buttonState === 'idle' ? { scale: 0.98 } : undefined}
          >
            <AnimatePresence mode="wait">
              {buttonState === 'idle' && (
                <motion.span
                  key="idle"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  Send {formatQF(recipientAmountWei)} QF
                </motion.span>
              )}
              {buttonState === 'signing' && (
                <motion.span
                  key="signing"
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing...
                </motion.span>
              )}
              {buttonState === 'confirmed' && (
                <motion.span
                  key="confirmed"
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <Check className="w-5 h-5" />
                  Sent
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
