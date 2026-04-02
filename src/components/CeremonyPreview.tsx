import { useRef } from 'react';
import ShimmerBorder, { type ShimmerBorderRef } from './ShimmerBorder';
import { CeremonySequence } from './CeremonySequence';
import { useReducedMotion } from '../hooks/useReducedMotion';

/**
 * CeremonyPreview — The glass panel on the disconnected screen.
 *
 * Single container. No LiquidGlass — on a #060A14 background, SVG
 * displacement refraction is nearly invisible, and the library was
 * causing a double-nested box that broke layout. The premium feel
 * comes from the shimmer border, rim lighting, and subtle glass CSS.
 *
 * The panel has an explicit aspect ratio so child content can fill
 * it reliably with h-full.
 */
export default function CeremonyPreview() {
  const shimmerRef = useRef<ShimmerBorderRef>(null);
  const reducedMotion = useReducedMotion();

  return (
    <div
      style={{
        width: 'min(400px, 85vw)',
        aspectRatio: '3 / 4',
        position: 'relative',
        borderRadius: 24,
        overflow: 'hidden',

        // Glass material — CSS only, no liquid-glass-react
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        boxShadow: [
          'inset 0 1px 0 0 rgba(255, 255, 255, 0.06)', // top edge catch
          '0 0 0 1px rgba(0, 0, 0, 0.3)',                // outer hairline
          '0 8px 40px rgba(0, 0, 0, 0.5)',                // shadow
          '0 0 80px rgba(0, 64, 255, 0.04)',              // faint sapphire ambient
        ].join(', '),
        backdropFilter: 'blur(1px)',
        WebkitBackdropFilter: 'blur(1px)',
      }}
    >
      {/* Shimmer border — only when motion is allowed */}
      {!reducedMotion && <ShimmerBorder ref={shimmerRef} borderRadius={24} />}

      {/* Ceremony content */}
      <CeremonySequence shimmerRef={shimmerRef} reducedMotion={reducedMotion} />
    </div>
  );
}
