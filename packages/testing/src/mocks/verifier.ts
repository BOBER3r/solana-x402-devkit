/**
 * Mock payment verifier for testing
 * Simulates TransactionVerifier behavior without blockchain calls
 */

import { MockPaymentVerifierOptions, MockVerificationResult } from '../types';
import { getUSDCMint } from '../helpers/accounts';
import { isValidSignatureFormat } from '../helpers/signatures';
import { sleep } from '../helpers/time';

/**
 * Mock payment cache for replay attack detection
 */
class MockPaymentCache {
  private usedSignatures = new Set<string>();
  private metadata = new Map<string, any>();

  async isUsed(signature: string): Promise<boolean> {
    return this.usedSignatures.has(signature);
  }

  async markUsed(signature: string, meta?: any): Promise<void> {
    this.usedSignatures.add(signature);
    if (meta) {
      this.metadata.set(signature, meta);
    }
  }

  async getMetadata(signature: string): Promise<any> {
    return this.metadata.get(signature) || null;
  }

  async clear(): Promise<void> {
    this.usedSignatures.clear();
    this.metadata.clear();
  }

  async close(): Promise<void> {
    // No-op for mock
  }
}

/**
 * Mock payment verifier
 *
 * Simulates the behavior of TransactionVerifier for testing without
 * requiring real Solana RPC calls or blockchain transactions.
 *
 * @example
 * ```typescript
 * // Auto-approve all payments
 * const verifier = mockPaymentVerifier({ autoApprove: true });
 * const result = await verifier.verifyPayment('sig...', 'recipient...', 0.001);
 * expect(result.valid).toBe(true);
 *
 * // Simulate specific failure
 * const failingVerifier = mockPaymentVerifier({
 *   failureMode: 'amount_mismatch'
 * });
 * const result = await failingVerifier.verifyPayment('sig...', 'recipient...', 0.001);
 * expect(result.valid).toBe(false);
 * expect(result.code).toBe('TRANSFER_MISMATCH');
 * ```
 */
