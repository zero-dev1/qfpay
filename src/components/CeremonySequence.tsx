import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { delay } from '../utils/delay';
import type { ShimmerBorderRef } from './ShimmerBorder';

// ─── Data ────────────────────────────────────────────────────────────────────

const QF_NAMES = ['vector.qf', 'memechi.qf', 'nova.qf', 'pulse.qf', 'zen.qf'];
const AMOUNTS_RAW = [150, 80, 250, 42, 1000];

function formatAmount(n: number): string {
  return n.toLocaleString('en-US');
}

function burnOf(n: number): string {
  // 0.1% burn = n * 10 / 10000
  const burn = (n * 10) / 10000;
  // Show at least 2 decimal places for small burns
  if (burn < 1) return burn.toFixed(2);
  return burn.toLocaleString('en-US');
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Phase = 'name' | 'amount' | 'preview' | 'burn' | 'sent' | 'complete';

interface CeremonySequenceProps {
  shimmerRef: React.RefObject<ShimmerBorderRef | null>;
  reducedMotion: boolean;
}

// ─── Phase transition motion ─────────────────────────────────────────────────

const PHASE_ENTER = { opacity: 0, filter: 'blur(6px)', y: 10 };
const PHASE_VISIBLE = { opacity: 1, filter: 'blur(0px)', y: 0 };
const PHASE_EXIT = { opacity: 0, filter: 'blur(6px)', y: -10 };
const PHASE_TRANSITION = { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const };

// ─── Phase components ────────────────────────────────────────────────────────

function NamePhase({ name }: { name: string }) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    let i = 0;
    setDisplayed(''); // reset on name change
    const interval = setInterval(() => {
      i++;
      setDisplayed(name.slice(0, i));
      if (i >= name.length) clearInterval(interval);
    }, 130); // slowed from 110 → 130ms per character
    return () => clearInterval(interval);
  }, [name]);

  return (
    <motion.div
      initial={PHASE_ENTER}
      animate={PHASE_VISIBLE}
      exit={PHASE_EXIT}
      transition={PHASE_TRANSITION}
      className="flex items-center justify-center"
    >
      <span className="font-clash font-bold text-[clamp(1.8rem,5vw,2.75rem)] text-[#F0F2F8]">
        {displayed}
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ repeat: Infinity, duration: 0.6, ease: 'easeInOut' }}
          className="text-[#0040FF] ml-[1px]"
        >
          |
        </motion.span>
      </span>
    </motion.div>
  );
}

function AmountPhase({ amount }: { amount: string }) {
  return (
    <motion.div
      initial={PHASE_ENTER}
      animate={PHASE_VISIBLE}
      exit={PHASE_EXIT}
      transition={PHASE_TRANSITION}
      className="flex items-center justify-center"
    >
      <span className="font-clash font-bold text-[clamp(2.2rem,6vw,3.25rem)] text-[#F0F2F8]">
        {amount} <span className="text-[rgba(122,139,171,0.5)]">QF</span>
      </span>
    </motion.div>
  );
}

