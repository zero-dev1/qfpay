import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { EASE_OUT_EXPO } from '../../lib/animations';

const SCENARIOS = [
  { from: 'alice', to: 'bob', amount: '50' },
  { from: 'dev', to: 'spin', amount: '100' },
  { from: 'satoshi', to: 'memechi', amount: '25' },
];

export const PaymentVignette = () => {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'sending' | 'done'>('idle');

  const scenario = SCENARIOS[index];

  useEffect(() => {
    const cycle = () => {
      // idle → sending
      const t1 = setTimeout(() => setPhase('sending'), 800);
      // sending → done
      const t2 = setTimeout(() => setPhase('done'), 2000);
      // done → next idle
      const t3 = setTimeout(() => {
        setPhase('idle');
        setIndex((i) => (i + 1) % SCENARIOS.length);
      }, 3800);

      return [t1, t2, t3];
    };

    const timers = cycle();
    const interval = setInterval(() => {
      cycle();
    }, 4500);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="relative flex items-center gap-4 sm:gap-6 px-6 py-4 rounded-2xl border border-qfpay-border bg-qfpay-surface/50 backdrop-blur-sm">
      {/* Sender */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-qfpay-blue/15 border border-qfpay-blue/20 flex items-center justify-center">
          <span className="font-clash font-semibold text-xs text-qfpay-blue">
            {scenario.from[0].toUpperCase()}
          </span>
        </div>
        <span className="font-satoshi text-sm text-qfpay-text-secondary">
          {scenario.from}<span className="text-qfpay-blue">.qf</span>
        </span>
      </div>

      {/* Animated amount traveling */}
      <div className="relative flex-1 flex items-center justify-center min-w-[80px]">
        {/* Track line */}
        <div className="absolute inset-y-1/2 left-0 right-0 h-px bg-qfpay-border" />

        <AnimatePresence mode="wait">
          {phase === 'sending' && (
            <motion.div
              key={`${index}-sending`}
              className="relative z-10 px-2.5 py-0.5 rounded-full bg-qfpay-blue text-white font-mono text-xs font-medium"
              initial={{ opacity: 0, x: -20, scale: 0.8 }}
              animate={{ opacity: 1, x: 20, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.8 }}
              transition={{ duration: 0.8, ease: EASE_OUT_EXPO }}
            >
              {scenario.amount} QF
            </motion.div>
          )}
          {phase === 'done' && (
            <motion.div
              key={`${index}-done`}
              className="relative z-10"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <svg className="w-4 h-4 text-qfpay-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <motion.path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </svg>
            </motion.div>
          )}
          {phase === 'idle' && (
            <motion.div
              key={`${index}-idle`}
              className="relative z-10 text-qfpay-text-muted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Recipient */}
      <div className="flex items-center gap-2.5">
        <span className="font-satoshi text-sm text-qfpay-text-secondary">
          {scenario.to}<span className="text-qfpay-blue">.qf</span>
        </span>
        <div className="w-8 h-8 rounded-full bg-qfpay-green/15 border border-qfpay-green/20 flex items-center justify-center">
          <span className="font-clash font-semibold text-xs text-qfpay-green">
            {scenario.to[0].toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
};
