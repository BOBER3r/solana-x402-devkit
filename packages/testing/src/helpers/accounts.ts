/**
 * Helper functions for generating mock Solana accounts and addresses
 */

import { Keypair, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { MockAccountOptions } from '../types';

/**
 * USDC mint addresses by network
 */
const USDC_MINTS = {
  devnet: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
  'mainnet-beta': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
};

/**
 * Generate a mock wallet keypair
 *
 * @param seed - Optional seed for deterministic generation
 * @returns Keypair
 *
 * @example
 * ```typescript
 * const wallet = generateMockKeypair();
 * console.log(wallet.publicKey.toString());
 * ```
 */
export function generateMockKeypair(seed?: string): Keypair {
  if (seed) {
    // Generate deterministic keypair from seed
    const seedBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      const charCode = seed.charCodeAt(i % seed.length);
      const mixed = (charCode * (i + 1) * 2654435761) >>> 0;
      seedBytes[i] = mixed & 0xff;
    }
    return Keypair.fromSeed(seedBytes);
  }

  // Generate random keypair
  return Keypair.generate();
}

/**
 * Generate a mock public key
 *
 * @param seed - Optional seed for deterministic generation
 * @returns PublicKey
 *
 * @example
 * ```typescript
 * const pubkey = generateMockPublicKey('test-wallet');
 * ```
 */
export function generateMockPublicKey(seed?: string): PublicKey {
  return generateMockKeypair(seed).publicKey;
}

/**
 * Generate a mock wallet address as string
 *
 * @param seed - Optional seed for deterministic generation
 * @returns Base58-encoded public key string
 *
 * @example
 * ```typescript
 * const address = generateMockAddress();
 * // 'Abc123...'
 *
 * const deterministicAddress = generateMockAddress('test');
 * // Always same address for same seed
 * ```
 */
export function generateMockAddress(seed?: string): string {
  return generateMockKeypair(seed).publicKey.toString();
}

/**
 * Generate a mock USDC token account address
 *
 * Uses actual Solana Associated Token Account (ATA) derivation by default,
 * ensuring addresses are correctly formatted and associated with owner wallets.
 *
 * @param options - Account generation options
 * @returns Token account address
 *
 * @example
 * ```typescript
 * // Random USDC account
 * const account = generateMockTokenAccount();
 *
 * // USDC account for specific wallet
 * const account = generateMockTokenAccount({
 *   owner: 'WalletAddress...',
 *   network: 'devnet'
 * });
 *
 * // Custom token account (not USDC)
 * const account = generateMockTokenAccount({
 *   owner: 'WalletAddress...',
 *   mint: 'CustomMint...',
 *   deriveATA: true
 * });
 * ```
 */
export function generateMockTokenAccount(options: MockAccountOptions = {}): string {
  const {
    owner,
    mint,
    network = 'devnet',
    deriveATA = true,
  } = options;

  // Get mint address (use USDC if not specified)
  const mintAddress = mint || USDC_MINTS[network];
  const mintPubkey = new PublicKey(mintAddress);

  // Get owner address
  let ownerPubkey: PublicKey;
  if (owner) {
    ownerPubkey = new PublicKey(owner);
  } else {
    // Generate random owner if not specified
    ownerPubkey = generateMockPublicKey();
  }

  if (deriveATA) {
    // Derive actual Associated Token Account address
    const ata = getAssociatedTokenAddressSync(mintPubkey, ownerPubkey);
    return ata.toString();
  }

  // Generate random token account (not a real ATA)
  return generateMockPublicKey(`token-${ownerPubkey.toString()}`).toString();
}

/**
 * Generate multiple mock addresses at once
 *
 * @param count - Number of addresses to generate
 * @param seedPrefix - Optional seed prefix for deterministic generation
 * @returns Array of unique addresses
 *
 * @example
 * ```typescript
 * const addresses = generateMockAddresses(5);
 * // ['addr1...', 'addr2...', 'addr3...', 'addr4...', 'addr5...']
 *
 * const deterministicAddrs = generateMockAddresses(3, 'wallet');
 * // Generates 'wallet-0', 'wallet-1', 'wallet-2'
 * ```
 */
