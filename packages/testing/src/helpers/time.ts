/**
 * Time manipulation helpers for testing
 */

import { MockTimeOptions } from '../types';

/**
 * Original Date.now function (saved for restoration)
 */
let originalDateNow: () => number = Date.now;
let mockTime: number | null = null;
let timeOffset: number = 0;

/**
 * Mock the current time for testing
 *
 * This replaces Date.now() to return a fixed time or offset time,
 * allowing you to test time-dependent logic without waiting.
 *
 * @param options - Time mock options
 *
 * @example
 * ```typescript
 * // Mock to specific time
 * mockCurrentTime({ now: 1609459200000 }); // Jan 1, 2021
 * console.log(Date.now()); // 1609459200000
 *
 * // Mock with offset (5 minutes in the future)
 * mockCurrentTime({ offset: 5 * 60 * 1000 });
 * console.log(Date.now()); // real time + 5 minutes
 * ```
 */
export function mockCurrentTime(options: MockTimeOptions = {}): void {
  const { now, offset } = options;

  if (now !== undefined) {
    // Set to specific time
    mockTime = now;
    timeOffset = 0;
    Date.now = () => mockTime!;
  } else if (offset !== undefined) {
    // Set offset from real time
    mockTime = null;
    timeOffset = offset;
    Date.now = () => originalDateNow() + timeOffset;
  }
}

/**
 * Restore Date.now() to original behavior
 *
 * @example
 * ```typescript
 * mockCurrentTime({ now: 1609459200000 });
 * // ... tests ...
 * restoreTime();
 * console.log(Date.now()); // Real current time
 * ```
 */
export function restoreTime(): void {
  Date.now = originalDateNow;
  mockTime = null;
  timeOffset = 0;
}

/**
 * Travel forward in time by specified milliseconds
 *
 * @param ms - Milliseconds to advance
 *
 * @example
 * ```typescript
 * mockCurrentTime({ now: 0 });
 * console.log(Date.now()); // 0
 *
 * timeTravel(5000);
 * console.log(Date.now()); // 5000
 *
 * timeTravel(60000);
 * console.log(Date.now()); // 65000
 * ```
 */
export function timeTravel(ms: number): void {
  if (mockTime !== null) {
    // Advance mocked time
    mockTime += ms;
  } else {
    // Increase offset
    timeOffset += ms;
  }
}

/**
 * Travel backward in time by specified milliseconds
 *
 * @param ms - Milliseconds to rewind
 *
 * @example
 * ```typescript
 * mockCurrentTime({ now: 10000 });
 * timeTravelBack(5000);
 * console.log(Date.now()); // 5000
 * ```
 */
export function timeTravelBack(ms: number): void {
  timeTravel(-ms);
}

/**
 * Get the current mocked time value
 *
 * @returns Current mocked time or null if not mocked
 *
 * @example
 * ```typescript
 * mockCurrentTime({ now: 12345 });
 * console.log(getMockedTime()); // 12345
 *
 * restoreTime();
 * console.log(getMockedTime()); // null
 * ```
 */
export function getMockedTime(): number | null {
  return mockTime;
}

/**
 * Get the current time offset
 *
 * @returns Time offset in milliseconds
 *
 * @example
 * ```typescript
 * mockCurrentTime({ offset: 60000 });
 * console.log(getTimeOffset()); // 60000
 * ```
 */
export function getTimeOffset(): number {
  return timeOffset;
}

/**
 * Check if time is currently mocked
 *
 * @returns True if time is mocked
 *
 * @example
 * ```typescript
 * console.log(isTimeMocked()); // false
 * mockCurrentTime({ now: 0 });
 * console.log(isTimeMocked()); // true
 * ```
 */
export function isTimeMocked(): boolean {
  return mockTime !== null || timeOffset !== 0;
}

/**
 * Create a timestamp for testing
 *
 * @param options - Options for timestamp creation
 * @returns Timestamp in milliseconds
 *
 * @example
 * ```typescript
 * // Current time
 * const now = createTimestamp();
 *
 * // 5 minutes ago
 * const past = createTimestamp({ minutesAgo: 5 });
 *
 * // 10 minutes in the future
 * const future = createTimestamp({ minutesFromNow: 10 });
 *
 * // Specific date
 * const specific = createTimestamp({ date: new Date('2021-01-01') });
 * ```
 */
