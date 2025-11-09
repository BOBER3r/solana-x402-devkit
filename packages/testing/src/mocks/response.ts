/**
 * Mock x402 response generator
 * Creates valid PaymentRequirements objects for testing
 */

import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { MockPaymentRequirementsOptions, MockX402Payment } from '../types';
import { getUSDCMint, generateMockAddress } from '../helpers/accounts';
import { generateMockSignature } from '../helpers/signatures';
import { generateMockTransaction } from './transaction';

/**
 * x402 protocol types (copied from core to avoid circular dependency)
 */
interface PaymentRequirements {
  x402Version: number;
  accepts: PaymentAccept[];
  error: string;
}

interface PaymentAccept {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  outputSchema?: object | null;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra?: object | null;
}

/**
 * Generate a mock x402 payment requirements response
 *
 * Creates a valid PaymentRequirements object that matches the x402 protocol
 * specification, suitable for testing 402 responses without a real payment generator.
 *
 * @param options - Payment requirements options
 * @returns PaymentRequirements object
 *
 * @example
 * ```typescript
 * // Basic 402 response
 * const requirements = mockX402Response({
 *   priceUSD: 0.001,
 *   recipientWallet: 'WalletAddress...'
 * });
 *
 * // With custom options
 * const customRequirements = mockX402Response({
 *   priceUSD: 0.005,
 *   recipientWallet: 'WalletAddress...',
 *   network: 'mainnet-beta',
 *   description: 'Premium API access',
 *   resource: '/api/premium',
 *   timeoutSeconds: 600,
 * });
 * ```
 */
export function mockX402Response(
  options: MockPaymentRequirementsOptions
): PaymentRequirements {
  const {
    priceUSD,
    recipientWallet,
    network = 'devnet',
    scheme = 'exact',
    resource = '',
    description = 'Payment required for access',
    mimeType = 'application/json',
    timeoutSeconds = 300,
    errorMessage = 'Payment Required',
    extra = null,
  } = options;

  // Validate recipient wallet
  let recipientPubkey: PublicKey;
  try {
    recipientPubkey = new PublicKey(recipientWallet);
  } catch {
    throw new Error(`Invalid recipient wallet: ${recipientWallet}`);
  }

  // Get USDC mint for network
  const usdcMint = getUSDCMint(network);
  const usdcMintPubkey = new PublicKey(usdcMint);

  // Derive recipient's USDC token account
  const recipientUSDCAccount = getAssociatedTokenAddressSync(
    usdcMintPubkey,
    recipientPubkey
  );

  // Convert USD to micro-USDC
  const microUSDC = Math.floor(priceUSD * 1_000_000);

  // Format network for x402 spec
  const networkName = network === 'devnet' ? 'solana-devnet' : 'solana-mainnet';

  // Create payment accept option
  const accept: PaymentAccept = {
    scheme,
    network: networkName,
    maxAmountRequired: microUSDC.toString(),
    resource,
    description,
    mimeType,
    outputSchema: null,
    payTo: recipientUSDCAccount.toString(),
    maxTimeoutSeconds: timeoutSeconds,
    asset: usdcMint,
    extra,
  };

  return {
    x402Version: 1,
    accepts: [accept],
    error: errorMessage,
  };
}

/**
 * Generate multiple payment options (tiered pricing)
 *
 * @param options - Array of payment requirement options
 * @returns PaymentRequirements with multiple accepts
 *
 * @example
 * ```typescript
 * const requirements = mockX402MultiResponse([
 *   { priceUSD: 0.001, recipientWallet: 'Wallet...', description: 'Basic' },
 *   { priceUSD: 0.005, recipientWallet: 'Wallet...', description: 'Premium' },
 * ]);
 * ```
 */
export function mockX402MultiResponse(
  options: MockPaymentRequirementsOptions[]
): PaymentRequirements {
  if (options.length === 0) {
    throw new Error('At least one payment option is required');
  }

  const accepts: PaymentAccept[] = options.map(opt => {
    const singleResponse = mockX402Response(opt);
    return singleResponse.accepts[0];
  });

  return {
    x402Version: 1,
    accepts,
    error: options[0].errorMessage || 'Payment Required',
  };
}

/**
 * Generate a mock X-PAYMENT header value
 *
 * Creates a valid payment proof that can be sent in the X-PAYMENT header
 * to test payment verification without requiring a real client.
 *
 * @param options - Payment options
 * @returns Base64-encoded X-PAYMENT header value
 *
 * @example
 * ```typescript
 * // Payment with signature
 * const header = mockX402PaymentHeader({
 *   signature: 'TransactionSignature...',
 *   network: 'devnet',
 * });
 *
 * // Payment with serialized transaction
 * const headerWithTx = mockX402PaymentHeader({
 *   serializedTransaction: 'base64EncodedTx...',
 *   network: 'devnet',
 * });
 *
 * // Use in test
 * const response = await fetch('/api/endpoint', {
 *   headers: {
 *     'X-PAYMENT': header,
 *   },
 * });
 * ```
 */
export function mockX402PaymentHeader(options: {
  signature?: string;
  serializedTransaction?: string;
  network?: 'devnet' | 'mainnet-beta';
  scheme?: string;
}): string {
  const {
    signature,
    serializedTransaction,
    network = 'devnet',
    scheme = 'exact',
  } = options;

  if (!signature && !serializedTransaction) {
    throw new Error('Either signature or serializedTransaction must be provided');
  }

  const networkName = network === 'devnet' ? 'solana-devnet' : 'solana-mainnet';

  const payment: MockX402Payment = {
    x402Version: 1,
    scheme,
    network: networkName,
    payload: {},
  };

  if (signature) {
    payment.payload.signature = signature;
  }

  if (serializedTransaction) {
    payment.payload.serializedTransaction = serializedTransaction;
  }

  // Encode as base64
  return Buffer.from(JSON.stringify(payment)).toString('base64');
}

