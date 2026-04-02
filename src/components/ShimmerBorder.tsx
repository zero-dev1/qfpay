import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import type { ShimmerBorderRef, ShimmerBorderProps } from '../types/ceremony';

type ShimmerColor = 'sapphire' | 'crimson';
type ShimmerSpeed = 'ambient' | 'confirm' | 'fast';
type ShimmerMode = 'trace' | 'bloom' | 'hold' | 'flood' | 'drain';

const COLOR_MAP = {
  sapphire: '#0040FF',
  crimson: '#DC2626',
} as const;

const ShimmerBorder = forwardRef<ShimmerBorderRef, ShimmerBorderProps>(
  ({ borderRadius = 16 }, ref) => {
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
          setTimeout(resolve, 500);
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

    const hex = COLOR_MAP[color];

    // Speed → CSS class for the beam orbit duration
    const speedClass =
      speed === 'ambient'
        ? 'beam-speed-ambient'
        : speed === 'confirm'
          ? 'beam-speed-confirm'
          : 'beam-speed-fast';

    // ── TRACE: glowing dot orbiting via offset-path ──────────────────

    const renderTraceMode = () => (
      <>
        {/* The beam dot — a small glowing orb that follows the border path */}
        <div
          className={`beam-dot ${speedClass}`}
          style={{
            position: 'absolute',
            // The dot itself: small, colored, heavily blurred for glow
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${hex}90 0%, ${hex}40 30%, transparent 70%)`,
            // offset-path traces the panel's rounded rect border
            offsetPath: `inset(0 round ${borderRadius}px)`,
            offsetRotate: '0deg',
            // Position the center of the dot ON the path
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 1,
            filter: `blur(2px)`,
            willChange: 'offset-distance',
          }}
        />
        {/* A smaller, brighter core for the beam head */}
        <div
          className={`beam-dot ${speedClass}`}
          style={{
            position: 'absolute',
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: `radial-gradient(circle, white 0%, ${hex} 40%, transparent 70%)`,
            offsetPath: `inset(0 round ${borderRadius}px)`,
            offsetRotate: '0deg',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 2,
            willChange: 'offset-distance',
          }}
        />
      </>
    );

    // ── BLOOM: entire border glows uniformly ─────────────────────────

    const renderBloomMode = () => (
      <div
        className="transition-all duration-500"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius,
          pointerEvents: 'none',
          zIndex: 1,
          boxShadow: `inset 0 0 0 1.5px ${hex}70, 0 0 30px ${hex}20`,
        }}
      />
    );

    // ── HOLD: static solid border tint ───────────────────────────────

    const renderHoldMode = () => (
      <div
        className="transition-colors duration-400"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius,
          pointerEvents: 'none',
          zIndex: 1,
          boxShadow: `inset 0 0 0 1.5px ${hex}90`,
        }}
      />
    );

    // ── FLOOD: sapphire ripple from center (contained by PARENT overflow) ──

    const renderFloodMode = () => (
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ zIndex: 3 }}
      >
        <div
          className="rounded-full animate-ceremony-flood"
          style={{
            width: '200%',
            aspectRatio: '1',
            background: 'rgba(0, 64, 255, 0.85)',
          }}
        />
      </div>
    );

    // ── DRAIN: reverse ripple ────────────────────────────────────────

    const renderDrainMode = () => (
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ zIndex: 3 }}
      >
        <div
          className="rounded-full animate-ceremony-drain"
          style={{
            width: '200%',
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
