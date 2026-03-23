/**
 * Parse a decimal string amount into wei (bigint with 18 decimals).
 * Example: "100.5" → 100500000000000000000n
 */
export function parseQFAmount(amount: string): bigint {
  const trimmed = amount.trim();
  if (!trimmed || trimmed === '.' || trimmed === '0.') return 0n;

  const parts = trimmed.split('.');
  const whole = parts[0] || '0';
  let decimal = parts[1] || '';

  // Pad or truncate to 18 decimal places
  if (decimal.length > 18) {
    decimal = decimal.slice(0, 18);
  } else {
    decimal = decimal.padEnd(18, '0');
  }

  const combined = whole + decimal;
  // Remove leading zeros but keep at least one digit
  const cleaned = combined.replace(/^0+/, '') || '0';
  return BigInt(cleaned);
}

/**
 * Validate amount input string.
 * Returns true if it's a valid positive decimal number.
 */
export function isValidAmountInput(value: string): boolean {
  if (!value) return true; // empty is valid (not submittable, but valid input)
  return /^\d*\.?\d*$/.test(value) && value !== '.';
}