export function createTimestamp(options: {
  date?: Date;
  secondsAgo?: number;
  minutesAgo?: number;
  hoursAgo?: number;
  daysAgo?: number;
  secondsFromNow?: number;
  minutesFromNow?: number;
  hoursFromNow?: number;
  daysFromNow?: number;
} = {}): number {
  const {
    date,
    secondsAgo = 0,
    minutesAgo = 0,
    hoursAgo = 0,
    daysAgo = 0,
    secondsFromNow = 0,
    minutesFromNow = 0,
    hoursFromNow = 0,
    daysFromNow = 0,
  } = options;

  if (date) {
    return date.getTime();
  }

  const now = Date.now();

  // Calculate offset
  const pastOffset =
    secondsAgo * 1000 +
    minutesAgo * 60 * 1000 +
    hoursAgo * 60 * 60 * 1000 +
    daysAgo * 24 * 60 * 60 * 1000;

  const futureOffset =
    secondsFromNow * 1000 +
    minutesFromNow * 60 * 1000 +
    hoursFromNow * 60 * 60 * 1000 +
    daysFromNow * 24 * 60 * 60 * 1000;

  return now - pastOffset + futureOffset;
}

/**
 * Create a Solana block time (seconds since epoch)
 *
 * @param options - Timestamp options
 * @returns Block time in seconds
 *
 * @example
 * ```typescript
 * const blockTime = createBlockTime({ minutesAgo: 5 });
 * // Used in mock transactions
 * ```
 */
export function createBlockTime(options: Parameters<typeof createTimestamp>[0] = {}): number {
  return Math.floor(createTimestamp(options) / 1000);
}

/**
 * Wait for specified milliseconds (async delay for tests)
 *
 * @param ms - Milliseconds to wait
 *
 * @example
 * ```typescript
 * await sleep(1000); // Wait 1 second
 * ```
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a timestamp that is expired relative to max age
 *
 * @param maxAgeMs - Maximum age in milliseconds
 * @param excessMs - How much older than max age (default: 1000ms)
 * @returns Expired timestamp
 *
 * @example
 * ```typescript
 * const maxAge = 5 * 60 * 1000; // 5 minutes
 * const expired = createExpiredTimestamp(maxAge);
 * // Returns timestamp from 5 minutes and 1 second ago
 * ```
 */
export function createExpiredTimestamp(maxAgeMs: number, excessMs: number = 1000): number {
  return Date.now() - maxAgeMs - excessMs;
}

/**
 * Create a timestamp that is valid relative to max age
 *
 * @param maxAgeMs - Maximum age in milliseconds
 * @param bufferMs - How much within the limit (default: 10000ms)
 * @returns Valid timestamp
 *
 * @example
 * ```typescript
 * const maxAge = 5 * 60 * 1000; // 5 minutes
 * const valid = createValidTimestamp(maxAge);
 * // Returns timestamp from ~4 minutes and 50 seconds ago
 * ```
 */
export function createValidTimestamp(maxAgeMs: number, bufferMs: number = 10000): number {
  return Date.now() - (maxAgeMs - bufferMs);
}

/**
 * Format timestamp as ISO string for display
 *
 * @param timestamp - Timestamp in milliseconds
 * @returns ISO date string
 *
 * @example
 * ```typescript
 * const timestamp = Date.now();
 * console.log(formatTimestamp(timestamp));
 * // '2025-11-09T12:34:56.789Z'
 * ```
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

/**
 * Get age of timestamp in milliseconds
 *
 * @param timestamp - Timestamp in milliseconds
 * @returns Age in milliseconds
 *
 * @example
 * ```typescript
 * const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
 * const age = getTimestampAge(fiveMinutesAgo);
 * console.log(age); // ~300000 (5 minutes in ms)
 * ```
 */
export function getTimestampAge(timestamp: number): number {
  return Date.now() - timestamp;
}
