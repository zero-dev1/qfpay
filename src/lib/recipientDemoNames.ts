// src/lib/recipientDemoNames.ts
// Shared constants for the auto-typing demo — used by both
// IdentityScreen (invitation state) and RecipientScreen (active input)

// All 18 network identities from Screen 1 — same names, .qf suffix, cycling order
export const EXAMPLE_NAMES = [
  'vector.qf', 'memechi.qf', 'steve.qf', 'hwmedia.qf', 'teddy.qf',
  'satoshiflipper.qf', 'altcoinsensei.qf', 'soapy.qf', 'patrick.qf',
  'drprofit.qf', 'vitalik.qf', 'cryptomonk.qf', 'overdose.qf',
  'amg.qf', 'bino.qf', 'nils.qf', 'cryptouser28.qf', 'sam.qf',
]
export const TYPE_SPEED = 80       // ms per character while typing
export const DELETE_SPEED = 40     // ms per character while deleting
export const PAUSE_AFTER_TYPE = 1500  // ms to hold before deleting
export const PAUSE_AFTER_DELETE = 300 // ms to hold before next name