/**
 * Generate a complete mock payment flow
 *
 * Creates both the payment requirements and a matching payment header,
 * useful for end-to-end testing.
 *
 * @param options - Payment flow options
 * @returns Object with requirements and payment header
 *
 * @example
 * ```typescript
 * const { requirements, paymentHeader, signature } = mockX402PaymentFlow({
 *   priceUSD: 0.001,
 *   recipientWallet: 'Wallet...',
 *   network: 'devnet',
 * });
 *
 * // First request - get 402
 * const res1 = await fetch('/api/endpoint');
 * expect(res1.status).toBe(402);
 * expect(await res1.json()).toEqual(requirements);
 *
 * // Second request - provide payment
 * const res2 = await fetch('/api/endpoint', {
 *   headers: { 'X-PAYMENT': paymentHeader },
 * });
 * expect(res2.status).toBe(200);
 * ```
 */
export function mockX402PaymentFlow(
  options: MockPaymentRequirementsOptions & {
    useSerializedTransaction?: boolean;
  }
): {
  requirements: PaymentRequirements;
  paymentHeader: string;
  signature: string;
  transaction?: any;
} {
  const { useSerializedTransaction = false, ...reqOptions } = options;

  // Generate requirements
  const requirements = mockX402Response(reqOptions);

  // Generate matching payment
  const signature = generateMockSignature({ seed: 'payment' });

  let paymentHeader: string;
  let transaction: any;

  if (useSerializedTransaction) {
    // Generate mock transaction
    transaction = generateMockTransaction({
      amount: Math.floor(reqOptions.priceUSD * 1_000_000),
      to: requirements.accepts[0].payTo,
      network: reqOptions.network,
    });

    // Serialize transaction (simplified)
    const serialized = Buffer.from(JSON.stringify(transaction)).toString('base64');

    paymentHeader = mockX402PaymentHeader({
      serializedTransaction: serialized,
      network: reqOptions.network,
    });
  } else {
    paymentHeader = mockX402PaymentHeader({
      signature,
      network: reqOptions.network,
    });
  }

  return {
    requirements,
    paymentHeader,
    signature,
    transaction,
  };
}

/**
 * Encode payment requirements as base64 JSON
 * Matches the static method from PaymentRequirementsGenerator
 *
 * @param requirements - Payment requirements
 * @returns Base64-encoded JSON string
 *
 * @example
 * ```typescript
 * const requirements = mockX402Response({ ... });
 * const encoded = encodePaymentRequirements(requirements);
 * ```
 */
export function encodePaymentRequirements(requirements: PaymentRequirements): string {
  return Buffer.from(JSON.stringify(requirements)).toString('base64');
}

/**
 * Decode payment requirements from base64 JSON
 *
 * @param encoded - Base64-encoded payment requirements
 * @returns Payment requirements object
 *
 * @example
 * ```typescript
 * const decoded = decodePaymentRequirements(encoded);
 * ```
 */
export function decodePaymentRequirements(encoded: string): PaymentRequirements {
  try {
    const json = Buffer.from(encoded, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch (error) {
    throw new Error('Invalid payment requirements encoding');
  }
}

/**
 * Decode X-PAYMENT header
 *
 * @param header - Base64-encoded X-PAYMENT header
 * @returns Parsed payment object
 *
 * @example
 * ```typescript
 * const payment = decodePaymentHeader(headerValue);
 * console.log(payment.payload.signature);
 * ```
 */
export function decodePaymentHeader(header: string): MockX402Payment {
  try {
    const json = Buffer.from(header, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch (error) {
    throw new Error('Invalid payment header encoding');
  }
}

/**
 * Create a 402 HTTP response object for testing
 *
 * @param requirements - Payment requirements
 * @returns Mock HTTP response
 *
 * @example
 * ```typescript
 * const response = create402Response(requirements);
 * expect(response.status).toBe(402);
 * expect(response.body).toEqual(requirements);
 * ```
 */
export function create402Response(requirements: PaymentRequirements): {
  status: number;
  statusText: string;
  body: PaymentRequirements;
  headers: Record<string, string>;
} {
  return {
    status: 402,
    statusText: 'Payment Required',
    body: requirements,
    headers: {
      'Content-Type': 'application/json',
      'WWW-Authenticate': 'x402',
    },
  };
}

/**
 * Create common test payment requirements
 * Pre-configured for typical test scenarios
 *
 * @param scenario - Test scenario name
 * @returns Payment requirements
 *
 * @example
 * ```typescript
 * const basicReq = getCommonTestRequirements('basic');
 * const premiumReq = getCommonTestRequirements('premium');
 * const expensiveReq = getCommonTestRequirements('expensive');
 * ```
 */
export function getCommonTestRequirements(
  scenario: 'basic' | 'premium' | 'expensive' | 'free'
): PaymentRequirements {
  const recipientWallet = generateMockAddress('test-recipient');

  const priceMap = {
    basic: 0.001,
    premium: 0.01,
    expensive: 1.0,
    free: 0.0001,
  };

  const descriptionMap = {
    basic: 'Basic access',
    premium: 'Premium access',
    expensive: 'Expensive operation',
    free: 'Nearly free access',
  };

  return mockX402Response({
    priceUSD: priceMap[scenario],
    recipientWallet,
    description: descriptionMap[scenario],
  });
}
