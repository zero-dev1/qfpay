export type CeremonyPhase =
  | { type: 'name'; text: string; cursor: boolean }
  | { type: 'amount'; text: string; cursor: boolean }
  | { type: 'preview'; sender: string; receiver: string; amount: number }
  | { type: 'burn'; amount: number }
  | { type: 'sent'; amount: number }
  | { type: 'complete' }
  | { type: 'empty' };

export interface BorderState {
  mode: 'trace' | 'bloom' | 'hold' | 'flood' | 'drain';
  color: 'sapphire' | 'crimson';
  speed: 'ambient' | 'confirm' | 'fast';
}

export interface CeremonyLoop {
  name: string;
  amount: number;
  sender: string;
}

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
