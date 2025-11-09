/**
 * Type definitions for Next.js x402 integration
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Payment information attached to requests
 */
export interface PaymentInfo {
  /** Transaction signature */
  signature: string;

  /** Amount paid in USD */
  amount: number;

  /** Payer wallet address */
  payer: string;

  /** Block time (Unix timestamp) */
  blockTime?: number;

  /** Slot number */
  slot?: number;
}

/**
 * x402 middleware configuration
 */
export interface X402MiddlewareConfig {
  /** Solana RPC URL */
  solanaRpcUrl: string;

  /** Recipient wallet address */
  recipientWallet: string;

  /** Network (devnet or mainnet-beta) */
  network: 'devnet' | 'mainnet-beta';

  /** Redis configuration for replay attack prevention (optional) */
  redis?: {
    url: string;
  };

  /** Maximum payment age in milliseconds (default: 300000 = 5 minutes) */
  maxPaymentAgeMs?: number;

  /** Enable debug logging (default: false) */
  debug?: boolean;

  /** Protected route patterns (glob patterns) */
  protectedRoutes?: string[];
}

/**
 * Payment requirements for a specific resource
 */
export interface PaymentRequirementOptions {
  /** Resource identifier (e.g., '/api/endpoint') */
  resource?: string;

  /** Description of what payment is for */
  description?: string;

  /** MIME type of the resource */
  mimeType?: string;

  /** Optional JSON schema for response output */
  outputSchema?: object | null;

  /** Error message override */
  errorMessage?: string;

  /** Maximum payment age for this route */
  maxPaymentAgeMs?: number;

  /** Timeout in seconds for payment to be valid */
  timeoutSeconds?: number;

  /** Optional additional data */
  extra?: object | null;
}

/**
 * Extended NextRequest with payment info
 */
export interface NextRequestWithPayment extends NextRequest {
  payment?: PaymentInfo;
}

/**
 * API route handler type
 */
export type NextApiHandler<T = any> = (
  req: NextRequestWithPayment,
  context?: any
) => Promise<Response> | Response | Promise<NextResponse<T>> | NextResponse<T>;

/**
 * Server Action result with payment requirement
 */
export interface ServerActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  paymentRequired?: {
    priceUSD: number;
    requirements: any;
  };
}

/**
 * Server Action options
 */
export interface ServerActionOptions extends PaymentRequirementOptions {
  /** Price in USD */
  priceUSD: number;
}

/**
 * x402 configuration for API routes
 */
export interface WithX402Options extends PaymentRequirementOptions {
  /** Price in USD */
  priceUSD: number;
}
