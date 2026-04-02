import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { delay } from '../utils/delay';
import type { CeremonyPhase, BorderState, CeremonyLoop, CeremonySequenceProps, ShimmerBorderRef } from '../types/ceremony';

// ─── Data ────────────────────────────────────────────────────────────────────

const CEREMONY_DATA: CeremonyLoop[] = [
  { name: 'satoshi.qf', amount: 1000, sender: 'vitalik.qf' },
  { name: 'alice.qf', amount: 250, sender: 'bob.qf' },
  { name: 'nakamoto.qf', amount: 5000, sender: 'hal.qf' },
];

// ─── Directional transition variants ─────────────────────────────────────────

const transitionVariants = {
  enter: {
    opacity: 0,
    x: 20,
    filter: 'blur(6px)',
  },
  center: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
  },
  exit: {
    opacity: 0,
    x: -15,
    filter: 'blur(6px)',
  },
};

// ─── Phase content renderer ─────────────────────────────────────────────────

function renderPhaseContent(phase: CeremonyPhase) {
  switch (phase.type) {
    case 'name':
      return (
        <div className="text-center">
          <span className="font-clash text-[clamp(28px,5vw,40px)] font-semibold text-[#F0F2F8]">
            {phase.text}
          </span>
          {phase.cursor && (
            <span className="inline-block w-[2px] h-[1.1em] bg-[#0040FF] ml-0.5 animate-cursor-blink align-middle" />
          )}
        </div>
      );

    case 'amount':
      return (
        <div className="text-center">
          <span className="font-clash text-[clamp(36px,7vw,56px)] font-semibold text-[#F0F2F8]">
            {phase.text}
          </span>
          {phase.cursor && (
            <span className="inline-block w-[2px] h-[1.1em] bg-[#0040FF] ml-0.5 animate-cursor-blink align-middle" />
          )}
          {phase.text.length > 0 && (
            <span className="font-clash text-[clamp(18px,3vw,24px)] font-medium text-[rgba(122,139,171,0.5)] ml-2">
              QF
            </span>
          )}
        </div>
      );

    case 'preview':
      return (
        <div className="flex flex-col items-center justify-center gap-3 h-full">
          <span className="font-clash text-[clamp(13px,2.2vw,16px)] text-[rgba(122,139,171,0.7)]">
            {phase.sender}
          </span>
          <div className="w-px h-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0040FF] to-transparent animate-pulse-down" />
          </div>
          <span className="font-clash text-[clamp(28px,5vw,40px)] font-semibold text-[#F0F2F8]">
            {phase.amount.toLocaleString('en-US')}
            <span className="text-[rgba(122,139,171,0.5)] ml-1 text-[0.5em]">QF</span>
          </span>
          <div className="w-px h-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0040FF] to-transparent animate-pulse-down" />
          </div>
          <span className="font-clash text-[clamp(13px,2.2vw,16px)] text-[#F0F2F8]">
            {phase.receiver}
          </span>
        </div>
      );

    case 'burn':
      return (
        <div className="flex flex-col items-center justify-center gap-2">
          <span className="font-clash text-[clamp(32px,6vw,48px)] font-semibold text-[#FF2D2D]">
            {phase.amount.toLocaleString('en-US', {
              minimumFractionDigits: phase.amount % 1 === 0 ? 1 : undefined,
            })}
          </span>
          <span className="font-clash text-[clamp(10px,1.8vw,13px)] font-medium uppercase tracking-[0.15em] text-[rgba(255,45,45,0.7)]">
            burned
          </span>
        </div>
      );

    case 'sent':
      return (
        <div className="flex flex-col items-center justify-center gap-2">
          <span className="font-clash text-[clamp(32px,6vw,48px)] font-semibold text-[#F0F2F8]">
            {phase.amount.toLocaleString('en-US')}
          </span>
          <span className="font-clash text-[clamp(10px,1.8vw,13px)] font-medium uppercase tracking-[0.15em] text-[rgba(122,139,171,0.5)]">
            sent
          </span>
        </div>
      );

    case 'complete':
      return (
        <div className="flex items-center justify-center relative z-10">
          <svg
            viewBox="0 0 40 40"
            className="w-[clamp(40px,8vw,64px)] h-[clamp(40px,8vw,64px)]"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.path
              d="M10 20 L17 27 L30 13"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, ease: [0.65, 0, 0.35, 1] }}
            />
          </svg>
        </div>
      );

    case 'empty':
      return <div className="w-1 h-1" />;

    default:
      return <div className="w-1 h-1" />;
  }
}

// ─── Async ceremony loop ─────────────────────────────────────────────────────

