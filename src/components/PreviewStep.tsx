import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useWalletStore } from '../stores/walletStore';
import { usePaymentStore } from '../stores/paymentStore';
import { formatQF } from '../utils/qfpay';
import { writeContract } from '../utils/contractCall';
import { QFPAY_ROUTER_ADDRESS, ROUTER_ABI } from '../config/contracts';
import { isRetryableError, RETRY_MESSAGE_SHORT } from '../utils/errorHelpers';
import { showToast } from './Toast';

export const PreviewStep = () => {
  const { ss58Address } = useWalletStore();
  const { 
    phase, 
    recipientName, 
    recipientAddress, 
    amountWei,
    burnAmountWei,
    recipientAmountWei,
    goBackToForm,
    setBroadcasting,
    startAnimation,
    setConfirmation,
    setError
  } = usePaymentStore();

  const isBroadcasting = phase === 'broadcasting';
  const displayRecipientName = recipientName ? `${recipientName}.qf` : recipientAddress?.slice(0, 8) + '...' + recipientAddress?.slice(-6);

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
        [recipientAddress, amountWei],
        null,
        amountWei + burnAmountWei
      );

      startAnimation(txHash);

      confirmation.then(({ confirmed, error }) => {
        setConfirmation(confirmed, error);
      });

    } catch (err: any) {
      const msg = err?.message || 'Transaction failed';
      
      if (isRetryableError(msg)) {
        showToast('warning', RETRY_MESSAGE_SHORT);
        goBackToForm();
      } else {
        showToast('error', msg);
        goBackToForm();
      }
    }
  };

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-4"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-qfpay-card rounded-2xl border border-white/5 p-8 w-full max-w-md text-center">
        {/* Title */}
        <h2 className="font-clash font-bold text-2xl text-white mb-8">
          Confirm Payment
        </h2>
        
        {/* Big amount */}
        <div className="mb-2">
          <p className="font-clash font-bold text-6xl text-white">
            {formatQF(amountWei)}
          </p>
          <p className="text-white/40 text-lg mt-1">QF</p>
        </div>

        {/* Arrow */}
        <div className="text-white/30 text-2xl my-4">↓</div>

        {/* Recipient */}
        <p className="font-satoshi font-semibold text-xl text-qfpay-green mb-6">
          {displayRecipientName}
        </p>

        {/* Breakdown */}
        <div className="space-y-1 mb-8">
          <p className="text-sm">
            <span className="text-white/40">Burn: </span>
            <span className="text-qfpay-burn font-mono">{formatQF(burnAmountWei)} QF</span>
          </p>
          <p className="text-sm">
            <span className="text-white/40">Receives: </span>
            <span className="text-qfpay-green font-mono">{formatQF(recipientAmountWei)} QF</span>
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            className="flex-1 bg-transparent border border-white/10 hover:border-white/20 text-white font-satoshi font-medium py-3.5 rounded-xl transition-colors disabled:opacity-50"
            onClick={goBackToForm}
            disabled={isBroadcasting}
          >
            Back
          </button>
          
          <button
            className="flex-1 bg-qfpay-blue hover:bg-qfpay-blue-hover text-white font-satoshi font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            onClick={handleConfirm}
            disabled={isBroadcasting}
          >
            {isBroadcasting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing...
              </>
            ) : (
              'Confirm'
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
