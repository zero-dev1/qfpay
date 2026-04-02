import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface ShimmerButtonProps {
  children: ReactNode;
  onClick: () => void;
  reducedMotion?: boolean;
}

export const ShimmerButton = ({
  children,
  onClick,
  reducedMotion = false,
}: ShimmerButtonProps) => {
  return (
    <motion.div className="relative group" whileTap={{ scale: 0.98 }}>
      {/* Rotating conic-gradient shimmer border — continuous 4s cycle, faster on hover */}
      <div
        className="absolute -inset-[1px] rounded-2xl overflow-hidden"
        style={{ padding: '1px' }}
      >
        <div
          className={`w-full h-full rounded-2xl ${reducedMotion ? '' : 'animate-shimmer-rotate group-hover:animate-shimmer-rotate-fast'}`}
          style={{
            background: reducedMotion
              ? 'linear-gradient(135deg, rgba(0,64,255,0.4), rgba(0,64,255,0.15), rgba(0,64,255,0.4))'
              : 'conic-gradient(from var(--shimmer-angle, 0deg), rgba(0,64,255,0.08) 0%, rgba(0,64,255,0.5) 10%, rgba(0,64,255,0.08) 20%, rgba(0,64,255,0.08) 100%)',
          }}
        />
      </div>

      {/* Hover glow */}
      <div className="absolute -inset-2 bg-qfpay-blue/0 group-hover:bg-qfpay-blue/10 rounded-3xl blur-xl transition-all duration-500" />

      {/* Button — Clash Display per spec */}
      <motion.button
        className="relative bg-qfpay-blue hover:bg-qfpay-blue-hover text-white font-clash font-bold text-lg px-14 py-4 rounded-2xl transition-colors focus-ring"
        onClick={onClick}
        whileHover={{
          y: -2,
          boxShadow: '0 0 40px rgba(0,64,255,0.25), 0 0 80px rgba(0,64,255,0.08)',
        }}
      >
        {children}
      </motion.button>
    </motion.div>
  );
};
