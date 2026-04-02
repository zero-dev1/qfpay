import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Flame, Delete } from 'lucide-react';
import { usePaymentStore } from '../stores/paymentStore';
import { useWalletStore } from '../stores/walletStore';
import { getQFBalance, formatQF, calculateBurn, truncateAddress } from '../utils/qfpay';
import { parseQFAmount, isValidAmountInput } from '../utils/parseAmount';
import { GAS_BUFFER } from '../config/contracts';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { EASE_OUT_EXPO, EASE_SPRING } from '../lib/animations';
import { BRAND_BLUE, BURN_CRIMSON } from '../lib/colors';

// ─── Keyboard height — used for container bottom padding on mobile ────────────
const KEYBOARD_HEIGHT = 272;

// ─── Custom keyboard layout — pure 3×4 grid ──────────────────────────────────
const DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];
const BOTTOM_ROW = ['.', '0', 'backspace'];

export const AmountScreen = () => {
  const {
    recipientName, recipientAddress, recipientAvatar,
    setAmount, goToPreview, goBackToRecipient,
  } = usePaymentStore();
  const { ss58Address, address } = useWalletStore();

  const [amountInput, setAmountInput] = useState('');
  const [balance,     setBalance]     = useState<bigint>(0n);
  const [waveKey,     setWaveKey]     = useState(0);
  const [isDesktop,   setIsDesktop]   = useState(() => window.innerWidth >= 1024);

  const prevCanContinueRef = useRef(false);
  const longPressRef       = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Desktop detection — reactive to resize ──
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Load balance ──
  useEffect(() => {
    const addr = ss58Address || address;
    if (addr) getQFBalance(addr).then(setBalance);
  }, [ss58Address, address]);

  // ─── Calculation logic ──────────────────────────────────────────────────────
  const amountWei = amountInput ? parseQFAmount(amountInput) : 0n;
  const { burnAmount, recipientAmount, totalRequired } = calculateBurn(amountWei);
  const insufficientBalance = amountWei > 0n && totalRequired + GAS_BUFFER > balance;
  const canContinue = amountWei > 0n && !insufficientBalance && !!recipientAddress;
  const maxSendableWei = balance > GAS_BUFFER
    ? ((balance - GAS_BUFFER) * 10000n) / 10010n
    : 0n;

  // ── Shortfall for "X QF short" ──
  const shortfallWei = insufficientBalance ? (totalRequired + GAS_BUFFER) - balance : 0n;

  // ── Fire sapphire wave on underline when canContinue first becomes true ──
  useEffect(() => {
    if (canContinue && !prevCanContinueRef.current) {
      setWaveKey(k => k + 1);
    }
    prevCanContinueRef.current = canContinue;
  }, [canContinue]);

  // ─── Key handler ────────────────────────────────────────────────────────────

  const handleKey = useCallback((key: string) => {
    hapticLight();
    if (key === 'MAX') {
      if (maxSendableWei <= 0n) return;
      const raw = (Number(maxSendableWei) / 1e18).toFixed(6).replace(/\.?0+$/, '');
      setAmountInput(raw);
      return;
    }
    if (key === '⌫' || key === 'backspace') {
      setAmountInput(prev => prev.slice(0, -1));
      return;
    }
    if (key === '.') {
      if (amountInput.includes('.')) return;
      setAmountInput(prev => (prev === '' ? '0.' : prev + '.'));
      return;
    }
    const next = amountInput === '0' ? key : amountInput + key;
    if (isValidAmountInput(next)) setAmountInput(next);
  }, [amountInput, maxSendableWei]);

  const startLongPress = () => {
    longPressRef.current = setTimeout(() => {
      hapticMedium();
      setAmountInput('');
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  // ─── Continue action (shared between chevron click and Enter key) ───────────

  const handleContinue = useCallback(() => {
    if (!canContinue) return;
    hapticMedium();
    setAmount(amountInput, amountWei, burnAmount, recipientAmount, totalRequired);
    goToPreview();
  }, [canContinue, amountInput, amountWei, burnAmount, recipientAmount, totalRequired, setAmount, goToPreview]);

  // ── Desktop: Enter key to continue ──
  useEffect(() => {
    if (!isDesktop) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleContinue();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDesktop, handleContinue]);

  // ─── Derived display values ──────────────────────────────────────────────

  const displayRecipientLabel = recipientName
    ? `${recipientName}.qf` 
    : recipientAddress
      ? truncateAddress(recipientAddress)
      : '';

  const avatarInitial = (recipientName || 'W')[0].toUpperCase();

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <motion.div
      className="flex flex-col items-center min-h-[100svh] px-6 relative"
      style={{ paddingBottom: isDesktop ? 0 : KEYBOARD_HEIGHT + 24 }}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
    >
      {/*
        ── ANCHOR GROUP ──
        This is the positionally-stable cluster. It uses a top spacer to push
        itself to ~40% from the top of the available viewport, which keeps
        the visual center of gravity slightly above true-center (more natural).
        The spacer flexes but has a max so it doesn't over-push on tall screens.
        Critically: nothing below the underline is inside this group, so
        adding burn lines / chevron / short message below does NOT shift
        the anchor upward.
      */}
      <div
        className="flex-1"
        style={{ maxHeight: isDesktop ? '30vh' : '22vh' }}
      />
      {/* ── Back chevron ‹ ── */}
      <motion.button
        className="fixed top-5 left-5 z-50 transition-opacity hover:opacity-60"
        style={{ fontSize: '1.75rem', lineHeight: 1, color: 'rgba(255,255,255,0.25)' }}
        onClick={() => { hapticLight(); goBackToRecipient(); }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Back"
      >
        ‹
      </motion.button>

      {/* ── Recipient presence — avatar + name ── */}
      <motion.div
        className="flex flex-col items-center mb-8"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1,  y:  0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: EASE_OUT_EXPO }}
      >
        {/* Avatar — 48px, layoutId shared from RecipientScreen */}
        <motion.div layoutId="recipient-avatar" className="relative mb-2">
          {recipientAvatar ? (
            <img
              src={recipientAvatar}
              alt={displayRecipientLabel}
              className="rounded-full object-cover"
              style={{ width: 48, height: 48, border: '1.5px solid rgba(255,255,255,0.15)' }}
            />
          ) : (
            <div
              className="rounded-full flex items-center justify-center"
              style={{
                width: 48, height: 48,
                background: 'rgba(255,255,255,0.08)',
                border: '1.5px solid rgba(255,255,255,0.15)',
              }}
            >
              <span className="font-clash font-bold text-lg text-white">{avatarInitial}</span>
            </div>
          )}
        </motion.div>

        <span className="font-satoshi font-medium text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
          {recipientName && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.70)' }}>{recipientName}</span>
              <span style={{ color: `${BRAND_BLUE}d9` }}>.qf</span>
            </>
          )}
          {!recipientName && displayRecipientLabel}
        </span>
      </motion.div>

      {/* ── Amount display — tight inline pair + MAX micro-pill ── */}
      <div className="flex items-baseline justify-center mb-4">
        <div className="inline-flex items-baseline gap-2">
          {isDesktop ? (
            <input
              autoFocus
              type="text"
              inputMode="decimal"
              value={amountInput}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || isValidAmountInput(val)) setAmountInput(val);
              }}
              placeholder="0"
              className="font-clash font-bold text-right bg-transparent outline-none border-none"
              style={{
                fontSize: 'clamp(2.5rem, 8vw, 6rem)',
                letterSpacing: '-0.02em',
                color: amountInput ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.20)',
                width: `${Math.max(1, amountInput.length) * 0.65 + 0.5}em`,
                minWidth: '1.2em',
                maxWidth: '80vw',
                caretColor: BRAND_BLUE,
              }}
            />
          ) : (
            <span
              className="font-clash font-bold"
              style={{
                fontSize: 'clamp(2.5rem, 8vw, 6rem)',
                letterSpacing: '-0.02em',
                color: amountInput ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.20)',
              }}
            >
              {amountInput || '0'}
            </span>
          )}
          <span
            className="font-clash font-bold"
            style={{
              fontSize: 'clamp(1.25rem, 3vw, 2rem)',
              color: amountInput
                ? `${BRAND_BLUE}cc` 
                : `${BRAND_BLUE}66`,
              transition: 'color 0.3s ease',
            }}
          >
            QF
          </span>

          {/* MAX micro-pill — only visible when there's a sendable balance */}
          {maxSendableWei > 0n && (
            <motion.button
              className="font-satoshi font-semibold select-none"
              style={{
                fontSize: '0.6rem',
                letterSpacing: '0.08em',
                color: BRAND_BLUE,
                background: 'rgba(0,64,255,0.08)',
                border: '1px solid rgba(0,64,255,0.18)',
                borderRadius: 6,
                padding: '2px 7px',
                marginLeft: 2,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                opacity: amountInput ? 0.55 : 0.85,
                transition: 'opacity 0.3s ease',
              }}
              onClick={() => handleKey('MAX')}
              whileTap={{ scale: 0.92 }}
              aria-label="Set maximum amount"
            >
              MAX
            </motion.button>
          )}
        </div>
      </div>

      {/* ── Underline — four states: dim → typing → valid → amber ── */}
      <motion.div
        key={waveKey}
        style={{
          width: 'clamp(160px, 50%, 320px)',
          height: 2,
          borderRadius: 1,
          background: insufficientBalance
            ? 'rgba(245,158,11,0.70)'
            : canContinue
              ? BRAND_BLUE
              : amountInput
                ? 'rgba(0,64,255,0.45)'
                : 'rgba(0,64,255,0.25)',
          transition: 'background 0.3s ease',
        }}
        initial={{ scaleX: waveKey > 0 ? 0.4 : 1, originX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
      />

      {/* ────────────────────────────────────────────────────────────────────────
          RESULTS AREA — everything below the underline.
          This area grows downward. It does NOT affect the anchor group above.
          ──────────────────────────────────────────────────────────────────────── */}

      {/* ── Burn lines ── */}
      <AnimatePresence>
        {amountWei > 0n && (
          <motion.div
            className="flex flex-col items-center gap-1 mt-4"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
          >
            <p
              className="font-satoshi text-center"
              style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}
            >
              {formatQF(totalRequired)} QF leaves your wallet
            </p>
            <p
              className="font-satoshi text-center inline-flex items-center gap-1"
              style={{ fontSize: 12, color: `${BURN_CRIMSON}99` }}
            >
              <Flame className="w-3 h-3" style={{ color: `${BURN_CRIMSON}99` }} />
              {formatQF(burnAmount)} QF burns
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Shortfall — "{X} QF short" in amber ── */}
      <AnimatePresence>
        {insufficientBalance && (
          <motion.p
            className="font-satoshi mt-2 text-center"
            style={{ fontSize: 13, color: 'rgba(245,158,11,0.85)' }}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
          >
            {formatQF(shortfallWei)} QF short
          </motion.p>
        )}
      </AnimatePresence>

      {/* ── Continue chevron › ── */}
      <AnimatePresence>
        {canContinue && (
          <motion.button
            className="mt-6 focus-ring"
            style={{
              fontSize: isDesktop ? '2.25rem' : '1.75rem',
              lineHeight: 1,
              color: 'rgba(255,255,255,0.50)',
            }}
            onClick={handleContinue}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ ...EASE_SPRING }}
            whileHover={{ color: 'rgba(255,255,255,0.90)' }}
            whileTap={{ scale: 0.92 }}
            aria-label="Continue"
          >
            ›
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Bottom spacer — absorbs remaining space so anchor doesn't shift ── */}
      <div className="flex-1" />

      {/* ── Custom keyboard — mobile only, 3×4 grid, borderless ── */}
      {!isDesktop && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 px-4 pt-4"
          style={{
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
          }}
        >
          {/* Digit rows 1–9 */}
          {DIGIT_ROWS.map((row) => (
            <div key={row.join('')} className="flex mb-1">
              {row.map((key) => (
                <KeyButton key={key} label={key} onTap={() => handleKey(key)} />
              ))}
            </div>
          ))}

          {/* Bottom row: .  0  ⌫  — clean 3-column grid */}
          <div className="flex mb-1">
            <KeyButton label="." onTap={() => handleKey('.')} />
            <KeyButton label="0" onTap={() => handleKey('0')} />
            <KeyButton
              label="backspace"
              onTap={() => handleKey('⌫')}
              onLongPressStart={startLongPress}
              onLongPressEnd={cancelLongPress}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
};

// ─── KeyButton — individual keyboard key ─────────────────────────────────────

interface KeyButtonProps {
  label: string;
  onTap: () => void;
  onLongPressStart?: () => void;
  onLongPressEnd?: () => void;
  disabled?: boolean;
}

function KeyButton({
  label, onTap, onLongPressStart, onLongPressEnd,
  disabled = false,
}: KeyButtonProps) {
  const isBackspace = label === 'backspace';

  return (
    <motion.button
      className="flex-1 flex items-center justify-center select-none"
      style={{
        height: 56,
        borderRadius: 0,
        fontSize: '1.4rem',
        letterSpacing: '-0.01em',
        fontFamily: isBackspace ? undefined : "'Clash Display', sans-serif",
        fontWeight: 600,
        background: 'transparent',
        border: 'none',
        color: isBackspace
          ? 'rgba(255,255,255,0.50)'
          : 'rgba(255,255,255,0.75)',
        opacity: disabled ? 0.25 : 1,
        cursor: disabled ? 'not-allowed' : 'default',
        WebkitTapHighlightColor: 'transparent',
      }}
      disabled={disabled}
      onPointerDown={() => {
        if (disabled) return;
        if (onLongPressStart) onLongPressStart();
      }}
      onPointerUp={() => {
        if (disabled) return;
        if (onLongPressEnd) onLongPressEnd();
        onTap();
      }}
      onPointerLeave={() => {
        if (onLongPressEnd) onLongPressEnd();
      }}
      whileTap={disabled ? undefined : { scale: 0.88, opacity: 0.4 }}
      transition={{ duration: 0.08 }}
    >
      {isBackspace ? (
        <Delete className="w-5 h-5" />
      ) : (
        label
      )}
    </motion.button>
  );
}
