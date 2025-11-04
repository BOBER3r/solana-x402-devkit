/**
 * x402 Facilitator implementation for Solana
 *
 * Implements the three required facilitator endpoints:
 * - POST /verify: Validate payment without blockchain interaction
 * - POST /settle: Execute payment on blockchain
 * - GET /supported: List supported (scheme, network) pairs
 *
 * Reference: https://github.com/coinbase/x402
 */

import {
  VerifyRequest,
  VerifyResponse,
  SettleRequest,
  SettleResponse,
  SupportedResponse,
  SupportedPair,
  PaymentAccept,
} from '../types/x402.types';
import { TransactionVerifier } from '../verifier/transaction-verifier';
import { VerifierConfig } from '../types/solana.types';
import { validateSolanaPayload } from '../utils/x402-parser';

/**
 * Configuration for x402 Facilitator
 */
export interface FacilitatorConfig extends VerifierConfig {
  /** Supported networks (default: both devnet and mainnet) */
  supportedNetworks?: Array<'solana-devnet' | 'solana-mainnet'>;

  /** Supported schemes (default: ['exact']) */
  supportedSchemes?: string[];

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * x402 Facilitator for Solana
 *
 * Provides the three required facilitator endpoints for x402 protocol compliance:
 * - /verify: Validates payment authenticity without blockchain interaction
 * - /settle: Executes payment on blockchain
 * - /supported: Lists supported (scheme, network) combinations
 *
 * @example
 * ```typescript
 * const facilitator = new X402Facilitator({
 *   rpcUrl: 'https://api.devnet.solana.com',
 *   commitment: 'confirmed',
 * });
 *
 * // In Express routes:
 * app.post('/verify', async (req, res) => {
 *   const result = await facilitator.verify(req.body);
 *   res.json(result);
 * });
 *
 * app.post('/settle', async (req, res) => {
 *   const result = await facilitator.settle(req.body);
 *   res.json(result);
 * });
 *
 * app.get('/supported', async (req, res) => {
 *   const result = await facilitator.supported();
 *   res.json(result);
 * });
 * ```
 */
export class X402Facilitator {
  private verifier: TransactionVerifier;
  private supportedNetworks: Array<'solana-devnet' | 'solana-mainnet'>;
  private supportedSchemes: string[];
  private debug: boolean;

  /**
   * Create an x402 facilitator
   *
   * @param config - Facilitator configuration
   */
  constructor(config: FacilitatorConfig) {
    this.verifier = new TransactionVerifier(config);

    this.supportedNetworks = config.supportedNetworks || [
      'solana-devnet',
      'solana-mainnet',
    ];

    this.supportedSchemes = config.supportedSchemes || ['exact'];
    this.debug = config.debug || false;
  }

  /**
   * POST /verify endpoint
   *
   * Validates payment authenticity without executing on blockchain.
   * This is a lightweight check that can be performed quickly.
   *
   * @param request - Verify request
   * @returns Verify response
   *
   * @example
   * ```typescript
   * const result = await facilitator.verify({
   *   x402Version: 1,
   *   paymentHeader: {
   *     x402Version: 1,
   *     scheme: 'exact',
   *     network: 'solana-devnet',
   *     payload: { signature: '...' }
   *   },
   *   paymentRequirements: {
   *     scheme: 'exact',
   *     network: 'solana-devnet',
   *     payTo: 'TokenAccount...',
   *     maxAmountRequired: '10000',
   *     // ... other fields
   *   }
   * });
   *
   * if (result.isValid) {
   *   console.log('Payment is valid');
   * } else {
   *   console.error('Invalid:', result.invalidReason);
   * }
   * ```
   */
  async verify(request: VerifyRequest): Promise<VerifyResponse> {
    try {
      this.log('Verify request received');

      // Validate protocol version
      if (request.x402Version !== 1) {
        return {
          isValid: false,
          invalidReason: `Unsupported protocol version: ${request.x402Version}`,
        };
      }

      // Validate payment header structure
      const payment = request.paymentHeader;
      if (!payment || typeof payment !== 'object') {
        return {
          isValid: false,
          invalidReason: 'Missing or invalid payment header',
        };
      }

      // Validate scheme is supported
      if (!this.supportedSchemes.includes(payment.scheme)) {
        return {
          isValid: false,
          invalidReason: `Unsupported scheme: ${payment.scheme}`,
        };
      }

      // Validate network is supported
      if (!this.supportedNetworks.includes(payment.network as any)) {
        return {
          isValid: false,
          invalidReason: `Unsupported network: ${payment.network}`,
        };
      }

      // Validate network matches requirements
      if (payment.network !== request.paymentRequirements.network) {
        return {
          isValid: false,
          invalidReason: `Network mismatch: payment uses ${payment.network}, requirements specify ${request.paymentRequirements.network}`,
        };
      }

      // Validate payload for Solana
      const payloadValidation = validateSolanaPayload(
        payment.payload,
        payment.scheme
      );

      if (!payloadValidation.success) {
        return {
          isValid: false,
          invalidReason: payloadValidation.error || 'Invalid payload',
        };
      }

      this.log('Payment validation passed');

      return {
        isValid: true,
        invalidReason: null,
      };
    } catch (error: any) {
      this.log(`Verify error: ${error.message}`);
      return {
        isValid: false,
        invalidReason: `Verification error: ${error.message}`,
      };
    }
  }

