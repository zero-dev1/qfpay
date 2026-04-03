// src/utils/haptics.ts
// Cross-platform haptic feedback using web-haptics.
// Works on Android (Vibration API) and iOS 18+ (Safari switch checkbox hack).
// Silent no-op on unsupported platforms.

import { WebHaptics } from 'web-haptics';

const haptics = new WebHaptics();

/** Light tap — pills, back buttons, navigation */
export function hapticLight() {
  haptics.trigger('light');
}

/** Medium tap — CTA presses, commitments */
export function hapticMedium() {
  haptics.trigger('medium');
}

/** Double pulse — recipient .qf resolution celebration */
export function hapticDouble() {
  haptics.trigger('success');
}

/** Burn rumble — destruction feel, pairs with burn sound */
export function hapticBurn() {
  haptics.trigger([
    { duration: 20 },
    { delay: 100, duration: 15 },
    { delay: 100, duration: 25, intensity: 1 },
  ]);
}

/** Impact — crisp hit when amount badge arrives at recipient */
export function hapticImpact() {
  haptics.trigger('heavy');
}

/** Success — triple pulse, completion/resolution */
export function hapticSuccess() {
  haptics.trigger('success');
}

/** Tick — subtle pulse during hold-to-sign, heartbeat feel */
export function hapticTick() {
  haptics.trigger([
    { duration: 8, intensity: 0.4 }
  ]);
}
