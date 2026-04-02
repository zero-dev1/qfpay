import { useRef } from 'react';
import ShimmerBorder from './ShimmerBorder';
import { CeremonySequence } from './CeremonySequence';
import { useReducedMotion } from '../hooks/useReducedMotion';
import type { ShimmerBorderRef } from '../types/ceremony';

export default function CeremonyPreview() {
  const shimmerRef = useRef<ShimmerBorderRef>(null);
  const reducedMotion = useReducedMotion();

  return (
    <div
      className="relative w-full h-full overflow-hidden rounded-2xl"
      style={{
        // Near-invisible against #060A14. Panel exists because the beam tells you it does.
        background: 'rgba(255, 255, 255, 0.008)',
        // Whisper of rim light — physical object catching light from above
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.025)',
      }}
    >
      {!reducedMotion && <ShimmerBorder ref={shimmerRef} borderRadius={16} />}
      <CeremonySequence shimmerRef={shimmerRef} reducedMotion={reducedMotion} />
    </div>
  );
}
