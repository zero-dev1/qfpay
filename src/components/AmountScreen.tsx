import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { usePaymentStore } from '../stores/paymentStore';
import { useWalletStore } from '../stores/walletStore';
import { getQFBalance, formatQF, calculateBurn, truncateAddress } from '../utils/qfpay';
import { parseQFAmount, isValidAmountInput } from '../utils/parseAmount';
import { GAS_BUFFER } from '../config/contracts';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { EASE_OUT_EXPO, EASE_SPRING } from '../lib/animations';
import { BRAND_BLUE, BG_SURFACE, BURN_CRIMSON } from '../lib/colors';

// ─── Keyboard height — used for container bottom padding ─────────────────────
const KEYBOARD_HEIGHT = 268;

// ─── Custom keyboard layout ───────────────────────────────────────────────────
const DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

export const AmountScreen = () => {
  const {
    recipientName, recipientAddress, recipientAvatar,
    setAmount, goToPreview, goBackToRecipient,
  } = usePaymentStore();
  const { ss58Address, address } = useWalletStore();

  const [amountInput, setAmountInput] = useState('');
  const [balance,     setBalance]     = useState<bigint>(0n);
  const [waveKey,     setWaveKey]     = useState(0);

  const prevCanContinueRef = useRef(false);
  const longPressRef       = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load balance ──
  useEffect(() => {
    const addr = ss58Address || address;
    if (addr) getQFBalance(addr).then(setBalance);
  }, [ss58Address, address]);

  // ─── Calculation logic — copied verbatim ────────────────────────────────────
  const amountWei = amountInput ? parseQFAmount(amountInput) : 0n;
  const { burnAmount, recipientAmount, totalRequired } = calculateBurn(amountWei);
  const insufficientBalance = amountWei > 0n && totalRequired + GAS_BUFFER > balance;
  const canContinue = amountWei > 0n && !insufficientBalance && !!recipientAddress;
  const maxSendableWei = balance > GAS_BUFFER
    ? ((balance - GAS_BUFFER) * 10000n) / 10010n
    : 0n;

  // ── Fire sapphire wave on underline when canContinue first becomes true ──
  useEffect(() => {
    if (canContinue && !prevCanContinueRef.current) {
      setWaveKey(k => k + 1);
    }
    prevCanContinueRef.current = canContinue;
  }, [canContinue]);

  // ─── Balance display — brightens as amount approaches limit ─────────────────
  const balanceRatio  = balance > 0n ? Number(totalRequired) / Number(balance) : 0;
  const balanceOpacity = insufficientBalance
    ? 1
    : Math.min(0.30 + balanceRatio * 0.70, 1);
  const balanceColor = insufficientBalance
    ? 'rgba(245,158,11,0.90)'
    : `rgba(255,255,255,${balanceOpacity.toFixed(2)})`;

  // ─── Keyboard handlers ────────────────────────────────────────────────────

  const handleKey = (key: string) => {
    hapticLight();
    if (key === 'MAX') {
      if (maxSendableWei <= 0n) return;
      // Convert wei to plain decimal string, strip trailing zeros
      const raw = (Number(maxSendableWei) / 1e18).toFixed(6).replace(/\.?0+$/, '');
      setAmountInput(raw);
      return;
    }
    if (key === '⌫') {
      setAmountInput(prev => prev.slice(0, -1));
      return;
    }
    if (key === '.') {
      if (amountInput.includes('.')) return;
      setAmountInput(prev => (prev === '' ? '0.' : prev + '.'));
      return;
    }
    // Digit
    const next = amountInput === '0' ? key : amountInput + key;
    if (isValidAmountInput(next)) setAmountInput(next);
  };

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
      className="flex flex-col items-center min-h-screen px-6 pt-12 relative"
      style={{ paddingBottom: KEYBOARD_HEIGHT }}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
    >
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

      {/* ── Recipient presence — top-center, avatar travels via layoutId ── */}
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

        {/* Name.qf below avatar */}
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

      {/* ── Balance line — JetBrains Mono 11px, brightens as limit approaches ── */}
      <motion.p
        className="font-mono mb-6 text-center"
        style={{ fontSize: 11, color: balanceColor, transition: 'color 0.3s ease' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        {formatQF(balance)} QF
      </motion.p>

      {/* ── Amount display ── */}
      <div className="flex items-baseline justify-center gap-3 mb-4 w-full">
        <span
          className="font-clash font-bold text-center"
          style={{
            fontSize: 'clamp(3rem, 10vw, 6rem)',
            letterSpacing: '-0.02em',
            color: amountInput ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.20)',
            minWidth: 40,
          }}
        >
          {amountInput || '0'}
        </span>
        <span
          className="font-clash font-bold"
          style={{ fontSize: 'clamp(1.25rem, 3vw, 2rem)', color: `${BRAND_BLUE}cc` }}
        >
          QF
        </span>
      </div>

      {/* ── Sapphire underline — wave animates when canContinue becomes true ── */}
      <motion.div
        key={waveKey}
        style={{
          width: 'clamp(160px, 50%, 320px)',
          height: 2,
          borderRadius: 1,
          background: canContinue ? BRAND_BLUE : 'rgba(0,64,255,0.30)',
        }}
        initial={{ scaleX: waveKey > 0 ? 0.4 : 1, originX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
      />

      {/* ── Burn line — appears when any amount is typed ── */}
      <AnimatePresence>
        {amountWei > 0n && (
          <motion.p
            className="font-satoshi mt-4 text-center"
            style={{ fontSize: 12 }}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1,  y:  0 }}
            exit={{    opacity: 0,  y: -4 }}
            transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
          >
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>
              {formatQF(totalRequired)} QF leaves your wallet ·{' '}
            </span>
            <span style={{ color: `${BURN_CRIMSON}99` }}>
              🔥 {formatQF(burnAmount)} burns
            </span>
          </motion.p>
        )}
      </AnimatePresence>

      {/* ── Insufficient balance — amber inline, no card ── */}
      <AnimatePresence>
        {insufficientBalance && (
          <motion.p
            className="font-satoshi mt-2 text-center"
            style={{ fontSize: 13, color: 'rgba(245,158,11,0.85)' }}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1,  y:  0 }}
            exit={{    opacity: 0,  y: -4 }}
            transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
          >
            Insufficient balance
          </motion.p>
        )}
      </AnimatePresence>

      {/* ── Continue chevron › ── */}
      <AnimatePresence>
        {canContinue && (
          <motion.button
            className="mt-6 focus-ring"
            style={{ fontSize: '1.75rem', lineHeight: 1, color: 'rgba(255,255,255,0.50)' }}
            onClick={() => {
              hapticMedium();
              setAmount(amountInput, amountWei, burnAmount, recipientAmount, totalRequired);
              goToPreview();
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1,  y:  0 }}
            exit={{    opacity: 0,  y:  6 }}
            transition={{ ...EASE_SPRING }}
            whileHover={{ color: 'rgba(255,255,255,0.90)' }}
            whileTap={{ scale: 0.92 }}
            aria-label="Continue"
          >
            ›
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Custom keyboard — fixed bottom, full width ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 px-3 pt-3 pb-safe-bottom"
        style={{
          background: 'rgba(6,10,20,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
        }}
      >
        {/* Digit rows 1–9 */}
        {DIGIT_ROWS.map((row) => (
          <div key={row.join('')} className="flex gap-2 mb-2">
            {row.map((key) => (
              <KeyButton key={key} label={key} onTap={() => handleKey(key)} />
            ))}
          </div>
        ))}

        {/* Bottom row: . 0 MAX ⌫ */}
        <div className="flex gap-2">
          <KeyButton label="." onTap={() => handleKey('.')} />
          <KeyButton label="0" onTap={() => handleKey('0')} />
          <KeyButton
            label="MAX"
            onTap={() => handleKey('MAX')}
            variant="sapphire"
            disabled={maxSendableWei <= 0n}
          />
          <KeyButton
            label="⌫"
            onTap={() => { handleKey('⌫'); }}
            onLongPressStart={startLongPress}
            onLongPressEnd={cancelLongPress}
          />
        </div>
      </div>
    </motion.div>
  );
};

