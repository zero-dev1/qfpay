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
      className="relative overflow-hidden rounded-2xl"
      style={{
        maxWidth: 'min(520px, 90vw)',      // wider on desktop
        aspectRatio: 'var(--panel-ratio)',
        background: 'rgba(255, 255, 255, 0.015)',
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        // NO border property — the shimmer IS the border
      }}
    >
      {/* Shimmer border — only when motion is allowed */}
      {!reducedMotion && <ShimmerBorder ref={shimmerRef} borderRadius={24} />}

      {/* Ceremony content */}
      <CeremonySequence shimmerRef={shimmerRef} reducedMotion={reducedMotion} />
    </div>
  );
}
