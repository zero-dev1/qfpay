import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface ShimmerButtonProps {
  children: ReactNode;
  onClick: () => void;
  reducedMotion?: boolean;
}

/**
 * Solid pill CTA button.
 * Previously had a shimmer border — removed per spec:
 * "two living things on the page: the panel and the button."
 * The button's life comes from its hover/press physics, not a competing shimmer.
 */
export const ShimmerButton = ({
  children,
  onClick,
}: ShimmerButtonProps) => {
  return (
    <motion.button
      className="relative bg-[#0040FF] text-white font-clash font-bold text-lg px-14 py-4 rounded-full transition-colors duration-200 focus-ring"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      style={{
        boxShadow: '0 0 30px rgba(0,64,255,0.15)',
      }}
    >
      {children}
    </motion.button>
  );
};
