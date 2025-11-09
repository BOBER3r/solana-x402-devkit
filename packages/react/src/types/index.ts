/**
 * Type definitions for @x402-solana/react package
 */

import { WalletAdapter } from '@solana/wallet-adapter-base';
import { Connection, PublicKey } from '@solana/web3.js';
import { PaymentRequirements } from '@x402-solana/core';

/**
 * Configuration for X402Provider
 */
export interface X402ProviderConfig {
  /** Solana RPC endpoint URL */
  solanaRpcUrl: string;

  /** Network to use (devnet or mainnet-beta) */
  network?: 'devnet' | 'mainnet-beta';

  /** Automatically retry requests after payment (default: true) */
  autoRetry?: boolean;

  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;

  /** Commitment level for transactions (default: 'confirmed') */
  commitment?: 'processed' | 'confirmed' | 'finalized';

  /** Enable debug logging (default: false) */
  debug?: boolean;

  /** Enable payment history tracking (default: true) */
  enableHistory?: boolean;

  /** Maximum number of payment history entries to store (default: 100) */
  maxHistorySize?: number;
}

/**
 * X402 context value provided to child components
 */
export interface X402ContextValue {
  /** Configuration options */
  config: Required<X402ProviderConfig>;

  /** Solana connection instance */
  connection: Connection;

  /** Connected wallet adapter (null if not connected) */
  wallet: WalletAdapter | null;

  /** Wallet public key (null if not connected) */
  publicKey: PublicKey | null;

  /** Whether a wallet is connected */
  connected: boolean;

  /** Fetch with automatic 402 payment handling */
  fetch: (url: string, options?: RequestInit) => Promise<Response>;

  /** Get wallet's USDC balance */
  getBalance: () => Promise<number>;

  /** Payment history */
  paymentHistory: PaymentHistoryEntry[];

  /** Clear payment history */
  clearHistory: () => void;

  /** Loading state for async operations */
  isLoading: boolean;

  /** Error state */
  error: Error | null;
}

/**
 * Payment history entry
 */
export interface PaymentHistoryEntry {
  /** Unique ID for this payment */
  id: string;

  /** Transaction signature */
  signature: string;

  /** URL that was paid for */
  url: string;

  /** Amount paid in USDC (standard units) */
  amount: number;

  /** Amount in micro-USDC (raw units) */
  amountMicroUSDC: number;

  /** Payment timestamp */
  timestamp: number;

  /** Payment requirements that were fulfilled */
  requirements: PaymentRequirements;

  /** Payment status */
  status: 'pending' | 'confirmed' | 'failed';

  /** Error message if payment failed */
  error?: string;

  /** Transaction slot (if available) */
  slot?: number;

  /** Block time (if available) */
  blockTime?: number;
}

/**
 * Options for useX402Payment hook
 */
export interface UseX402PaymentOptions {
  /** Automatically retry on 402 responses (default: true) */
  autoRetry?: boolean;

  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;

  /** Callback when payment is required */
  onPaymentRequired?: (requirements: PaymentRequirements) => void;

  /** Callback when payment is sent */
  onPaymentSent?: (signature: string, amount: number) => void;

  /** Callback when payment is confirmed */
  onPaymentConfirmed?: (signature: string) => void;

  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Return value from useX402Payment hook
 */
export interface UseX402PaymentReturn {
  /** Fetch with automatic 402 handling */
  fetch: (url: string, options?: RequestInit) => Promise<Response>;

  /** Loading state */
  isLoading: boolean;

  /** Error state */
  error: Error | null;

  /** Last payment signature */
  lastPaymentSignature: string | null;

  /** Last payment amount in USDC */
  lastPaymentAmount: number | null;

  /** Payment history */
  paymentHistory: PaymentHistoryEntry[];
}

/**
 * Options for useWalletBalance hook
 */
export interface UseWalletBalanceOptions {
  /** Auto-refresh interval in milliseconds (0 to disable) */
  refreshInterval?: number;

  /** Callback when balance changes */
  onBalanceChange?: (balance: number) => void;
}

/**
 * Return value from useWalletBalance hook
 */
export interface UseWalletBalanceReturn {
  /** USDC balance in standard units */
  usdcBalance: number;

  /** SOL balance in standard units */
  solBalance: number;

  /** Loading state */
  isLoading: boolean;

  /** Error state */
  error: Error | null;

  /** Manually refresh balance */
  refresh: () => Promise<void>;
}

/**
 * Options for usePaymentHistory hook
 */
export interface UsePaymentHistoryOptions {
  /** Maximum number of entries to keep */
  maxSize?: number;

  /** Enable localStorage persistence */
  persist?: boolean;

  /** LocalStorage key (default: 'x402-payment-history') */
  storageKey?: string;
}

/**
 * Return value from usePaymentHistory hook
 */
export interface UsePaymentHistoryReturn {
  /** Payment history entries */
  history: PaymentHistoryEntry[];

  /** Add new payment to history */
  addPayment: (payment: Omit<PaymentHistoryEntry, 'id' | 'timestamp'>) => void;

  /** Update existing payment */
  updatePayment: (id: string, updates: Partial<PaymentHistoryEntry>) => void;

  /** Clear all history */
  clear: () => void;

  /** Get payment by ID */
  getPayment: (id: string) => PaymentHistoryEntry | undefined;

  /** Get payments for a specific URL */
  getPaymentsForUrl: (url: string) => PaymentHistoryEntry[];

  /** Total amount spent (USDC) */
  totalSpent: number;

  /** Number of successful payments */
  successfulPayments: number;
}

/**
 * Payment error with additional context
 */
export interface X402PaymentError extends Error {
  code: string;
  details?: any;
  requirements?: PaymentRequirements;
  signature?: string;
}