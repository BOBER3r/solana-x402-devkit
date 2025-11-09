/**
 * @x402-solana/nextjs
 *
 * Next.js 14+ App Router integration for x402 payments on Solana
 *
 * This package provides comprehensive integration with Next.js App Router,
 * including middleware, Server Actions, API routes, and RSC support.
 *
 * @example Middleware
 * ```typescript
 * // middleware.ts
 * import { x402Middleware } from '@x402-solana/nextjs';
 *
 * export default x402Middleware({
 *   solanaRpcUrl: process.env.SOLANA_RPC_URL!,
 *   recipientWallet: process.env.RECIPIENT_WALLET!,
 *   network: 'devnet',
 *   protectedRoutes: ['/api/premium/*']
 * });
 * ```
 *
 * @example API Routes
 * ```typescript
 * // app/api/premium/route.ts
 * import { withX402 } from '@x402-solana/nextjs';
 *
 * export const GET = withX402(
 *   async (req) => Response.json({ data: 'Premium!' }),
 *   { priceUSD: 0.01 }
 * );
 * ```
 *
 * @example Server Actions
 * ```typescript
 * // app/actions.ts
 * 'use server';
 * import { requirePayment } from '@x402-solana/nextjs';
 *
 * export const getPremiumData = requirePayment(
 *   async () => ({ data: 'Premium!' }),
 *   { priceUSD: 0.01 }
 * );
 * ```
 *
 * @packageDocumentation
 */

// ============================================================================
// Type Definitions
// ============================================================================

export * from './types';

// ============================================================================
// App Router Middleware
// ============================================================================

export {
  x402Middleware,
  createMatcher,
  getPaymentFromRequest,
} from './middleware/app-router';

// ============================================================================
// Server Actions
// ============================================================================

export {
  requirePayment,
  createPaymentRequirement,
  configureX402ServerActions,
} from './actions/require-payment';

// ============================================================================
// API Route Helpers
// ============================================================================

export {
  withX402,
  createWithX402,
  configureX402ApiRoutes,
  getPaymentInfo,
} from './api/with-x402';

// ============================================================================
// RSC Provider
// ============================================================================

export {
  X402Provider,
  useX402Config,
  createX402Config,
  type X402ClientConfig,
  type X402ProviderProps,
} from './rsc/provider';

// ============================================================================
// Re-export commonly used core types
// ============================================================================

export type {
  PaymentRequirements,
  PaymentAccept,
  X402Payment,
  PaymentPayload,
  PaymentReceipt,
  X402Error,
} from '@x402-solana/core';

export {
  X402ErrorCode,
  TransactionVerifier,
  PaymentRequirementsGenerator,
} from '@x402-solana/core';

// ============================================================================
// Version
// ============================================================================

export const VERSION = '0.2.0';

// ============================================================================
// Quick Start Examples
// ============================================================================

/**
 * Quick start guide for Next.js App Router
 *
 * @example Complete Setup
 * ```typescript
 * // 1. Configure middleware (middleware.ts)
 * import { x402Middleware } from '@x402-solana/nextjs';
 *
 * export default x402Middleware({
 *   solanaRpcUrl: process.env.SOLANA_RPC_URL!,
 *   recipientWallet: process.env.RECIPIENT_WALLET!,
 *   network: 'devnet',
 *   protectedRoutes: ['/api/premium/*'],
 * });
 *
 * export const config = {
 *   matcher: ['/api/premium/:path*'],
 * };
 *
 * // 2. Configure API routes (app/api/config.ts)
 * import { configureX402ApiRoutes } from '@x402-solana/nextjs';
 *
 * configureX402ApiRoutes({
 *   solanaRpcUrl: process.env.SOLANA_RPC_URL!,
 *   recipientWallet: process.env.RECIPIENT_WALLET!,
 *   network: 'devnet',
 * });
 *
 * // 3. Create protected API route (app/api/premium/route.ts)
 * import { withX402 } from '@x402-solana/nextjs';
 * import '../config'; // Import to initialize config
 *
 * export const GET = withX402(
 *   async (req) => {
 *     const payment = req.payment;
 *     return Response.json({
 *       data: 'Premium content!',
 *       paidBy: payment?.payer,
 *     });
 *   },
 *   {
 *     priceUSD: 0.01,
 *     description: 'Access to premium API',
 *     resource: '/api/premium',
 *   }
 * );
 *
 * // 4. Configure Server Actions (app/actions/config.ts)
 * import { configureX402ServerActions } from '@x402-solana/nextjs';
 *
 * configureX402ServerActions({
 *   solanaRpcUrl: process.env.SOLANA_RPC_URL!,
 *   recipientWallet: process.env.RECIPIENT_WALLET!,
 *   network: 'devnet',
 * });
 *
 * // 5. Create protected Server Action (app/actions/premium.ts)
 * 'use server';
 * import { requirePayment } from '@x402-solana/nextjs';
 * import './config'; // Import to initialize config
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
 *
 * // 6. Add provider to layout (app/layout.tsx)
 * import { X402Provider } from '@x402-solana/nextjs';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <X402Provider
 *           config={{
 *             network: 'devnet',
 *             recipientWallet: process.env.NEXT_PUBLIC_RECIPIENT_WALLET!,
 *           }}
 *         >
 *           {children}
 *         </X402Provider>
 *       </body>
 *     </html>
 *   );
 * }
 *
 * // 7. Use in client component (app/components/PremiumContent.tsx)
 * 'use client';
 * import { useX402Config } from '@x402-solana/nextjs';
 * import { getPremiumData } from '../actions/premium';
 *
 * export function PremiumContent() {
 *   const config = useX402Config();
 *
 *   const handleGetData = async () => {
 *     const result = await getPremiumData();
 *     if (result.success) {
 *       console.log('Data:', result.data);
 *     } else if (result.paymentRequired) {
 *       console.log('Payment required:', result.paymentRequired);
 *       // Handle payment...
 *     }
 *   };
 *
 *   return (
 *     <button onClick={handleGetData}>
 *       Get Premium Data
 *     </button>
 *   );
 * }
 * ```
 */
export const NEXTJS_QUICK_START = null;