export function mockPaymentVerifier(options: MockPaymentVerifierOptions = {}) {
  const {
    autoApprove = true,
    failureMode = null,
    delayMs = 0,
    network = 'devnet',
    trackReplays = true,
    maxAgeMs = 300_000,
  } = options;

  const cache = new MockPaymentCache();
  const usdcMint = getUSDCMint(network);

  /**
   * Verify a payment
   */
  async function verifyPayment(
    signature: string,
    expectedRecipient: string,
    expectedAmountUSD: number,
    verifyOptions: {
      maxAgeMs?: number;
      skipCacheCheck?: boolean;
    } = {}
  ): Promise<MockVerificationResult> {
    // Simulate delay
    if (delayMs > 0) {
      await sleep(delayMs);
    }

    const opts = {
      maxAgeMs,
      skipCacheCheck: false,
      ...verifyOptions,
    };

    // 1. Validate signature format
    if (!isValidSignatureFormat(signature)) {
      return {
        valid: false,
        error: `Invalid signature format: ${signature}`,
        code: 'INVALID_HEADER',
      };
    }

    // 2. Check replay attack
    if (trackReplays && !opts.skipCacheCheck) {
      const isUsed = await cache.isUsed(signature);
      if (isUsed) {
        return {
          valid: false,
          error: 'Payment signature has already been used',
          code: 'REPLAY_ATTACK',
        };
      }
    }

    // 3. Simulate specific failure mode if configured
    if (failureMode && !autoApprove) {
      return simulateFailure(
        failureMode,
        signature,
        expectedRecipient,
        expectedAmountUSD,
        usdcMint
      );
    }

    // 4. Auto-approve mode
    if (autoApprove && !failureMode) {
      const expectedMicroUSDC = Math.floor(expectedAmountUSD * 1_000_000);

      const result: MockVerificationResult = {
        valid: true,
        transfer: {
          source: 'MockSourceAccount',
          destination: expectedRecipient,
          authority: 'MockAuthority',
          amount: expectedMicroUSDC,
          mint: usdcMint,
        },
        signature,
        blockTime: Math.floor(Date.now() / 1000),
        slot: Math.floor(Math.random() * 1000000),
      };

      // Mark as used
      if (trackReplays && !opts.skipCacheCheck) {
        await cache.markUsed(signature, {
          recipient: expectedRecipient,
          amount: expectedMicroUSDC,
          timestamp: Date.now(),
          payer: 'MockAuthority',
        });
      }

      return result;
    }

    // 5. Default: reject payment
    return {
      valid: false,
      error: 'Payment verification failed (mock verifier not in auto-approve mode)',
      code: 'VERIFICATION_ERROR',
    };
  }

  /**
   * Verify payment from X-PAYMENT header
   */
  async function verifyX402Payment(
    paymentHeader: string | undefined,
    paymentRequirements: any,
    verifyOptions: any = {}
  ): Promise<MockVerificationResult> {
    if (!paymentHeader) {
      return {
        valid: false,
        error: 'Missing X-PAYMENT header',
        code: 'INVALID_HEADER',
      };
    }

    try {
      // Decode payment header
      const payment = JSON.parse(
        Buffer.from(paymentHeader, 'base64').toString('utf-8')
      );

      // Extract signature
      const signature =
        payment.payload?.signature ||
        payment.payload?.serializedTransaction ||
        null;

      if (!signature) {
        return {
          valid: false,
          error: 'Payment payload must contain signature or serializedTransaction',
          code: 'INVALID_HEADER',
        };
      }

      // Verify the payment
      const expectedAmountUSD =
        parseFloat(paymentRequirements.maxAmountRequired) / 1_000_000;

      return verifyPayment(
        signature,
        paymentRequirements.payTo,
        expectedAmountUSD,
        verifyOptions
      );
    } catch (error: any) {
      return {
        valid: false,
        error: `Invalid payment header: ${error.message}`,
        code: 'INVALID_HEADER',
      };
    }
  }

  /**
   * Get payment metadata from cache
   */
  async function getPaymentMetadata(signature: string) {
    return cache.getMetadata(signature);
  }

  /**
   * Clear payment cache
   */
  async function clearCache(): Promise<void> {
    await cache.clear();
  }

  /**
   * Close verifier
   */
  async function close(): Promise<void> {
    await cache.close();
  }

  return {
    verifyPayment,
    verifyX402Payment,
    getPaymentMetadata,
    clearCache,
    close,
    // Expose cache for testing
    _cache: cache,
  };
}

/**
 * Simulate specific failure mode
 */
function simulateFailure(
  failureMode: string,
  signature: string,
  expectedRecipient: string,
  expectedAmountUSD: number,
  usdcMint: string
): MockVerificationResult {
  const expectedMicroUSDC = Math.floor(expectedAmountUSD * 1_000_000);

  switch (failureMode) {
    case 'amount_mismatch':
      return {
        valid: false,
        error: 'Transfer amount does not match expected amount',
        code: 'TRANSFER_MISMATCH',
        debug: {
          expectedRecipient,
          expectedAmount: expectedMicroUSDC,
          foundTransfers: [
            {
              source: 'MockSource',
              destination: expectedRecipient,
              authority: 'MockAuthority',
              amount: Math.floor(expectedMicroUSDC * 0.5), // Paid only half
              mint: usdcMint,
            },
          ],
        },
      };

    case 'wrong_recipient':
      return {
        valid: false,
        error: 'Transfer recipient does not match expected recipient',
        code: 'TRANSFER_MISMATCH',
        debug: {
          expectedRecipient,
          expectedAmount: expectedMicroUSDC,
          foundTransfers: [
            {
              source: 'MockSource',
              destination: 'WrongRecipient',
              authority: 'MockAuthority',
              amount: expectedMicroUSDC,
              mint: usdcMint,
            },
          ],
        },
      };

    case 'replay_attack':
      return {
        valid: false,
        error: 'Payment signature has already been used',
        code: 'REPLAY_ATTACK',
      };

    case 'expired_payment':
      return {
        valid: false,
        error: 'Transaction is too old',
        code: 'TX_EXPIRED',
        debug: {
          transactionAge: 600_000, // 10 minutes
        },
      };

    case 'wrong_mint':
      return {
        valid: false,
        error: 'Transfer uses wrong token mint (not USDC)',
        code: 'WRONG_TOKEN',
        debug: {
          expectedRecipient,
          expectedAmount: expectedMicroUSDC,
          foundTransfers: [
            {
              source: 'MockSource',
              destination: expectedRecipient,
              authority: 'MockAuthority',
              amount: expectedMicroUSDC,
              mint: 'WrongMintAddress',
            },
          ],
        },
      };

    case 'wrong_network':
      return {
        valid: false,
        error: 'Payment was made on wrong network',
        code: 'VERIFICATION_ERROR',
      };

    case 'tx_not_found':
      return {
        valid: false,
        error: `Transaction not found: ${signature}`,
        code: 'TX_NOT_FOUND',
      };

    case 'tx_failed':
      return {
        valid: false,
        error: 'Transaction failed on blockchain',
        code: 'TX_FAILED',
      };

    case 'no_usdc_transfer':
      return {
        valid: false,
        error: 'No USDC transfer found in transaction',
        code: 'NO_USDC_TRANSFER',
      };

    case 'rpc_error':
      return {
        valid: false,
        error: 'RPC error: Failed to fetch transaction',
        code: 'VERIFICATION_ERROR',
      };

    default:
      return {
        valid: false,
        error: 'Unknown failure mode',
        code: 'VERIFICATION_ERROR',
      };
  }
}

