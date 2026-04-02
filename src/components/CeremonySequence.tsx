import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { delay } from '../utils/delay';

// The .qf names that rotate each loop
const QF_NAMES = ['vector.qf', 'memechi.qf', 'nova.qf', 'pulse.qf', 'zen.qf'];
const AMOUNTS = ['150', '80', '250', '42', '1,000'];

type Phase = 'name' | 'amount' | 'preview' | 'burn' | 'sent' | 'complete' | 'reset';

interface ShimmerBorderRef {
  pulse: (count?: number) => Promise<void>;
  setColor: (color: 'sapphire' | 'crimson' | 'white') => void;
  flood: () => Promise<void>;
  dissipate: () => Promise<void>;
}

interface CeremonySequenceProps {
  shimmerRef: React.RefObject<ShimmerBorderRef>;
}

const phaseVariants = {
  initial: { opacity: 0, filter: 'blur(4px)', y: 8 },
  animate: { opacity: 1, filter: 'blur(0px)', y: 0 },
  exit: { opacity: 0, filter: 'blur(4px)', y: -8 },
};

const phaseTransition = { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const };

function NamePhase({ name }: { name: string }) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(name.slice(0, i + 1));
      i++;
      if (i >= name.length) clearInterval(interval);
    }, 110);  // ~110ms per character — matches RecipientScreen cadence
    return () => clearInterval(interval);
  }, [name]);

  return (
    <motion.div variants={phaseVariants} initial="initial" animate="animate" exit="exit" transition={phaseTransition}
      className="text-center"
    >
      <span className="font-clash font-bold text-[clamp(2rem,5vw,3rem)] text-[#F0F2F8]">
        {displayed}
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ repeat: Infinity, duration: 0.6 }}
          className="text-[#0040FF]"
        >
          |
        </motion.span>
      </span>
    </motion.div>
  );
}

function AmountPhase({ amount }: { amount: string }) {
  return (
    <motion.div variants={phaseVariants} initial="initial" animate="animate" exit="exit" transition={phaseTransition}
      className="text-center"
    >
      <span className="font-clash font-bold text-[clamp(2.5rem,6vw,3.5rem)] text-[#F0F2F8]">
        {amount} QF
      </span>
    </motion.div>
  );
}

