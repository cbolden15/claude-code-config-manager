/**
 * Custom Test Assertions
 *
 * Additional assertions for testing
 */

/**
 * Asserts that an array contains an object with matching properties
 */
export function assertContains<T>(
  array: T[],
  matcher: Partial<T>,
  message?: string
): void {
  const found = array.some(item =>
    Object.entries(matcher).every(([key, value]) => (item as any)[key] === value)
  );

  if (!found) {
    const msg = message || `Expected array to contain object matching ${JSON.stringify(matcher)}`;
    throw new Error(msg);
  }
}

/**
 * Asserts that an array does not contain an object with matching properties
 */
export function assertNotContains<T>(
  array: T[],
  matcher: Partial<T>,
  message?: string
): void {
  const found = array.some(item =>
    Object.entries(matcher).every(([key, value]) => (item as any)[key] === value)
  );

  if (found) {
    const msg = message || `Expected array to not contain object matching ${JSON.stringify(matcher)}`;
    throw new Error(msg);
  }
}

/**
 * Asserts that a value is defined (not null or undefined)
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message?: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message || 'Expected value to be defined');
  }
}

/**
 * Asserts that a value matches a regex pattern
 */
export function assertMatches(
  value: string,
  pattern: RegExp,
  message?: string
): void {
  if (!pattern.test(value)) {
    throw new Error(
      message || `Expected "${value}" to match pattern ${pattern}`
    );
  }
}

/**
 * Asserts that a value is within a range
 */
export function assertInRange(
  value: number,
  min: number,
  max: number,
  message?: string
): void {
  if (value < min || value > max) {
    throw new Error(
      message || `Expected ${value} to be between ${min} and ${max}`
    );
  }
}

/**
 * Asserts that an object has specific keys
 */
export function assertHasKeys<T extends object>(
  obj: T,
  keys: (keyof T)[],
  message?: string
): void {
  const missing = keys.filter(key => !(key in obj));

  if (missing.length > 0) {
    throw new Error(
      message || `Expected object to have keys: ${missing.join(', ')}`
    );
  }
}

/**
 * Asserts that a date is recent (within last N milliseconds)
 */
export function assertRecentDate(
  date: Date,
  withinMs: number = 5000,
  message?: string
): void {
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 0 || diff > withinMs) {
    throw new Error(
      message || `Expected date to be within last ${withinMs}ms, but was ${diff}ms ago`
    );
  }
}

/**
 * Asserts that an async function throws a specific error
 */
export async function assertThrowsAsync(
  fn: () => Promise<any>,
  errorMatcher?: string | RegExp,
  message?: string
): Promise<void> {
  let threw = false;
  let error: any;

  try {
    await fn();
  } catch (e) {
    threw = true;
    error = e;
  }

  if (!threw) {
    throw new Error(message || 'Expected function to throw');
  }

  if (errorMatcher) {
    const errorMessage = error.message || String(error);
    const matches = typeof errorMatcher === 'string'
      ? errorMessage.includes(errorMatcher)
      : errorMatcher.test(errorMessage);

    if (!matches) {
      throw new Error(
        `Expected error to match ${errorMatcher}, but got: ${errorMessage}`
      );
    }
  }
}

/**
 * Asserts that two arrays have the same elements (order independent)
 */
export function assertSameElements<T>(
  actual: T[],
  expected: T[],
  message?: string
): void {
  if (actual.length !== expected.length) {
    throw new Error(
      message || `Arrays have different lengths: ${actual.length} vs ${expected.length}`
    );
  }

  const sortedActual = [...actual].sort();
  const sortedExpected = [...expected].sort();

  for (let i = 0; i < sortedActual.length; i++) {
    if (sortedActual[i] !== sortedExpected[i]) {
      throw new Error(
        message || `Arrays differ at index ${i}: ${sortedActual[i]} vs ${sortedExpected[i]}`
      );
    }
  }
}
