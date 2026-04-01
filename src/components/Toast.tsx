import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { EASE_OUT_EXPO } from '../lib/animations';
import { SUCCESS_GREEN, BURN_CRIMSON } from '../lib/colors';

// ─── Store types ─────────────────────────────────────────────────────────────

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

// ─── Store — copied verbatim from original ───────────────────────────────────

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

// ─── Visual helpers ───────────────────────────────────────────────────────────

const TOAST_STYLES: Record<ToastMessage['type'], { bg: string; border: string; color: string }> = {
  success: {
    bg:     `rgba(0, 209, 121, 0.06)`,
    border: `1px solid rgba(0, 209, 121, 0.15)`,
    color:  SUCCESS_GREEN,
  },
  warning: {
    bg:     `rgba(245, 158, 11, 0.06)`,
    border: `1px solid rgba(245, 158, 11, 0.15)`,
    color:  '#F59E0B',
  },
  error: {
    bg:     `rgba(185, 28, 28, 0.06)`,
    border: `1px solid rgba(185, 28, 28, 0.15)`,
    color:  BURN_CRIMSON,
  },
};

// ─── Icon — animated checkmark for success, inline symbol otherwise ──────────

const ToastIcon = ({ type }: { type: ToastMessage['type'] }) => {
  const { color } = TOAST_STYLES[type];

  if (type === 'success') {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        className="flex-shrink-0 mt-0.5"
      >
        <motion.path
          d="M3 8L6.5 11.5L13 4.5"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
        />
      </svg>
    );
  }

  return (
    <span
      className="flex-shrink-0 font-mono text-base leading-none mt-0.5 select-none"
      style={{ color }}
    >
      {type === 'warning' ? '!' : '×'}
    </span>
  );
};

// ─── Single toast item ────────────────────────────────────────────────────────

const ToastItem = ({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}) => {
  const { bg, border, color } = TOAST_STYLES[toast.type];
  const isError = toast.type === 'error';

  return (
    <motion.div
      layout
      style={{
        background: bg,
        border,
        borderRadius: 14,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '11px 14px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.30)',
      }}
      className="flex items-start gap-3 w-full"
      initial={{ opacity: 0, y: isError ? 12 : -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: isError ? 12 : -12, scale: 0.97 }}
      transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
    >
      <ToastIcon type={toast.type} />

      <p
        className="font-satoshi text-sm font-medium flex-1 leading-snug"
        style={{ color }}
      >
        {toast.message}
      </p>

      {/* Error only: manual dismiss */}
      {isError && (
        <button
          onClick={() => onDismiss(toast.id)}
          className="flex-shrink-0 transition-opacity hover:opacity-80"
          style={{ opacity: 0.45, color, fontSize: '0.8rem', lineHeight: 1 }}
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </motion.div>
  );
};

// ─── Toast renderer ───────────────────────────────────────────────────────────

export const Toast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const update = () => setToasts([...toastStore.toasts]);
    listeners.add(update);
    update();
    return () => { listeners.delete(update); };
  }, []);

  const topToasts    = toasts.filter((t) => t.type !== 'error');
  const bottomToasts = toasts.filter((t) => t.type === 'error');

  return (
    <>
      {/* Success + Warning — slide down from top */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] flex flex-col gap-2 pointer-events-none w-full max-w-sm px-4">
        <AnimatePresence>
          {topToasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onDismiss={(id) => toastStore.removeToast(id)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Error — slide up from bottom, never auto-dismiss */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] flex flex-col gap-2 pointer-events-none w-full max-w-sm px-4">
        <AnimatePresence>
          {bottomToasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onDismiss={(id) => toastStore.removeToast(id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </>
  );
};
