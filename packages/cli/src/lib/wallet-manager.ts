import * as fs from 'fs';
import * as path from 'path';
import { Keypair, Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import bs58 from 'bs58';

/**
 * Wallet information
 */
export interface WalletInfo {
  publicKey: string;
  solBalance: number;
  usdcBalance: number;
  usdcTokenAccount: string;
}

/**
 * USDC mint addresses
 */
const USDC_MINTS = {
  devnet: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
  'mainnet-beta': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
};

/**
 * Wallet manager for creating, importing, and managing Solana wallets
 */
export class WalletManager {
  private connection: Connection;
  private network: 'devnet' | 'mainnet-beta';

  constructor(rpcUrl: string, network: 'devnet' | 'mainnet-beta' = 'devnet') {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.network = network;
  }

  /**
   * Create a new wallet
   */
  createWallet(): Keypair {
    return Keypair.generate();
  }

  /**
   * Import wallet from private key
   */
  importWallet(privateKey: string): Keypair {
    try {
      // Try to decode as base58
      const secretKey = bs58.decode(privateKey);
      return Keypair.fromSecretKey(secretKey);
    } catch (error) {
      // Try to parse as JSON array
      try {
        const secretKey = new Uint8Array(JSON.parse(privateKey));
        return Keypair.fromSecretKey(secretKey);
      } catch {
        throw new Error(
          'Invalid private key format. Expected base58 string or JSON array.'
        );
      }
    }
  }

  /**
   * Save wallet to file
   */
  saveWallet(wallet: Keypair, filePath: string): void {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Save as JSON array (standard Solana wallet format)
      const secretKey = Array.from(wallet.secretKey);
      fs.writeFileSync(filePath, JSON.stringify(secretKey), {
        mode: 0o600, // Read/write for owner only
      });
    } catch (error) {
      throw new Error(`Failed to save wallet: ${error}`);
    }
  }

  /**
   * Load wallet from file
   */
  loadWallet(filePath: string): Keypair {
    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      const secretKey = new Uint8Array(JSON.parse(data));
      return Keypair.fromSecretKey(secretKey);
    } catch (error) {
      throw new Error(`Failed to load wallet from ${filePath}: ${error}`);
    }
  }

  /**
   * Get wallet information including balances
   */
  async getWalletInfo(wallet: Keypair): Promise<WalletInfo> {
    const publicKey = wallet.publicKey;

    // Get SOL balance
    const solBalanceLamports = await this.connection.getBalance(publicKey);
    const solBalance = solBalanceLamports / 1e9;

    // Get USDC balance
    const usdcMint = new PublicKey(USDC_MINTS[this.network]);
    const usdcTokenAccount = getAssociatedTokenAddressSync(usdcMint, publicKey);

    let usdcBalance = 0;
    try {
      const tokenBalance =
        await this.connection.getTokenAccountBalance(usdcTokenAccount);
      usdcBalance = parseFloat(tokenBalance.value.uiAmount?.toString() || '0');
    } catch (error) {
      // Token account doesn't exist, balance is 0
    }

    return {
      publicKey: publicKey.toString(),
      solBalance,
      usdcBalance,
      usdcTokenAccount: usdcTokenAccount.toString(),
    };
  }

  /**
   * Export wallet private key as base58
   */
  exportPrivateKey(wallet: Keypair): string {
    return bs58.encode(wallet.secretKey);
  }

  /**
   * Check if wallet file exists
   */
  walletExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  /**
   * Get USDC mint address for current network
   */
  getUSDCMint(): PublicKey {
    return new PublicKey(USDC_MINTS[this.network]);
  }

  /**
   * Get USDC token account for a wallet
   */
  getUSDCTokenAccount(wallet: Keypair): PublicKey {
    return getAssociatedTokenAddressSync(this.getUSDCMint(), wallet.publicKey);
  }

  /**
   * Airdrop SOL to wallet (devnet only)
   */
  async requestAirdrop(wallet: Keypair, amount: number = 1): Promise<string> {
    if (this.network !== 'devnet') {
      throw new Error('Airdrop only available on devnet');
    }

    const signature = await this.connection.requestAirdrop(
      wallet.publicKey,
      amount * 1e9
    );

    // Wait for confirmation
    await this.connection.confirmTransaction(signature, 'confirmed');

    return signature;
  }
}
