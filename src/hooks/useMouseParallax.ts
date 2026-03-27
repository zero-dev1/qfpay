// src/hooks/useMouseParallax.ts
import { useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';
import { useReducedMotion } from './useReducedMotion';

interface ParallaxValues {
  x: ReturnType<typeof useSpring>;
  y: ReturnType<typeof useSpring>;
}

export function useMouseParallax(strength: number = 1): ParallaxValues {
  const reducedMotion = useReducedMotion();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Looser spring: orbs drift noticeably, settle slowly (organic, not twitchy)
  const springConfig = { stiffness: 30, damping: 20, mass: 1.5 };
  const x = useSpring(useTransform(mouseX, (v) => v * strength), springConfig);
  const y = useSpring(useTransform(mouseY, (v) => v * strength), springConfig);

  useEffect(() => {
    if (reducedMotion) return;
    // Only activate on devices with a fine pointer (desktop/laptop)
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
    if (!hasFinePointer) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Normalize to -1...1 from center of viewport
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      mouseX.set(nx);
      mouseY.set(ny);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [reducedMotion, mouseX, mouseY]);

  return { x, y };
}