function PreviewPhase({
  sender,
  receiver,
  amount,
}: {
  sender: string;
  receiver: string;
  amount: string;
}) {
  return (
    <motion.div
      initial={PHASE_ENTER}
      animate={PHASE_VISIBLE}
      exit={PHASE_EXIT}
      transition={PHASE_TRANSITION}
      className="flex flex-col items-center gap-2"
    >
      {/* Sender */}
      <span className="font-clash font-semibold text-[clamp(0.9rem,2.5vw,1.1rem)] text-[rgba(122,139,171,0.7)]">
        {sender}
      </span>

      {/* Trailing sapphire line — top to bottom */}
      <div className="relative w-[1.5px] h-12 bg-[rgba(255,255,255,0.04)] overflow-hidden rounded-full">
        <motion.div
          className="absolute top-0 left-0 w-full rounded-full"
          style={{
            height: '33%',
            background: '#0040FF',
            boxShadow: '0 0 8px 2px rgba(0,64,255,0.35)',
          }}
          animate={{ y: ['0%', '200%'] }}
          transition={{
            repeat: Infinity,
            duration: 1.4,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Amount */}
      <span className="font-clash font-bold text-[clamp(1.4rem,4vw,2rem)] text-[#F0F2F8]">
        {amount} <span className="text-[rgba(122,139,171,0.5)]">QF</span>
      </span>

      {/* Trailing sapphire line — second pulse with offset */}
      <div className="relative w-[1.5px] h-12 bg-[rgba(255,255,255,0.04)] overflow-hidden rounded-full">
        <motion.div
          className="absolute top-0 left-0 w-full rounded-full"
          style={{
            height: '33%',
            background: '#0040FF',
            boxShadow: '0 0 8px 2px rgba(0,64,255,0.35)',
          }}
          animate={{ y: ['0%', '200%'] }}
          transition={{
            repeat: Infinity,
            duration: 1.4,
            ease: 'easeInOut',
            delay: 0.35,
          }}
        />
      </div>

      {/* Receiver */}
      <span className="font-clash font-semibold text-[clamp(0.9rem,2.5vw,1.1rem)] text-[#F0F2F8]">
        {receiver}
      </span>
    </motion.div>
  );
}

function BurnPhase({ burnAmount }: { burnAmount: string }) {
  return (
    <motion.div
      initial={PHASE_ENTER}
      animate={PHASE_VISIBLE}
      exit={PHASE_EXIT}
      transition={PHASE_TRANSITION}
      className="flex flex-col items-center justify-center"
    >
      <span className="font-clash font-bold text-[clamp(2rem,5vw,3rem)] text-[#FF2D2D]">
        {burnAmount} <span className="text-[rgba(255,45,45,0.5)]">QF</span>
      </span>
      <p className="mt-2 font-clash font-medium text-[0.7rem] text-[rgba(255,45,45,0.5)] uppercase tracking-[0.2em]">
        burned
      </p>
    </motion.div>
  );
}

function SentPhase({ amount }: { amount: string }) {
  return (
    <motion.div
      initial={PHASE_ENTER}
      animate={PHASE_VISIBLE}
      exit={PHASE_EXIT}
      transition={PHASE_TRANSITION}
      className="flex flex-col items-center justify-center"
    >
      <span className="font-clash font-bold text-[clamp(2rem,5vw,3rem)] text-[#F0F2F8]">
        {amount} <span className="text-[rgba(122,139,171,0.5)]">QF</span>
      </span>
      <p className="mt-2 font-clash font-medium text-[0.7rem] text-[rgba(122,139,171,0.5)] uppercase tracking-[0.2em]">
        sent
      </p>
    </motion.div>
  );
}

function CompletePhase() {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', damping: 18, stiffness: 280 }}
      className="flex items-center justify-center"
    >
      <svg width="56" height="56" viewBox="0 0 64 64" fill="none">
        <motion.path
          d="M16 33L27 44L48 20"
          stroke="#FFFFFF"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.45, ease: 'easeOut', delay: 0.1 }}
        />
      </svg>
    </motion.div>
  );
}

function StaticLayout() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center gap-5">
      <span className="font-clash font-bold text-[clamp(1.8rem,5vw,2.75rem)] text-[#F0F2F8]">
        vector.qf
      </span>
      <span className="font-clash font-bold text-[clamp(2.2rem,6vw,3.25rem)] text-[#F0F2F8]">
        150 <span className="text-[rgba(122,139,171,0.5)]">QF</span>
      </span>
      <svg width="56" height="56" viewBox="0 0 64 64" fill="none">
        <path
          d="M16 33L27 44L48 20"
          stroke="#FFFFFF"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// ─── Main choreography ───────────────────────────────────────────────────────

