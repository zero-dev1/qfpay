import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
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
import { LogOut, WifiOff } from 'lucide-react';
import { EASE_OUT_EXPO } from './lib/animations';
import { BG_PRIMARY, BRAND_BLUE_DEEP } from './lib/colors';

function App() {
  const { address, disconnect } = useWalletStore();
  const { phase } = usePaymentStore();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

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
    phase === 'burn' || phase === 'sending' || phase === 'success';
  const showLogout = !!address && !isAnimating;

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
        return { key: 'error', element: <IdentityScreen /> };
      case 'idle':
      default:
        return { key: 'identity', element: <IdentityScreen /> };
    }
  };

  const { key, element } = getScreen();

  return (
    <motion.div
      className="min-h-screen w-full relative overflow-hidden"
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

      {/* ── Logout button ── */}
      <AnimatePresence>
        {showLogout && (
          <motion.button
            className="fixed top-6 right-6 z-50 p-2.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.06] transition-all focus-ring"
            onClick={disconnect}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            title="Disconnect wallet"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <LogOut className="w-4 h-4 text-white/50" />
          </motion.button>
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
  );
}

export default App;
