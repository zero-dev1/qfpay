import { motion, AnimatePresence } from 'framer-motion';
import { useWalletStore } from './stores/walletStore';
import { usePaymentStore } from './stores/paymentStore';
import { DisconnectedView } from './components/DisconnectedView';
import { WalletModal } from './components/WalletModal';
import { SendForm } from './components/SendForm';
import { PreviewStep } from './components/PreviewStep';
import { AnimationSequence } from './components/AnimationSequence';
import { Toast } from './components/Toast';

function App() {
  const { address } = useWalletStore();
  const { phase } = usePaymentStore();

  const getBackgroundColor = () => {
    switch (phase) {
      case 'burn':
        return '#C13333';
      case 'sending':
        return '#00D179';
      case 'success':
        return '#0052FF';
      default:
        return '#0A0A0A';
    }
  };

  return (
    <motion.div
      className="min-h-screen w-full relative"
      animate={{ backgroundColor: getBackgroundColor() }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
    >
      <AnimatePresence mode="wait">
        {!address ? (
          <DisconnectedView key="disconnected" />
        ) : (
          <>
            {phase === 'idle' && <SendForm key="send" />}
            {phase === 'preview' && <PreviewStep key="preview" />}
            {phase === 'broadcasting' && <PreviewStep key="broadcasting" />}
            {(phase === 'burn' || phase === 'sending' || phase === 'success') && (
              <AnimationSequence key="animation" />
            )}
            {phase === 'error' && <SendForm key="error" />}
          </>
        )}
      </AnimatePresence>

      <WalletModal />
      <Toast />
    </motion.div>
  );
}

export default App;