// ─── KeyButton — individual keyboard key ─────────────────────────────────────

interface KeyButtonProps {
  label:             string;
  onTap:             () => void;
  onLongPressStart?: () => void;
  onLongPressEnd?:   () => void;
  variant?:          'default' | 'sapphire';
  disabled?:         boolean;
}

function KeyButton({
  label, onTap, onLongPressStart, onLongPressEnd,
  variant = 'default', disabled = false,
}: KeyButtonProps) {
  const isSapphire = variant === 'sapphire';

  return (
    <motion.button
      className="flex-1 flex items-center justify-center font-clash font-bold select-none focus-ring"
      style={{
        height: 54,
        borderRadius: 12,
        fontSize: label === 'MAX' ? '0.8rem' : '1.25rem',
        background: isSapphire
          ? `rgba(0,64,255,0.12)`
          : 'rgba(255,255,255,0.06)',
        border: `1px solid ${isSapphire ? 'rgba(0,64,255,0.20)' : 'rgba(255,255,255,0.08)'}`,
        color: isSapphire
          ? BRAND_BLUE
          : 'rgba(255,255,255,0.85)',
        opacity: disabled ? 0.30 : 1,
        cursor: disabled ? 'not-allowed' : 'default',
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
      whileTap={disabled ? undefined : { scale: 0.96 }}
    >
      {label}
    </motion.button>
  );
}
