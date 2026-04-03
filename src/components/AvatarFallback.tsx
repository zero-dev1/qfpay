// src/components/AvatarFallback.tsx
// Reusable avatar component with deterministic gradient fallback.
// Used on RecipientScreen, ConfirmScreen, AnimationSequence, ConnectedPill.

import { generateAvatarGradient, getAvatarInitial, getAvatarSeed } from '../utils/avatarFallback';

interface AvatarFallbackProps {
  name: string | null;
  address: string | null;
  avatarUrl: string | null;
  size: number;
  borderColor?: string;
  borderWidth?: number;
  className?: string;
  onLoad?: () => void;
  style?: React.CSSProperties;
}

export function AvatarFallback({
  name,
  address,
  avatarUrl,
  size,
  borderColor = 'rgba(255,255,255,0.15)',
  borderWidth = 1.5,
  className = '',
  onLoad,
  style,
}: AvatarFallbackProps) {
  const seed = getAvatarSeed(name, address);
  const gradient = generateAvatarGradient(seed);
  const initial = getAvatarInitial(name, address);
  
  // Font size scales with avatar size: roughly size * 0.38
  const fontSize = Math.round(size * 0.38);

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'User'}
        className={`rounded-full object-cover ${className}`}
        style={{
          width: size,
          height: size,
          border: `${borderWidth}px solid ${borderColor}`,
          ...style,
        }}
        onLoad={onLoad}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        background: gradient,
        border: `${borderWidth}px solid ${borderColor}`,
        ...style,
      }}
    >
      <span
        className="font-clash font-bold text-white"
        style={{ fontSize, lineHeight: 1, opacity: 0.9 }}
      >
        {initial}
      </span>
    </div>
  );
}
