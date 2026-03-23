import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error';
  message: string;
  duration?: number; // auto-dismiss in ms
}

interface ToastStore {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  clearErrors: () => void;
}

// Simple toast store for Phase 2
let toastStore: ToastStore = {
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
  clearErrors: () => {},
};

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach(listener => listener());
}

// Create store
function createToastStore(): ToastStore {
  const store: ToastStore = {
    toasts: [],
    addToast: (toast) => {
      const id = Math.random().toString(36).substr(2, 9);
      const newToast = { ...toast, id };
      
      // Remove previous error if adding a new error
      if (toast.type === 'error') {
        store.toasts = store.toasts.filter(t => t.type !== 'error');
      }
      
      // Limit to 3 toasts
      if (store.toasts.length >= 3) {
        store.toasts = store.toasts.slice(1);
      }
      
      store.toasts.push(newToast);
      
      // Auto-dismiss for success and warning
      if (toast.type !== 'error') {
        setTimeout(() => {
          store.removeToast(id);
        }, toast.duration || (toast.type === 'success' ? 3000 : 7000));
      }
      
      notifyListeners();
    },
    removeToast: (id) => {
      store.toasts = store.toasts.filter(t => t.id !== id);
      notifyListeners();
    },
    clearErrors: () => {
      store.toasts = store.toasts.filter(t => t.type !== 'error');
      notifyListeners();
    },
  };
  
  return store;
}

// Initialize store
toastStore = createToastStore();

// Export functions for use in components
export const showToast = (type: ToastMessage['type'], message: string, duration?: number) => {
  toastStore.addToast({ type, message, duration });
};

export const Toast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const updateToasts = () => setToasts([...toastStore.toasts]);
    
    listeners.add(updateToasts);
    updateToasts();
    
    return () => {
      listeners.delete(updateToasts);
    };
  }, []);

  const getToastColor = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return 'bg-qfpay-green/10 border-qfpay-green/20 text-qfpay-green';
      case 'warning':
        return 'bg-qfpay-warning/10 border-qfpay-warning/20 text-qfpay-warning';
      case 'error':
        return 'bg-qfpay-error/10 border-qfpay-error/20 text-qfpay-error';
    }
  };

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 space-y-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`pointer-events-auto flex items-center justify-between p-3 rounded-lg border backdrop-blur-sm min-w-[300px] max-w-md ${getToastColor(
              toast.type
            )}`}
          >
            <p className="text-sm font-medium">{toast.message}</p>
            {toast.type === 'error' && (
              <button
                onClick={() => toastStore.removeToast(toast.id)}
                className="ml-3 text-current/60 hover:text-current transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