export function CeremonySequence({
  shimmerRef,
  reducedMotion,
}: CeremonySequenceProps) {
  const [phase, setPhase] = useState<Phase>('name');
  const [loopIndex, setLoopIndex] = useState(0);
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  // Current loop data
  const name = QF_NAMES[loopIndex % QF_NAMES.length];
  const amountRaw = AMOUNTS_RAW[loopIndex % AMOUNTS_RAW.length];
  const amountStr = formatAmount(amountRaw);
  const burnStr = burnOf(amountRaw);

  // Abortable delay — resolves immediately if the controller is aborted
  const abortableDelay = useCallback(
    (ms: number): Promise<void> =>
      new Promise((resolve) => {
        const signal = abortRef.current?.signal;
        if (signal?.aborted) {
          resolve();
          return;
        }
        const timer = setTimeout(resolve, ms);
        signal?.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            resolve();
          },
          { once: true }
        );
      }),
    []
  );

  // Safe state setter — only updates if still mounted and not aborted
  const safeSetPhase = useCallback(
    (p: Phase) => {
      if (mountedRef.current && !abortRef.current?.signal.aborted) {
        setPhase(p);
      }
    },
    []
  );

  useEffect(() => {
    mountedRef.current = true;

    // Reduced motion — show static layout, no loop
    if (reducedMotion) return;

    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      const shimmer = shimmerRef.current;
      const signal = controller.signal;
      const check = () => !signal.aborted && mountedRef.current;

      // ── Beat 1 — Name types in ────────────────────────────────
      // ~130ms × ~10 chars = ~1.3s typing + 1.2s settle = ~2.5s
      safeSetPhase('name');
      await abortableDelay(2800);
      if (!check()) return;
      if (shimmer) await shimmer.pulse(2);  // +600ms
      if (!check()) return;

      // ── Breath ────────────────────────────────────────────────
      await abortableDelay(500);
      if (!check()) return;

      // ── Beat 2 — Amount lands ─────────────────────────────────
      safeSetPhase('amount');
      await abortableDelay(1400);
      if (!check()) return;
      if (shimmer) await shimmer.pulse(2);  // +600ms
      if (!check()) return;

      // ── Breath ────────────────────────────────────────────────
      await abortableDelay(500);
      if (!check()) return;

      // ── Beat 3 — Transaction preview ──────────────────────────
      safeSetPhase('preview');
      await abortableDelay(2200);
      if (!check()) return;
      if (shimmer) await shimmer.pulse(1);  // +300ms
      if (!check()) return;

      // ── Breath ────────────────────────────────────────────────
      await abortableDelay(400);
      if (!check()) return;

      // ── Beat 4 — Burn ─────────────────────────────────────────
      shimmer?.setColor('crimson');
      safeSetPhase('burn');
      await abortableDelay(400);           // let crimson paint
      if (!check()) return;
      if (shimmer) await shimmer.pulse(2);  // +600ms
      if (!check()) return;
      await abortableDelay(600);
      if (!check()) return;

      // ── Beat 5 — Sent ─────────────────────────────────────────
      shimmer?.setColor('sapphire');
      safeSetPhase('sent');
      await abortableDelay(1400);
      if (!check()) return;

      // ── Breath ────────────────────────────────────────────────
      await abortableDelay(400);
      if (!check()) return;

      // ── Beat 6 — Complete ─────────────────────────────────────
      safeSetPhase('complete');
      await abortableDelay(400);           // let checkmark draw
      if (!check()) return;
      if (shimmer) await shimmer.flood();   // +500ms
      if (!check()) return;
      await abortableDelay(1800);          // hold the blue
      if (!check()) return;

      // ── Beat 7 — Reset ────────────────────────────────────────
      if (shimmer) await shimmer.dissipate(); // +500ms
      if (!check()) return;
      await abortableDelay(600);
      if (!check()) return;

      // ── Next loop ─────────────────────────────────────────────
      if (mountedRef.current) {
        setLoopIndex((prev) => prev + 1);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [loopIndex, reducedMotion, shimmerRef, safeSetPhase, abortableDelay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ── Reduced motion: static ──
  if (reducedMotion) {
    return <StaticLayout />;
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center p-6">
      <AnimatePresence mode="wait">
        {phase === 'name' && <NamePhase key={`name-${loopIndex}`} name={name} />}
        {phase === 'amount' && (
          <AmountPhase key={`amount-${loopIndex}`} amount={amountStr} />
        )}
        {phase === 'preview' && (
          <PreviewPhase
            key={`preview-${loopIndex}`}
            sender="you.qf"
            receiver={name}
            amount={amountStr}
          />
        )}
        {phase === 'burn' && (
          <BurnPhase key={`burn-${loopIndex}`} burnAmount={burnStr} />
        )}
        {phase === 'sent' && (
          <SentPhase key={`sent-${loopIndex}`} amount={amountStr} />
        )}
        {phase === 'complete' && <CompletePhase key={`complete-${loopIndex}`} />}
      </AnimatePresence>
    </div>
  );
}
