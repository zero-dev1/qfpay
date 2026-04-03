import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';

import { useWalletStore } from '../stores/walletStore';
import { getQFBalance, formatQF, truncateAddress } from '../utils/qfpay';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { BG_SURFACE, SUCCESS_GREEN, BRAND_BLUE } from '../lib/colors';
import { EASE_OUT_EXPO } from '../lib/animations';
import { AvatarFallback } from './AvatarFallback';

export function ConnectedPill() {
  const { qnsName, address, ss58Address, avatarUrl, disconnect } = useWalletStore();

  const [balance, setBalance]           = useState<bigint | null>(null);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied]             = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(
    () => localStorage.getItem('qfpay-sound-enabled') !== 'false'
  );

  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Balance — calls getQFBalance on mount ──
  useEffect(() => {
    const addr = ss58Address || address;
    if (addr) getQFBalance(addr).then(setBalance);
  }, [ss58Address, address]);

  // ── Close dropdown on outside tap ──
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    hapticLight();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSoundToggle = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('qfpay-sound-enabled', String(next));
    hapticLight();
  };

  // Loading: ··· QF  |  Masked: •••• QF  |  Revealed: 1,234 QF
  const displayBalance =
    balance === null
      ? '··· QF'
      : balanceVisible
        ? `${formatQF(balance)} QF`
        : '•••• QF';

  const name    = qnsName || truncateAddress(address || '');
  const initial = (qnsName || address || 'W')[0].toUpperCase();

  return (
    <div ref={dropdownRef} className="relative">

      {/* ── Pill body — tap toggles dropdown ── */}
      <motion.div
        className="flex items-center gap-2 cursor-pointer select-none"
        style={{
          background: '#060A14',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 9999,
          padding: '5px 12px 5px 5px',
          transition: 'border-color 0.2s ease',
        }}
        whileHover={{ borderColor: 'rgba(255,255,255,0.15)' }}
        whileTap={{ scale: 0.97 }}
        onClick={() => {
          hapticLight();
          setDropdownOpen(v => !v);
        }}
      >
        {/* Avatar — 40px per spec */}
        <motion.div
          layoutId="user-avatar"
          className="relative flex-shrink-0 rounded-full overflow-hidden"
          style={{ width: 40, height: 40 }}
        >
          <AvatarFallback
            name={qnsName}
            address={address}
            avatarUrl={avatarUrl}
            size={40}
          />

          {/* Presence dot */}
          <div
            className="absolute bottom-0 right-0 rounded-full animate-pulse-glow"
            style={{
              width: 7, height: 7,
              background: SUCCESS_GREEN,
              border: '1.5px solid #060A14',
            }}
          />
        </motion.div>

        {/* Name · .qf */}
        <motion.span
          layoutId="user-name"
          className="font-satoshi font-medium text-sm whitespace-nowrap"
          style={{ color: 'rgba(255,255,255,0.90)' }}
        >
          {name}
          {qnsName && (
            <span style={{ color: `${BRAND_BLUE}d9` }}>.qf</span>
          )}
        </motion.span>

        {/* Square separator dot */}
        <div
          style={{
            width: 4, height: 4, borderRadius: 1,
            background: 'rgba(255,255,255,0.25)',
            flexShrink: 0,
          }}
        />

        {/* Balance — inline in pill */}
        <span
          className="font-mono text-xs whitespace-nowrap selectable"
          style={{ color: `${BRAND_BLUE}cc` }}
        >
          {displayBalance}
        </span>

        {/* Chevron — decorative, dropdown opened by pill onClick */}
        <span
          className="text-xs ml-0.5 select-none"
          style={{ color: 'rgba(255,255,255,0.25)' }}
        >
          ▾
        </span>
      </motion.div>

      {/* ── Dropdown — clear glass, border-radius 12px, spring 150ms ── */}
      <AnimatePresence>
        {dropdownOpen && (
          <motion.div
            className="absolute right-0 mt-2 min-w-[168px] z-50"
            style={{
              background: 'linear-gradient(to bottom, rgba(12,16,25,0.98), rgba(6,10,20,1))',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
              padding: 4,
              boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
            }}
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={   { opacity: 0, scale: 0.95, y: -6 }}
            transition={{ type: 'spring', damping: 24, stiffness: 320, duration: 0.15 }}
          >
            {/* Balance visibility toggle */}
            <motion.button
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-satoshi text-sm"
              style={{ color: 'rgba(255,255,255,0.60)' }}
              onClick={() => { hapticLight(); setBalanceVisible(v => !v); }}
              whileTap={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
            >
              <span>{balanceVisible ? 'Hide balance' : 'Show balance'}</span>
              {balanceVisible
                ? <EyeOff className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.35)' }} />
                : <Eye className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.35)' }} />
              }
            </motion.button>

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 8px' }} />

            {/* Copy address */}
            <motion.button
              className="w-full text-left px-3 py-2.5 rounded-lg font-satoshi text-sm"
              style={{ color: 'rgba(255,255,255,0.60)' }}
              onClick={handleCopy}
              whileTap={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
            >
              {copied ? 'Copied ✓' : 'Copy address'}
            </motion.button>

            {/* Disconnect */}
            <motion.button
              className="w-full text-left px-3 py-2.5 rounded-lg font-satoshi text-sm"
              style={{ color: 'rgba(255,255,255,0.45)' }}
              onClick={() => { hapticMedium(); disconnect(); }}
              whileTap={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
            >
              Disconnect
            </motion.button>

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 8px' }} />

            {/* Sound toggle */}
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="font-satoshi text-sm" style={{ color: 'rgba(255,255,255,0.40)' }}>
                Sound
              </span>
              <button
                onClick={handleSoundToggle}
                className="relative rounded-full transition-colors"
                style={{
                  width: 32, height: 17,
                  background: soundEnabled ? BRAND_BLUE : 'rgba(255,255,255,0.12)',
                  flexShrink: 0,
                }}
                aria-label={soundEnabled ? 'Sound on' : 'Sound off'}
              >
                <motion.div
                  className="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white"
                  animate={{ x: soundEnabled ? 14 : 2 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
