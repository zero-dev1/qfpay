import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

type ShimmerColor = 'sapphire' | 'crimson' | 'white';

export interface ShimmerBorderRef {
  pulse: (count?: number) => Promise<void>;
  setColor: (color: ShimmerColor) => void;
  flood: () => Promise<void>;
  dissipate: () => Promise<void>;
}

interface ShimmerBorderProps {
  borderRadius?: number;
}

// ─── Color map ───────────────────────────────────────────────────────────────

const COLOR_MAP: Record<ShimmerColor, string> = {
  sapphire: '#0040FF',
  crimson: '#FF2D2D',
  white: '#FFFFFF',
};

// ─── Component ───────────────────────────────────────────────────────────────

const ShimmerBorder = forwardRef<ShimmerBorderRef, ShimmerBorderProps>(
  ({ borderRadius = 24 }, ref) => {
    // State-driven color so changes trigger re-render of the gradient
    const [color, setColorState] = useState<ShimmerColor>('sapphire');

    // Shimmer speed: 'ambient' = slow 6s crawl, 'pulse' = fast 300ms loops
    const [speed, setSpeed] = useState<'ambient' | 'pulse'>('ambient');

    // Flood state
    const [floodState, setFloodState] = useState<
      'idle' | 'flooding' | 'holding' | 'dissipating'
    >('idle');

    // Refs for resolving imperative promises
    const pulseResolveRef = useRef<(() => void) | null>(null);
    const floodResolveRef = useRef<(() => void) | null>(null);
    const dissipateResolveRef = useRef<(() => void) | null>(null);

    // Shimmer ring element ref
    const shimmerRef = useRef<HTMLDivElement>(null);

    // ── Ambient rotation: CSS @property based ──────────────────────────
    // The --ceremony-shimmer-angle custom property is animated via CSS
    // keyframes defined in index.css. We toggle animation-duration to
    // control speed. This is GPU-composited and doesn't touch JS per frame.

    // ── Imperative API ─────────────────────────────────────────────────

    const pulse = useCallback(
      (count = 2): Promise<void> =>
        new Promise((resolve) => {
          // Each pulse = one full 360° rotation at 300ms
          // Total pulse time = count * 300ms
          // We switch to fast speed, wait for count rotations, then revert.
          setSpeed('pulse');

          const totalMs = count * 300;
          setTimeout(() => {
            setSpeed('ambient');
            resolve();
          }, totalMs);
        }),
      []
    );

    const setColor = useCallback((c: ShimmerColor) => {
      setColorState(c);
    }, []);

    const flood = useCallback(
      (): Promise<void> =>
        new Promise((resolve) => {
          floodResolveRef.current = resolve;
          setFloodState('flooding');
        }),
      []
    );

    const dissipate = useCallback(
      (): Promise<void> =>
        new Promise((resolve) => {
          dissipateResolveRef.current = resolve;
          setFloodState('dissipating');
        }),
      []
    );

    useImperativeHandle(ref, () => ({ pulse, setColor, flood, dissipate }), [
      pulse,
      setColor,
      flood,
      dissipate,
    ]);

    // ── Flood animation end handler ────────────────────────────────────

    const handleFloodAnimationEnd = useCallback(() => {
      if (floodState === 'flooding') {
        setFloodState('holding');
        floodResolveRef.current?.();
        floodResolveRef.current = null;
      } else if (floodState === 'dissipating') {
        setFloodState('idle');
        dissipateResolveRef.current?.();
        dissipateResolveRef.current = null;
      }
    }, [floodState]);

    // ── Derived styles ─────────────────────────────────────────────────

    const hex = COLOR_MAP[color];
    const isAmbient = speed === 'ambient';

    // Shimmer ring: conic-gradient with CSS custom property for angle
    const shimmerStyle: React.CSSProperties = {
      position: 'absolute',
      inset: 0,
      borderRadius,
      pointerEvents: 'none',
      zIndex: 1,

      // Conic gradient using the CSS custom property
      background: `conic-gradient(
        from var(--ceremony-shimmer-angle),
        transparent 0%,
        transparent 2%,
        ${hex} 10%,
        transparent 18%,
        transparent 100%
      )`,

      // Mask to show only a thin border ring
      mask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
      WebkitMask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
      maskComposite: 'exclude',
      WebkitMaskComposite: 'xor',
      padding: '1.5px', // border width

      // Animation — switch between slow ambient and fast pulse
      animationName: isAmbient
        ? 'ceremony-shimmer-crawl'
        : 'ceremony-shimmer-pulse',
      animationDuration: isAmbient ? '6s' : '0.3s',
      animationTimingFunction: 'linear',
      animationIterationCount: 'infinite',
      animationFillMode: 'forwards',

      // Subtle glow on the shimmer
      filter: `drop-shadow(0 0 4px ${hex}40)`,
    };

    // Flood overlay: circular div that scales from center
    const showFlood =
      floodState === 'flooding' ||
      floodState === 'holding' ||
      floodState === 'dissipating';

    const floodStyle: React.CSSProperties = {
      position: 'absolute',
      // Center a square that's large enough to cover the panel when scaled
      top: '50%',
      left: '50%',
      width: '150%',
      height: '150%',
      transform: 'translate(-50%, -50%)',
      borderRadius: '50%',
      background: `radial-gradient(circle, ${COLOR_MAP.sapphire} 0%, ${COLOR_MAP.sapphire} 70%, ${COLOR_MAP.sapphire}00 100%)`,
      pointerEvents: 'none',
      zIndex: 2,

      ...(floodState === 'flooding'
        ? {
            animation: 'ceremony-flood 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
          }
        : floodState === 'holding'
        ? {
            transform: 'translate(-50%, -50%) scale(1.5)',
            opacity: 1,
          }
        : floodState === 'dissipating'
        ? {
            animation:
              'ceremony-dissipate 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
          }
        : {}),
    };

    return (
      <>
        {/* Ambient shimmer ring */}
        <div ref={shimmerRef} style={shimmerStyle} />

        {/* Top rim highlight — subtle edge light from above */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '10%',
            right: '10%',
            height: '1px',
            background: `linear-gradient(90deg, transparent, ${hex}30, transparent)`,
            borderRadius,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Flood overlay */}
        {showFlood && (
          <div
            style={floodStyle}
            onAnimationEnd={handleFloodAnimationEnd}
          />
        )}
      </>
    );
  }
);

ShimmerBorder.displayName = 'ShimmerBorder';

export default ShimmerBorder;
