import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Keypair } from '@solana/web3.js';
import { WalletManager } from '../src/lib/wallet-manager';
import bs58 from 'bs58';

describe('WalletManager', () => {
  let walletManager: WalletManager;
  let testWalletPath: string;

  beforeEach(() => {
    walletManager = new WalletManager(
      'https://api.devnet.solana.com',
      'devnet'
    );
    testWalletPath = path.join(os.tmpdir(), `test-wallet-${Date.now()}.json`);
  });

  afterEach(() => {
    // Clean up test wallet file
    if (fs.existsSync(testWalletPath)) {
      fs.unlinkSync(testWalletPath);
    }
  });

  describe('createWallet', () => {
    it('should create a new wallet', () => {
      const wallet = walletManager.createWallet();

      expect(wallet).toBeInstanceOf(Keypair);
      expect(wallet.publicKey).toBeDefined();
      expect(wallet.secretKey).toBeDefined();
    });

    it('should create unique wallets', () => {
      const wallet1 = walletManager.createWallet();
      const wallet2 = walletManager.createWallet();

      expect(wallet1.publicKey.toString()).not.toBe(
        wallet2.publicKey.toString()
      );
    });
  });

  describe('importWallet', () => {
    it('should import wallet from base58 private key', () => {
      const originalWallet = Keypair.generate();
      const privateKey = bs58.encode(originalWallet.secretKey);

      const importedWallet = walletManager.importWallet(privateKey);

      expect(importedWallet.publicKey.toString()).toBe(
        originalWallet.publicKey.toString()
      );
    });

    it('should import wallet from JSON array', () => {
      const originalWallet = Keypair.generate();
      const privateKey = JSON.stringify(Array.from(originalWallet.secretKey));

      const importedWallet = walletManager.importWallet(privateKey);

      expect(importedWallet.publicKey.toString()).toBe(
        originalWallet.publicKey.toString()
      );
    });

    it('should throw error for invalid private key', () => {
      expect(() => {
        walletManager.importWallet('invalid-key');
      }).toThrow();
    });
  });

  describe('saveWallet and loadWallet', () => {
    it('should save and load wallet correctly', () => {
      const wallet = walletManager.createWallet();

      walletManager.saveWallet(wallet, testWalletPath);
      expect(fs.existsSync(testWalletPath)).toBe(true);

      const loadedWallet = walletManager.loadWallet(testWalletPath);
      expect(loadedWallet.publicKey.toString()).toBe(
        wallet.publicKey.toString()
      );
    });

    it('should create directory if it does not exist', () => {
      const wallet = walletManager.createWallet();
      const nestedPath = path.join(
        os.tmpdir(),
        `test-dir-${Date.now()}`,
        'wallet.json'
      );

      walletManager.saveWallet(wallet, nestedPath);
      expect(fs.existsSync(nestedPath)).toBe(true);

      // Cleanup
      fs.unlinkSync(nestedPath);
      fs.rmdirSync(path.dirname(nestedPath));
    });

    it('should throw error when loading non-existent wallet', () => {
      expect(() => {
        walletManager.loadWallet('/non/existent/wallet.json');
      }).toThrow();
    });
  });

  describe('exportPrivateKey', () => {
    it('should export private key as base58', () => {
      const wallet = walletManager.createWallet();
      const privateKey = walletManager.exportPrivateKey(wallet);

      expect(typeof privateKey).toBe('string');

      // Should be able to re-import
      const importedWallet = walletManager.importWallet(privateKey);
      expect(importedWallet.publicKey.toString()).toBe(
        wallet.publicKey.toString()
      );
    });
  });

  describe('walletExists', () => {
    it('should return true for existing wallet', () => {
      const wallet = walletManager.createWallet();
      walletManager.saveWallet(wallet, testWalletPath);

      expect(walletManager.walletExists(testWalletPath)).toBe(true);
    });

    it('should return false for non-existent wallet', () => {
      expect(walletManager.walletExists('/non/existent/wallet.json')).toBe(
        false
      );
    });
  });

  describe('getUSDCMint', () => {
    it('should return correct USDC mint for devnet', () => {
      const mint = walletManager.getUSDCMint();
      expect(mint.toString()).toBe(
        'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr'
      );
    });

    it('should return correct USDC mint for mainnet', () => {
      const mainnetManager = new WalletManager(
        'https://api.mainnet-beta.solana.com',
        'mainnet-beta'
      );
      const mint = mainnetManager.getUSDCMint();
      expect(mint.toString()).toBe(
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
      );
    });
  });

  describe('getUSDCTokenAccount', () => {
    it('should return USDC token account address', () => {
      const wallet = walletManager.createWallet();
      const tokenAccount = walletManager.getUSDCTokenAccount(wallet);

      expect(tokenAccount).toBeDefined();
      expect(tokenAccount.toString()).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
    });
  });
});
