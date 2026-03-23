import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { useWalletStore } from '../stores/walletStore';
import { usePaymentStore } from '../stores/paymentStore';
import { 
  resolveForward, 
  getQFBalance, 
  formatQF, 
  calculateBurn
} from '../utils/qfpay';
import { parseQFAmount, isValidAmountInput } from '../utils/parseAmount';
import { detectAddressType, ss58ToEvmAddress } from '../utils/address';
import { GAS_BUFFER } from '../config/contracts';
import { truncateAddress } from '../utils/qfpay';

export const SendForm = () => {
  const { displayName, ss58Address, disconnect } = useWalletStore();
  const { 
    recipientName, 
    recipientAddress, 
    setRecipient, 
    setAmount, 
    goToPreview 
  } = usePaymentStore();

  // Form state
  const [recipientInput, setRecipientInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [balance, setBalance] = useState<bigint>(0n);
  const [isResolving, setIsResolving] = useState(false);
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const [selfSendError, setSelfSendError] = useState(false);

  // Debounced resolution
  const resolveRecipient = useCallback(async (input: string) => {
    if (!input.trim()) {
      setRecipient(null, null);
      setResolutionError(null);
      setSelfSendError(false);
      return;
    }

    const addressType = detectAddressType(input);
    let resolvedAddress: string | null = null;
    let resolvedName: string | null = null;

    try {
      setIsResolving(true);
      setResolutionError(null);

      switch (addressType) {
        case 'qf-name':
          resolvedAddress = await resolveForward(input);
          if (resolvedAddress) {
            resolvedName = input.replace('.qf', '');
          } else {
            setResolutionError('Name not found');
          }
          break;

        case 'evm-address':
          resolvedAddress = input;
          break;

        case 'ss58-address':
          resolvedAddress = ss58ToEvmAddress(input);
          break;

        default:
          setResolutionError('Invalid address format');
      }

      // Check for self-send
      const { address: senderAddress } = useWalletStore.getState();
      if (senderAddress && resolvedAddress && resolvedAddress.toLowerCase() === senderAddress.toLowerCase()) {
        setSelfSendError(true);
        setResolutionError('Cannot send to yourself');
        resolvedAddress = null;
        resolvedName = null;
      } else {
        setSelfSendError(false);
      }

      setRecipient(resolvedName, resolvedAddress);
    } catch (error) {
      setResolutionError('Resolution failed');
      setRecipient(null, null);
    } finally {
      setIsResolving(false);
    }
  }, [ss58Address, setRecipient]);

  // Debounced effect
  useEffect(() => {
    const timer = setTimeout(() => {
      resolveRecipient(recipientInput);
    }, 400);

    return () => clearTimeout(timer);
  }, [recipientInput, resolveRecipient]);

  // Fetch balance on mount
  useEffect(() => {
    if (ss58Address) {
      getQFBalance(ss58Address).then(setBalance);
    }
  }, [ss58Address]);

  // Calculate burn and recipient amounts
  const amountWei = amountInput ? parseQFAmount(amountInput) : 0n;
  const { burnAmount, recipientAmount } = calculateBurn(amountWei);

  // Validation
  const isFormValid = 
    recipientAddress && 
    amountWei > 0n && 
    !resolutionError && 
    !selfSendError &&
    amountWei + GAS_BUFFER <= balance;

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="bg-qfpay-card rounded-2xl border border-white/5 p-8 w-full max-w-md">
        {/* Sender Info */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-qfpay-secondary text-sm mb-1">From</p>
            <p className="font-satoshi text-white">
              {displayName || 'Unknown'}
            </p>
          </div>
          <button
            className="text-qfpay-secondary hover:text-white transition-colors text-sm"
            onClick={disconnect}
          >
            Disconnect
          </button>
        </div>

        {/* Balance */}
        <div className="mb-6">
          <p className="text-qfpay-secondary text-sm mb-1">Balance</p>
          <p className="font-satoshi text-white text-xl">
            {formatQF(balance)} QF available
          </p>
        </div>

        {/* Recipient Input */}
        <div className="mb-4">
          <label className="block text-qfpay-secondary text-sm mb-2">
            Recipient
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Enter .qf name or address"
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
              className={`w-full bg-white/5 border rounded-xl px-4 py-3 pr-10 text-white placeholder-qfpay-secondary focus:outline-none transition-colors ${
                resolutionError 
                  ? 'border-qfpay-error' 
                  : recipientAddress 
                    ? 'border-qfpay-green' 
                    : 'border-white/10 focus:border-qfpay-blue'
              }`}
            />
            
            {/* Status indicator */}
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {isResolving && (
                <Loader2 className="w-4 h-4 text-qfpay-secondary animate-spin" />
              )}
              {!isResolving && recipientAddress && (
                <Check className="w-4 h-4 text-qfpay-green" />
              )}
              {!isResolving && resolutionError && (
                <X className="w-4 h-4 text-qfpay-error" />
              )}
            </div>
          </div>
          
          {/* Resolution feedback */}
          {recipientAddress && !resolutionError && (
            <p className="text-xs text-qfpay-green mt-1">
              {recipientName ? `${recipientName}.qf` : truncateAddress(recipientAddress)}
            </p>
          )}
          {resolutionError && (
            <p className="text-xs text-qfpay-error mt-1">{resolutionError}</p>
          )}
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <label className="block text-qfpay-secondary text-sm mb-2">
            Amount
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="0.00"
              value={amountInput}
              onChange={(e) => {
                if (isValidAmountInput(e.target.value)) {
                  setAmountInput(e.target.value);
                }
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-qfpay-secondary focus:outline-none focus:border-qfpay-blue transition-colors"
            />
            <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-qfpay-secondary">
              QF
            </span>
          </div>
        </div>

        {/* Quick Amount Buttons */}
        <div className="flex gap-2 mb-6">
          {[10, 50, 100, 500].map((amount) => (
            <button
              key={amount}
              className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg py-2 text-qfpay-secondary hover:text-white transition-colors text-sm"
              onClick={() => setAmountInput(amount.toString())}
            >
              {amount}
            </button>
          ))}
        </div>

        {/* Burn Preview */}
        {amountWei > 0n && (
          <div className="mb-6 p-3 bg-white/5 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-qfpay-secondary">0.1% burn</span>
              <span className="text-qfpay-burn">{formatQF(burnAmount)} QF</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-qfpay-secondary">Receives</span>
              <span className="text-qfpay-green">{formatQF(recipientAmount)} QF</span>
            </div>
          </div>
        )}

        {/* Insufficient balance warning */}
        {amountWei > 0n && amountWei + GAS_BUFFER > balance && (
          <div className="mb-4 p-3 bg-qfpay-error/10 border border-qfpay-error/20 rounded-lg">
            <p className="text-qfpay-error text-sm">
              Insufficient balance. Need {formatQF(amountWei + GAS_BUFFER)} QF total.
            </p>
          </div>
        )}

        {/* Send Button */}
        <button
          className="w-full bg-qfpay-blue hover:bg-qfpay-blue-hover text-white font-satoshi font-medium py-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!isFormValid}
          onClick={() => {
            setAmount(amountInput, amountWei, burnAmount, recipientAmount);
            goToPreview();
          }}
        >
          Send
        </button>
      </div>
    </motion.div>
  );
};
