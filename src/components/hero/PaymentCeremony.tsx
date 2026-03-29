import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { IdentityAnchor } from './IdentityAnchor';
import { CeremonyAtmosphere } from './CeremonyAtmosphere';
import type { CeremonyPhase } from './CeremonyAtmosphere';
import { EASE_OUT_EXPO } from '../../lib/animations';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const SCENARIOS = [
  { from: 'alice', to: 'bob', amount: '50', burn: '0.05' },
  { from: 'dev', to: 'spin', amount: '100', burn: '0.1' },
  { from: 'satoshi', to: 'memechi', amount: '25', burn: '0.025' },
];

const DURATIONS = {
  idle: 1200,
  ignite: 1400,
  transfer: 1600,
  arrive: 1800,
  rest: 1200,
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

  useEffect(() => {
    if (reducedMotion) return;

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

  // Activity line element — shared between animated and static
  const activityContent = (
    <AnimatePresence mode="wait">
      {(phase === 'arrive' || phase === 'rest') && (
        <motion.p
          key={`activity-${index}`}
          className="font-satoshi text-xs sm:text-sm text-qfpay-text-muted"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 0.5, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
        >
          {scenario.from} sent {scenario.to} {scenario.amount} QF
        </motion.p>
      )}
    </AnimatePresence>
  );

  if (reducedMotion) {
    return (
      <div className="w-full max-w-xl mx-auto">
        <div
          className="relative rounded-[20px] p-6 sm:p-8 flex items-center justify-between"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(0, 64, 255, 0.1)',
            minHeight: '160px',
          }}
        >
          <IdentityAnchor name={scenario.from} size={32} />
          <div className="flex flex-col items-center gap-1">
            <span className="font-clash font-bold text-2xl text-white">
              {scenario.amount} <span className="text-white/30">QF</span>
            </span>
            <svg className="w-5 h-5 text-qfpay-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <IdentityAnchor name={scenario.to} size={32} impacting />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <CeremonyAtmosphere phase={phase} activityLine={activityContent}>
        {/* The ceremony stage — pills + center */}
        <div className="flex items-center justify-between gap-2">
          {/* Sender pill */}
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
                size={32}
                delay={0}
                dimmed={phase === 'transfer'}
              />
            </motion.div>
          </AnimatePresence>

          {/* Center stage — amount + trail + checkmark */}
          <div className="flex-1 flex flex-col items-center justify-center relative min-h-[80px]">
            {/* Trail line */}
            <svg
              className="absolute top-1/2 left-0 right-0 -translate-y-1/2"
              style={{ height: '4px', overflow: 'visible' }}
              preserveAspectRatio="none"
            >
              {phase === 'transfer' && (
                <motion.line
                  x1="0" y1="2" x2="100%" y2="2"
                  stroke="rgba(0, 64, 255, 0.15)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.2, ease: EASE_OUT_EXPO }}
                />
              )}
            </svg>

            <AnimatePresence mode="wait">
              {(phase === 'ignite' || phase === 'transfer') && (
                <motion.div
                  key={`amount-${index}`}
                  className="flex flex-col items-center gap-1.5"
                  initial={{ opacity: 0, scale: 0.85, x: 0, letterSpacing: '0.05em' }}
                  animate={{
                    opacity: phase === 'transfer' ? [1, 1, 0] : 1,
                    scale: phase === 'transfer' ? [1, 0.95, 0.9] : 1,
                    x: phase === 'transfer' ? [0, 40, 100] : 0,
                    letterSpacing: '-0.02em',
                  }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{
                    duration: phase === 'transfer' ? 1.4 : 0.5,
                    ease: EASE_OUT_EXPO,
                  }}
                >
                  <span className="font-clash font-bold text-2xl sm:text-3xl text-white">
                    {scenario.amount}{' '}
                    <span className="text-white/30">QF</span>
                  </span>
                  {phase === 'ignite' && (
                    <motion.span
                      className="font-mono text-[10px] sm:text-[11px] text-orange-300/40"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.4, ease: EASE_OUT_EXPO }}
                    >
                      {scenario.burn} QF burned
                    </motion.span>
                  )}
                </motion.div>
              )}

              {phase === 'arrive' && (
                <motion.div
                  key={`check-${index}`}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
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

          {/* Recipient pill */}
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
                size={32}
                delay={0.15}
                impacting={phase === 'arrive'}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </CeremonyAtmosphere>
    </div>
  );
});

PaymentCeremony.displayName = 'PaymentCeremony';
