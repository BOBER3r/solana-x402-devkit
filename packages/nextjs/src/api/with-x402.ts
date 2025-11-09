/**
 * API Route helpers for x402 payment verification
 *
 * Provides wrapper functions for Next.js App Router API routes
 * to require payment before execution.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  TransactionVerifier,
  PaymentRequirementsGenerator,
  parseX402Payment,
  PaymentReceipt,
} from '@x402-solana/core';
import { NextApiHandler, WithX402Options, PaymentInfo } from '../types';

/**
 * Configuration for API route payment verification
 */
interface ApiRouteConfig {
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
let globalApiConfig: ApiRouteConfig | null = null;

/**
 * Configure x402 for API routes
 *
 * @param config - API route configuration
 *
 * @example
 * ```typescript
 * // In app/api/config.ts or similar
 * import { configureX402ApiRoutes } from '@x402-solana/nextjs';
 *
 * configureX402ApiRoutes({
 *   solanaRpcUrl: process.env.SOLANA_RPC_URL!,
 *   recipientWallet: process.env.RECIPIENT_WALLET!,
 *   network: 'devnet',
 * });
 * ```
 */
export function configureX402ApiRoutes(config: ApiRouteConfig): void {
  globalApiConfig = config;
}

/**
 * Wrap an API route handler with payment requirement
 *
 * @param handler - The route handler to protect
 * @param options - Payment requirement options
 * @returns Wrapped route handler
 *
 * @example
 * ```typescript
 * // app/api/premium/route.ts
 * import { withX402 } from '@x402-solana/nextjs';
 *
 * export const GET = withX402(
 *   async (req) => {
 *     const payment = req.payment; // Access payment info
 *     return Response.json({ data: 'Premium data!', payment });
 *   },
 *   {
 *     priceUSD: 0.01,
 *     description: 'Access to premium API',
 *     resource: '/api/premium',
 *   }
 * );
 * ```
 */
export function withX402<T = any>(
  handler: NextApiHandler<T>,
  options: WithX402Options
): (req: NextRequest, context?: any) => Promise<Response | NextResponse<T>> {
  return async (req: NextRequest, context?: any): Promise<Response | NextResponse<T>> => {
    try {
      if (!globalApiConfig) {
        throw new Error('x402 API routes not configured. Call configureX402ApiRoutes() first.');
      }

      const config = globalApiConfig;

      // Get payment header
      const paymentHeader = req.headers.get('x-payment');

      if (config.debug) {
        console.log('[x402 API] Processing request:', {
          path: req.nextUrl.pathname,
          method: req.method,
          hasPayment: !!paymentHeader,
        });
      }

      if (!paymentHeader) {
        // No payment - return 402 with payment requirements
        if (config.debug) {
          console.log('[x402 API] No payment header, returning 402');
        }

        const generator = new PaymentRequirementsGenerator({
          recipientWallet: config.recipientWallet,
          network: config.network,
        });

        const requirements = generator.generate(options.priceUSD, {
          resource: options.resource || req.nextUrl.pathname,
          description: options.description,
          mimeType: options.mimeType,
          outputSchema: options.outputSchema,
          timeoutSeconds: options.timeoutSeconds,
          extra: options.extra,
        });

        return new NextResponse(JSON.stringify(requirements), {
          status: 402,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }

      // Parse payment header
      const parseResult = parseX402Payment(paymentHeader);

      if (!parseResult.success) {
        if (config.debug) {
          console.log('[x402 API] Invalid payment header:', parseResult.error);
        }

        const generator = new PaymentRequirementsGenerator({
          recipientWallet: config.recipientWallet,
          network: config.network,
        });

        const requirements = generator.generate(options.priceUSD, {
          resource: options.resource || req.nextUrl.pathname,
          description: options.description,
          errorMessage: parseResult.error || 'Invalid payment header',
        });

        return new NextResponse(JSON.stringify(requirements), {
          status: 402,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }

      // Verify payment
      const verifier = new TransactionVerifier({
        rpcUrl: config.solanaRpcUrl,
        commitment: 'confirmed',
        cacheConfig: config.redis
          ? {
              redisUrl: config.redis.url,
              ttlSeconds: 600,
            }
          : { useInMemory: true },
      });

      const generator = new PaymentRequirementsGenerator({
        recipientWallet: config.recipientWallet,
        network: config.network,
      });

      const paymentRequirements = generator.generate(options.priceUSD, {
        resource: options.resource || req.nextUrl.pathname,
        description: options.description,
      });

      const paymentAccept = paymentRequirements.accepts[0];

      const maxAge = options.maxPaymentAgeMs || config.maxPaymentAgeMs || 300_000;
      const result = await verifier.verifyX402Payment(paymentHeader, paymentAccept, {
        maxAgeMs: maxAge,
        commitment: 'confirmed',
      });

      if (!result.valid) {
        if (config.debug) {
          console.log('[x402 API] Payment verification failed:', result.error);
        }

        const requirements = generator.generate(options.priceUSD, {
          resource: options.resource || req.nextUrl.pathname,
          description: options.description,
          errorMessage: result.error || 'Payment verification failed',
        });

        await verifier.close();

        return new NextResponse(JSON.stringify(requirements), {
          status: 402,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }

      if (config.debug) {
        console.log('[x402 API] Payment verified:', {
          signature: result.signature,
          amount: result.transfer?.amount,
        });
      }

      // Attach payment info to request
      const paymentInfo: PaymentInfo = {
        signature: result.signature!,
        amount: (result.transfer?.amount || 0) / 1_000_000,
        payer: result.transfer?.authority || '',
        blockTime: result.blockTime,
        slot: result.slot,
      };

      // Create extended request with payment info
      (req as any).payment = paymentInfo;

      // Execute handler
      const response = await handler(req as any, context);

      // Create payment receipt
      const receipt: PaymentReceipt = {
        signature: result.signature!,
        network: `solana-${config.network}`,
        amount: result.transfer?.amount || 0,
        timestamp: Date.now(),
        status: 'verified',
        blockTime: result.blockTime,
        slot: result.slot,
      };

      // Add payment receipt header to response
      if (response instanceof NextResponse) {
        response.headers.set(
          'x-payment-response',
          Buffer.from(JSON.stringify(receipt)).toString('base64')
        );
      } else if (response instanceof Response) {
        response.headers.set(
          'x-payment-response',
          Buffer.from(JSON.stringify(receipt)).toString('base64')
        );
      }

      // Clean up
      await verifier.close();

      return response;
    } catch (error: any) {
      console.error('[x402 API] Error:', error);

      return new NextResponse(
        JSON.stringify({
          error: 'Payment verification failed',
          message: globalApiConfig?.debug ? error.message : 'Internal server error',
          code: 'VERIFICATION_ERROR',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  };
}

/**
 * Create a configured withX402 wrapper
 *
 * Useful when you don't want to configure globally
 *
 * @param config - Configuration for API routes
 * @returns Configured withX402 function
 *
 * @example
 * ```typescript
 * // app/api/premium/route.ts
 * import { createWithX402 } from '@x402-solana/nextjs';
 *
 * const withX402 = createWithX402({
 *   solanaRpcUrl: process.env.SOLANA_RPC_URL!,
 *   recipientWallet: process.env.RECIPIENT_WALLET!,
 *   network: 'devnet',
 * });
 *
 * export const GET = withX402(
 *   async (req) => Response.json({ data: 'Premium!' }),
 *   { priceUSD: 0.01 }
 * );
 * ```
 */
export function createWithX402(config: ApiRouteConfig) {
  return function withX402Configured<T = any>(
    handler: NextApiHandler<T>,
    options: WithX402Options
  ): (req: NextRequest, context?: any) => Promise<Response | NextResponse<T>> {
    // Store config temporarily
    const previousConfig = globalApiConfig;
    globalApiConfig = config;

    const wrappedHandler = withX402(handler, options);

    // Restore previous config
    globalApiConfig = previousConfig;

    return wrappedHandler;
  };
}

/**
 * Helper to extract payment info from request
 * (For handlers that don't use withX402 wrapper)
 *
 * @param req - NextRequest object
 * @returns Payment info if available
 */
export function getPaymentInfo(req: NextRequest): PaymentInfo | undefined {
  return (req as any).payment;
}
