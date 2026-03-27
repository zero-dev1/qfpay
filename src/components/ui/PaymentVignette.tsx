import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, useCallback } from 'react';
import { EASE_OUT_EXPO } from '../../lib/animations';

const SCENARIOS = [
  { from: 'alice', to: 'bob', amount: '50' },
  { from: 'dev', to: 'spin', amount: '100' },
  { from: 'satoshi', to: 'memechi', amount: '25' },
];

// Unique gradient pairs per persona — premium feel, not random
const AVATAR_GRADIENTS: Record<string, [string, string]> = {
  alice:   ['#6366F1', '#A78BFA'],  // indigo → violet
  bob:     ['#F59E0B', '#F97316'],  // amber → orange
  dev:     ['#0040FF', '#38BDF8'],  // brand blue → sky
  spin:    ['#10B981', '#34D399'],  // emerald pair
  satoshi: ['#8B5CF6', '#EC4899'],  // violet → pink
  memechi: ['#F43F5E', '#FB923C'],  // rose → orange
};

const DemoAvatar = ({ name, size = 28 }: { name: string; size?: number }) => {
  const [c1, c2] = AVATAR_GRADIENTS[name] || ['#6366F1', '#A78BFA'];
  const gradId = `av-${name}`;
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" className="flex-shrink-0 rounded-full">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor={c1} />
          <stop offset="1" stopColor={c2} />
        </linearGradient>
      </defs>
      <circle cx="14" cy="14" r="14" fill={`url(#${gradId})`} />
      <text
        x="14"
        y="14"
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontFamily="'Clash Display', sans-serif"
        fontWeight="600"
        fontSize="11"
      >
        {name[0].toUpperCase()}
      </text>
    </svg>
  );
};

// Phase durations (ms)
const IDLE_DURATION = 1200;
const SENDING_DURATION = 1200;
const DONE_DURATION = 2200;

export const PaymentVignette = () => {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'sending' | 'done'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scenario = SCENARIOS[index];

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const scheduleNext = () => {
      switch (phase) {
        case 'idle':
          timerRef.current = setTimeout(() => setPhase('sending'), IDLE_DURATION);
          break;
        case 'sending':
          timerRef.current = setTimeout(() => setPhase('done'), SENDING_DURATION);
          break;
        case 'done':
          timerRef.current = setTimeout(() => {
            setIndex((i) => (i + 1) % SCENARIOS.length);
            setPhase('idle');
          }, DONE_DURATION);
          break;
      }
    };
    scheduleNext();
    return clearTimer;
  }, [phase, clearTimer]);

  return (
    <div className="relative flex items-center gap-3 sm:gap-5 px-4 sm:px-6 py-3 sm:py-3.5 rounded-2xl border border-qfpay-border bg-qfpay-surface/50 backdrop-blur-sm">
      {/* Sender */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        <DemoAvatar name={scenario.from} size={28} />
        <span className="font-satoshi text-xs sm:text-sm text-qfpay-text-secondary">
          <span className="hidden xs:inline">{scenario.from}</span>
          <span className="xs:hidden">{scenario.from.length > 5 ? scenario.from.slice(0, 4) + '…' : scenario.from}</span>
          <span className="text-qfpay-blue">.qf</span>
        </span>
      </div>

      {/* Animated amount traveling */}
      <div className="relative flex-1 flex items-center justify-center min-w-[48px] sm:min-w-[80px]">
        <svg
          className="absolute inset-y-1/2 left-0 right-0 h-px"
          style={{ top: '50%', transform: 'translateY(-50%)' }}
          preserveAspectRatio="none"
          viewBox="0 0 100 1"
        >
          <line
            x1="0" y1="0.5" x2="100" y2="0.5"
            stroke="currentColor"
            className="text-qfpay-border"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          {phase === 'sending' && (
            <motion.line
              x1="0" y1="0.5" x2="100" y2="0.5"
              stroke="currentColor"
              className="text-qfpay-blue"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 0.6, 0.3] }}
              transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
            />
          )}
        </svg>

        <AnimatePresence mode="wait">
          {phase === 'sending' && (
            <motion.div
              key={`${index}-sending`}
              className="relative z-10 px-2 sm:px-2.5 py-0.5 rounded-full bg-qfpay-blue text-white font-mono text-[10px] sm:text-xs font-medium"
              initial={{ opacity: 0, x: -16, scale: 0.8 }}
              animate={{ opacity: 1, x: 16, scale: 1 }}
              exit={{ opacity: 0, x: 32, scale: 0.8 }}
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
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Recipient */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        <span className="font-satoshi text-xs sm:text-sm text-qfpay-text-secondary">
          <span className="hidden xs:inline">{scenario.to}</span>
          <span className="xs:hidden">{scenario.to.length > 5 ? scenario.to.slice(0, 4) + '…' : scenario.to}</span>
          <span className="text-qfpay-blue">.qf</span>
        </span>
        <DemoAvatar name={scenario.to} size={28} />
      </div>
    </div>
  );
};
