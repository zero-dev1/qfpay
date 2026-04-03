// src/utils/avatarFallback.ts
// Deterministic gradient avatar from any string (address, .qf name, etc.)
// No dependencies. Same input always produces same output.

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate a deterministic CSS gradient string from an identifier.
 * Returns a linear-gradient with two hues derived from the input.
 * The gradient angle is also deterministic.
 */
export function generateAvatarGradient(identifier: string): string {
  const hash = hashString(identifier.toLowerCase());
  
  // Derive two hue values (0-360) and an angle (100-170 for diagonal feel)
  const hue1 = hash % 360;
  const hue2 = (hash * 7 + 131) % 360;
  const angle = 120 + (hash % 50); // 120-170 degrees
  
  // Use moderate saturation and lightness for dark-bg readability
  // Saturation: 55-75%, Lightness: 40-55%
  const sat1 = 55 + (hash % 20);
  const light1 = 40 + ((hash >> 4) % 15);
  const sat2 = 60 + ((hash >> 8) % 15);
  const light2 = 35 + ((hash >> 12) % 20);
  
  return `linear-gradient(${angle}deg, hsl(${hue1}, ${sat1}%, ${light1}%), hsl(${hue2}, ${sat2}%, ${light2}%))`;
}

/**
 * Get the initial letter(s) for an avatar.
 * For .qf names: first character uppercased.
 * For addresses: first non-0x character uppercased.
 */
export function getAvatarInitial(name: string | null, address: string | null): string {
  if (name) {
    return name[0].toUpperCase();
  }
  if (address) {
    const clean = address.startsWith('0x') ? address.slice(2) : address;
    return (clean[0] || '?').toUpperCase();
  }
  return '?';
}

/**
 * Get the string to use as gradient seed.
 * Prefers address (more unique) over name.
 */
export function getAvatarSeed(name: string | null, address: string | null): string {
  return address?.toLowerCase() || name?.toLowerCase() || 'unknown';
}
