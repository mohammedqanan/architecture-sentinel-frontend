/**
 * src/utils/helpers.ts
 *
 * Centralised library of pure, side‑effect‑free helper functions used across the application.
 * Includes debouncing, throttling, deep cloning, date formatting, truncation, ID generation,
 * object picking/omitting, and emptiness checks.
 */

// ============================================================
// Debounce
// ============================================================

/**
 * Creates a debounced function that delays invoking `func` until after `wait` milliseconds
 * have elapsed since the last time the debounced function was called.
 *
 * @param func - The function to debounce.
 * @param wait - The number of milliseconds to delay.
 * @returns A debounced function.
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>): void {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func.apply(this, args);
      timeoutId = null;
    }, wait);
  };
}

// ============================================================
// Throttle
// ============================================================

/**
 * Creates a throttled function that invokes `func` at most once per `wait` milliseconds.
 * Uses leading‑edge throttling (the first call is executed immediately, then subsequent
 * calls are ignored until the wait period has passed).
 *
 * @param func - The function to throttle.
 * @param wait - The number of milliseconds to throttle invocations to.
 * @returns A throttled function.
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let lastCallTime: number | null = null;

  return function (this: any, ...args: Parameters<T>): void {
    const now = Date.now();
    if (lastCallTime === null || now - lastCallTime >= wait) {
      lastCallTime = now;
      func.apply(this, args);
    }
  };
}

// ============================================================
// Deep Clone
// ============================================================

/**
 * Performs a deep clone of a value using `structuredClone` if available,
 * with a fallback to `JSON.parse(JSON.stringify(value))` for older environments.
 *
 * @note The fallback does not preserve non‑JSON‑safe values (e.g., `Date`, `RegExp`, `undefined`, functions).
 * For those cases, consider a custom cloning implementation.
 *
 * @param value - The value to clone.
 * @returns A deep clone of the input.
 */
export function deepClone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  // Fallback: JSON serialisation (limited to JSON‑safe values)
  return JSON.parse(JSON.stringify(value));
}

// ============================================================
// Date Formatting
// ============================================================

/**
 * Formats a date into a human‑readable relative time string (e.g., "2 hours ago", "yesterday").
 * Uses `Intl.RelativeTimeFormat` if available, otherwise falls back to a manual approximation.
 *
 * @param date - A date, timestamp, or ISO string.
 * @returns A relative time string.
 */
export function formatDate(date: Date | string | number): string {
  const input = typeof date === 'string' ? new Date(date) : new Date(date);
  if (isNaN(input.getTime())) {
    return 'Invalid date';
  }

  const now = Date.now();
  const diffMs = now - input.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30.44); // approximate
  const diffYear = Math.floor(diffDay / 365.25);

  // Use Intl.RelativeTimeFormat if available
  if (typeof Intl !== 'undefined' && Intl.RelativeTimeFormat) {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    if (diffSec < 60) return rtf.format(-diffSec, 'second');
    if (diffMin < 60) return rtf.format(-diffMin, 'minute');
    if (diffHour < 24) return rtf.format(-diffHour, 'hour');
    if (diffDay < 7) return rtf.format(-diffDay, 'day');
    if (diffWeek < 4) return rtf.format(-diffWeek, 'week');
    if (diffMonth < 12) return rtf.format(-diffMonth, 'month');
    return rtf.format(-diffYear, 'year');
  }

  // Manual fallback
  const r = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (diffSec < 60) return r.format(-diffSec, 'second');
  if (diffMin < 60) return r.format(-diffMin, 'minute');
  if (diffHour < 24) return r.format(-diffHour, 'hour');
  if (diffDay < 7) return r.format(-diffDay, 'day');
  if (diffWeek < 4) return r.format(-diffWeek, 'week');
  if (diffMonth < 12) return r.format(-diffMonth, 'month');
  return r.format(-diffYear, 'year');
}

// ============================================================
// String Truncation
// ============================================================

/**
 * Truncates a string to a maximum length and appends an ellipsis if truncated.
 * If `maxLength` is less than or equal to the length of the ellipsis, the ellipsis is omitted.
 *
 * @param str - The string to truncate.
 * @param maxLength - The maximum allowed length of the final string.
 * @param ellipsis - The ellipsis string (default: '…').
 * @returns The truncated string.
 */
export function truncate(str: string, maxLength: number, ellipsis: string = '…'): string {
  if (!str) return '';
  if (maxLength <= 0) return '';
  if (str.length <= maxLength) return str;

  const ellipsisLen = ellipsis.length;
  if (maxLength <= ellipsisLen) {
    return str.slice(0, maxLength);
  }
  return str.slice(0, maxLength - ellipsisLen) + ellipsis;
}

// ============================================================
// ID Generation
// ============================================================

/**
 * Generates a random alphanumeric ID.
 *
 * @param prefix - An optional prefix (e.g., 'task-').
 * @param length - The length of the random part (default: 8).
 * @returns A string ID.
 */
export function generateId(prefix: string = '', length: number = 8): string {
  const randomPart = Math.random()
    .toString(36)
    .substring(2, 2 + length);
  return prefix + randomPart;
}

// ============================================================
// Object Pick / Omit
// ============================================================

/**
 * Creates a new object by picking only the specified keys from the source object.
 *
 * @param obj - The source object.
 * @param keys - The keys to pick.
 * @returns A new object with only the picked keys.
 */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Creates a new object by omitting the specified keys from the source object.
 *
 * @param obj - The source object.
 * @param keys - The keys to omit.
 * @returns A new object without the omitted keys.
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

// ============================================================
// Emptiness Check
// ============================================================

/**
 * Checks if a value is "empty":
 * - `null` or `undefined` → empty
 * - String with only whitespace → empty
 * - Array with length 0 → empty
 * - Object with no own enumerable string‑keyed properties → empty
 *
 * @param value - The value to check.
 * @returns `true` if the value is empty, otherwise `false`.
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;

  if (typeof value === 'string') {
    return value.trim().length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }

  // For numbers, booleans, etc., treat as non‑empty
  return false;
}