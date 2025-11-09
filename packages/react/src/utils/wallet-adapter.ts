/**
 * Wallet adapter utilities for integrating with @solana/wallet-adapter-react
 */

import { WalletAdapter, SignerWalletAdapter, WalletAdapterProps } from '@solana/wallet-adapter-base';
import {
  Connection,
  Transaction,
  VersionedTransaction,
  PublicKey,
  TransactionSignature,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  createTransferInstruction,
} from '@solana/spl-token';
import { PaymentRequirements } from '@x402-solana/core';

/**
 * Wallet-like interface that matches both WalletAdapter and WalletContextState
 */
interface WalletLike {
  publicKey: PublicKey | null;
  connected?: boolean;
  signTransaction?: <T extends Transaction | VersionedTransaction>(transaction: T) => Promise<T>;
}

/**
 * Create a USDC payment transaction using wallet adapter
 *
 * This function creates a transaction that transfers USDC from the connected
 * wallet to the recipient specified in payment requirements.
 *
 * @param wallet - Connected wallet (adapter or context state)
 * @param connection - Solana connection
 * @param paymentReq - Payment requirements from 402 response
 * @returns Transaction signature
 * @throws Error if wallet not connected or payment fails
 *
 * @example
 * ```typescript
 * const signature = await createPaymentWithWallet(
 *   wallet,
 *   connection,
 *   paymentRequirements
 * );
 * ```
 */
export async function createPaymentWithWallet(
  wallet: WalletLike,
  connection: Connection,
  paymentReq: PaymentRequirements
): Promise<TransactionSignature> {
  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  // Ensure wallet can sign transactions
  if (!wallet.signTransaction) {
    throw new Error('Wallet does not support signing transactions');
  }

  const requirement = paymentReq.accepts[0];
  const amountMicroUSDC = parseInt(requirement.maxAmountRequired);
  const recipientTokenAccount = new PublicKey(requirement.payTo);
  const usdcMint = new PublicKey(requirement.asset);

  // Get sender's USDC token account
  const senderTokenAccount = getAssociatedTokenAddressSync(
    usdcMint,
    wallet.publicKey
  );

  // Check balance
  const balance = await connection.getTokenAccountBalance(senderTokenAccount);
  const balanceMicroUSDC = parseInt(balance.value.amount);

  if (balanceMicroUSDC < amountMicroUSDC) {
    throw new Error(
      `Insufficient USDC balance: have ${balanceMicroUSDC} micro-USDC, need ${amountMicroUSDC} micro-USDC`
    );
  }

  // Create transfer instruction
  const transferIx = createTransferInstruction(
    senderTokenAccount,
    recipientTokenAccount,
    wallet.publicKey,
    amountMicroUSDC
  );

  // Build transaction
  const transaction = new Transaction().add(transferIx);

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash('confirmed');

  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;

  // Sign transaction with wallet
  const signedTx = await wallet.signTransaction(transaction);

  // Send transaction
  const signature = await connection.sendRawTransaction(signedTx.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });

  // Wait for confirmation
  await connection.confirmTransaction(
    {
      signature,
      blockhash,
      lastValidBlockHeight,
    },
    'confirmed'
  );

  return signature;
}

/**
 * Get USDC token account balance for connected wallet
 *
 * @param wallet - Connected wallet (adapter or context state)
 * @param connection - Solana connection
 * @param usdcMint - USDC mint public key
 * @returns USDC balance in standard units (not micro-USDC)
 *
 * @example
 * ```typescript
 * const balance = await getUSDCBalance(wallet, connection, usdcMint);
 * console.log(`Balance: ${balance} USDC`);
 * ```
 */
export async function getUSDCBalance(
  wallet: WalletLike,
  connection: Connection,
  usdcMint: PublicKey
): Promise<number> {
  if (!wallet.publicKey) {
    return 0;
  }

  try {
    const tokenAccount = getAssociatedTokenAddressSync(
      usdcMint,
      wallet.publicKey
    );

    const balance = await connection.getTokenAccountBalance(tokenAccount);
    return parseFloat(balance.value.uiAmount?.toString() || '0');
  } catch (error) {
    // Token account doesn't exist or other error
    console.error('Error fetching USDC balance:', error);
    return 0;
  }
}

/**
 * Get SOL balance for connected wallet
 *
 * @param wallet - Connected wallet (adapter or context state)
 * @param connection - Solana connection
 * @returns SOL balance in standard units
 *
 * @example
 * ```typescript
 * const balance = await getSOLBalance(wallet, connection);
 * console.log(`Balance: ${balance} SOL`);
 * ```
 */
export async function getSOLBalance(
  wallet: WalletLike,
  connection: Connection
): Promise<number> {
  if (!wallet.publicKey) {
    return 0;
  }

  try {
    const balance = await connection.getBalance(wallet.publicKey);
    return balance / 1e9;
  } catch (error) {
    console.error('Error fetching SOL balance:', error);
    return 0;
  }
}

/**
 * Encode payment proof for X-PAYMENT header
 *
 * @param signature - Transaction signature
 * @param paymentReq - Original payment requirements
 * @returns Base64-encoded payment proof
 *
 * @example
 * ```typescript
 * const header = encodePaymentProof(signature, requirements);
 * fetch(url, {
 *   headers: { 'X-PAYMENT': header }
 * });
 * ```
 */
export function encodePaymentProof(
  signature: string,
  paymentReq: PaymentRequirements
): string {
  const requirement = paymentReq.accepts[0];

  const payment = {
    x402Version: paymentReq.x402Version,
    scheme: requirement.scheme,
    network: requirement.network,
    payload: { signature },
  };

  return Buffer.from(JSON.stringify(payment)).toString('base64');
}

/**
 * Check if wallet adapter supports required features
 *
 * @param wallet - Wallet to check
 * @returns True if wallet supports transaction signing
 */
export function isWalletSupported(wallet: WalletLike): boolean {
  const connected = 'connected' in wallet ? wallet.connected : true;
  return (
    !!connected &&
    !!wallet.signTransaction &&
    typeof wallet.signTransaction === 'function'
  );
}

/**
 * Get USDC mint address for network
 *
 * @param network - Network identifier
 * @returns USDC mint public key
 */
export function getUSDCMint(network: 'devnet' | 'mainnet-beta'): PublicKey {
  const mints = {
    devnet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    'mainnet-beta': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  };

  return new PublicKey(mints[network]);
}

/**
 * Validate payment requirements
 *
 * @param paymentReq - Payment requirements to validate
 * @param network - Expected network
 * @throws Error if requirements are invalid
 */
export function validatePaymentRequirements(
  paymentReq: PaymentRequirements,
  network: 'devnet' | 'mainnet-beta'
): void {
  if (!paymentReq.accepts || paymentReq.accepts.length === 0) {
    throw new Error('No payment methods accepted');
  }

  const requirement = paymentReq.accepts[0];

  if (requirement.scheme !== 'exact') {
    throw new Error(`Unsupported payment scheme: ${requirement.scheme}`);
  }

  const expectedNetwork = `solana-${network}`;
  if (requirement.network !== expectedNetwork) {
    throw new Error(
      `Network mismatch: expected ${expectedNetwork}, got ${requirement.network}`
    );
  }

  const expectedMint = getUSDCMint(network);
  if (requirement.asset !== expectedMint.toString()) {
    throw new Error(
      `Invalid USDC mint: expected ${expectedMint.toString()}, got ${requirement.asset}`
    );
  }
}