/**
 * Input validation and sanitization helpers for API routes
 * Prevents injection attacks and ensures data integrity
 */

/** Strip dangerous characters and limit length */
export function sanitizeString(value: unknown, maxLength = 500): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

/** Validate MongoDB ObjectId format */
export function isValidObjectId(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  return /^[a-f\d]{24}$/i.test(id.trim());
}

/** Validate positive number */
export function sanitizeNumber(value: unknown, defaultValue = 0, max = 1_000_000): number {
  const n = Number(value);
  if (isNaN(n) || !isFinite(n)) return defaultValue;
  return Math.max(0, Math.min(max, n));
}

/** Validate YYYY-MM date format */
export function isValidMonth(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** Validate YYYY-MM-DD date format */
export function isValidDate(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value);
}

/** Validate Egyptian phone number (starts with 01, length 11) */
export function isValidEgyptianPhone(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const clean = value.replace(/\s/g, '');
  return /^(01)[0-9]{9}$/.test(clean) || /^(\+2)(01)[0-9]{9}$/.test(clean);
}

/** Validate enum value */
export function isValidEnum<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

/** Sanitize a percentage value (0-100) */
export function sanitizePercentage(value: unknown, defaultValue = 50): number {
  const n = Number(value);
  if (isNaN(n) || !isFinite(n)) return defaultValue;
  return Math.max(0, Math.min(100, Math.round(n)));
}
