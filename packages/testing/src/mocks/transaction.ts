/**
 * Mock transaction generator for testing
 * Creates realistic Solana transactions with SPL token transfers
 */

import {
  PublicKey,
  TransactionInstruction,
  VersionedTransactionResponse,
  TransactionError,
  MessageV0,
} from '@solana/web3.js';
import bs58 from 'bs58';
import { MockTransactionOptions } from '../types';
import { generateMockSignature } from '../helpers/signatures';
import { generateMockTokenAccount, getUSDCMint } from '../helpers/accounts';
import { createBlockTime } from '../helpers/time';

/**
 * SPL Token Program ID
 */
const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNKMfcCY54QikxcXcCu7639RdozWp';

/**
 * Generate a mock Solana transaction with USDC transfer
 *
 * Creates a realistic VersionedTransactionResponse that can be used
 * to test payment verification without requiring real blockchain calls.
 *
 * @param options - Transaction generation options
 * @returns Mock VersionedTransactionResponse
 *
 * @example
 * ```typescript
 * // Basic USDC transfer transaction
 * const tx = generateMockTransaction({
 *   amount: 1000, // $0.001 in micro-USDC
 *   from: 'SenderTokenAccount...',
 *   to: 'RecipientTokenAccount...',
 * });
 *
 * // Failed transaction
 * const failedTx = generateMockTransaction({
 *   amount: 1000,
 *   success: false,
 * });
 *
 * // Old transaction (for testing expiry)
 * const oldTx = generateMockTransaction({
 *   amount: 1000,
 *   blockTime: Math.floor(Date.now() / 1000) - 600, // 10 minutes ago
 * });
 * ```
 */
export function generateMockTransaction(
  options: MockTransactionOptions = {}
): VersionedTransactionResponse {
  const {
    amount = 1000,
    from,
    to,
    authority,
    mint,
    network = 'devnet',
    blockTime,
    slot = Math.floor(Math.random() * 1000000),
    success = true,
    includeInnerInstructions = true,
    signature,
  } = options;

  // Generate addresses if not provided
  const sourceAccount = from || generateMockTokenAccount({ network });
  const destAccount = to || generateMockTokenAccount({ network });
  const authorityAccount = authority || generateMockTokenAccount({ network });
  const mintAddress = mint || getUSDCMint(network);

  // Generate signature as base58 string (Solana standard format)
  const txSignature = signature || generateMockSignature();

  // Create SPL Token Transfer instruction
  const transferInstruction = createTransferInstruction(
    sourceAccount,
    destAccount,
    authorityAccount,
    amount
  );

  // Create transaction meta
  const meta: VersionedTransactionResponse['meta'] = {
    err: success ? null : ({ InstructionError: [0, 'Custom program error'] } as TransactionError),
    fee: 5000,
    preBalances: [1000000000, 500000000, 100000000],
    postBalances: [999995000, 500000000, 100000000],
    preTokenBalances: [
      {
        accountIndex: 1,
        mint: mintAddress,
        owner: authorityAccount,
        programId: TOKEN_PROGRAM_ID,
        uiTokenAmount: {
          amount: (1000000 + amount).toString(),
          decimals: 6,
          uiAmount: (1000000 + amount) / 1_000_000,
          uiAmountString: ((1000000 + amount) / 1_000_000).toFixed(6),
        },
      },
      {
        accountIndex: 2,
        mint: mintAddress,
        owner: 'RecipientOwner',
        programId: TOKEN_PROGRAM_ID,
        uiTokenAmount: {
          amount: '500000',
          decimals: 6,
          uiAmount: 0.5,
          uiAmountString: '0.500000',
        },
      },
    ],
    postTokenBalances: [
      {
        accountIndex: 1,
        mint: mintAddress,
        owner: authorityAccount,
        programId: TOKEN_PROGRAM_ID,
        uiTokenAmount: {
          amount: '1000000',
          decimals: 6,
          uiAmount: 1.0,
          uiAmountString: '1.000000',
        },
      },
      {
        accountIndex: 2,
        mint: mintAddress,
        owner: 'RecipientOwner',
        programId: TOKEN_PROGRAM_ID,
        uiTokenAmount: {
          amount: (500000 + amount).toString(),
          decimals: 6,
          uiAmount: (500000 + amount) / 1_000_000,
          uiAmountString: ((500000 + amount) / 1_000_000).toFixed(6),
        },
      },
    ],
    logMessages: [
      'Program TokenkegQfeZyiNKMfcCY54QikxcXcCu7639RdozWp invoke [1]',
      `Program log: Instruction: Transfer`,
      'Program TokenkegQfeZyiNKMfcCY54QikxcXcCu7639RdozWp consumed 4645 of 200000 compute units',
      'Program TokenkegQfeZyiNKMfcCY54QikxcXcCu7639RdozWp success',
    ],
    innerInstructions: includeInnerInstructions
      ? [
          {
            index: 0,
            instructions: [
              {
                programIdIndex: 3,
                accounts: [1, 2, 0],
                data: bs58.encode(encodeTransferInstruction(amount)),
              },
            ],
          },
        ]
      : [],
    loadedAddresses: {
      writable: [],
      readonly: [],
    },
    computeUnitsConsumed: 4645,
  };

  // Create message (simplified)
  const message = {
    accountKeys: [
      new PublicKey(authorityAccount),
      new PublicKey(sourceAccount),
      new PublicKey(destAccount),
      new PublicKey(TOKEN_PROGRAM_ID),
    ],
    header: {
      numRequiredSignatures: 1,
      numReadonlySignedAccounts: 0,
      numReadonlyUnsignedAccounts: 1,
    },
    recentBlockhash: generateMockBlockhash(),
    instructions: [transferInstruction],
  } as unknown as MessageV0;

  // Return proper VersionedTransactionResponse with string signatures
  return {
    slot,
    transaction: {
      message,
      signatures: [txSignature], // Signatures are base58 strings in Solana
    },
    meta,
    blockTime: blockTime !== undefined ? blockTime : createBlockTime(),
    version: 0,
  } as VersionedTransactionResponse;
}

