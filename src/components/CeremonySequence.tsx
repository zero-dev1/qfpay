import { useState, useEffect } from 'react';
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
  enter: (direction: 'forward' | 'backward') => ({
    opacity: 0,
    x: direction === 'forward' ? 20 : -20,
    filter: 'blur(6px)',
  }),
  center: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
  },
  exit: (direction: 'forward' | 'backward') => ({
    opacity: 0,
    x: direction === 'forward' ? -20 : 20,
    filter: 'blur(6px)',
  }),
};

// ─── Phase content renderer ─────────────────────────────────────────────────────

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
          {/* QF label appears once typing starts, at reduced opacity */}
          {phase.text.length > 0 && (
            <span className="font-clash text-[clamp(18px,3vw,24px)] font-medium text-[rgba(122,139,171,0.5)] ml-2">
              QF
            </span>
          )}
        </div>
      );

    case 'preview':
      return (
        <div className="flex flex-col items-center justify-center gap-4">
          <span className="font-clash text-[clamp(14px,2.5vw,18px)] text-[rgba(122,139,171,0.7)]">
            {phase.sender}
          </span>
          {/* Sapphire trailing line — directional pulse */}
          <div className="w-px h-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0040FF] to-transparent animate-pulse-down" />
          </div>
          <span className="font-clash text-[clamp(28px,5vw,40px)] font-semibold text-[#F0F2F8]">
            {phase.amount.toLocaleString('en-US')}
            <span className="text-[rgba(122,139,171,0.5)] ml-1 text-[0.5em]">QF</span>
          </span>
          <div className="w-px h-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0040FF] to-transparent animate-pulse-down" />
          </div>
          <span className="font-clash text-[clamp(14px,2.5vw,18px)] text-[#F0F2F8]">
            {phase.receiver}
          </span>
        </div>
      );

    case 'burn':
      return (
        <div className="flex flex-col items-center justify-center gap-2">
          <span className="font-clash text-[clamp(32px,6vw,48px)] font-semibold text-[#FF2D2D]">
            {phase.amount.toLocaleString('en-US', { 
              minimumFractionDigits: phase.amount % 1 === 0 ? 1 : undefined 
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
              transition={{
                duration: 0.5,
                ease: [0.65, 0, 0.35, 1],
              }}
            />
          </svg>
        </div>
      );

    case 'empty':
      return null;
  }
}


// ─── Async ceremony loop ─────────────────────────────────────────────────────

async function runCeremonyLoop(
  signal: AbortSignal,
  setPhase: (phase: CeremonyPhase) => void,
  setBorderState: (state: BorderState) => void,
  shimmerRef: React.RefObject<ShimmerBorderRef | null>,
  loopIndex: number,
) {
  const data = CEREMONY_DATA[loopIndex % CEREMONY_DATA.length];
  const burnAmount = Math.round(data.amount * 10) / 10000;
  // burnAmount for 1000 = 1.0, for 250 = 0.25, for 5000 = 5.0
  const sentAmount = data.amount; // the intended amount (burn is additional)

  // BEAT 1 — Name typing
  setPhase({ type: 'name', text: '', cursor: true });
  setBorderState({ mode: 'trace', color: 'sapphire', speed: 'ambient' });
  
  for (let i = 0; i <= data.name.length; i++) {
    await delay(130, signal);
    setPhase({ type: 'name', text: data.name.slice(0, i), cursor: true });
  }
  
  // Name resolved — single confident shimmer lap
  setBorderState({ mode: 'trace', color: 'sapphire', speed: 'confirm' });
  await delay(1200, signal);  // one full lap at confirm speed
  setBorderState({ mode: 'trace', color: 'sapphire', speed: 'ambient' });
  await delay(500, signal);   // breath
  
  // TRANSITION 1→2: directional dissolve
  setPhase({ type: 'transition', direction: 'forward' });
  await delay(400, signal);   // transition animation duration
  
  // BEAT 2 — Amount typing
  const amountStr = data.amount.toLocaleString('en-US');
  setPhase({ type: 'amount', text: '', cursor: true });
  
  for (let i = 0; i <= amountStr.length; i++) {
    await delay(100, signal);  // faster typing for numbers
    setPhase({ type: 'amount', text: amountStr.slice(0, i), cursor: true });
  }
  
  // Amount confirmed — single confident shimmer lap
  setBorderState({ mode: 'trace', color: 'sapphire', speed: 'confirm' });
  await delay(1200, signal);
  setBorderState({ mode: 'trace', color: 'sapphire', speed: 'ambient' });
  await delay(500, signal);   // breath
  
  // TRANSITION 2→3: directional dissolve
  setPhase({ type: 'transition', direction: 'forward' });
  await delay(400, signal);
  
  // BEAT 3 — Preview (sender → amount → receiver)
  setPhase({
    type: 'preview',
    sender: data.sender,
    receiver: data.name,
    amount: data.amount,
  });
  
  // Bloom — entire border brightens uniformly
  setBorderState({ mode: 'bloom', color: 'sapphire', speed: 'ambient' });
  await delay(1800, signal);  // hold the preview with bloom
  
  // Release bloom — brief breath
  setBorderState({ mode: 'trace', color: 'sapphire', speed: 'ambient' });
  await delay(400, signal);
  
  // BEAT 4 — Burn
  setPhase({
    type: 'burn',
    amount: burnAmount,
  });
  
  // Crimson hold — entire border tints, no tracing
  setBorderState({ mode: 'hold', color: 'crimson', speed: 'ambient' });
  await delay(1000, signal);  // held crimson moment
  
  // BEAT 5 — Sent
  // Crimson dissolves back to sapphire (cross-fade handled by CSS transition)
  setBorderState({ mode: 'trace', color: 'sapphire', speed: 'fast' });
  setPhase({
    type: 'sent',
    amount: sentAmount,
  });
  await delay(1400, signal);  // faster lap + hold
  setBorderState({ mode: 'trace', color: 'sapphire', speed: 'ambient' });
  await delay(400, signal);   // breath
  
  // BEAT 6 — Complete (checkmark + flood SIMULTANEOUSLY)
  setPhase({ type: 'complete' });
  await delay(300, signal);   // let checkmark start drawing
  setBorderState({ mode: 'flood', color: 'sapphire', speed: 'ambient' });
  await delay(2000, signal);  // hold the blue flood + checkmark
  
  // BEAT 7 — Reset
  setBorderState({ mode: 'drain', color: 'sapphire', speed: 'ambient' });
  setPhase({ type: 'empty' });
  await delay(800, signal);   // drain animation
  setBorderState({ mode: 'trace', color: 'sapphire', speed: 'ambient' });
  await delay(600, signal);   // empty breath before next loop
}

// ─── Main choreography ───────────────────────────────────────────────────────

export function CeremonySequence({
  shimmerRef,
  reducedMotion,
}: CeremonySequenceProps) {
  const [phase, setPhase] = useState<CeremonyPhase>({ type: 'empty' });

  useEffect(() => {
    // CORRECT — hook always runs, guards internally
    if (reducedMotion) return;
    
    const controller = new AbortController();
    let loopIndex = 0;
    
    async function loop() {
      while (!controller.signal.aborted) {
        try {
          await runCeremonyLoop(
            controller.signal,
            setPhase,
            (state) => {
              // Update shimmer border state
              const shimmer = shimmerRef.current;
              if (shimmer) {
                shimmer.setMode(state.mode);
                shimmer.setColor(state.color);
                shimmer.setSpeed(state.speed);
              }
            },
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

  // ── Reduced motion: static snapshot ──
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
      <AnimatePresence mode="wait" custom="forward">
        <motion.div
          key={phase.type + '-' + Math.random()}  // unique key per phase
          custom="forward"
          variants={transitionVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            duration: 0.4,
            ease: [0.25, 0.46, 0.45, 0.94],  // custom ease
          }}
          className="absolute inset-0 flex flex-col items-center justify-center"
        >
          {renderPhaseContent(phase)}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
