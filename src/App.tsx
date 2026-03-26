import { motion, AnimatePresence } from 'framer-motion';
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
import { LogOut } from 'lucide-react';
import { EASE_OUT_EXPO } from './lib/animations';

function App() {
  const { address, disconnect } = useWalletStore();
  const { phase } = usePaymentStore();

  const getBackgroundStyle = (): React.CSSProperties => {
    switch (phase) {
      case 'burn':
        return {
          background: 'linear-gradient(to top, rgba(185, 28, 28, 0.3), #060A14 70%)',
        };
      case 'sending':
        return { backgroundColor: '#060A14' };
      case 'success':
        return { backgroundColor: '#0052FF' };
      case 'recipient':
      case 'amount':
      case 'preview':
      case 'broadcasting':
        return { backgroundColor: '#0052FF' };
      default:
        return { backgroundColor: '#060A14' };
    }
  };

  const isAnimating = phase === 'burn' || phase === 'sending' || phase === 'success';
  const showLogout = !!address && !isAnimating;

  // Determine which single screen to render and its key
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
      className="min-h-screen w-full relative overflow-hidden bg-qfpay-bg"
      style={getBackgroundStyle()}
      animate={{ backgroundColor: getBackgroundStyle().backgroundColor }}
      transition={{ duration: 0.8, ease: EASE_OUT_EXPO }}
    >
      {/* Logout button */}
      <AnimatePresence>
        {showLogout && (
          <motion.button
            className="fixed top-6 right-6 z-50 p-2.5 rounded-full hover:bg-white/10 transition-colors"
            onClick={disconnect}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            title="Disconnect wallet"
          >
            <LogOut className="w-5 h-5 text-white/40 hover:text-white/70" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
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
