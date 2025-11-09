/**
 * Tests for mock utilities
 */

import {
  mockX402Response,
  mockX402PaymentHeader,
  mockX402PaymentFlow,
  mockPaymentVerifier,
  generateMockSignature,
  generateMockTransaction,
  mockSolanaRPC,
  createTestWallet,
  getTransactionSignature,
} from '../src';

describe('Mock x402 Response', () => {
  it('should generate valid payment requirements', () => {
    const wallet = createTestWallet('test');
    const requirements = mockX402Response({
      priceUSD: 0.001,
      recipientWallet: wallet.address,
    });

    expect(requirements.x402Version).toBe(1);
    expect(requirements.accepts).toHaveLength(1);
    expect(requirements.error).toBe('Payment Required');

    const accept = requirements.accepts[0];
    expect(accept.scheme).toBe('exact');
    expect(accept.network).toBe('solana-devnet');
    expect(accept.maxAmountRequired).toBe('1000');
    expect(accept.payTo).toBe(wallet.usdcAccount);
  });

  it('should handle mainnet network', () => {
    const wallet = createTestWallet('test', 'mainnet-beta');
    const requirements = mockX402Response({
      priceUSD: 0.001,
      recipientWallet: wallet.address,
      network: 'mainnet-beta',
    });

    const accept = requirements.accepts[0];
    expect(accept.network).toBe('solana-mainnet');
    expect(accept.asset).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  });

  it('should include custom options', () => {
    const wallet = createTestWallet('test');
    const requirements = mockX402Response({
      priceUSD: 0.005,
      recipientWallet: wallet.address,
      description: 'Premium access',
      resource: '/api/premium',
      timeoutSeconds: 600,
    });

    const accept = requirements.accepts[0];
    expect(accept.description).toBe('Premium access');
    expect(accept.resource).toBe('/api/premium');
    expect(accept.maxTimeoutSeconds).toBe(600);
    expect(accept.maxAmountRequired).toBe('5000');
  });
});

describe('Mock Payment Header', () => {
  it('should generate valid X-PAYMENT header with signature', () => {
    const signature = generateMockSignature();
    const header = mockX402PaymentHeader({ signature });

    expect(header).toBeTruthy();

    // Decode and verify
    const decoded = JSON.parse(Buffer.from(header, 'base64').toString());
    expect(decoded.x402Version).toBe(1);
    expect(decoded.scheme).toBe('exact');
    expect(decoded.network).toBe('solana-devnet');
    expect(decoded.payload.signature).toBe(signature);
  });

  it('should throw without signature or transaction', () => {
    expect(() => mockX402PaymentHeader({})).toThrow();
  });
});

describe('Mock Payment Flow', () => {
  it('should generate complete payment flow', () => {
    const wallet = createTestWallet('test');
    const flow = mockX402PaymentFlow({
      priceUSD: 0.001,
      recipientWallet: wallet.address,
    });

    expect(flow.requirements).toBeDefined();
    expect(flow.paymentHeader).toBeDefined();
    expect(flow.signature).toBeDefined();

    expect(flow.requirements.accepts[0].payTo).toBe(wallet.usdcAccount);
  });
});

