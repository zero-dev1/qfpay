import {
  forwardRef,
  useCallback,
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
    const [color, setColorState] = useState<ShimmerColor>('sapphire');
    const [speed, setSpeed] = useState<'ambient' | 'pulse'>('ambient');
    const [floodState, setFloodState] = useState<
      'idle' | 'flooding' | 'holding' | 'dissipating'
    >('idle');

    const floodResolveRef = useRef<(() => void) | null>(null);
    const dissipateResolveRef = useRef<(() => void) | null>(null);

    // ── Imperative API ─────────────────────────────────────────────────

    const pulse = useCallback(
      (count = 2): Promise<void> =>
        new Promise((resolve) => {
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
      pulse, setColor, flood, dissipate,
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

    const shimmerStyle: React.CSSProperties = {
      position: 'absolute',
      inset: 0,
      borderRadius,
      pointerEvents: 'none',
      zIndex: 1,
      background: `conic-gradient(
        from var(--ceremony-shimmer-angle),
        transparent 0%,
        transparent 2%,
        ${hex} 10%,
        transparent 18%,
        transparent 100%
      )`,
      mask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
      WebkitMask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
      maskComposite: 'exclude',
      WebkitMaskComposite: 'xor',
      padding: '1.5px',
      animationName: isAmbient ? 'ceremony-shimmer-crawl' : 'ceremony-shimmer-pulse',
      animationDuration: isAmbient ? '6s' : '0.3s',
      animationTimingFunction: 'linear',
      animationIterationCount: 'infinite',
      animationFillMode: 'forwards',
      filter: `drop-shadow(0 0 4px ${hex}40)`,
    };

    // ── Flood: wrapper centers, inner circle scales ────────────────────

    const showFlood =
      floodState === 'flooding' ||
      floodState === 'holding' ||
      floodState === 'dissipating';

    // The inner circle needs to be large enough to cover the panel
    // at scale(1). We use a square whose side = 150% of the panel's
    // larger dimension (height for a 3:4 panel). The wrapper centers
    // it with flexbox so transform only does scale — no translate needed.

    const getFloodAnimation = (): React.CSSProperties => {
      switch (floodState) {
        case 'flooding':
          return {
            animation: 'ceremony-flood 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
          };
        case 'holding':
          return {
            transform: 'scale(1)',
            opacity: 1,
          };
        case 'dissipating':
          return {
            animation: 'ceremony-dissipate 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
          };
        default:
          return {};
      }
    };
    return (
      <>
        {/* Ambient shimmer ring */}
        <div style={shimmerStyle} />

        {/* Top rim highlight */}
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

        {/* Flood overlay — wrapper centers the circle, animation only scales */}
        {showFlood && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 2,
              overflow: 'hidden',
              borderRadius,
            }}
          >
            <div
              style={{
                // Circle large enough to cover the full panel at scale(1)
                width: '160%',
                height: '160%',
                borderRadius: '50%',
                background: COLOR_MAP.sapphire,
                flexShrink: 0,
                ...getFloodAnimation(),
              }}
              onAnimationEnd={handleFloodAnimationEnd}
            />
          </div>
        )}
      </>
    );
  }
);

ShimmerBorder.displayName = 'ShimmerBorder';

export default ShimmerBorder;
