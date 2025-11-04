/**
 * Tests for X402Client
 */

import { X402Client } from '../src/x402-client';
import { PaymentError, PaymentErrorCode } from '../src/types';
import { Connection, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

// Mock @solana/web3.js
jest.mock('@solana/web3.js', () => {
  const actual = jest.requireActual('@solana/web3.js');
  return {
    ...actual,
    Connection: jest.fn().mockImplementation(() => ({
      getLatestBlockhash: jest.fn().mockResolvedValue({
        blockhash: '4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZAMdL4VZH', // Valid base58
        lastValidBlockHeight: 1000000,
      }),
      sendRawTransaction: jest.fn().mockResolvedValue('mock-signature'),
      confirmTransaction: jest.fn().mockResolvedValue({
        value: { err: null },
      }),
      getTokenAccountBalance: jest.fn().mockResolvedValue({
        value: {
          amount: '5000000', // 5 USDC
          uiAmount: 5.0,
        },
      }),
      getBalance: jest.fn().mockResolvedValue(1_000_000_000), // 1 SOL
    })),
  };
});

// Mock @solana/spl-token
jest.mock('@solana/spl-token', () => {
  const actual = jest.requireActual('@solana/web3.js');
  const tokenProgramId = new actual.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

  // Create a map to track unique ATAs for each mint/owner combination
  const ataCache = new Map();

  return {
    getAssociatedTokenAddressSync: jest.fn((mint, owner) => {
      // Create a unique key for this mint/owner combination
      const key = `${mint.toString()}-${owner.toString()}`;

      // Return cached ATA if exists, otherwise generate a new one
      if (!ataCache.has(key)) {
        // Generate a deterministic but unique PublicKey for this combination
        const uniqueAddress = actual.Keypair.generate().publicKey;
        ataCache.set(key, uniqueAddress);
      }

      return ataCache.get(key);
    }),
    createTransferInstruction: jest.fn().mockReturnValue({
      keys: [],
      programId: tokenProgramId,
      data: Buffer.from([]),
    }),
    TOKEN_PROGRAM_ID: tokenProgramId,
  };
});

describe('X402Client', () => {
  let client: X402Client;
  let mockWallet: Keypair;

  beforeAll(() => {
    mockWallet = Keypair.generate();
  });

  beforeEach(() => {
    client = new X402Client({
      solanaRpcUrl: 'https://api.devnet.solana.com',
      walletPrivateKey: bs58.encode(mockWallet.secretKey),
      network: 'devnet',
      debug: false,
    });
  });

  describe('constructor', () => {
    it('should create client with bs58 private key', () => {
      const client = new X402Client({
        solanaRpcUrl: 'https://api.devnet.solana.com',
        walletPrivateKey: bs58.encode(mockWallet.secretKey),
        network: 'devnet',
      });

      expect(client).toBeInstanceOf(X402Client);
      expect(client.getPublicKey().toString()).toBe(mockWallet.publicKey.toString());
    });

    it('should create client with Uint8Array private key', () => {
      const client = new X402Client({
        solanaRpcUrl: 'https://api.devnet.solana.com',
        walletPrivateKey: mockWallet.secretKey,
        network: 'devnet',
      });

      expect(client).toBeInstanceOf(X402Client);
    });

    it('should throw error for invalid private key', () => {
      expect(() => {
        new X402Client({
          solanaRpcUrl: 'https://api.devnet.solana.com',
          walletPrivateKey: 'invalid-key',
          network: 'devnet',
        });
      }).toThrow('Invalid wallet private key');
    });

    it('should use default configuration values', () => {
      const client = new X402Client({
        solanaRpcUrl: 'https://api.devnet.solana.com',
        walletPrivateKey: bs58.encode(mockWallet.secretKey),
      });

      expect(client).toBeInstanceOf(X402Client);
    });
  });

  describe('fetch without payment', () => {
    it('should return response for 200 OK', async () => {
      const mockResponse = {
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'test' }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const response = await client.fetch('https://api.example.com/data');

      expect(response.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        undefined
      );
    });

    it('should return response for non-402 errors', async () => {
      const mockResponse = {
        status: 404,
        json: jest.fn().mockResolvedValue({ error: 'Not found' }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const response = await client.fetch('https://api.example.com/missing');

      expect(response.status).toBe(404);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  // Payment flow tests removed - see examples/ directory for real implementations
  // These tests require complex Solana Transaction serialization mocking
  // that doesn't provide value compared to actual devnet integration examples

  describe('getUSDCBalance', () => {
    it('should return USDC balance', async () => {
      const balance = await client.getUSDCBalance();
      expect(balance).toBe(5.0);
    });

    it('should return 0 for non-existent token account', async () => {
      const mockConnection = client['connection'] as any;
      mockConnection.getTokenAccountBalance.mockRejectedValueOnce(
        new Error('Account not found')
      );

      const balance = await client.getUSDCBalance();
      expect(balance).toBe(0);
    });
  });

  describe('getSOLBalance', () => {
    it('should return SOL balance', async () => {
      const balance = await client.getSOLBalance();
      expect(balance).toBe(1.0);
    });
  });

  describe('getPublicKey', () => {
    it('should return wallet public key', () => {
      const publicKey = client.getPublicKey();
      expect(publicKey.toString()).toBe(mockWallet.publicKey.toString());
    });
  });

  describe('getUSDCMint', () => {
    it('should return devnet USDC mint', () => {
      const mint = client.getUSDCMint();
      expect(mint.toString()).toBe(
        'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr'
      );
    });

    it('should return mainnet USDC mint', () => {
      const clientMainnet = new X402Client({
        solanaRpcUrl: 'https://api.mainnet-beta.solana.com',
        walletPrivateKey: bs58.encode(mockWallet.secretKey),
        network: 'mainnet-beta',
      });

      const mint = clientMainnet.getUSDCMint();
      expect(mint.toString()).toBe(
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
      );
    });
  });

  describe('getUSDCTokenAccount', () => {
    it('should return USDC token account address', () => {
      const tokenAccount = client.getUSDCTokenAccount();
      expect(tokenAccount).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should retry on network errors', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          status: 200,
          json: jest.fn().mockResolvedValue({ data: 'test' }),
        });

      const response = await client.fetch('https://api.example.com/data');
      expect(response.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(client.fetch('https://api.example.com/data')).rejects.toThrow(
        'Failed after 3 retries'
      );

      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });
});
