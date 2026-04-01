import { motion, AnimatePresence } from 'framer-motion';
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

const getToastStyles = (type: ToastMessage['type']) => {
  switch (type) {
    case 'success':
      return {
        background: 'rgba(0,209,121,0.06)',
        border: '1px solid rgba(0,209,121,0.15)',
        color: '#00D179',
      }
    case 'warning':
      return {
        background: 'rgba(245,158,11,0.06)',
        border: '1px solid rgba(245,158,11,0.15)',
        color: '#F59E0B',
      }
    case 'error':
      return {
        background: 'rgba(185,28,28,0.06)',
        border: '1px solid rgba(185,28,28,0.15)',
        color: '#B91C1C',
      }
  }
}

const ToastIcon = ({ type }: { type: ToastMessage['type'] }) => {
  const s = getToastStyles(type)
  if (type === 'success') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5">
        <motion.path
          d="M3 8L6.5 11.5L13 4.5"
          stroke={s.color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
        />
      </svg>
    )
  }
  return (
    <span
      className="flex-shrink-0 font-mono text-base leading-none mt-0.5"
      style={{ color: s.color }}
    >
      {type === 'warning' ? '!' : '×'}
    </span>
  )
}

export const Toast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    const updateToasts = () => setToasts([...toastStore.toasts])
    listeners.add(updateToasts)
    updateToasts()
    return () => { listeners.delete(updateToasts) }
  }, [])

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2
                    pointer-events-none w-full max-w-md px-4">
      <AnimatePresence>
        {toasts.map((toast) => {
          const s = getToastStyles(toast.type)
          return (
            <motion.div
              key={toast.id}
              style={{
                background: s.background,
                border: s.border,
                borderRadius: 14,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                padding: '11px 14px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
                color: s.color,
                pointerEvents: 'auto',
              }}
              className="flex items-start gap-3"
              initial={{
                opacity: 0,
                y: toast.type === 'error' ? 8 : -8,
                scale: 0.97,
              }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{
                opacity: 0,
                y: toast.type === 'error' ? 8 : -8,
                scale: 0.97,
              }}
              transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
            >
              <ToastIcon type={toast.type} />
              <p className="font-satoshi text-sm font-medium flex-1 leading-snug">
                {toast.message}
              </p>
              {toast.type === 'error' && (
                <button
                  onClick={() => toastStore.removeToast(toast.id)}
                  className="flex-shrink-0 transition-opacity hover:opacity-100 focus-ring"
                  style={{ opacity: 0.45, color: s.color, fontSize: '0.8rem' }}
                >
                  ✕
                </button>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