/**
 * Create a SPL Token Transfer instruction
 */
function createTransferInstruction(
  source: string,
  destination: string,
  authority: string,
  amount: number
): TransactionInstruction {
  return {
    programId: new PublicKey(TOKEN_PROGRAM_ID),
    keys: [
      { pubkey: new PublicKey(source), isSigner: false, isWritable: true },
      { pubkey: new PublicKey(destination), isSigner: false, isWritable: true },
      { pubkey: new PublicKey(authority), isSigner: true, isWritable: false },
    ],
    data: Buffer.from(encodeTransferInstruction(amount)),
  };
}

/**
 * Encode SPL Token Transfer instruction data
 * Format: [discriminator(1), amount(8)]
 */
function encodeTransferInstruction(amount: number): Uint8Array {
  const data = new Uint8Array(9);

  // Discriminator for Transfer instruction (3)
  data[0] = 3;

  // Amount as u64 little-endian
  const amountBigInt = BigInt(amount);
  for (let i = 0; i < 8; i++) {
    data[1 + i] = Number((amountBigInt >> BigInt(i * 8)) & BigInt(0xff));
  }

  return data;
}

/**
 * Generate a mock blockhash
 */
function generateMockBlockhash(): string {
  return generateMockSignature({ seed: `blockhash-${Date.now()}` });
}

/**
 * Generate multiple mock transactions
 *
 * @param count - Number of transactions to generate
 * @param baseOptions - Base options for all transactions
 * @returns Array of mock transactions
 *
 * @example
 * ```typescript
 * const transactions = generateMockTransactions(5, {
 *   to: 'RecipientAccount...',
 *   network: 'devnet',
 * });
 * ```
 */
