/**
 * Test Helper Utilities
 *
 * Common helper functions for testing
 */

/**
 * Waits for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: {
    timeout?: number;
    interval?: number;
    message?: string;
  } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100, message = 'Condition not met' } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await sleep(interval);
  }

  throw new Error(`${message} (timeout after ${timeout}ms)`);
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function until it succeeds or max attempts reached
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    backoff?: boolean;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, delay = 1000, backoff = false } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxAttempts) {
        const waitTime = backoff ? delay * attempt : delay;
        await sleep(waitTime);
      }
    }
  }

  throw new Error(
    `Failed after ${maxAttempts} attempts. Last error: ${lastError?.message}`
  );
}

/**
 * Creates a spy function
 */
export function createSpy<T extends (...args: any[]) => any>(): SpyFunction<T> {
  const calls: Array<{ args: Parameters<T>; result?: ReturnType<T>; error?: Error }> = [];

  const spy = ((...args: Parameters<T>) => {
    const call: any = { args };
    calls.push(call);

    if (spy.implementation) {
      try {
        call.result = spy.implementation(...args);
        return call.result;
      } catch (error) {
        call.error = error as Error;
        throw error;
      }
    }
  }) as SpyFunction<T>;

  spy.calls = calls;
  spy.callCount = () => calls.length;
  spy.calledWith = (...args) => calls.some(call =>
    args.every((arg, i) => call.args[i] === arg)
  );
  spy.lastCall = () => calls[calls.length - 1];
  spy.reset = () => calls.length = 0;
  spy.mockImplementation = (impl) => {
    spy.implementation = impl;
    return spy;
  };

  return spy;
}

/**
 * Spy function type
 */
export interface SpyFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T>;
  calls: Array<{ args: Parameters<T>; result?: ReturnType<T>; error?: Error }>;
  callCount: () => number;
  calledWith: (...args: Parameters<T>) => boolean;
  lastCall: () => { args: Parameters<T>; result?: ReturnType<T>; error?: Error } | undefined;
  reset: () => void;
  mockImplementation: (impl: T) => SpyFunction<T>;
  implementation?: T;
}

/**
 * Deep clones an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Generates a random string
 */
export function randomString(length: number = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/**
 * Generates a random number within range
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Picks random element from array
 */
export function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Creates a date offset from now
 */
export function dateOffset(offset: {
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
}): Date {
  const date = new Date();

  if (offset.days) date.setDate(date.getDate() + offset.days);
  if (offset.hours) date.setHours(date.getHours() + offset.hours);
  if (offset.minutes) date.setMinutes(date.getMinutes() + offset.minutes);
  if (offset.seconds) date.setSeconds(date.getSeconds() + offset.seconds);

  return date;
}

/**
 * Measures execution time of a function
 */
export async function measureTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;

  return { result, duration };
}

/**
 * Groups array elements by a key
 */
export function groupBy<T, K extends keyof T>(
  array: T[],
  key: K
): Map<T[K], T[]> {
  const map = new Map<T[K], T[]>();

  for (const item of array) {
    const keyValue = item[key];
    const group = map.get(keyValue) || [];
    group.push(item);
    map.set(keyValue, group);
  }

  return map;
}

/**
 * Debounces a function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Truncates a string to a maximum length
 */
export function truncate(str: string, maxLength: number, suffix: string = '...'): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Formats bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
