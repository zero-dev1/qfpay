import { forwardRef, useRef, useState, useImperativeHandle } from 'react';
import LiquidGlass from 'liquid-glass-react';
import ShimmerBorder from './ShimmerBorder';
import { CeremonySequence } from './CeremonySequence';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface CeremonyPreviewRef {
  pulse: (count?: number) => Promise<void>;
  setColor: (color: 'sapphire' | 'crimson' | 'white') => void;
  flood: () => Promise<void>;
  dissipate: () => Promise<void>;
}

const CeremonyPreview = forwardRef<CeremonyPreviewRef>((props, ref) => {
  const shimmerBorderRef = useRef<any>(null);
  const [useLiquidGlass, setUseLiquidGlass] = useState(true);
  const reducedMotion = useReducedMotion();

  useImperativeHandle(ref, () => ({
    pulse: (count?: number) => shimmerBorderRef.current?.pulse(count),
    setColor: (color: 'sapphire' | 'crimson' | 'white') => shimmerBorderRef.current?.setColor(color),
    flood: () => shimmerBorderRef.current?.flood(),
    dissipate: () => shimmerBorderRef.current?.dissipate(),
  }));

  const panelContent = (
    <div
      className="ceremony-preview-glass"
      style={{
        width: 'min(400px, 85vw)',
        minHeight: '320px',
        position: 'relative',
      }}
    >
      {/* Shimmer border layer - only when not reduced motion */}
      {!reducedMotion && <ShimmerBorder ref={shimmerBorderRef} borderRadius={24} />}
      
      {/* Glass panel with content */}
      {useLiquidGlass ? (
        <LiquidGlass
          displacementScale={40}       // subtle refraction — dark bg means less visible
          blurAmount={0.02}            // near-zero frosting — clear glass
          saturation={120}             // slight saturation boost
          aberrationIntensity={1}      // minimal chromatic aberration
          elasticity={0}               // no liquid wobble — this panel is stationary
          cornerRadius={24}            // rounded but not pill-shaped
          className="ceremony-preview-glass"
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
          }}
        >
          <CeremonySequence shimmerRef={shimmerBorderRef} />
        </LiquidGlass>
      ) : (
        <div
          className="ceremony-preview-glass"
          style={{
            width: '100%',
            height: '100%',
            padding: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CeremonySequence shimmerRef={shimmerBorderRef} />
        </div>
      )}
    </div>
  );

  return (
    <>
      {panelContent}
      {/* CSS fallback styles */}
      <style>{`
        .ceremony-preview-glass {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 24px;
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.04),
            inset 0 1px 0 0 rgba(255, 255, 255, 0.06),
            0 8px 32px rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(1px);
          position: relative;
          overflow: hidden;
        }
      `}</style>
    </>
  );
});

CeremonyPreview.displayName = 'CeremonyPreview';

export default CeremonyPreview;
