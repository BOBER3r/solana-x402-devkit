/**
 * Payment requirements generator
 * Creates x402-compliant 402 responses
 */

import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import {
  PaymentRequirements,
  PaymentAccept,
} from '../types/x402.types';
import { GeneratePaymentOptions, GeneratorConfig } from '../types/payment.types';
import { usdToMicroUSDC } from '../utils/currency-converter';
import { getUSDCMint } from '../utils/address-validator';

/**
 * Payment requirements generator
 * Generates x402-compliant payment requirements for 402 responses
 *
 * @example
 * ```typescript
 * const generator = new PaymentRequirementsGenerator({
 *   recipientWallet: 'YourWalletPublicKey111111111111111111111111',
 *   network: 'devnet',
 * });
 *
 * const requirements = generator.generate(0.001, {
 *   description: 'Access to premium API endpoint',
 *   resource: '/api/premium/data',
 * });
 *
 * // Return in 402 response
 * res.status(402).json(requirements);
 * ```
 */
export class PaymentRequirementsGenerator {
  private recipientWallet: PublicKey;
  private recipientUSDCAccount: PublicKey;
  private network: 'devnet' | 'mainnet-beta';
  private usdcMint: PublicKey;

  /**
   * Create a payment requirements generator
   *
   * @param config - Generator configuration
   * @throws Error if recipient wallet is invalid
   */
  constructor(config: GeneratorConfig) {
    try {
      this.recipientWallet = new PublicKey(config.recipientWallet);
    } catch (error) {
      throw new Error(`Invalid recipient wallet: ${config.recipientWallet}`);
    }

    this.network = config.network;

    // Get USDC mint for network
    const usdcMintAddress = getUSDCMint(this.network);
    this.usdcMint = new PublicKey(usdcMintAddress);

    // Derive recipient's USDC token account (ATA)
    // CRITICAL: This is the address clients will send payment to
    this.recipientUSDCAccount = getAssociatedTokenAddressSync(
      this.usdcMint,
      this.recipientWallet
    );
  }

  /**
   * Generate payment requirements for a 402 response
   *
   * @param priceUSD - Price in USD (e.g., 0.001 = $0.001)
   * @param options - Generation options
   * @returns Payment requirements object
   *
   * @example
   * ```typescript
   * const requirements = generator.generate(0.001, {
   *   description: 'Access to weather API',
   *   resource: '/api/weather',
   *   timeoutSeconds: 300,
   * });
   * ```
   */
  generate(
    priceUSD: number,
    options: GeneratePaymentOptions = {}
  ): PaymentRequirements {
    // Validate price
    if (priceUSD <= 0) {
      throw new Error('Price must be greater than 0');
    }

    // Convert USD to micro-USDC
    const microUSDC = usdToMicroUSDC(priceUSD);

    // Format network for x402 spec (solana-devnet or solana-mainnet)
    const network = this.network === 'devnet' ? 'solana-devnet' : 'solana-mainnet';

    // Create payment accept option (x402-compliant format)
    const accept: PaymentAccept = {
      scheme: 'exact', // Official x402 scheme for fixed payments
      network,
      maxAmountRequired: microUSDC.toString(),
      resource: options.resource || '',
      description: options.description || 'Payment required for access',
      mimeType: options.mimeType || 'application/json',
      outputSchema: options.outputSchema || null,
      payTo: this.recipientUSDCAccount.toString(), // String, not object
      maxTimeoutSeconds: options.timeoutSeconds || 300, // Default 5 minutes
      asset: this.usdcMint.toString(), // USDC mint address
      extra: options.extra || null,
    };

    // Create full payment requirements
    const requirements: PaymentRequirements = {
      x402Version: 1,
      accepts: [accept],
      error: options.errorMessage || 'Payment Required',
    };

    return requirements;
  }

  /**
   * Generate payment requirements with multiple payment options
   * For example, different tiers or payment methods
   *
   * @param options - Array of price and option pairs
   * @returns Payment requirements with multiple accepts
   *
   * @example
   * ```typescript
   * const requirements = generator.generateMultiple([
   *   { priceUSD: 0.001, description: 'Basic access' },
   *   { priceUSD: 0.005, description: 'Premium access' },
   * ]);
   * ```
   */
  generateMultiple(
    options: Array<{ priceUSD: number } & GeneratePaymentOptions>
  ): PaymentRequirements {
    if (options.length === 0) {
      throw new Error('At least one payment option is required');
    }

    // Format network for x402 spec
    const network = this.network === 'devnet' ? 'solana-devnet' : 'solana-mainnet';

    const accepts: PaymentAccept[] = options.map(opt => {
      const microUSDC = usdToMicroUSDC(opt.priceUSD);

      return {
        scheme: 'exact', // Official x402 scheme
        network,
        maxAmountRequired: microUSDC.toString(),
        resource: opt.resource || '',
        description: opt.description || 'Payment required for access',
        mimeType: opt.mimeType || 'application/json',
        outputSchema: opt.outputSchema || null,
        payTo: this.recipientUSDCAccount.toString(), // String format
        maxTimeoutSeconds: opt.timeoutSeconds || 300,
        asset: this.usdcMint.toString(),
        extra: opt.extra || null,
      };
    });

    return {
      x402Version: 1,
      accepts,
      error: options[0].errorMessage || 'Payment Required',
    };
  }

  /**
   * Get recipient's USDC token account address
   * This is the address that clients will send payment to
   *
   * @returns USDC token account address
   */
  getRecipientUSDCAccount(): string {
    return this.recipientUSDCAccount.toString();
  }

  /**
   * Get recipient's wallet address
   *
   * @returns Wallet address
   */
  getRecipientWallet(): string {
    return this.recipientWallet.toString();
  }

  /**
   * Get USDC mint address for this network
   *
   * @returns USDC mint address
   */
  getUSDCMint(): string {
    return this.usdcMint.toString();
  }

  /**
   * Get network name
   *
   * @returns Network name
   */
  getNetwork(): string {
    return this.network;
  }

  /**
   * Encode payment requirements as base64 JSON
   * Useful for including in custom headers
   *
   * @param requirements - Payment requirements
   * @returns Base64-encoded JSON string
   */
  static encode(requirements: PaymentRequirements): string {
    return Buffer.from(JSON.stringify(requirements)).toString('base64');
  }

  /**
   * Decode payment requirements from base64 JSON
   *
   * @param encoded - Base64-encoded payment requirements
   * @returns Payment requirements object
   */
  static decode(encoded: string): PaymentRequirements {
    try {
      const json = Buffer.from(encoded, 'base64').toString('utf-8');
      return JSON.parse(json);
    } catch (error) {
      throw new Error('Invalid payment requirements encoding');
    }
  }
}
