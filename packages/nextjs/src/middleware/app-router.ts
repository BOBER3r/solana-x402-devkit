/**
 * Next.js App Router middleware for x402 payment verification
 *
 * This middleware intercepts requests to protected routes and verifies
 * payment using the x402 protocol.
 *
 * Edge Runtime compatible for optimal performance.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  TransactionVerifier,
  PaymentRequirementsGenerator,
  parseX402Payment,
  PaymentReceipt,
} from '@x402-solana/core';
import { X402MiddlewareConfig, PaymentInfo } from '../types';

/**
 * Create x402 middleware for Next.js App Router
 *
 * @param config - Middleware configuration
 * @returns Next.js middleware function
 *
 * @example
 * ```typescript
 * // middleware.ts
 * import { x402Middleware } from '@x402-solana/nextjs';
 *
 * export default x402Middleware({
 *   solanaRpcUrl: process.env.SOLANA_RPC_URL!,
 *   recipientWallet: process.env.RECIPIENT_WALLET!,
 *   network: 'devnet',
 *   protectedRoutes: ['/api/premium/*', '/api/private/*']
 * });
 *
 * export const config = {
 *   matcher: ['/api/premium/:path*', '/api/private/:path*']
 * };
 * ```
 */
export function x402Middleware(config: X402MiddlewareConfig) {
  // Initialize verifier and generator
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

  if (config.debug) {
    console.log('[x402] Next.js middleware initialized:', {
      network: config.network,
      recipientWallet: config.recipientWallet,
      recipientUSDCAccount: generator.getRecipientUSDCAccount(),
    });
  }

  return async function middleware(request: NextRequest) {
    try {
      // Check if route should be protected
      const pathname = request.nextUrl.pathname;

      if (config.protectedRoutes && config.protectedRoutes.length > 0) {
        const isProtected = config.protectedRoutes.some(pattern => {
          // Simple glob matching (* wildcard)
          const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
          return regex.test(pathname);
        });

        if (!isProtected) {
          // Route not protected, continue
          return NextResponse.next();
        }
      }

      if (config.debug) {
        console.log('[x402] Processing protected route:', pathname);
      }

      // Get payment header
      const paymentHeader = request.headers.get('x-payment');

      if (!paymentHeader) {
        // No payment - return 402 with payment requirements
        if (config.debug) {
          console.log('[x402] No payment header, returning 402');
        }

        // Extract price from route metadata or use default
        const priceUSD = getRoutePriceFromMetadata(request) || 0.001;

        const requirements = generator.generate(priceUSD, {
          resource: pathname,
          description: `Access to ${pathname}`,
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
          console.log('[x402] Invalid payment header:', parseResult.error);
        }

        const priceUSD = getRoutePriceFromMetadata(request) || 0.001;
        const requirements = generator.generate(priceUSD, {
          resource: pathname,
          description: `Access to ${pathname}`,
          errorMessage: parseResult.error || 'Invalid payment header',
        });

        return new NextResponse(JSON.stringify(requirements), {
          status: 402,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }

      // Generate payment requirements for verification
      const priceUSD = getRoutePriceFromMetadata(request) || 0.001;
      const paymentRequirements = generator.generate(priceUSD, {
        resource: pathname,
        description: `Access to ${pathname}`,
      });

      const paymentAccept = paymentRequirements.accepts[0];

      // Verify payment
      const maxAge = config.maxPaymentAgeMs || 300_000;
      const result = await verifier.verifyX402Payment(
        paymentHeader,
        paymentAccept,
        {
          maxAgeMs: maxAge,
          commitment: 'confirmed',
        }
      );

      if (!result.valid) {
        if (config.debug) {
          console.log('[x402] Payment verification failed:', result.error);
        }

        const requirements = generator.generate(priceUSD, {
          resource: pathname,
          description: `Access to ${pathname}`,
          errorMessage: result.error || 'Payment verification failed',
        });

        return new NextResponse(JSON.stringify(requirements), {
          status: 402,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }

      if (config.debug) {
        console.log('[x402] Payment verified successfully:', {
          signature: result.signature,
          amount: result.transfer?.amount,
          payer: result.transfer?.authority,
        });
      }

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

      // Create response with payment info in headers
      const response = NextResponse.next();

      // Add payment receipt header
      response.headers.set(
        'x-payment-response',
        Buffer.from(JSON.stringify(receipt)).toString('base64')
      );

      // Add payment info as custom headers for route handlers to access
      response.headers.set('x-payment-verified', 'true');
      response.headers.set('x-payment-signature', result.signature!);
      response.headers.set('x-payment-payer', result.transfer?.authority || '');
      response.headers.set(
        'x-payment-amount',
        ((result.transfer?.amount || 0) / 1_000_000).toString()
      );

      return response;
    } catch (error: any) {
      console.error('[x402] Middleware error:', error);

      return new NextResponse(
        JSON.stringify({
          error: 'Payment verification failed',
          message: config.debug ? error.message : 'Internal server error',
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
 * Helper to extract price from route metadata
 * In a real implementation, this could read from route config
 */
function getRoutePriceFromMetadata(_request: NextRequest): number | undefined {
  // This could be extended to read from route metadata
  // For now, routes need to handle their own pricing
  return undefined;
}

/**
 * Create a matcher configuration for Next.js middleware
 *
 * @param patterns - Route patterns to match
 * @returns Matcher configuration
 *
 * @example
 * ```typescript
 * export const config = createMatcher([
 *   '/api/premium/:path*',
 *   '/api/private/:path*'
 * ]);
 * ```
 */
export function createMatcher(patterns: string[]) {
  return {
    matcher: patterns,
  };
}

/**
 * Extract payment info from Next.js request headers
 * Useful for route handlers that need payment information
 *
 * @param request - NextRequest object
 * @returns Payment info if verified, undefined otherwise
 */
export function getPaymentFromRequest(request: NextRequest): PaymentInfo | undefined {
  const verified = request.headers.get('x-payment-verified');

  if (verified !== 'true') {
    return undefined;
  }

  const signature = request.headers.get('x-payment-signature');
  const payer = request.headers.get('x-payment-payer');
  const amount = request.headers.get('x-payment-amount');

  if (!signature || !payer || !amount) {
    return undefined;
  }

  return {
    signature,
    payer,
    amount: parseFloat(amount),
  };
}
