import { motion, useAnimationControls } from 'framer-motion';
import { forwardRef, useRef, useState, useImperativeHandle } from 'react';

type ShimmerColor = 'sapphire' | 'crimson' | 'white';

interface ShimmerBorderRef {
  pulse: (count?: number) => Promise<void>;
  setColor: (color: ShimmerColor) => void;
  flood: () => Promise<void>;
  dissipate: () => Promise<void>;
}

const COLOR_MAP: Record<ShimmerColor, string> = {
  sapphire: '#0040FF',
  crimson: '#FF2D2D',
  white: '#FFFFFF',
};

const ShimmerBorder = forwardRef<ShimmerBorderRef, { borderRadius: number }>(
  ({ borderRadius }, ref) => {
    const controls = useAnimationControls();
    const colorRef = useRef<ShimmerColor>('sapphire');
    const [fillOpacity, setFillOpacity] = useState(0);

    useImperativeHandle(ref, () => ({
      async pulse(count = 2) {
        // Quick shimmer loops — each loop is ~300ms
        for (let i = 0; i < count; i++) {
          await controls.start({
            rotate: [0, 360],
            transition: { duration: 0.3, ease: 'linear' },
          });
        }
      },
      setColor(color: ShimmerColor) {
        colorRef.current = color;
        // Force re-render by restarting the animation
        controls.stop();
        controls.start({
          rotate: [0, 360],
          transition: { repeat: Infinity, duration: 8, ease: 'linear' },
        });
      },
      async flood() {
        // Blue ripple fills entire panel
        setFillOpacity(1);
        // Animate fill from center outward — use scale on a radial overlay
      },
      async dissipate() {
        // Blue drains to edges, becoming the shimmer again
        setFillOpacity(0);
      },
    }));

    return (
      <>
        {/* Shimmer layer */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius,
            // The gradient rotates continuously for ambient shimmer
            background: `conic-gradient(
              from 0deg,
              transparent 0%,
              ${COLOR_MAP[colorRef.current]} 10%,
              transparent 20%,
              transparent 100%
            )`,
            // Mask: show only a 1-2px border ring
            mask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
            maskComposite: 'xor',
            WebkitMaskComposite: 'xor',
            padding: '1.5px', // border thickness
          }}
          animate={controls}
          // Default: slow continuous rotation (~8s per loop)
          transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
        />

        {/* Flood fill overlay — for the completion ripple */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius,
            background: COLOR_MAP.sapphire,
          }}
          animate={{ opacity: fillOpacity }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </>
    );
  }
);

export default ShimmerBorder;