describe('Mock Payment Verifier', () => {
  it('should auto-approve payments', async () => {
    const verifier = mockPaymentVerifier({ autoApprove: true });
    const signature = generateMockSignature();
    const wallet = createTestWallet('test');

    const result = await verifier.verifyPayment(
      signature,
      wallet.usdcAccount,
      0.001
    );

    expect(result.valid).toBe(true);
    expect(result.transfer).toBeDefined();
    expect(result.transfer?.amount).toBe(1000);
    expect(result.transfer?.destination).toBe(wallet.usdcAccount);
  });

  it('should detect replay attacks', async () => {
    const verifier = mockPaymentVerifier({
      autoApprove: true,
      trackReplays: true,
    });
    const signature = generateMockSignature();
    const wallet = createTestWallet('test');

    // First payment succeeds
    const result1 = await verifier.verifyPayment(
      signature,
      wallet.usdcAccount,
      0.001
    );
    expect(result1.valid).toBe(true);

    // Second payment with same signature fails
    const result2 = await verifier.verifyPayment(
      signature,
      wallet.usdcAccount,
      0.001
    );
    expect(result2.valid).toBe(false);
    expect(result2.code).toBe('REPLAY_ATTACK');
  });

  it('should simulate amount mismatch', async () => {
    const verifier = mockPaymentVerifier({
      autoApprove: false,
      failureMode: 'amount_mismatch',
    });
    const signature = generateMockSignature();
    const wallet = createTestWallet('test');

    const result = await verifier.verifyPayment(
      signature,
      wallet.usdcAccount,
      0.001
    );

    expect(result.valid).toBe(false);
    expect(result.code).toBe('TRANSFER_MISMATCH');
    expect(result.debug?.expectedAmount).toBe(1000);
  });

  it('should simulate wrong recipient', async () => {
    const verifier = mockPaymentVerifier({
      failureMode: 'wrong_recipient',
    });
    const signature = generateMockSignature();
    const wallet = createTestWallet('test');

    const result = await verifier.verifyPayment(
      signature,
      wallet.usdcAccount,
      0.001
    );

    expect(result.valid).toBe(false);
    expect(result.code).toBe('TRANSFER_MISMATCH');
  });

  it('should simulate expired payment', async () => {
    const verifier = mockPaymentVerifier({
      failureMode: 'expired_payment',
    });
    const signature = generateMockSignature();
    const wallet = createTestWallet('test');

    const result = await verifier.verifyPayment(
      signature,
      wallet.usdcAccount,
      0.001
    );

    expect(result.valid).toBe(false);
    expect(result.code).toBe('TX_EXPIRED');
  });

  it('should validate signature format', async () => {
    const verifier = mockPaymentVerifier({ autoApprove: true });
    const wallet = createTestWallet('test');

    const result = await verifier.verifyPayment(
      'invalid-signature',
      wallet.usdcAccount,
      0.001
    );

    expect(result.valid).toBe(false);
    expect(result.code).toBe('INVALID_HEADER');
  });
});

describe('Mock Solana RPC', () => {
  it('should return pre-configured transactions', async () => {
    const tx = generateMockTransaction({ amount: 1000 });
    const signature = getTransactionSignature(tx);
    const txMap = new Map([[signature, tx]]);

    const rpc = mockSolanaRPC({ transactions: txMap });

    const fetchedTx = await rpc.getTransaction(signature);
    expect(fetchedTx).toBeDefined();
    expect(fetchedTx?.slot).toBe(tx.slot);
  });

  it('should return null for unknown transactions', async () => {
    const rpc = mockSolanaRPC();
    const tx = await rpc.getTransaction('unknown-signature');
    expect(tx).toBeNull();
  });

  it('should simulate timeout failures', async () => {
    const rpc = mockSolanaRPC({ failureMode: 'timeout' });

    await expect(rpc.getTransaction('sig')).rejects.toThrow('timeout');
  });

  it('should simulate latency', async () => {
    const rpc = mockSolanaRPC({ latencyMs: 100 });

    const start = Date.now();
    await rpc.getTransaction('sig');
    const duration = Date.now() - start;

    expect(duration).toBeGreaterThanOrEqual(100);
  });

  it('should confirm transactions', async () => {
    const tx = generateMockTransaction({ amount: 1000 });
    const signature = getTransactionSignature(tx);
    const txMap = new Map([[signature, tx]]);

    const rpc = mockSolanaRPC({ transactions: txMap });

    const confirmation = await rpc.confirmTransaction({ signature });
    expect(confirmation.value.err).toBeNull();
  });

  it('should return balance', async () => {
    const rpc = mockSolanaRPC();
    const wallet = createTestWallet('test');

    const balance = await rpc.getBalance(wallet.publicKey);
    expect(balance).toBeGreaterThan(0);
  });
});

describe('Mock Transaction', () => {
  it('should generate valid transaction', () => {
    const tx = generateMockTransaction({ amount: 1000 });

    expect(tx).toBeDefined();
    expect(tx.slot).toBeGreaterThan(0);
    expect(tx.blockTime).toBeGreaterThan(0);
    expect(tx.meta).toBeDefined();
    expect(tx.meta?.err).toBeNull();
  });

  it('should generate failed transaction', () => {
    const tx = generateMockTransaction({ amount: 1000, success: false });

    expect(tx.meta?.err).not.toBeNull();
  });

  it('should include inner instructions', () => {
    const tx = generateMockTransaction({
      amount: 1000,
      includeInnerInstructions: true,
    });

    expect(tx.meta?.innerInstructions).toBeDefined();
    expect(tx.meta?.innerInstructions?.length).toBeGreaterThan(0);
  });

  it('should extract signature from transaction', () => {
    const tx = generateMockTransaction();
    const signature = getTransactionSignature(tx);

    expect(signature).toBeTruthy();
    expect(signature.length).toBeGreaterThan(50);
  });
});