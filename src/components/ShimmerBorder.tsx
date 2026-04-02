import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

type ShimmerColor = 'sapphire' | 'crimson';
type ShimmerSpeed = 'ambient' | 'confirm' | 'fast';
type ShimmerMode = 'trace' | 'bloom' | 'hold' | 'flood' | 'drain';

export interface ShimmerBorderRef {
  setMode: (mode: ShimmerMode) => void;
  setColor: (color: ShimmerColor) => void;
  setSpeed: (speed: ShimmerSpeed) => void;
  flood: () => Promise<void>;
  drain: () => Promise<void>;
}

interface ShimmerBorderProps {
  borderRadius?: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

const ShimmerBorder = forwardRef<ShimmerBorderRef, ShimmerBorderProps>(
  ({ borderRadius = 24 }, ref) => {
    const [color, setColorState] = useState<ShimmerColor>('sapphire');
    const [speed, setSpeedState] = useState<ShimmerSpeed>('ambient');
    const [mode, setModeState] = useState<ShimmerMode>('trace');
    const [isAnimating, setIsAnimating] = useState(false);

    // ── Imperative API ─────────────────────────────────────────────────

    const setMode = useCallback((newMode: ShimmerMode) => {
      setModeState(newMode);
    }, []);

    const setColor = useCallback((newColor: ShimmerColor) => {
      setColorState(newColor);
    }, []);

    const setSpeed = useCallback((newSpeed: ShimmerSpeed) => {
      setSpeedState(newSpeed);
    }, []);

    const flood = useCallback(
      (): Promise<void> =>
        new Promise((resolve) => {
          setModeState('flood');
          setIsAnimating(true);
          setTimeout(() => {
            setIsAnimating(false);
            resolve();
          }, 500);
        }),
      []
    );

    const drain = useCallback(
      (): Promise<void> =>
        new Promise((resolve) => {
          setModeState('drain');
          setIsAnimating(true);
          setTimeout(() => {
            setIsAnimating(false);
            setModeState('trace'); // Return to trace after drain
            resolve();
          }, 500);
        }),
      []
    );

    useImperativeHandle(ref, () => ({ setMode, setColor, setSpeed, flood, drain }), [
      setMode, setColor, setSpeed, flood, drain,
    ]);

    // ── Derived styles ─────────────────────────────────────────────────

    const duration = speed === 'ambient' ? '6s' 
      : speed === 'confirm' ? '1.2s' 
      : '0.8s';

    const shimmerColor = color === 'crimson' 
      ? 'rgba(220, 38, 38, 0.8)' 
      : 'rgba(0, 64, 255, 0.7)';

    const faintColor = color === 'crimson'
      ? 'rgba(220, 38, 38, 0.05)'
      : 'rgba(0, 64, 255, 0.05)';

    // The concentrated light beam gradient - small bright arc (~30deg)
    const beamGradient = `conic-gradient(
      from var(--shimmer-angle),
      transparent 0deg,
      transparent 330deg,
      ${shimmerColor} 345deg,
      transparent 360deg
    )`;

    // Faint trail gradient for trace mode
    const trailGradient = `conic-gradient(
      from var(--shimmer-angle),
      ${faintColor} 0deg,
      ${faintColor} 330deg,
      transparent 345deg,
      transparent 360deg
    )`;

    // ── Mode rendering ────────────────────────────────────────────────

    const renderTraceMode = () => (
      <>
        {/* Faint trail */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius,
            pointerEvents: 'none',
            zIndex: 1,
            background: trailGradient,
            mask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
            WebkitMask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
            maskComposite: 'exclude',
            WebkitMaskComposite: 'xor',
            padding: '1px',
            animation: `shimmer-rotate ${duration} linear infinite`,
          }}
        />
        {/* Concentrated beam */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius,
            pointerEvents: 'none',
            zIndex: 2,
            background: beamGradient,
            mask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
            WebkitMask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
            maskComposite: 'exclude',
            WebkitMaskComposite: 'xor',
            padding: '1.5px',
            animation: `shimmer-rotate ${duration} linear infinite`,
            filter: `drop-shadow(0 0 4px ${shimmerColor}40)`,
          }}
        />
        {/* Outer glow */}
        <div
          style={{
            position: 'absolute',
            inset: -2,
            borderRadius,
            pointerEvents: 'none',
            zIndex: 0,
            background: beamGradient,
            mask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
            WebkitMask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
            maskComposite: 'exclude',
            WebkitMaskComposite: 'xor',
            padding: '3px',
            animation: `shimmer-rotate ${duration} linear infinite`,
            filter: `blur(12px)`,
          }}
        />
      </>
    );

    const renderBloomMode = () => (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius,
          pointerEvents: 'none',
          zIndex: 1,
          boxShadow: `0 0 0 1px ${shimmerColor}`,
          transition: 'box-shadow 400ms ease',
        }}
      />
    );

    const renderHoldMode = () => (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius,
          pointerEvents: 'none',
          zIndex: 1,
          boxShadow: `0 0 0 1px ${shimmerColor}`,
        }}
      />
    );

    const renderFloodMode = () => (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="rounded-full animate-ceremony-flood"
          style={{
            width: '150%',       // oversized to cover corners
            aspectRatio: '1',
            background: 'rgba(0, 64, 255, 0.85)',
          }}
        />
      </div>
    );

    const renderDrainMode = () => (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="rounded-full animate-ceremony-drain"
          style={{
            width: '150%',
            aspectRatio: '1',
            background: 'rgba(0, 64, 255, 0.85)',
          }}
        />
      </div>
    );

    // ── Main render ─────────────────────────────────────────────────────

    return (
      <>
        {mode === 'trace' && renderTraceMode()}
        {mode === 'bloom' && renderBloomMode()}
        {mode === 'hold' && renderHoldMode()}
        {mode === 'flood' && renderFloodMode()}
        {mode === 'drain' && renderDrainMode()}
      </>
    );
  }
);

ShimmerBorder.displayName = 'ShimmerBorder';

export default ShimmerBorder;
