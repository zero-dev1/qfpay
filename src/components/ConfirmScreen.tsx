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
      className="flex flex-col items-center justify-center min-h-screen bg-[#0052FF] px-6"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4 }}
    >
      {!isBroadcasting && (
        <motion.button
          className="fixed top-6 left-6 z-50 p-2.5 rounded-full hover:bg-white/10 transition-colors"
          onClick={goBackToAmount}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <ArrowLeft className="w-5 h-5 text-white/50 hover:text-white" />
        </motion.button>
      )}

      <motion.p
        className="font-satoshi text-white/40 text-sm uppercase tracking-widest mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        Confirm Payment
      </motion.p>

      <motion.h1
        className="font-clash font-bold text-7xl sm:text-8xl md:text-9xl text-white mb-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
      >
        {formatQF(recipientAmountWei)}
      </motion.h1>

      <motion.p
        className="font-clash text-2xl text-white/40 mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
      >
        QF
      </motion.p>

      <motion.p
        className="text-white/60 text-3xl mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        ↓
      </motion.p>

      <motion.p
        className="font-clash font-semibold text-2xl sm:text-3xl text-white mb-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
      >
        {displayRecipient}
      </motion.p>

      <motion.div
        className="space-y-1.5 mb-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
      >
        <p className="text-center text-sm">
          <span className="text-white/50">Burn: </span>
          <span className="text-white/70 font-mono">{formatQF(burnAmountWei)} QF</span>
        </p>
        <p className="text-center text-sm">
          <span className="text-white/50">Total cost: </span>
          <span className="text-white/80 font-mono">{formatQF(totalRequiredWei)} QF</span>
        </p>
      </motion.div>

      <motion.button
        className="bg-white text-[#0052FF] font-satoshi font-semibold text-lg px-16 py-4 rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 hover:bg-white/90"
        onClick={handleConfirm}
        disabled={isBroadcasting}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.4 }}
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
