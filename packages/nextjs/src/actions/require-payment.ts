/**
 * Server Actions wrapper for x402 payment verification
 *
 * Provides a decorator/wrapper pattern for protecting Server Actions
 * with payment requirements.
 */

'use server';

import {
  TransactionVerifier,
  PaymentRequirementsGenerator,
  parseX402Payment,
} from '@x402-solana/core';
import { ServerActionOptions, ServerActionResult } from '../types';
import { headers } from 'next/headers';

/**
 * Configuration for Server Actions payment verification
 */
interface ServerActionConfig {
  /** Solana RPC URL */
  solanaRpcUrl: string;

  /** Recipient wallet address */
  recipientWallet: string;

  /** Network (devnet or mainnet-beta) */
  network: 'devnet' | 'mainnet-beta';

  /** Redis configuration (optional) */
  redis?: {
    url: string;
  };

  /** Maximum payment age in milliseconds */
  maxPaymentAgeMs?: number;

  /** Enable debug logging */
  debug?: boolean;
}

// Global config storage
let globalConfig: ServerActionConfig | null = null;

/**
 * Configure x402 for Server Actions
 *
 * This must be called once before using requirePayment
 *
 * @param config - Server action configuration
 *
 * @example
 * ```typescript
 * // In a server-side initialization file
 * import { configureX402ServerActions } from '@x402-solana/nextjs';
 *
 * configureX402ServerActions({
 *   solanaRpcUrl: process.env.SOLANA_RPC_URL!,
 *   recipientWallet: process.env.RECIPIENT_WALLET!,
 *   network: 'devnet',
 * });
 * ```
 */
export function configureX402ServerActions(config: ServerActionConfig): void {
  globalConfig = config;
}

/**
 * Wrap a Server Action with payment requirement
 *
 * @param action - The server action to protect
 * @param options - Payment requirement options
 * @returns Wrapped server action
 *
 * @example
 * ```typescript
 * 'use server';
 *
 * import { requirePayment } from '@x402-solana/nextjs';
 *
 * export const getPremiumData = requirePayment(
 *   async () => {
 *     return { message: 'This is premium data!' };
 *   },
 *   {
 *     priceUSD: 0.01,
 *     description: 'Access to premium data',
 *     resource: '/actions/getPremiumData',
 *   }
 * );
 * ```
 */
export function requirePayment<T extends (...args: any[]) => Promise<any>>(
  action: T,
  options: ServerActionOptions
): (...args: Parameters<T>) => Promise<ServerActionResult<Awaited<ReturnType<T>>>> {
  return async (...args: Parameters<T>): Promise<ServerActionResult<Awaited<ReturnType<T>>>> => {
    try {
      if (!globalConfig) {
        throw new Error(
          'x402 Server Actions not configured. Call configureX402ServerActions() first.'
        );
      }

      // Get headers (async in Next.js 16+)
      const headersList = await headers();
      const paymentHeader = headersList.get('x-payment');

      if (globalConfig.debug) {
        console.log('[x402 Server Action] Processing action:', {
          resource: options.resource,
          hasPayment: !!paymentHeader,
        });
      }

      if (!paymentHeader) {
        // No payment - return payment requirements
        const generator = new PaymentRequirementsGenerator({
          recipientWallet: globalConfig.recipientWallet,
          network: globalConfig.network,
        });

        const requirements = generator.generate(options.priceUSD, {
          resource: options.resource,
          description: options.description,
          timeoutSeconds: options.timeoutSeconds,
        });

        return {
          success: false,
          error: 'Payment required',
          paymentRequired: {
            priceUSD: options.priceUSD,
            requirements,
          },
        };
      }

      // Parse payment header
      const parseResult = parseX402Payment(paymentHeader);

      if (!parseResult.success) {
        const generator = new PaymentRequirementsGenerator({
          recipientWallet: globalConfig.recipientWallet,
          network: globalConfig.network,
        });

        const requirements = generator.generate(options.priceUSD, {
          resource: options.resource,
          description: options.description,
          errorMessage: parseResult.error || 'Invalid payment header',
        });

        return {
          success: false,
          error: parseResult.error || 'Invalid payment header',
          paymentRequired: {
            priceUSD: options.priceUSD,
            requirements,
          },
        };
      }

      // Verify payment
      const verifier = new TransactionVerifier({
        rpcUrl: globalConfig.solanaRpcUrl,
        commitment: 'confirmed',
        cacheConfig: globalConfig.redis
          ? {
              redisUrl: globalConfig.redis.url,
              ttlSeconds: 600,
            }
          : { useInMemory: true },
      });

      const generator = new PaymentRequirementsGenerator({
        recipientWallet: globalConfig.recipientWallet,
        network: globalConfig.network,
      });

      const paymentRequirements = generator.generate(options.priceUSD, {
        resource: options.resource,
        description: options.description,
      });

      const paymentAccept = paymentRequirements.accepts[0];

      const maxAge = options.maxPaymentAgeMs || globalConfig.maxPaymentAgeMs || 300_000;
      const result = await verifier.verifyX402Payment(paymentHeader, paymentAccept, {
        maxAgeMs: maxAge,
        commitment: 'confirmed',
      });

      if (!result.valid) {
        if (globalConfig.debug) {
          console.log('[x402 Server Action] Payment verification failed:', result.error);
        }

        const requirements = generator.generate(options.priceUSD, {
          resource: options.resource,
          description: options.description,
          errorMessage: result.error || 'Payment verification failed',
        });

        return {
          success: false,
          error: result.error || 'Payment verification failed',
          paymentRequired: {
            priceUSD: options.priceUSD,
            requirements,
          },
        };
      }

      if (globalConfig.debug) {
        console.log('[x402 Server Action] Payment verified:', {
          signature: result.signature,
          amount: result.transfer?.amount,
        });
      }

      // Payment verified - execute action
      const data = await action(...args);

      // Clean up
      await verifier.close();

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('[x402 Server Action] Error:', error);

      return {
        success: false,
        error: error.message || 'Internal server error',
      };
    }
  };
}

/**
 * Alternative: Higher-order function for inline configuration
 *
 * Useful when you don't want to configure globally
 *
 * @param config - Configuration for this specific action
 * @returns Function that wraps server actions with payment
 *
 * @example
 * ```typescript
 * 'use server';
 *
 * import { createPaymentRequirement } from '@x402-solana/nextjs';
 *
 * const withPayment = createPaymentRequirement({
 *   solanaRpcUrl: process.env.SOLANA_RPC_URL!,
 *   recipientWallet: process.env.RECIPIENT_WALLET!,
 *   network: 'devnet',
 * });
 *
 * export const getPremiumData = withPayment(
 *   async () => {
 *     return { message: 'Premium data!' };
 *   },
 *   {
 *     priceUSD: 0.01,
 *     description: 'Premium data access',
 *   }
 * );
 * ```
 */
export function createPaymentRequirement(config: ServerActionConfig) {
  return function requirePaymentWithConfig<T extends (...args: any[]) => Promise<any>>(
    action: T,
    options: ServerActionOptions
  ): (...args: Parameters<T>) => Promise<ServerActionResult<Awaited<ReturnType<T>>>> {
    // Store config temporarily
    const previousConfig = globalConfig;
    globalConfig = config;

    const wrappedAction = requirePayment(action, options);

    // Restore previous config
    globalConfig = previousConfig;

    return wrappedAction;
  };
}
