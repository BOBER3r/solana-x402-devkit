/**
 * Tests for Server Actions wrapper
 */

import { requirePayment, configureX402ServerActions } from '../src/actions/require-payment';

// Mock next/headers
jest.mock('next/headers', () => ({
  headers: jest.fn(() => ({
    get: jest.fn((name: string) => {
      if (name === 'x-payment') {
        return 'test-payment-header';
      }
      return null;
    }),
  })),
}));

// Mock @x402-solana/core
jest.mock('@x402-solana/core', () => ({
  TransactionVerifier: jest.fn().mockImplementation(() => ({
    verifyX402Payment: jest.fn().mockResolvedValue({
      valid: true,
      signature: 'test-signature',
      transfer: {
        amount: 10000,
        authority: 'test-payer',
      },
      blockTime: 1234567890,
      slot: 12345,
    }),
    close: jest.fn(),
  })),
  PaymentRequirementsGenerator: jest.fn().mockImplementation(() => ({
    generate: jest.fn().mockReturnValue({
      accepts: [
        {
          scheme: 'solana',
          network: 'devnet',
          payTo: { address: 'test-recipient' },
          amount: 10000,
        },
      ],
    }),
  })),
  parseX402Payment: jest.fn().mockReturnValue({
    success: true,
    payment: {
      scheme: 'solana',
      network: 'devnet',
      payload: { signature: 'test-sig' },
    },
  }),
}));

describe('requirePayment', () => {
  beforeAll(() => {
    configureX402ServerActions({
      solanaRpcUrl: 'https://api.devnet.solana.com',
      recipientWallet: 'test-wallet',
      network: 'devnet',
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should execute action when payment is valid', async () => {
    const action = jest.fn().mockResolvedValue({ message: 'Success!' });

    const wrappedAction = requirePayment(action, {
      priceUSD: 0.01,
      description: 'Test action',
      resource: '/actions/test',
    });

    const result = await wrappedAction();

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ message: 'Success!' });
    expect(action).toHaveBeenCalled();
  });

  it('should return payment requirements without payment header', async () => {
    const { headers } = require('next/headers');
    headers.mockReturnValue({
      get: jest.fn(() => null),
    });

    const action = jest.fn().mockResolvedValue({ message: 'Success!' });

    const wrappedAction = requirePayment(action, {
      priceUSD: 0.01,
      description: 'Test action',
      resource: '/actions/test',
    });

    const result = await wrappedAction();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Payment required');
    expect(result.paymentRequired).toBeDefined();
    expect(action).not.toHaveBeenCalled();
  });

  it('should return error for invalid payment', async () => {
    const { parseX402Payment } = require('@x402-solana/core');
    parseX402Payment.mockReturnValue({
      success: false,
      error: 'Invalid payment header',
    });

    const action = jest.fn().mockResolvedValue({ message: 'Success!' });

    const wrappedAction = requirePayment(action, {
      priceUSD: 0.01,
      description: 'Test action',
      resource: '/actions/test',
    });

    const result = await wrappedAction();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid payment header');
    expect(action).not.toHaveBeenCalled();
  });

  it('should handle action errors gracefully', async () => {
    const { parseX402Payment } = require('@x402-solana/core');
    parseX402Payment.mockReturnValue({
      success: true,
      payment: {
        scheme: 'solana',
        network: 'devnet',
        payload: { signature: 'test-sig' },
      },
    });

    const action = jest.fn().mockRejectedValue(new Error('Action failed'));

    const wrappedAction = requirePayment(action, {
      priceUSD: 0.01,
      description: 'Test action',
      resource: '/actions/test',
    });

    const result = await wrappedAction();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Action failed');
  });
});