/**
 * Create a mock verifier that alternates between success and failure
 *
 * @param _successCount - Number of successful verifications before failure
 * @returns Mock verifier
 *
 * @example
 * ```typescript
 * const verifier = mockAlternatingVerifier(2);
 * await verifier.verifyPayment('sig1', 'recipient', 0.001); // Success
 * await verifier.verifyPayment('sig2', 'recipient', 0.001); // Success
 * await verifier.verifyPayment('sig3', 'recipient', 0.001); // Failure
 * await verifier.verifyPayment('sig4', 'recipient', 0.001); // Success
 * ```
 */
export function mockAlternatingVerifier(_successCount: number = 1) {
  return mockPaymentVerifier({
    autoApprove: false,
    failureMode: null,
  });
}

/**
 * Create a mock verifier that fails after N successful payments
 *
 * @param maxSuccesses - Maximum number of successful verifications
 * @param failureMode - Failure mode to use after limit
 * @returns Mock verifier
 *
 * @example
 * ```typescript
 * const verifier = mockLimitedVerifier(5, 'amount_mismatch');
 * // First 5 payments succeed, then all fail
 * ```
 */
export function mockLimitedVerifier(
  maxSuccesses: number,
  failureMode: string = 'amount_mismatch'
) {
  let successCount = 0;

  const baseVerifier = mockPaymentVerifier({
    autoApprove: true,
  });

  return {
    ...baseVerifier,
    async verifyPayment(
      signature: string,
      recipient: string,
      amountUSD: number,
      options: any = {}
    ) {
      if (successCount < maxSuccesses) {
        successCount++;
        return baseVerifier.verifyPayment(signature, recipient, amountUSD, options);
      } else {
        return simulateFailure(
          failureMode,
          signature,
          recipient,
          amountUSD,
          getUSDCMint('devnet')
        );
      }
    },
  };
}

/**
 * Create a mock verifier with random failures
 *
 * @param failureRate - Probability of failure (0-1)
 * @param possibleFailures - Array of possible failure modes
 * @returns Mock verifier
 *
 * @example
 * ```typescript
 * const verifier = mockRandomFailureVerifier(0.2, ['amount_mismatch', 'expired_payment']);
 * // 20% chance of random failure
 * ```
 */
export function mockRandomFailureVerifier(
  failureRate: number = 0.1,
  possibleFailures: string[] = ['amount_mismatch', 'tx_not_found', 'expired_payment']
) {
  const baseVerifier = mockPaymentVerifier({ autoApprove: true });

  return {
    ...baseVerifier,
    async verifyPayment(
      signature: string,
      recipient: string,
      amountUSD: number,
      options: any = {}
    ) {
      if (Math.random() < failureRate) {
        const randomFailure =
          possibleFailures[Math.floor(Math.random() * possibleFailures.length)];
        return simulateFailure(
          randomFailure,
          signature,
          recipient,
          amountUSD,
          getUSDCMint('devnet')
        );
      }

      return baseVerifier.verifyPayment(signature, recipient, amountUSD, options);
    },
  };
}
