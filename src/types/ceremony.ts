/**
 * Type definitions for QFPay ceremony system
 * Defines the structure for choreography phases, border states, and ceremony data
 */

// ─── Phase Types ─────────────────────────────────────────────────────────────

export type CeremonyPhase =
  | { type: 'name'; text: string; cursor: boolean }
  | { type: 'amount'; text: string; cursor: boolean }
  | { type: 'preview'; sender: string; receiver: string; amount: number }
  | { type: 'burn'; amount: number }
  | { type: 'sent'; amount: number }
  | { type: 'complete' }
  | { type: 'empty' }
  | { type: 'transition'; direction: 'forward' | 'backward' };

// ─── Border State Types ───────────────────────────────────────────────────────

export interface BorderState {
  mode: 'trace' | 'bloom' | 'hold' | 'flood' | 'drain';
  color: 'sapphire' | 'crimson';
  speed: 'ambient' | 'confirm' | 'fast';
}

// ─── Ceremony Data Types ─────────────────────────────────────────────────────

export interface CeremonyLoop {
  name: string;
  amount: number;
  sender: string;
}

// ─── Component Props Types ───────────────────────────────────────────────────

export interface CeremonySequenceProps {
  shimmerRef: React.RefObject<ShimmerBorderRef | null>;
  reducedMotion: boolean;
}

export interface ShimmerBorderRef {
  setMode: (mode: BorderState['mode']) => void;
  setColor: (color: BorderState['color']) => void;
  setSpeed: (speed: BorderState['speed']) => void;
  flood: () => Promise<void>;
  drain: () => Promise<void>;
}

export interface ShimmerBorderProps {
  borderRadius?: number;
}
