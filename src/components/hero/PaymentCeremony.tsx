import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { IdentityAnchor } from './IdentityAnchor';
import { CeremonyAtmosphere } from './CeremonyAtmosphere';
import { EASE_OUT_EXPO } from '../../lib/animations';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const SCENARIOS = [
  { from: 'alice', to: 'bob', amount: '50', burn: '0.05' },
  { from: 'dev', to: 'spin', amount: '100', burn: '0.1' },
  { from: 'satoshi', to: 'memechi', amount: '25', burn: '0.025' },
];

type CeremonyPhase = 'idle' | 'ignite' | 'transfer' | 'arrive' | 'rest';

// Phase durations in ms — calibrated for emotional pacing
const DURATIONS = {
  idle: 1200,      // identities visible, space between them
  ignite: 1400,    // amount materializes at center
  transfer: 1600,  // amount moves to recipient
  arrive: 1800,    // checkmark draws, impact ring
  rest: 1200,      // brief void before next cycle
};

export const PaymentCeremony = memo(() => {
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<CeremonyPhase>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scenario = SCENARIOS[index];

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Phase machine
  useEffect(() => {
    if (reducedMotion) return; // static state for reduced motion

    const advance = () => {
      switch (phase) {
        case 'idle':
          timerRef.current = setTimeout(() => setPhase('ignite'), DURATIONS.idle);
          break;
        case 'ignite':
          timerRef.current = setTimeout(() => setPhase('transfer'), DURATIONS.ignite);
          break;
        case 'transfer':
          timerRef.current = setTimeout(() => setPhase('arrive'), DURATIONS.transfer);
          break;
        case 'arrive':
          timerRef.current = setTimeout(() => setPhase('rest'), DURATIONS.arrive);
          break;
        case 'rest':
          timerRef.current = setTimeout(() => {
            setIndex((i) => (i + 1) % SCENARIOS.length);
            setPhase('idle');
          }, DURATIONS.rest);
          break;
      }
    };

    advance();
    return clearTimer;
  }, [phase, reducedMotion, clearTimer]);

  // For reduced motion: show a static completed state
  if (reducedMotion) {
    return (
      <div className="relative w-full max-w-xl mx-auto flex items-center justify-between px-4">
        <IdentityAnchor name={scenario.from} side="left" size={44} />
        <div className="flex flex-col items-center gap-1">
          <span className="font-clash font-bold text-2xl text-white">
            {scenario.amount} <span className="text-white/30">QF</span>
          </span>
          <svg
            className="w-5 h-5 text-qfpay-green"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <IdentityAnchor name={scenario.to} side="right" size={44} />
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto" style={{ minHeight: '140px' }}>
      {/* Atmospheric background layer */}
      <CeremonyAtmosphere phase={phase} />

      {/* The ceremony stage */}
      <div className="relative z-10 flex items-center justify-between px-2 sm:px-4">
        {/* Sender identity — left side */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`sender-${index}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'rest' ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          >
            <IdentityAnchor
              name={scenario.from}
              side="left"
              size={44}
              delay={0}
            />
          </motion.div>
        </AnimatePresence>

        {/* Center stage — amount + trail + checkmark */}
        <div className="flex-1 flex flex-col items-center justify-center relative min-h-[100px]">
          {/* SVG trail line — draws during transfer */}
          <svg
            className="absolute top-1/2 left-0 right-0 -translate-y-1/2"
            style={{ height: '2px', overflow: 'visible' }}
            preserveAspectRatio="none"
          >
            {phase === 'transfer' && (
              <motion.line
                x1="0"
                y1="1"
                x2="100%"
                y2="1"
                stroke="rgba(0, 64, 255, 0.08)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.2, ease: EASE_OUT_EXPO }}
              />
            )}
          </svg>

          <AnimatePresence mode="wait">
            {/* Amount badge — appears during ignite, travels during transfer */}
            {(phase === 'ignite' || phase === 'transfer') && (
              <motion.div
                key={`amount-${index}`}
                className="flex flex-col items-center gap-1.5"
                initial={{
                  opacity: 0,
                  scale: 0.85,
                  x: 0,
                  letterSpacing: '0.05em',
                }}
                animate={{
                  opacity: phase === 'transfer' ? [1, 1, 0] : 1,
                  scale: phase === 'transfer' ? [1, 0.95, 0.9] : 1,
                  x: phase === 'transfer' ? [0, 60, 140] : 0,
                  letterSpacing: '-0.02em',
                }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{
                  duration: phase === 'transfer' ? 1.4 : 0.5,
                  ease: EASE_OUT_EXPO,
                }}
              >
                <span className="font-clash font-bold text-3xl sm:text-4xl text-white">
                  {scenario.amount}{' '}
                  <span className="text-white/30">QF</span>
                </span>
                {phase === 'ignite' && (
                  <motion.span
                    className="font-mono text-[11px] text-orange-300/40"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.4, ease: EASE_OUT_EXPO }}
                  >
                    {scenario.burn} QF burned
                  </motion.span>
                )}
              </motion.div>
            )}

            {/* Checkmark — draws during arrive phase */}
            {phase === 'arrive' && (
              <motion.div
                key={`check-${index}`}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <svg
                  className="w-8 h-8"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <motion.path
                    d="M5 13l4 4L19 7"
                    stroke="#00D179"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
                  />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Recipient identity — right side */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`recipient-${index}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'rest' ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          >
            <IdentityAnchor
              name={scenario.to}
              side="right"
              size={44}
              delay={0.15}
              impacting={phase === 'arrive'}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Live activity line — "alice just sent bob 50 QF" */}
      <div className="relative z-10 flex justify-center mt-5">
        <AnimatePresence mode="wait">
          {(phase === 'arrive' || phase === 'rest') && (
            <motion.p
              key={`activity-${index}`}
              className="font-satoshi text-sm text-qfpay-text-muted italic"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 0.6, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
            >
              {scenario.from} sent {scenario.to} {scenario.amount} QF
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

PaymentCeremony.displayName = 'PaymentCeremony';
