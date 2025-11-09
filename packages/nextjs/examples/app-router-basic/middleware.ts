/**
 * Next.js middleware configuration for x402 payment verification
 */

import { x402Middleware } from '@x402-solana/nextjs';

export default x402Middleware({
  solanaRpcUrl: process.env.SOLANA_RPC_URL!,
  recipientWallet: process.env.RECIPIENT_WALLET!,
  network: 'devnet',
  protectedRoutes: ['/api/premium/*'],
  debug: true,
});

// Configure which routes to run middleware on
export const config = {
  matcher: ['/api/premium/:path*'],
};
