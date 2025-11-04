/**
 * Type definitions for x402 protocol
 */

/**
 * Payment requirements returned in 402 response
 */
export interface PaymentRequirements {
  /** x402 protocol version */
  x402Version: number;

  /** List of accepted payment methods */
  accepts: PaymentAccept[];

  /** Error message describing why payment is required */
  error: string;
}

/**
 * A specific payment method accepted by the server
 * Compliant with official x402 specification
 */
export interface PaymentAccept {
  /** Payment scheme - use 'exact' for fixed-amount payments */
  scheme: string;

  /** Network identifier (e.g., 'solana-devnet', 'solana-mainnet') */
  network: string;

  /** Maximum amount required in smallest unit (micro-USDC for Solana) */
  maxAmountRequired: string;

  /** Resource being paid for */
  resource: string;

  /** Description of what payment is for */
  description: string;

  /** MIME type of the resource (e.g., 'application/json') */
  mimeType: string;

  /** Optional JSON schema for response output */
  outputSchema?: object | null;

  /** Payment destination address (token account for Solana) */
  payTo: string;

  /** Timeout in seconds for payment to be valid */
  maxTimeoutSeconds: number;

  /** Asset identifier (e.g., USDC mint address) */
  asset: string;

  /** Optional additional data (scheme-specific) */
  extra?: object | null;
}

/**
 * Information about a completed payment
 */
export interface PaymentInfo {
  /** Transaction signature on Solana */
  signature: string;

  /** Amount paid in micro-units */
  amount: number;

  /** Timestamp when payment was made */
  timestamp: number;

  /** Public key of the payer */
  payer: string;
}

/**
 * Payment proof sent in X-PAYMENT header
 */
export interface PaymentProof {
  /** x402 protocol version */
  x402Version: number;

  /** Payment scheme used */
  scheme: string;

  /** Network where payment was made */
  network: string;

  /** Payment-specific data */
  payload: {
    /** Transaction signature */
    signature: string;
  };
}

/**
 * Error thrown when payment fails
 */
export class PaymentError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

/**
 * Error codes for payment failures
 */
export enum PaymentErrorCode {
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  CONFIRMATION_TIMEOUT = 'CONFIRMATION_TIMEOUT',
  INVALID_PAYMENT_REQUIREMENTS = 'INVALID_PAYMENT_REQUIREMENTS',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNSUPPORTED_PAYMENT_METHOD = 'UNSUPPORTED_PAYMENT_METHOD',
}
