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
import { GAS_BUFFER, QFPAY_ROUTER_ADDRESS } from '../config/contracts';
import { truncateAddress } from '../utils/qfpay';

export const SendForm = () => {
  const { displayName, ss58Address, address, disconnect } = useWalletStore();
  const { 
    recipientName, 
    recipientAddress, 
    setRecipient, 
    setAmount, 
    goToPreview 
  } = usePaymentStore();

  const [recipientInput, setRecipientInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [balance, setBalance] = useState<bigint>(0n);
  const [isResolving, setIsResolving] = useState(false);
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const [selfSendError, setSelfSendError] = useState(false);

  const routerNotDeployed = QFPAY_ROUTER_ADDRESS === '0x0000000000000000000000000000000000000000';

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

  useEffect(() => {
    const timer = setTimeout(() => {
      resolveRecipient(recipientInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [recipientInput, resolveRecipient]);

  useEffect(() => {
    if (ss58Address) {
      getQFBalance(ss58Address).then(setBalance);
    }
  }, [ss58Address]);

  const amountWei = amountInput ? parseQFAmount(amountInput) : 0n;
  const { burnAmount, recipientAmount } = calculateBurn(amountWei);

  const isFormValid = 
    recipientAddress && 
    amountWei > 0n && 
    !resolutionError && 
    !selfSendError &&
    !routerNotDeployed &&
    amountWei + GAS_BUFFER <= balance;

  const displayRecipientName = recipientName ? `${recipientName}.qf` : null;

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="bg-qfpay-card rounded-2xl border border-white/5 p-6 sm:p-8 w-full max-w-md">
        {/* Header: avatar + name + balance */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-qfpay-blue/30 flex items-center justify-center">
              <span className="text-qfpay-blue font-clash font-semibold text-sm">
                {(displayName || '?')[0].toUpperCase()}
              </span>
            </div>
            <span className="font-satoshi text-white font-medium">
              {displayName || truncateAddress(address || '')}
            </span>
          </div>
          <span className="font-mono text-white text-sm">
            {formatQF(balance)} QF
          </span>
        </div>

        {/* TO field */}
        <div className="mb-6">
          <label className="block text-qfpay-secondary text-xs uppercase tracking-wider mb-2">
            To
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="name.qf or address"
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
              className={`w-full bg-white/5 border rounded-xl px-4 py-3.5 pr-10 text-white text-lg placeholder-white/30 focus:outline-none transition-colors ${
                resolutionError 
                  ? 'border-qfpay-error' 
                  : recipientAddress 
                    ? 'border-qfpay-green/50' 
                    : 'border-white/10 focus:border-white/20'
              }`}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {isResolving && <Loader2 className="w-5 h-5 text-qfpay-secondary animate-spin" />}
              {!isResolving && recipientAddress && <Check className="w-5 h-5 text-qfpay-green" />}
              {!isResolving && resolutionError && <X className="w-5 h-5 text-qfpay-error" />}
            </div>
          </div>
          {recipientAddress && !resolutionError && (
            <p className="text-xs text-qfpay-green mt-1.5">
              {displayRecipientName || truncateAddress(recipientAddress)}
            </p>
          )}
          {resolutionError && (
            <p className="text-xs text-qfpay-error mt-1.5">{resolutionError}</p>
          )}
        </div>

        {/* AMOUNT field */}
        <div className="mb-4">
          <label className="block text-qfpay-secondary text-xs uppercase tracking-wider mb-2">
            Amount
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={amountInput}
              onChange={(e) => {
                if (isValidAmountInput(e.target.value)) {
                  setAmountInput(e.target.value);
                }
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 pr-14 text-white text-lg placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
            />
            <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/40 font-mono text-sm">
              QF
            </span>
          </div>
        </div>

        {/* Quick amounts */}
        <div className="flex gap-2 mb-6">
          {[10, 50, 100, 500].map((amount) => (
            <button
              key={amount}
              className={`flex-1 border rounded-lg py-2 text-sm transition-colors ${
                amountInput === amount.toString()
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-transparent border-white/10 text-white/50 hover:text-white hover:border-white/20'
              }`}
              onClick={() => setAmountInput(amount.toString())}
            >
              {amount}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-white/5 mb-4" />

        {/* Burn + receives breakdown */}
        {amountWei > 0n && (
          <div className="mb-6 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-white/40">0.1% burn:</span>
              <span className="text-qfpay-burn font-mono">{formatQF(burnAmount)} QF</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40">
                {displayRecipientName || 'Recipient'} receives:
              </span>
              <span className="text-qfpay-green font-mono">{formatQF(recipientAmount)} QF</span>
            </div>
          </div>
        )}

        {/* Warnings */}
        {amountWei > 0n && amountWei + GAS_BUFFER > balance && (
          <div className="mb-4 p-3 bg-qfpay-error/10 border border-qfpay-error/20 rounded-lg">
            <p className="text-qfpay-error text-sm">
              Insufficient balance. Need {formatQF(amountWei + GAS_BUFFER)} QF total.
            </p>
          </div>
        )}

        {routerNotDeployed && (
          <div className="mb-4 p-3 bg-qfpay-warning/10 border border-qfpay-warning/20 rounded-lg">
            <p className="text-qfpay-warning text-sm">
              QFPay router contract not yet deployed. Sending is disabled.
            </p>
          </div>
        )}

        {/* Send button */}
        <button
          className="w-full bg-qfpay-blue hover:bg-qfpay-blue-hover text-white font-satoshi font-semibold py-4 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-lg"
          disabled={!isFormValid}
          onClick={() => {
            setAmount(amountInput, amountWei, burnAmount, recipientAmount);
            goToPreview();
          }}
        >
          {amountWei > 0n && recipientAddress ? `Send ${formatQF(amountWei)} QF` : 'Send'}
        </button>
      </div>
    </motion.div>
  );
};
