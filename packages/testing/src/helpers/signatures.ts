/**
 * Helper functions for generating mock Solana signatures
 */

import bs58 from 'bs58';
import { MockSignatureOptions } from '../types';

/**
 * Generate a mock Solana transaction signature
 *
 * Solana signatures are 64-byte ed25519 signatures encoded as base58 strings.
 * This generates valid-looking signatures for testing without requiring real transactions.
 *
 * @param options - Signature generation options
 * @returns Valid base58-encoded signature string
 *
 * @example
 * ```typescript
 * // Random signature
 * const sig1 = generateMockSignature();
 *
 * // Deterministic signature from seed
 * const sig2 = generateMockSignature({ seed: 'test-payment-1' });
 * const sig3 = generateMockSignature({ seed: 'test-payment-1' });
 * // sig2 === sig3 (deterministic)
 * ```
 */
export function generateMockSignature(options: MockSignatureOptions = {}): string {
  const { seed, validBase58 = true } = options;

  if (seed) {
    // Generate deterministic signature from seed
    return generateDeterministicSignature(seed);
  }

  if (validBase58) {
    // Generate random valid base58 signature
    return generateRandomSignature();
  }

  // Generate random but possibly invalid signature
  return generateRandomString(88); // Typical signature length
}

/**
 * Generate a deterministic signature from a seed string
 * Same seed always produces same signature
 */
function generateDeterministicSignature(seed: string): string {
  // Simple hash function to convert seed to bytes
  const bytes = new Uint8Array(64);

  // Use seed to generate deterministic bytes
  for (let i = 0; i < 64; i++) {
    // Simple hash mixing the seed and index
    const charCode = seed.charCodeAt(i % seed.length);
    const mixed = (charCode * (i + 1) * 2654435761) >>> 0; // multiplicative hash
    bytes[i] = mixed & 0xff;
  }

  return bs58.encode(Buffer.from(bytes));
}

/**
 * Generate a random valid base58 signature
 */
function generateRandomSignature(): string {
  const bytes = new Uint8Array(64);

  // Fill with random bytes
  for (let i = 0; i < 64; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }

  return bs58.encode(Buffer.from(bytes));
}

/**
 * Generate a random string of specified length
 */
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789'; // base58 chars
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate multiple mock signatures at once
 *
 * @param count - Number of signatures to generate
 * @param options - Signature generation options
 * @returns Array of unique signatures
 *
 * @example
 * ```typescript
 * const signatures = generateMockSignatures(5);
 * // ['sig1...', 'sig2...', 'sig3...', 'sig4...', 'sig5...']
 *
 * const deterministicSigs = generateMockSignatures(3, { seed: 'base' });
 * // Generates 'base-0', 'base-1', 'base-2'
 * ```
 */
export function generateMockSignatures(
  count: number,
  options: MockSignatureOptions = {}
): string[] {
  const signatures: string[] = [];
  const { seed } = options;

  for (let i = 0; i < count; i++) {
    const sigOptions = seed
      ? { ...options, seed: `${seed}-${i}` }
      : options;

    signatures.push(generateMockSignature(sigOptions));
  }

  return signatures;
}

/**
 * Validate if a string is a valid Solana signature format
 *
 * @param signature - String to validate
 * @returns True if valid signature format
 *
 * @example
 * ```typescript
 * const valid = isValidSignatureFormat(generateMockSignature());
 * // true
 *
 * const invalid = isValidSignatureFormat('not-a-signature');
 * // false
 * ```
 */
export function isValidSignatureFormat(signature: string): boolean {
  try {
    // Try to decode as base58
    const decoded = bs58.decode(signature);

    // Solana signatures are 64 bytes
    return decoded.length === 64;
  } catch {
    return false;
  }
}

/**
 * Create a signature from a specific byte pattern
 * Useful for creating test signatures with specific properties
 *
 * @param pattern - Byte to repeat (0-255)
 * @returns Signature with repeated byte pattern
 *
 * @example
 * ```typescript
 * const zeroSig = signatureFromPattern(0);
 * const oneSig = signatureFromPattern(255);
 * ```
 */
export function signatureFromPattern(pattern: number): string {
  const bytes = new Uint8Array(64);
  bytes.fill(pattern);
  return bs58.encode(Buffer.from(bytes));
}

/**
 * Get the first N signatures from a deterministic sequence
 * Useful for setting up test fixtures
 *
 * @param count - Number of signatures
 * @returns Array of deterministic signatures
 *
 * @example
 * ```typescript
 * const [sig1, sig2, sig3] = getTestSignatures(3);
 * ```
 */
export function getTestSignatures(count: number): string[] {
  return generateMockSignatures(count, { seed: 'test' });
}