async function runCeremonyLoop(
  signal: AbortSignal,
  setPhase: (phase: CeremonyPhase) => void,
  shimmerRef: React.RefObject<ShimmerBorderRef | null>,
  loopIndex: number,
) {
  const data = CEREMONY_DATA[loopIndex % CEREMONY_DATA.length];
  const burnAmount = Math.round(data.amount * 10) / 10000;
  const sentAmount = data.amount;

  const shimmer = () => shimmerRef.current;

  // BEAT 1 — Name typing
  setPhase({ type: 'name', text: '', cursor: true });
  shimmer()?.setMode('trace');
  shimmer()?.setColor('sapphire');
  shimmer()?.setSpeed('ambient');

  for (let i = 0; i <= data.name.length; i++) {
    await delay(130, signal);
    setPhase({ type: 'name', text: data.name.slice(0, i), cursor: true });
  }

  // Name resolved — single confident shimmer lap
  shimmer()?.setSpeed('confirm');
  await delay(1200, signal);
  shimmer()?.setSpeed('ambient');
  await delay(500, signal); // breath

  // BEAT 2 — Amount typing (AnimatePresence handles the dissolve)
  const amountStr = data.amount.toLocaleString('en-US');
  setPhase({ type: 'amount', text: '', cursor: true });
  await delay(100, signal); // let exit/enter animate

  for (let i = 0; i <= amountStr.length; i++) {
    await delay(100, signal);
    setPhase({ type: 'amount', text: amountStr.slice(0, i), cursor: true });
  }

  // Amount confirmed
  shimmer()?.setSpeed('confirm');
  await delay(1200, signal);
  shimmer()?.setSpeed('ambient');
  await delay(500, signal);

  // BEAT 3 — Preview
  setPhase({
    type: 'preview',
    sender: data.sender,
    receiver: data.name,
    amount: data.amount,
  });

  shimmer()?.setMode('bloom');
  await delay(1800, signal);
  shimmer()?.setMode('trace');
  shimmer()?.setSpeed('ambient');
  await delay(400, signal);

  // BEAT 4 — Burn
  setPhase({ type: 'burn', amount: burnAmount });
  shimmer()?.setMode('hold');
  shimmer()?.setColor('crimson');
  await delay(1000, signal);

  // BEAT 5 — Sent (crimson → sapphire cross-fade)
  shimmer()?.setColor('sapphire');
  shimmer()?.setMode('trace');
  shimmer()?.setSpeed('fast');
  setPhase({ type: 'sent', amount: sentAmount });
  await delay(1400, signal);
  shimmer()?.setSpeed('ambient');
  await delay(400, signal);

  // BEAT 6 — Complete (checkmark + flood SIMULTANEOUSLY)
  setPhase({ type: 'complete' });
  // Small head start for checkmark to begin drawing
  await delay(200, signal);
  // Use the imperative flood() which returns a promise
  if (shimmer()?.flood) {
    await shimmer()!.flood();
  }
  await delay(1800, signal); // hold the triumph

  // BEAT 7 — Reset via imperative drain
  setPhase({ type: 'empty' });
  if (shimmer()?.drain) {
    await shimmer()!.drain();
  }
  await delay(600, signal); // empty breath
}

// ─── Main component ──────────────────────────────────────────────────────────

export function CeremonySequence({
  shimmerRef,
  reducedMotion,
}: CeremonySequenceProps) {
  const [phase, setPhase] = useState<CeremonyPhase>({ type: 'empty' });
  const [phaseKey, setPhaseKey] = useState(0);
  const prevPhaseType = useRef<string>('empty');

  // Increment key only when phase TYPE changes
  useEffect(() => {
    if (phase.type !== prevPhaseType.current) {
      prevPhaseType.current = phase.type;
      setPhaseKey((prev) => prev + 1);
    }
  }, [phase.type]);

  useEffect(() => {
    if (reducedMotion) return;

    const controller = new AbortController();
    let loopIndex = 0;

    async function loop() {
      while (!controller.signal.aborted) {
        try {
          await runCeremonyLoop(
            controller.signal,
            setPhase,
            shimmerRef,
            loopIndex,
          );
          loopIndex++;
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return;
          throw e;
        }
      }
    }

    loop();
    return () => controller.abort();
  }, [reducedMotion, shimmerRef]);

  if (reducedMotion) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <span className="font-clash text-[clamp(14px,2.5vw,18px)] text-[rgba(122,139,171,0.7)]">
          vitalik.qf
        </span>
        <span className="font-clash text-[clamp(28px,5vw,40px)] font-semibold text-[#F0F2F8]">
          1,000 <span className="text-[rgba(122,139,171,0.5)] text-[0.5em]">QF</span>
        </span>
        <span className="font-clash text-[clamp(14px,2.5vw,18px)] text-[#F0F2F8]">
          satoshi.qf
        </span>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center p-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={phaseKey}
          variants={transitionVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            duration: 0.4,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="absolute inset-0 flex flex-col items-center justify-center"
        >
          {renderPhaseContent(phase)}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
