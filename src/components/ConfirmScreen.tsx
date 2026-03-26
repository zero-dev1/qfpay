import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowLeft, Flame, ArrowDown } from 'lucide-react';
import { useWalletStore } from '../stores/walletStore';
import { usePaymentStore } from '../stores/paymentStore';
import { formatQF } from '../utils/qfpay';
import { writeContract } from '../utils/contractCall';
import { QFPAY_ROUTER_ADDRESS, ROUTER_ABI } from '../config/contracts';
import { isRetryableError, RETRY_MESSAGE_SHORT } from '../utils/errorHelpers';
import { showToast } from './Toast';
import { EASE_OUT_EXPO, staggerContainer, staggerChild } from '../lib/animations';

export const ConfirmScreen = () => {
  const { ss58Address, qnsName: senderName, avatarUrl: senderAvatar } = useWalletStore();
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

  const isBroadcasting = phase === 'broadcasting';
  const displayRecipient = recipientName
    ? `${recipientName}.qf` 
    : recipientAddress
      ? recipientAddress.slice(0, 8) + '...' + recipientAddress.slice(-4)
      : '';

  const displaySender = senderName ? `${senderName}.qf` : 'You';

  const handleConfirm = async () => {
    if (!recipientAddress || !ss58Address) {
      setError('Missing recipient or sender information');
      return;
    }

    setBroadcasting();

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }

    try {
      const { txHash, confirmation } = await writeContract(
        QFPAY_ROUTER_ADDRESS,
        ROUTER_ABI,
        'send',
        [recipientAddress, recipientAmountWei],
        null,
        totalRequiredWei
      );

      startAnimation(txHash);

      const fallbackTimer = setTimeout(() => {
        setConfirmation(true);
      }, 3000);

      confirmation.then(({ confirmed, error }) => {
        clearTimeout(fallbackTimer);
        setConfirmation(confirmed, error);
      });
    } catch (err: any) {
      const msg = err?.message || 'Transaction failed';
      if (isRetryableError(msg)) {
        showToast('warning', RETRY_MESSAGE_SHORT);
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
            className="fixed top-6 left-6 z-50 p-2.5 rounded-full hover:bg-white/10 transition-colors focus-ring"
            onClick={goBackToAmount}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ArrowLeft className="w-5 h-5 text-white/50 hover:text-white transition-colors" />
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

        {/* Burn breakdown — contained card */}
        <motion.div
          className="bg-white/[0.04] rounded-xl border border-white/[0.06] px-4 py-3 mb-8"
          variants={staggerChild}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-white/30" />
              <span className="font-satoshi text-xs text-white/40">
                Burn (0.1%)
              </span>
            </div>
            <span className="font-mono text-xs text-white/50">
              {formatQF(burnAmountWei)} QF
            </span>
          </div>
          <div className="flex items-center justify-between">
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
            className="w-full bg-white text-[#0052FF] font-satoshi font-semibold text-lg py-4 rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 focus-ring"
            onClick={handleConfirm}
            disabled={isBroadcasting}
            whileHover={!isBroadcasting ? { scale: 1.01, boxShadow: '0 0 30px rgba(255, 255, 255, 0.15)' } : undefined}
            whileTap={!isBroadcasting ? { scale: 0.98 } : undefined}
          >
            {isBroadcasting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Signing...
              </>
            ) : (
              <>Send {formatQF(recipientAmountWei)} QF</>
            )}
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
