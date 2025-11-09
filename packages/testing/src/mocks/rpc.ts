/**
 * Mock Solana RPC Connection for testing
 * Simulates Solana web3.js Connection without blockchain calls
 */

import {
  Commitment,
  VersionedTransactionResponse,
  PublicKey,
  BlockhashWithExpiryBlockHeight,
} from '@solana/web3.js';
import { MockConnectionOptions } from '../types';
import { generateMockTransaction, getTransactionSignature } from './transaction';
import { sleep } from '../helpers/time';
import bs58 from 'bs58';

/**
 * Mock Solana RPC Connection
 *
 * Simulates a Solana Connection object for testing without
 * requiring access to a real RPC endpoint.
 *
 * @param options - Mock connection options
 * @returns Mock Connection-like object
 *
 * @example
 * ```typescript
 * // Basic mock with pre-configured transactions
 * const tx = generateMockTransaction({ amount: 1000 });
 * const txMap = new Map([[getTransactionSignature(_tx), tx]]);
 * const connection = mockSolanaRPC({ transactions: txMap });
 *
 * const fetchedTx = await connection.getTransaction('signature...');
 * expect(_fetchedTx).toBeDefined();
 *
 * // Simulate RPC failures
 * const failingRPC = mockSolanaRPC({ failureMode: 'timeout' });
 * await expect(failingRPC.getTransaction('sig...')).rejects.toThrow();
 *
 * // Simulate latency
 * const slowRPC = mockSolanaRPC({ latencyMs: 500 });
 * const start = Date.now();
 * await slowRPC.getTransaction('sig...');
 * expect(Date.now() - start).toBeGreaterThanOrEqual(500);
 * ```
 */
export function mockSolanaRPC(options: MockConnectionOptions = {}) {
  const {
    network = 'devnet',
    transactions = new Map(),
    failureMode = null,
    latencyMs = 0,
    failureRate = 0,
  } = options;

  /**
   * Simulate network delay and failures
   */
  async function simulateNetwork(): Promise<void> {
    // Simulate latency
    if (latencyMs > 0) {
      await sleep(latencyMs);
    }

    // Random failures
    if (failureRate > 0 && Math.random() < failureRate) {
      throw new Error('Random RPC failure');
    }

    // Configured failure mode
    if (failureMode) {
      throw createRPCError(failureMode);
    }
  }

  /**
   * Get a transaction
   */
  async function getTransaction(
    signature: string,
    _options?: {
      commitment?: Commitment;
      maxSupportedTransactionVersion?: number;
    }
  ): Promise<VersionedTransactionResponse | null> {
    await simulateNetwork();

    // Look up transaction
    const tx = transactions.get(signature);
    return tx || null;
  }

  /**
   * Confirm a transaction
   */
  async function confirmTransaction(
    config: {
      signature: string;
      blockhash?: string;
      lastValidBlockHeight?: number;
    },
    _commitment?: Commitment
  ): Promise<{ value: { err: any | null } }> {
    await simulateNetwork();

    // Check if transaction exists
    const tx = transactions.get(config.signature);

    if (!tx) {
      return {
        value: {
          err: { InstructionError: [0, 'Transaction not found'] },
        },
      };
    }

    // Return confirmation status based on transaction meta
    return {
      value: {
        err: tx.meta?.err || null,
      },
    };
  }

  /**
   * Get balance
   */
  async function getBalance(
    _publicKey: PublicKey,
    _commitment?: Commitment
  ): Promise<number> {
    await simulateNetwork();

    // Return mock balance (1 SOL)
    return 1_000_000_000;
  }

  /**
   * Get latest blockhash
   */
  async function getLatestBlockhash(
    _commitment?: Commitment
  ): Promise<BlockhashWithExpiryBlockHeight> {
    await simulateNetwork();

    return {
      blockhash: 'MockBlockhash' + Date.now(),
      lastValidBlockHeight: Math.floor(Math.random() * 1000000) + 100000,
    };
  }

  /**
   * Get slot
   */
  async function getSlot(_commitment?: Commitment): Promise<number> {
    await simulateNetwork();
    return Math.floor(Math.random() * 1000000);
  }

  /**
   * Get block time
   */
  async function getBlockTime(_slot: number): Promise<number | null> {
    await simulateNetwork();
    return Math.floor(Date.now() / 1000);
  }

  /**
   * Get account info
   */
  async function getAccountInfo(
    _publicKey: PublicKey,
    _commitment?: Commitment
  ): Promise<any> {
    await simulateNetwork();

    // Return mock account info
    return {
      executable: false,
      owner: new PublicKey('11111111111111111111111111111111'),
      lamports: 1_000_000,
      data: Buffer.from([]),
      rentEpoch: 0,
    };
  }

  /**
   * Get multiple accounts
   */
  async function getMultipleAccountsInfo(
    publicKeys: PublicKey[],
    _commitment?: Commitment
  ): Promise<any[]> {
    await simulateNetwork();

    return publicKeys.map(() => ({
      executable: false,
      owner: new PublicKey('11111111111111111111111111111111'),
      lamports: 1_000_000,
      data: Buffer.from([]),
      rentEpoch: 0,
    }));
  }

  /**
   * Send transaction
   */
  async function sendTransaction(
    transaction: any,
    _options?: any
  ): Promise<string> {
    await simulateNetwork();

    // Generate mock signature
    const signature = bs58.encode(transaction.signatures?.[0] || Buffer.alloc(64));

    // Store transaction for later retrieval
    const mockTx = generateMockTransaction({ signature });
    transactions.set(signature, mockTx);

    return signature;
  }

  /**
   * Get RPC endpoint
   */
  function rpcEndpoint(): string {
    return network === 'devnet'
      ? 'https://api.devnet.solana.com'
      : 'https://api.mainnet-beta.solana.com';
  }

  return {
    getTransaction,
    confirmTransaction,
    getBalance,
    getLatestBlockhash,
    getSlot,
    getBlockTime,
    getAccountInfo,
    getMultipleAccountsInfo,
    sendTransaction,
    rpcEndpoint,
    // Expose for testing
    _transactions: transactions,
    _network: network,
    _failureMode: failureMode,
  };
}

