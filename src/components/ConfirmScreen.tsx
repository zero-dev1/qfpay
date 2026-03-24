import { motion } from 'framer-motion';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useWalletStore } from '../stores/walletStore';
import { usePaymentStore } from '../stores/paymentStore';
import { formatQF } from '../utils/qfpay';
import { writeContract } from '../utils/contractCall';
import { QFPAY_ROUTER_ADDRESS, ROUTER_ABI } from '../config/contracts';
import { isRetryableError, RETRY_MESSAGE_SHORT } from '../utils/errorHelpers';
import { showToast } from './Toast';

export const ConfirmScreen = () => {
  const { ss58Address } = useWalletStore();
  const {
    phase,
    recipientName,
    recipientAddress,
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
  const displayRecipient = recipientName ? `${recipientName}.qf` : recipientAddress?.slice(0, 8) + '...' + recipientAddress?.slice(-4);

  const handleConfirm = async () => {
    if (!recipientAddress || !ss58Address) {
      setError('Missing recipient or sender information');
      return;
    }

    setBroadcasting();

    try {
      // New contract: send(address to, uint256 intendedAmount)
      // msg.value = intendedAmount + burn = totalRequiredWei
      const { txHash, confirmation } = await writeContract(
        QFPAY_ROUTER_ADDRESS,
        ROUTER_ABI,
        'send',
        [recipientAddress, recipientAmountWei],
        null,
        totalRequiredWei
      );

      startAnimation(txHash);

      confirmation.then(({ confirmed, error }) => {
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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4 }}
    >
      {/* Back button */}
      {!isBroadcasting && (
        <motion.button
          className="fixed top-6 left-6 z-50 p-2.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          onClick={goBackToAmount}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <ArrowLeft className="w-5 h-5 text-white/40 hover:text-white/70" />
        </motion.button>
      )}

      <motion.p
        className="font-satoshi text-white/30 text-sm uppercase tracking-widest mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        Confirm Payment
      </motion.p>

      {/* Big amount */}
      <motion.h1
        className="font-clash font-bold text-7xl sm:text-8xl md:text-9xl text-white mb-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
      >
        {formatQF(recipientAmountWei)}
      </motion.h1>

      <motion.p
        className="font-clash text-2xl text-white/30 mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
      >
        QF
      </motion.p>

      {/* Arrow */}
      <motion.p
        className="text-white/20 text-3xl mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        ↓
      </motion.p>

      {/* Recipient */}
      <motion.p
        className="font-clash font-semibold text-2xl sm:text-3xl text-qfpay-green mb-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
      >
        {displayRecipient}
      </motion.p>

      {/* Breakdown */}
      <motion.div
        className="space-y-1.5 mb-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
      >
        <p className="text-center text-sm">
          <span className="text-white/30">Burn: </span>
          <span className="text-qfpay-burn font-mono">{formatQF(burnAmountWei)} QF</span>
        </p>
        <p className="text-center text-sm">
          <span className="text-white/30">Total cost: </span>
          <span className="text-white/50 font-mono">{formatQF(totalRequiredWei)} QF</span>
        </p>
      </motion.div>

      {/* Confirm button */}
      <motion.button
        className="bg-qfpay-blue hover:bg-qfpay-blue-hover text-white font-satoshi font-semibold text-lg px-16 py-4 rounded-2xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        onClick={handleConfirm}
        disabled={isBroadcasting}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.4 }}
        whileHover={!isBroadcasting ? { scale: 1.02 } : {}}
        whileTap={!isBroadcasting ? { scale: 0.98 } : {}}
      >
        {isBroadcasting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Signing...
          </>
        ) : (
          'Confirm'
        )}
      </motion.button>
    </motion.div>
  );
};