function PreviewPhase({ sender, receiver, amount }: {
  sender: string; receiver: string; amount: string;
}) {
  return (
    <motion.div variants={phaseVariants} initial="initial" animate="animate" exit="exit" transition={phaseTransition}
      className="flex flex-col items-center gap-3"
    >
      {/* Sender */}
      <span className="font-clash font-semibold text-lg text-[rgba(122,139,171,0.7)]">
        {sender}
      </span>

      {/* Trailing line — sapphire pulse top to bottom */}
      <div className="relative w-[2px] h-16 bg-[rgba(255,255,255,0.06)] overflow-hidden rounded-full">
        <motion.div
          className="absolute top-0 left-0 w-full h-1/3 bg-[#0040FF] rounded-full"
          animate={{ y: ['0%', '200%'] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
          style={{ boxShadow: '0 0 8px 2px rgba(0, 64, 255, 0.4)' }}
        />
      </div>

      {/* Amount */}
      <span className="font-clash font-bold text-[clamp(1.5rem,4vw,2rem)] text-[#F0F2F8]">
        {amount} QF
      </span>

      {/* Trailing line — same as above */}
      <div className="relative w-[2px] h-16 bg-[rgba(255,255,255,0.06)] overflow-hidden rounded-full">
        <motion.div
          className="absolute top-0 left-0 w-full h-1/3 bg-[#0040FF] rounded-full"
          animate={{ y: ['0%', '200%'] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut', delay: 0.3 }}
          style={{ boxShadow: '0 0 8px 2px rgba(0, 64, 255, 0.4)' }}
        />
      </div>

      {/* Receiver */}
      <span className="font-clash font-semibold text-lg text-[#F0F2F8]">
        {receiver}
      </span>
    </motion.div>
  );
}

function BurnPhase({ burnAmount }: { burnAmount: string }) {
  return (
    <motion.div variants={phaseVariants} initial="initial" animate="animate" exit="exit" transition={phaseTransition}
      className="text-center"
    >
      <span className="font-clash font-bold text-[clamp(2rem,5vw,3rem)] text-[#FF2D2D]">
        {burnAmount} QF
      </span>
      <p className="mt-1 font-clash font-medium text-sm text-[rgba(255,45,45,0.6)] uppercase tracking-widest">
        burned
      </p>
    </motion.div>
  );
}

function SentPhase({ amount }: { amount: string }) {
  return (
    <motion.div variants={phaseVariants} initial="initial" animate="animate" exit="exit" transition={phaseTransition}
      className="text-center"
    >
      <span className="font-clash font-bold text-[clamp(2rem,5vw,3rem)] text-[#F0F2F8]">
        {amount} QF
      </span>
      <p className="mt-1 font-clash font-medium text-sm text-[rgba(122,139,171,0.7)] uppercase tracking-widest">
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
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="flex items-center justify-center"
    >
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <motion.path
          d="M16 33L27 44L48 20"
          stroke="#FFFFFF"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </svg>
    </motion.div>
  );
}

function StaticLayout() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="space-y-6">
        {/* Static name */}
        <div>
          <span className="font-clash font-bold text-[clamp(2rem,5vw,3rem)] text-[#F0F2F8]">
            vector.qf
          </span>
        </div>
        
        {/* Static amount */}
        <div>
          <span className="font-clash font-bold text-[clamp(2.5rem,6vw,3.5rem)] text-[#F0F2F8]">
            150 QF
          </span>
        </div>
        
        {/* Static checkmark */}
        <div className="flex items-center justify-center pt-4">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <path
              d="M16 33L27 44L48 20"
              stroke="#FFFFFF"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

export function CeremonySequence({ shimmerRef }: CeremonySequenceProps) {
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('name');
  const [loopIndex, setLoopIndex] = useState(0);
  const isMountedRef = useRef(false);
  const name = QF_NAMES[loopIndex % QF_NAMES.length];
  const amount = AMOUNTS[loopIndex % AMOUNTS.length];
  const burnAmount = Math.floor(Number(amount) * 0.001).toString(); // 0.1% of amount

  // Reduced motion: render static layout
  if (reducedMotion) {
    return <StaticLayout />;
  }

  useEffect(() => {
    // Main choreography timeline - start immediately on mount
    isMountedRef.current = true;
    runLoop();
    
    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
    };
  }, [loopIndex]);

  async function runLoop() {
    // Beat 1 — Name (~2s)
    setPhase('name');
    await delay(2000);  // typing animation takes ~1.5s, then 0.5s settle
    await shimmerRef.current?.pulse(2);

    // Beat 2 — Amount (~1.5s)
    setPhase('amount');
    await delay(1000);
    await shimmerRef.current?.pulse(2);

    // Beat 3 — Preview (~2s)
    setPhase('preview');
    await delay(1500);
    await shimmerRef.current?.pulse(1);  // single bloom to initiate

    // Beat 4 — Burn (~1.5s)
    shimmerRef.current?.setColor('crimson');
    setPhase('burn');
    await shimmerRef.current?.pulse(2);
    await delay(500);

    // Beat 5 — Sent (~1s)
    shimmerRef.current?.setColor('sapphire');
    setPhase('sent');
    await delay(1000);

    // Beat 6 — Complete (~1.5s)
    setPhase('complete');
    await shimmerRef.current?.flood();
    await delay(1200);

    // Beat 7 — Reset (~0.5s)
    await shimmerRef.current?.dissipate();
    setPhase('reset');
    await delay(300);

    // Next loop - only if still mounted
    if (isMountedRef.current) {
      setLoopIndex(prev => prev + 1);
    }
  }

  return (
    <div className="relative flex flex-col items-center justify-center h-full p-8">
      <AnimatePresence mode="wait">
        {phase === 'name' && (
          <NamePhase key="name" name={name} />
        )}
        {phase === 'amount' && (
          <AmountPhase key="amount" amount={amount} />
        )}
        {phase === 'preview' && (
          <PreviewPhase key="preview" sender="you.qf" receiver={name} amount={amount} />
        )}
        {phase === 'burn' && (
          <BurnPhase key="burn" burnAmount={burnAmount} />
        )}
        {phase === 'sent' && (
          <SentPhase key="sent" amount={amount} />
        )}
        {phase === 'complete' && (
          <CompletePhase key="complete" />
        )}
      </AnimatePresence>
    </div>
  );
}