  /**
   * POST /settle endpoint
   *
   * Executes payment verification on blockchain.
   * This performs full on-chain verification including:
   * - Transaction existence
   * - Transaction success
   * - Transfer amount and recipient validation
   * - Replay attack prevention
   *
   * @param request - Settle request
   * @returns Settle response
   *
   * @example
   * ```typescript
   * const result = await facilitator.settle({
   *   x402Version: 1,
   *   paymentHeader: { ... },
   *   paymentRequirements: { ... }
   * });
   *
   * if (result.success) {
   *   console.log('Payment settled:', result.txHash);
   * } else {
   *   console.error('Settlement failed:', result.error);
   * }
   * ```
   */
  async settle(request: SettleRequest): Promise<SettleResponse> {
    try {
      this.log('Settle request received');

      // First perform lightweight validation
      const verifyResult = await this.verify({
        x402Version: request.x402Version,
        paymentHeader: request.paymentHeader,
        paymentRequirements: request.paymentRequirements,
      });

      if (!verifyResult.isValid) {
        return {
          success: false,
          error: verifyResult.invalidReason,
          txHash: null,
          networkId: null,
        };
      }

      // Perform full on-chain verification
      const verificationResult = await this.verifier.verifyX402PaymentObject(
        request.paymentHeader,
        request.paymentRequirements,
        {
          maxAgeMs: request.paymentRequirements.maxTimeoutSeconds * 1000,
          commitment: 'confirmed',
        }
      );

      if (!verificationResult.valid) {
        return {
          success: false,
          error: verificationResult.error || 'Payment verification failed',
          txHash: null,
          networkId: request.paymentRequirements.network,
        };
      }

      this.log(`Payment settled successfully: ${verificationResult.signature}`);

      return {
        success: true,
        error: null,
        txHash: verificationResult.signature!,
        networkId: request.paymentRequirements.network,
      };
    } catch (error: any) {
      this.log(`Settle error: ${error.message}`);
      return {
        success: false,
        error: `Settlement error: ${error.message}`,
        txHash: null,
        networkId: request.paymentRequirements.network,
      };
    }
  }

  /**
   * GET /supported endpoint
   *
   * Returns list of supported (scheme, network) pairs.
   * This allows clients to discover which payment methods are available.
   *
   * @returns Supported response
   *
   * @example
   * ```typescript
   * const result = await facilitator.supported();
   * console.log('Supported payment methods:', result.supported);
   * // Output: [
   * //   { scheme: 'exact', network: 'solana-devnet' },
   * //   { scheme: 'exact', network: 'solana-mainnet' }
   * // ]
   * ```
   */
  async supported(): Promise<SupportedResponse> {
    // Generate all combinations of supported schemes and networks
    const supported: SupportedPair[] = [];

    for (const scheme of this.supportedSchemes) {
      for (const network of this.supportedNetworks) {
        supported.push({ scheme, network });
      }
    }

    this.log(`Returning ${supported.length} supported payment methods`);

    return { supported };
  }

  /**
   * Verify payment from base64-encoded X-PAYMENT header string
   * Convenience method that combines parsing and verification
   *
   * @param paymentHeader - Base64-encoded X-PAYMENT header
   * @param paymentRequirements - Payment requirements
   * @returns Verification result from TransactionVerifier
   */
  async verifyPaymentHeader(
    paymentHeader: string,
    paymentRequirements: PaymentAccept
  ) {
    return this.verifier.verifyX402Payment(paymentHeader, paymentRequirements);
  }

  /**
   * Get list of supported networks
   *
   * @returns Array of supported network identifiers
   */
  getSupportedNetworks(): string[] {
    return [...this.supportedNetworks];
  }

  /**
   * Get list of supported schemes
   *
   * @returns Array of supported scheme identifiers
   */
  getSupportedSchemes(): string[] {
    return [...this.supportedSchemes];
  }

  /**
   * Check if a (scheme, network) pair is supported
   *
   * @param scheme - Payment scheme
   * @param network - Network identifier
   * @returns True if supported
   */
  isSupported(scheme: string, network: string): boolean {
    return (
      this.supportedSchemes.includes(scheme) &&
      this.supportedNetworks.includes(network as any)
    );
  }

  /**
   * Close facilitator and cleanup resources
   */
  async close(): Promise<void> {
    await this.verifier.close();
  }

  /**
   * Log debug message if debug mode is enabled
   *
   * @param message - Message to log
   */
  private log(message: string): void {
    if (this.debug) {
      console.log(`[X402Facilitator] ${message}`);
    }
  }
}

/**
 * Create an x402 facilitator with default configuration
 *
 * @param config - Facilitator configuration
 * @returns X402Facilitator instance
 *
 * @example
 * ```typescript
 * const facilitator = createFacilitator({
 *   rpcUrl: 'https://api.devnet.solana.com',
 *   debug: true,
 * });
 * ```
 */
export function createFacilitator(config: FacilitatorConfig): X402Facilitator {
  return new X402Facilitator(config);
}