export function generateMockTransactions(
  count: number,
  baseOptions: MockTransactionOptions = {}
): VersionedTransactionResponse[] {
  const transactions: VersionedTransactionResponse[] = [];

  for (let i = 0; i < count; i++) {
    transactions.push(
      generateMockTransaction({
        ...baseOptions,
        signature: baseOptions.signature
          ? `${baseOptions.signature}-${i}`
          : undefined,
      })
    );
  }

  return transactions;
}

/**
 * Create a mock transaction with specific failure
 *
 * @param failureType - Type of failure to simulate
 * @param options - Additional transaction options
 * @returns Mock transaction with failure
 *
 * @example
 * ```typescript
 * const failedTx = generateFailedTransaction('insufficient_funds');
 * const notFoundTx = generateFailedTransaction('not_found');
 * ```
 */
export function generateFailedTransaction(
  failureType: 'insufficient_funds' | 'invalid_account' | 'program_error' | 'not_found',
  options: MockTransactionOptions = {}
): VersionedTransactionResponse | null {
  if (failureType === 'not_found') {
    return null;
  }

  // For now, just return a failed transaction
  // In the future, we could use specific error types from errorMap
  // to customize the transaction.meta.err field
  return generateMockTransaction({
    ...options,
    success: false,
  });
}

/**
 * Generate a mock transaction map for RPC mocking
 *
 * @param count - Number of transactions
 * @param options - Transaction options
 * @returns Map of signature -> transaction
 *
 * @example
 * ```typescript
 * const txMap = generateTransactionMap(10);
 * // Map with 10 transactions
 * ```
 */
export function generateTransactionMap(
  count: number,
  options: MockTransactionOptions = {}
): Map<string, VersionedTransactionResponse> {
  const map = new Map<string, VersionedTransactionResponse>();

  for (let i = 0; i < count; i++) {
    const tx = generateMockTransaction(options);
    const signature = getTransactionSignature(tx);
    map.set(signature, tx);
  }

  return map;
}

/**
 * Extract signature from mock transaction
 *
 * @param tx - Mock transaction
 * @returns Transaction signature as base58 string
 *
 * @example
 * ```typescript
 * const tx = generateMockTransaction();
 * const signature = getTransactionSignature(tx);
 * ```
 */
export function getTransactionSignature(tx: VersionedTransactionResponse): string {
  const sig = tx.transaction.signatures[0];
  // Signatures in VersionedTransactionResponse are already base58 strings
  if (typeof sig === 'string') {
    return sig;
  }
  // Fallback for edge cases where it might be Uint8Array
  return bs58.encode(sig);
}

/**
 * Create a transaction with multiple USDC transfers
 *
 * @param transfers - Array of transfer details
 * @param options - Additional transaction options
 * @returns Mock transaction with multiple transfers
 *
 * @example
 * ```typescript
 * const tx = generateMultiTransferTransaction([
 *   { to: 'Recipient1...', amount: 1000 },
 *   { to: 'Recipient2...', amount: 2000 },
 * ]);
 * ```
 */
export function generateMultiTransferTransaction(
  transfers: Array<{ to: string; amount: number; from?: string }>,
  options: Omit<MockTransactionOptions, 'to' | 'from' | 'amount'> = {}
): VersionedTransactionResponse {
  // For now, use the first transfer as primary
  // In a full implementation, this would properly encode multiple transfers
  const primaryTransfer = transfers[0];

  return generateMockTransaction({
    ...options,
    to: primaryTransfer.to,
    from: primaryTransfer.from,
    amount: primaryTransfer.amount,
  });
}

/**
 * Generate a transaction with no USDC transfer
 * Useful for testing error handling
 *
 * @param options - Transaction options
 * @returns Mock transaction without USDC transfer
 *
 * @example
 * ```typescript
 * const tx = generateTransactionWithoutUSDC();
 * // Transaction has no USDC transfer instruction
 * ```
 */
export function generateTransactionWithoutUSDC(
  options: Omit<MockTransactionOptions, 'includeInnerInstructions'> = {}
): VersionedTransactionResponse {
  return generateMockTransaction({
    ...options,
    includeInnerInstructions: false,
  });
}
