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

function App() {
  const { address, disconnect } = useWalletStore();
  const { phase } = usePaymentStore();

  const getBackgroundStyle = (): React.CSSProperties => {
    switch (phase) {
      case 'burn':
        return { background: 'linear-gradient(to top, #E85D25, #C13333, #0A0A0A)' };
      case 'sending':
        return { backgroundColor: '#00D179' };
      case 'success':
        return { backgroundColor: '#0052FF' };
      case 'recipient':
      case 'amount':
      case 'preview':
      case 'broadcasting':
        return { backgroundColor: '#0052FF' };
      default:
        return { backgroundColor: '#0A0A0A' };
    }
  };

  const isAnimating = phase === 'burn' || phase === 'sending' || phase === 'success';
  const showLogout = !!address && !isAnimating;

  return (
    <motion.div
      className="min-h-screen w-full relative overflow-hidden"
      animate={getBackgroundStyle()}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
    >
      {/* Logout button — top right, always visible when connected */}
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
        {!address ? (
          <DisconnectedView key="disconnected" />
        ) : (
          <>
            {phase === 'idle' && <IdentityScreen key="identity" />}
            {phase === 'recipient' && <RecipientScreen key="recipient" />}
            {phase === 'amount' && <AmountScreen key="amount" />}
            {(phase === 'preview' || phase === 'broadcasting') && <ConfirmScreen key="confirm" />}
            {isAnimating && <AnimationSequence key="animation" />}
            {phase === 'error' && <IdentityScreen key="error" />}
          </>
        )}
      </AnimatePresence>

      <WalletModal />
      <Toast />
    </motion.div>
  );
}

export default App;
