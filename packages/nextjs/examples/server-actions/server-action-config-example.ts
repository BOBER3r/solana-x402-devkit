/**
 * Example: Server Actions Configuration
 * File: app/actions/config.ts
 */

import { configureX402ServerActions } from '@x402-solana/nextjs';

// Configure x402 for all Server Actions
configureX402ServerActions({
  solanaRpcUrl: process.env.SOLANA_RPC_URL!,
  recipientWallet: process.env.RECIPIENT_WALLET!,
  network: 'devnet',
  redis: process.env.REDIS_URL
    ? { url: process.env.REDIS_URL }
    : undefined,
  maxPaymentAgeMs: 300_000, // 5 minutes
  debug: process.env.NODE_ENV === 'development',
});
