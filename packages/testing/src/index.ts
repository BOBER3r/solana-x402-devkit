/**
 * @x402-solana/testing
 *
 * Comprehensive testing utilities for x402-solana-toolkit
 * Provides mock payment verifiers, RPC connections, and test helpers
 * for writing fast, reliable tests without blockchain dependency.
 *
 * @example
 * ```typescript
 * import {
 *   mockX402Response,
 *   mockPaymentVerifier,
 *   mockSolanaRPC,
 *   generateMockSignature,
 *   createTestWallet,
 * } from '@x402-solana/testing';
 *
 * describe('Payment API', () => {
 *   it('should handle 402 response', () => {
 *     const requirements = mockX402Response({
 *       priceUSD: 0.001,
 *       recipientWallet: 'TestWallet...',
 *     });
 *
 *     expect(requirements.x402Version).toBe(1);
 *     expect(requirements.accepts).toHaveLength(1);
 *   });
 *
 *   it('should verify payment', async () => {
 *     const verifier = mockPaymentVerifier({ autoApprove: true });
 *     const result = await verifier.verifyPayment(
 *       'sig...',
 *       'recipient...',
 *       0.001
 *     );
 *
 *     expect(result.valid).toBe(true);
 *   });
 * });
 * ```
 *
 * @packageDocumentation
 */

// Export all types
export * from './types';

// Export all mocks
export * from './mocks';

// Export all helpers
export * from './helpers';

/**
 * Version information
 */
export const VERSION = '0.1.0';

/**
 * Quick setup function for common test scenarios
 *
 * @param scenario - Test scenario to set up
 * @returns Pre-configured test environment
 *
 * @example
 * ```typescript
 * const env = setupTestEnvironment('basic');
 * const { verifier, wallet, requirements } = env;
 * ```
 */
export function setupTestEnvironment(
  scenario: 'basic' | 'premium' | 'with-rpc' | 'full' = 'basic'
) {
  const { createTestWallet } = require('./helpers/accounts');
  const { mockPaymentVerifier } = require('./mocks/verifier');
  const { mockX402Response } = require('./mocks/response');
  const { mockSolanaRPC } = require('./mocks/rpc');

  const wallet = createTestWallet('test-wallet');

  const baseEnv = {
    wallet,
    verifier: mockPaymentVerifier({ autoApprove: true }),
    requirements: mockX402Response({
      priceUSD: scenario === 'premium' ? 0.01 : 0.001,
      recipientWallet: wallet.address,
    }),
  };

  if (scenario === 'with-rpc' || scenario === 'full') {
    return {
      ...baseEnv,
      rpc: mockSolanaRPC({ network: 'devnet' }),
    };
  }

  return baseEnv;
}

/**
 * Clean up test environment
 *
 * @param env - Environment returned from setupTestEnvironment
 *
 * @example
 * ```typescript
 * const env = setupTestEnvironment();
 * // ... tests ...
 * await cleanupTestEnvironment(env);
 * ```
 */
export async function cleanupTestEnvironment(env: any): Promise<void> {
  if (env.verifier?.close) {
    await env.verifier.close();
  }

  if (env.verifier?.clearCache) {
    await env.verifier.clearCache();
  }
}
