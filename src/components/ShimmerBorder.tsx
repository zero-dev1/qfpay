import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import type { ShimmerBorderRef, ShimmerBorderProps } from '../types/ceremony';

type ShimmerColor = 'sapphire' | 'crimson';
type ShimmerSpeed = 'ambient' | 'confirm' | 'fast';
type ShimmerMode = 'trace' | 'bloom' | 'hold' | 'flood' | 'drain';

const ShimmerBorder = forwardRef<ShimmerBorderRef, ShimmerBorderProps>(
  ({ borderRadius = 24 }, ref) => {
    const [color, setColorState] = useState<ShimmerColor>('sapphire');
    const [speed, setSpeedState] = useState<ShimmerSpeed>('ambient');
    const [mode, setModeState] = useState<ShimmerMode>('trace');

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
          setTimeout(() => {
            resolve();
          }, 500);
        }),
      []
    );

    const drain = useCallback(
      (): Promise<void> =>
        new Promise((resolve) => {
          setModeState('drain');
          setTimeout(() => {
            setModeState('trace');
            resolve();
          }, 600);
        }),
      []
    );

    useImperativeHandle(ref, () => ({ setMode, setColor, setSpeed, flood, drain }), [
      setMode, setColor, setSpeed, flood, drain,
    ]);

    // ── Derived values ───────────────────────────────────────────────

    const shimmerColor =
      color === 'crimson'
        ? 'rgba(220, 38, 38, 0.8)'
        : 'rgba(0, 64, 255, 0.7)';

    // The faint trail is almost invisible — just a whisper so the border
    // doesn't pop in/out harshly, but NOT enough to outline the whole panel
    const faintColor =
      color === 'crimson'
        ? 'rgba(220, 38, 38, 0.02)'
        : 'rgba(0, 64, 255, 0.02)';

    // Beam: bright ~30deg arc, rest is TRANSPARENT (not faintColor)
    const beamGradient = `conic-gradient(
      from var(--shimmer-angle),
      transparent 0deg,
      transparent 325deg,
      ${shimmerColor} 345deg,
      ${shimmerColor} 350deg,
      transparent 360deg
    )`;

    // Trail: very faint full ring so edges don't vanish completely
    // but nowhere near visible enough to read as an outlined border
    const trailGradient = `conic-gradient(
      from var(--shimmer-angle),
      ${faintColor} 0deg,
      ${faintColor} 320deg,
      transparent 340deg,
      transparent 360deg
    )`;

    // ── Renderers ────────────────────────────────────────────────────

    const renderTraceMode = () => (
      <>
        {/* Faint trail — near-invisible persistence behind the beam */}
        <div
          className={`shimmer-beam shimmer-speed-${speed}`}
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
            transition: 'opacity 400ms ease',
          }}
        />
        {/* Concentrated beam — the flashlight */}
        <div
          className={`shimmer-beam shimmer-speed-${speed}`}
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
            filter: `drop-shadow(0 0 6px ${shimmerColor}50)`,
            transition: 'filter 400ms ease',
          }}
        />
        {/* Outer glow — light spill beyond the edge */}
        <div
          className={`shimmer-beam shimmer-speed-${speed}`}
          style={{
            position: 'absolute',
            inset: -3,
            borderRadius: borderRadius + 3,
            pointerEvents: 'none',
            zIndex: 0,
            background: beamGradient,
            mask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
            WebkitMask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
            maskComposite: 'exclude',
            WebkitMaskComposite: 'xor',
            padding: '4px',
            filter: 'blur(14px)',
            opacity: 0.6,
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
          boxShadow: `0 0 0 1.5px ${shimmerColor}, 0 0 20px ${shimmerColor}30`,
          transition: 'box-shadow 600ms ease',
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
          boxShadow: `0 0 0 1.5px ${shimmerColor}`,
          transition: 'box-shadow 400ms ease',
        }}
      />
    );

    const renderFloodMode = () => (
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
        style={{ borderRadius, zIndex: 3 }}
      >
        <div
          className="rounded-full animate-ceremony-flood"
          style={{
            width: '150%',
            aspectRatio: '1',
            background: 'rgba(0, 64, 255, 0.85)',
          }}
        />
      </div>
    );

    const renderDrainMode = () => (
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
        style={{ borderRadius, zIndex: 3 }}
      >
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
