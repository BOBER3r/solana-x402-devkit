/**
 * Type definitions for x402 testing utilities
 */

import { VersionedTransactionResponse, Commitment } from '@solana/web3.js';

/**
 * Options for generating mock x402 payment requirements
 */
export interface MockPaymentRequirementsOptions {
  /** Price in USD (e.g., 0.001) */
  priceUSD: number;

  /** Network (default: 'devnet') */
  network?: 'devnet' | 'mainnet-beta';

  /** Recipient wallet address (base58 public key) */
  recipientWallet: string;

  /** Payment scheme (default: 'exact') */
  scheme?: string;

  /** Resource being paid for */
  resource?: string;

  /** Description of what payment is for */
  description?: string;

  /** MIME type (default: 'application/json') */
  mimeType?: string;

  /** Timeout in seconds (default: 300) */
  timeoutSeconds?: number;

  /** Custom error message */
  errorMessage?: string;

  /** Additional scheme-specific data */
  extra?: object | null;
}

/**
 * Failure modes for mock payment verifier
 */
export type MockVerifierFailureMode =
  | 'amount_mismatch'      // Paid less than required
  | 'wrong_recipient'      // Paid to wrong address
  | 'replay_attack'        // Signature already used
  | 'expired_payment'      // Transaction too old
  | 'wrong_mint'           // Not USDC
  | 'wrong_network'        // Mainnet vs devnet mismatch
  | 'tx_not_found'         // Transaction doesn't exist
  | 'tx_failed'            // Transaction failed on chain
  | 'no_usdc_transfer'     // No USDC transfer found
  | 'rpc_error'            // RPC failure
  | null;                  // No failure (success)

/**
 * Options for mock payment verifier
 */
export interface MockPaymentVerifierOptions {
  /** Auto-approve all payments (default: true) */
  autoApprove?: boolean;

  /** Simulate specific failure mode */
  failureMode?: MockVerifierFailureMode;

  /** Simulate delay in milliseconds (default: 0) */
  delayMs?: number;

  /** Network to simulate (default: 'devnet') */
  network?: 'devnet' | 'mainnet-beta';

  /** Track used signatures to detect replays (default: true) */
  trackReplays?: boolean;

  /** Maximum transaction age in milliseconds (default: 300000) */
  maxAgeMs?: number;
}

/**
 * Failure modes for mock RPC
 */
export type MockRPCFailureMode =
  | 'timeout'              // Request timeout
  | 'rate_limit'           // Rate limited
  | 'not_found'            // Resource not found
  | 'internal_error'       // Internal server error
  | 'network_error'        // Network connection error
  | null;                  // No failure (success)

/**
 * Options for mock Solana RPC Connection
 */
export interface MockConnectionOptions {
  /** Network to simulate (default: 'devnet') */
  network?: 'devnet' | 'mainnet-beta';

  /** Pre-configured transactions (signature -> transaction) */
  transactions?: Map<string, VersionedTransactionResponse>;

  /** Simulate failure mode */
  failureMode?: MockRPCFailureMode;

  /** Simulate latency in milliseconds (default: 0) */
  latencyMs?: number;

  /** Failure rate (0-1, default: 0) - probability of random failures */
  failureRate?: number;

  /** Commitment level for getTransaction */
  commitment?: Commitment;
}

/**
 * Options for generating mock Solana transactions
 */
export interface MockTransactionOptions {
  /** Amount in micro-USDC (default: 1000 = $0.001) */
  amount?: number;

  /** Source token account (sender's USDC account) */
  from?: string;

  /** Destination token account (recipient's USDC account) */
  to?: string;

  /** Authority wallet (signer) */
  authority?: string;

  /** Token mint (default: devnet USDC) */
  mint?: string;

  /** Network (default: 'devnet') */
  network?: 'devnet' | 'mainnet-beta';

  /** Block time in seconds since epoch */
  blockTime?: number;

  /** Slot number */
  slot?: number;

  /** Whether transaction succeeded (default: true) */
  success?: boolean;

  /** Include inner instructions (default: true) */
  includeInnerInstructions?: boolean;

  /** Transaction signature (auto-generated if not provided) */
  signature?: string;
}

/**
 * Options for generating mock signatures
 */
export interface MockSignatureOptions {
  /** Use deterministic generation based on seed */
  seed?: string;

  /** Generate valid base58 signature (default: true) */
  validBase58?: boolean;
}

/**
 * Options for generating mock token accounts
 */
export interface MockAccountOptions {
  /** Owner wallet address */
  owner?: string;

  /** Token mint address (default: USDC) */
  mint?: string;

  /** Network (default: 'devnet') */
  network?: 'devnet' | 'mainnet-beta';

  /** Use actual ATA derivation (default: true) */
  deriveATA?: boolean;
}

/**
 * Time manipulation helpers for testing
 */
export interface MockTimeOptions {
  /** Current time in milliseconds since epoch */
  now?: number;

  /** Time offset in milliseconds to add to Date.now() */
  offset?: number;
}

/**
 * Mock payment verification result
 * Same interface as real verifier for compatibility
 */
export interface MockVerificationResult {
  valid: boolean;
  transfer?: {
    source: string;
    destination: string;
    authority: string;
    amount: number;
    mint: string;
  };
  signature?: string;
  blockTime?: number;
  slot?: number;
  error?: string;
  code?: string;
  debug?: {
    expectedRecipient?: string;
    expectedAmount?: number;
    foundTransfers?: any[];
    transactionAge?: number;
    [key: string]: any;
  };
}

/**
 * Mock x402 payment object
 */
export interface MockX402Payment {
  x402Version: number;
  scheme: string;
  network: string;
  payload: {
    serializedTransaction?: string;
    signature?: string;
    [key: string]: any;
  };
}

/**
 * Configuration for mock environment setup
 */
export interface MockEnvironmentConfig {
  /** Network to use (default: 'devnet') */
  network?: 'devnet' | 'mainnet-beta';

  /** Recipient wallet for tests */
  recipientWallet?: string;

  /** Auto-approve all payments (default: true) */
  autoApprove?: boolean;

  /** Simulate latency (default: 0) */
  latencyMs?: number;

  /** Track signatures for replay detection (default: true) */
  trackReplays?: boolean;

  /** Maximum transaction age (default: 300000) */
  maxAgeMs?: number;
}

/**
 * Mock cache for testing payment verifier
 */
export interface MockPaymentCache {
  /** Check if signature has been used */
  isUsed(signature: string): Promise<boolean>;

  /** Mark signature as used */
  markUsed(signature: string, metadata?: any): Promise<void>;

  /** Get payment metadata */
  getMetadata(signature: string): Promise<any>;

  /** Clear all cached payments */
  clear(): Promise<void>;

  /** Close cache connection */
  close(): Promise<void>;
}
