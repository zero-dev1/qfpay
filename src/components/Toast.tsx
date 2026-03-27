import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { EASE_OUT_EXPO } from '../lib/animations';

interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error';
  message: string;
  duration?: number;
}

interface ToastStore {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  clearErrors: () => void;
}

let toastStore: ToastStore = {
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
  clearErrors: () => {},
};

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function createToastStore(): ToastStore {
  const store: ToastStore = {
    toasts: [],
    addToast: (toast) => {
      const id = Math.random().toString(36).substr(2, 9);
      const newToast = { ...toast, id };

      if (toast.type === 'error') {
        store.toasts = store.toasts.filter((t) => t.type !== 'error');
      }

      if (store.toasts.length >= 3) {
        store.toasts = store.toasts.slice(1);
      }

      store.toasts.push(newToast);

      if (toast.type !== 'error') {
        setTimeout(() => {
          store.removeToast(id);
        }, toast.duration || (toast.type === 'success' ? 3000 : 7000));
      }

      notifyListeners();
    },
    removeToast: (id) => {
      store.toasts = store.toasts.filter((t) => t.id !== id);
      notifyListeners();
    },
    clearErrors: () => {
      store.toasts = store.toasts.filter((t) => t.type !== 'error');
      notifyListeners();
    },
  };

  return store;
}

toastStore = createToastStore();

export const showToast = (
  type: ToastMessage['type'],
  message: string,
  duration?: number
) => {
  toastStore.addToast({ type, message, duration });
};

// Type-specific icon component
const ToastIcon = ({ type }: { type: ToastMessage['type'] }) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="w-4 h-4 flex-shrink-0" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 flex-shrink-0" />;
    case 'error':
      return <XCircle className="w-4 h-4 flex-shrink-0" />;
  }
};

// Type-specific styles
const getToastStyles = (type: ToastMessage['type']): string => {
  switch (type) {
    case 'success':
      return 'bg-qfpay-green/[0.08] border-qfpay-green/[0.15] text-qfpay-green';
    case 'warning':
      return 'bg-qfpay-warning/[0.08] border-qfpay-warning/[0.15] text-qfpay-warning';
    case 'error':
      return 'bg-qfpay-error/[0.08] border-qfpay-error/[0.15] text-qfpay-error';
  }
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

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] space-y-2 pointer-events-none w-full max-w-md px-4">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{
              opacity: 0,
              y: toast.type === 'error' ? 12 : -12,
              scale: 0.96,
            }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              y: toast.type === 'error' ? 12 : -12,
              scale: 0.96,
            }}
            transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border backdrop-blur-md ${getToastStyles(
              toast.type
            )}`}
          >
            <ToastIcon type={toast.type} />
            <p className="font-satoshi text-sm font-medium flex-1 leading-snug">
              {toast.message}
            </p>
            {toast.type === 'error' && (
              <button
                onClick={() => toastStore.removeToast(toast.id)}
                className="opacity-50 hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5"
              >
                <X size={14} />
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