export function generateMockAddresses(count: number, seedPrefix?: string): string[] {
  const addresses: string[] = [];

  for (let i = 0; i < count; i++) {
    const seed = seedPrefix ? `${seedPrefix}-${i}` : undefined;
    addresses.push(generateMockAddress(seed));
  }

  return addresses;
}

/**
 * Get USDC mint address for network
 *
 * @param network - Solana network
 * @returns USDC mint address
 *
 * @example
 * ```typescript
 * const devnetUSDC = getUSDCMint('devnet');
 * // 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr'
 * ```
 */
export function getUSDCMint(network: 'devnet' | 'mainnet-beta' = 'devnet'): string {
  return USDC_MINTS[network];
}

/**
 * Create a test wallet setup with wallet, USDC account, and keypair
 *
 * @param seed - Optional seed for deterministic generation
 * @param network - Network to use for USDC mint
 * @returns Wallet setup object
 *
 * @example
 * ```typescript
 * const wallet = createTestWallet('test-user');
 * console.log({
 *   address: wallet.address,
 *   usdcAccount: wallet.usdcAccount,
 *   keypair: wallet.keypair
 * });
 * ```
 */
export function createTestWallet(
  seed?: string,
  network: 'devnet' | 'mainnet-beta' = 'devnet'
): {
  keypair: Keypair;
  address: string;
  publicKey: PublicKey;
  usdcAccount: string;
  usdcMint: string;
} {
  const keypair = generateMockKeypair(seed);
  const address = keypair.publicKey.toString();
  const usdcMint = USDC_MINTS[network];

  const usdcAccount = generateMockTokenAccount({
    owner: address,
    mint: usdcMint,
    network,
    deriveATA: true,
  });

  return {
    keypair,
    address,
    publicKey: keypair.publicKey,
    usdcAccount,
    usdcMint,
  };
}

/**
 * Create multiple test wallets at once
 *
 * @param count - Number of wallets to create
 * @param seedPrefix - Optional seed prefix for deterministic generation
 * @param network - Network to use
 * @returns Array of wallet setups
 *
 * @example
 * ```typescript
 * const [sender, recipient, facilitator] = createTestWallets(3, 'user');
 * ```
 */
export function createTestWallets(
  count: number,
  seedPrefix?: string,
  network: 'devnet' | 'mainnet-beta' = 'devnet'
): Array<ReturnType<typeof createTestWallet>> {
  const wallets = [];

  for (let i = 0; i < count; i++) {
    const seed = seedPrefix ? `${seedPrefix}-${i}` : undefined;
    wallets.push(createTestWallet(seed, network));
  }

  return wallets;
}

/**
 * Validate if a string is a valid Solana address
 *
 * @param address - String to validate
 * @returns True if valid Solana address
 *
 * @example
 * ```typescript
 * const valid = isValidAddress(generateMockAddress());
 * // true
 *
 * const invalid = isValidAddress('not-an-address');
 * // false
 * ```
 */
export function isValidAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get a set of pre-defined test addresses for common scenarios
 *
 * @param network - Network to use
 * @returns Object with common test addresses
 *
 * @example
 * ```typescript
 * const addresses = getCommonTestAddresses();
 * const { recipient, sender, usdcMint } = addresses;
 * ```
 */
export function getCommonTestAddresses(network: 'devnet' | 'mainnet-beta' = 'devnet') {
  const sender = createTestWallet('test-sender', network);
  const recipient = createTestWallet('test-recipient', network);
  const facilitator = createTestWallet('test-facilitator', network);

  return {
    sender: sender.address,
    senderUSDC: sender.usdcAccount,
    senderKeypair: sender.keypair,
    recipient: recipient.address,
    recipientUSDC: recipient.usdcAccount,
    recipientKeypair: recipient.keypair,
    facilitator: facilitator.address,
    facilitatorUSDC: facilitator.usdcAccount,
    facilitatorKeypair: facilitator.keypair,
    usdcMint: sender.usdcMint,
  };
}
