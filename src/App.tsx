import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { useWalletStore } from './stores/walletStore';
import { usePaymentStore } from './stores/paymentStore';
import { DisconnectedView } from './components/DisconnectedView';
import { WalletModal } from './components/WalletModal';
import { IdentityScreen } from './components/IdentityScreen';
import { RecipientScreen } from './components/RecipientScreen';
import { AmountScreen } from './components/AmountScreen';
import { ConfirmScreen } from './components/ConfirmScreen';
import { AnimationSequence } from './components/AnimationSequence';
import { Toast } from './components/Toast';
import { ConnectedPill } from './components/ConnectedPill';
import { WifiOff } from 'lucide-react';
import { EASE_OUT_EXPO } from './lib/animations';
import { BG_PRIMARY, BRAND_BLUE_DEEP } from './lib/colors';

function App() {
  const { address } = useWalletStore();
  const { phase } = usePaymentStore();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [ceremonyComplete, setCeremonyComplete] = useState(false);

  // ── Reset ceremony on disconnect so next connection plays the full sequence ──
  useEffect(() => {
    if (!address) setCeremonyComplete(false);
  }, [address]);

  // Network status listener
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ── Background color: dark throughout, deep blue only at success ──
  const getBackgroundColor = (): string => {
    if (phase === 'success') return BRAND_BLUE_DEEP;
    return BG_PRIMARY;
  };

  const isAnimating =
    phase === 'burn' || phase === 'sending' || phase === 'success'
    || phase === 'preview' || phase === 'broadcasting';

  const handleCeremonyComplete = useCallback(() => setCeremonyComplete(true), []);

  const getScreen = (): { key: string; element: React.ReactNode } => {
    if (!address) {
      return { key: 'disconnected', element: <DisconnectedView /> };
    }
    switch (phase) {
      case 'recipient':
        return { key: 'recipient', element: <RecipientScreen /> };
      case 'amount':
        return { key: 'amount', element: <AmountScreen /> };
      case 'preview':
      case 'broadcasting':
        return { key: 'confirm', element: <ConfirmScreen /> };
      case 'burn':
      case 'sending':
      case 'success':
        return { key: 'animation', element: <AnimationSequence /> };
      case 'error':
        return { key: 'error', element: <IdentityScreen onCeremonyComplete={handleCeremonyComplete} /> };
      case 'idle':
      default:
        return { key: 'identity', element: <IdentityScreen onCeremonyComplete={handleCeremonyComplete} /> };
    }
  };

  const { key, element } = getScreen();

  return (
    <LayoutGroup>
    <motion.div
      className="h-[100svh] w-full relative overflow-hidden"
      animate={{ backgroundColor: getBackgroundColor() }}
      transition={{ duration: 0.8, ease: EASE_OUT_EXPO }}
    >
      {/* ── Offline indicator ── */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            className="fixed top-3 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 px-4 py-2 rounded-full bg-qfpay-warning/[0.08] border border-qfpay-warning/[0.15] backdrop-blur-md"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
          >
            <WifiOff className="w-3.5 h-3.5 text-qfpay-warning" />
            <span className="font-satoshi text-xs font-medium text-qfpay-warning">
              No connection
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Connected pill — session indicator, always top-right when connected ── */}
      <AnimatePresence>
        {!!address && !isAnimating && ceremonyComplete && (
          <motion.div
            className="fixed top-4 right-4 z-50"
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -4 }}
            transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
          >
            <ConnectedPill />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Screen transitions ── */}
      {/* Each screen owns its own entrance/exit animation.        */}
      {/* The outer wrapper only handles mount/unmount keying.     */}
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {element}
        </motion.div>
      </AnimatePresence>

      <WalletModal />
      <Toast />
    </motion.div>
    </LayoutGroup>
  );
}

export default App;