/**
 * Create RPC error based on failure mode
 */
function createRPCError(_failureMode: string): Error {
  switch (_failureMode) {
    case 'timeout':
      const timeoutError: any = new Error('Request timeout');
      timeoutError.code = 'ETIMEDOUT';
      return timeoutError;

    case 'rate_limit':
      const rateLimitError: any = new Error('Rate limit exceeded');
      rateLimitError.code = 429;
      return rateLimitError;

    case 'not_found':
      return new Error('Resource not found');

    case 'internal_error':
      return new Error('Internal server error');

    case 'network_error':
      const networkError: any = new Error('Network connection failed');
      networkError.code = 'ECONNREFUSED';
      return networkError;

    default:
      return new Error('RPC error');
  }
}

/**
 * Create a mock RPC with pre-populated transactions
 *
 * @param count - Number of transactions to create
 * @param options - Transaction and connection options
 * @returns Mock RPC with transactions
 *
 * @example
 * ```typescript
 * const rpc = mockRPCWithTransactions(10, {
 *   network: 'devnet',
 *   transactionOptions: { amount: 1000 }
 * });
 * ```
 */
export function mockRPCWithTransactions(
  count: number,
  options: {
    network?: 'devnet' | 'mainnet-beta';
    transactionOptions?: any;
    connectionOptions?: MockConnectionOptions;
  } = {}
) {
  const { network = 'devnet', transactionOptions = {}, connectionOptions = {} } = options;

  // Generate transactions
  const txMap = new Map<string, VersionedTransactionResponse>();

  for (let i = 0; i < count; i++) {
    const tx = generateMockTransaction({
      ...transactionOptions,
      network,
    });
    const signature = getTransactionSignature(tx);
    txMap.set(signature, tx);
  }

  return mockSolanaRPC({
    ...connectionOptions,
    network,
    transactions: txMap,
  });
}

/**
 * Create a failing mock RPC that always throws errors
 *
 * @param errorType - Type of error to throw
 * @returns Failing mock RPC
 *
 * @example
 * ```typescript
 * const rpc = mockFailingRPC('timeout');
 * await expect(rpc.getTransaction('sig')).rejects.toThrow('timeout');
 * ```
 */
export function mockFailingRPC(
  errorType: 'timeout' | 'rate_limit' | 'not_found' | 'internal_error' | 'network_error' = 'timeout'
) {
  return mockSolanaRPC({
    failureMode: errorType,
  });
}

/**
 * Create a slow mock RPC with configurable latency
 *
 * @param latencyMs - Latency in milliseconds
 * @returns Slow mock RPC
 *
 * @example
 * ```typescript
 * const rpc = mockSlowRPC(1000); // 1 second delay
 * const start = Date.now();
 * await rpc.getTransaction('sig');
 * expect(Date.now() - start).toBeGreaterThanOrEqual(1000);
 * ```
 */
export function mockSlowRPC(latencyMs: number) {
  return mockSolanaRPC({
    latencyMs,
  });
}

/**
 * Create an unreliable mock RPC with random failures
 *
 * @param failureRate - Probability of failure (0-1)
 * @returns Unreliable mock RPC
 *
 * @example
 * ```typescript
 * const rpc = mockUnreliableRPC(0.3); // 30% failure rate
 * ```
 */
export function mockUnreliableRPC(failureRate: number = 0.1) {
  return mockSolanaRPC({
    failureRate,
  });
}

/**
 * Create a mock RPC that returns null for all transactions
 * Useful for testing transaction not found scenarios
 *
 * @returns Empty mock RPC
 *
 * @example
 * ```typescript
 * const rpc = mockEmptyRPC();
 * const tx = await rpc.getTransaction('any-signature');
 * expect(_tx).toBeNull();
 * ```
 */
export function mockEmptyRPC() {
  return mockSolanaRPC({
    transactions: new Map(),
  });
}

/**
 * Create a mock RPC that works like a real Connection object
 * Compatible with code that expects a Connection instance
 *
 * @param options - Mock connection options
 * @returns Mock that can be used as Connection
 *
 * @example
 * ```typescript
 * const connection = createMockConnection({ network: 'devnet' });
 * const verifier = new TransactionVerifier({
 *   rpcUrl: 'mock', // Not used
 *   connection, // Use mock connection instead
 * });
 * ```
 */
export function createMockConnection(options: MockConnectionOptions = {}): any {
  const mock = mockSolanaRPC(options);

  // Add Connection-compatible methods
  return {
    ...mock,
    commitment: options.commitment || 'confirmed',
    rpcEndpoint: mock.rpcEndpoint(),
  };
}
