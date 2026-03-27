// src/utils/haptics.ts
// Haptic feedback patterns for QFPay's payment flow.
// Uses navigator.vibrate() — Android only. iOS Safari does not support this API.
// All calls are no-ops on unsupported devices.

const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

/** Light tap — pills, back buttons, navigation */
export function hapticLight() {
  if (canVibrate) navigator.vibrate(8);
}

/** Medium tap — CTA presses, commitments */
export function hapticMedium() {
  if (canVibrate) navigator.vibrate(15);
}

/** Double pulse — recipient .qf resolution celebration */
export function hapticDouble() {
  if (canVibrate) navigator.vibrate([12, 80, 12]);
}

/** Burn rumble — destruction feel, pairs with burn sound */
export function hapticBurn() {
  if (canVibrate) navigator.vibrate([20, 100, 15, 100, 25]);
}

/** Impact — crisp hit when amount badge arrives at recipient */
export function hapticImpact() {
  if (canVibrate) navigator.vibrate(25);
}

/** Success — triple pulse, completion/resolution */
export function hapticSuccess() {
  if (canVibrate) navigator.vibrate([15, 60, 15, 60, 20]);
}
