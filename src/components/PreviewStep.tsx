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

  const handleConfirm = async () => {
    if (!recipientAddress || !ss58Address) {
      setError('Missing recipient or sender information');
      return;
    }

    setBroadcasting();

    try {
      // writeContract handles getting the signer internally

      const { txHash, confirmation } = await writeContract(
        QFPAY_ROUTER_ADDRESS,
        ROUTER_ABI,
        'send',
        [recipientAddress],
        null,
        amountWei
      );

      // Broadcast received - start animation immediately
      startAnimation(txHash);

      // Track confirmation in background
      confirmation.then(({ confirmed, error }) => {
        setConfirmation(confirmed, error);
      });

    } catch (err: any) {
      const msg = err?.message || 'Transaction failed';
      
      if (isRetryableError(msg)) {
        // Show amber toast with retry message
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="bg-qfpay-card rounded-2xl border border-white/5 p-8 w-full max-w-md">
        <h2 className="font-clash font-semibold text-2xl text-white mb-6">
          Preview Payment
        </h2>
        
        <div className="space-y-6 mb-6">
          {/* Amount */}
          <div className="text-center">
            <p className="text-qfpay-secondary text-sm mb-2">Sending</p>
            <p className="font-satoshi text-3xl text-white">
              {formatQF(amountWei)} QF
            </p>
          </div>
          
          {/* Recipient */}
          <div className="text-center">
            <p className="text-qfpay-secondary text-sm mb-2">to</p>
            <p className="font-satoshi text-xl text-white">
              {recipientName ? `${recipientName}.qf` : recipientAddress?.slice(0, 8) + '...' + recipientAddress?.slice(-6)}
            </p>
          </div>
          
          {/* Breakdown */}
          <div className="border-t border-white/10 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-qfpay-secondary">Total amount</span>
              <span className="text-white">{formatQF(amountWei)} QF</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-qfpay-secondary">Burn (0.1%)</span>
              <span className="text-qfpay-burn">{formatQF(burnAmountWei)} QF</span>
            </div>
            <div className="flex justify-between text-sm font-medium">
              <span className="text-qfpay-secondary">Recipient receives</span>
              <span className="text-qfpay-green">{formatQF(recipientAmountWei)} QF</span>
            </div>
          </div>
        </div>

        {/* Gas Notice */}
        <div className="mb-6 p-3 bg-white/5 rounded-lg">
          <p className="text-qfpay-secondary text-xs text-center">
            Plus network fees (~0.5 QF for gas)
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-satoshi font-medium py-3 rounded-xl transition-colors disabled:opacity-50"
            onClick={goBackToForm}
            disabled={isBroadcasting}
          >
            Back
          </button>
          
          <button
            className="flex-1 bg-qfpay-blue hover:bg-qfpay-blue-hover text-white font-satoshi font-medium py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            onClick={handleConfirm}
            disabled={isBroadcasting}
          >
            {isBroadcasting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Confirming...
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
