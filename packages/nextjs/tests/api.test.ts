/**
 * Tests for API route helpers
 */

import { NextRequest, NextResponse } from 'next/server';
import { withX402, configureX402ApiRoutes, getPaymentInfo } from '../src/api/with-x402';

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
    getRecipientUSDCAccount: jest.fn().mockReturnValue('test-recipient'),
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

describe('withX402', () => {
  beforeAll(() => {
    configureX402ApiRoutes({
      solanaRpcUrl: 'https://api.devnet.solana.com',
      recipientWallet: 'test-wallet',
      network: 'devnet',
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 402 without payment header', async () => {
    const handler = jest.fn().mockResolvedValue(
      Response.json({ data: 'premium' })
    );

    const wrappedHandler = withX402(handler, {
      priceUSD: 0.01,
      description: 'Test API',
    });

    const req = new NextRequest(new URL('http://localhost/api/test'));
    const response = await wrappedHandler(req);

    expect(response.status).toBe(402);
    expect(handler).not.toHaveBeenCalled();
  });

  it('should verify payment and call handler', async () => {
    const handler = jest.fn().mockResolvedValue(
      Response.json({ data: 'premium' })
    );

    const wrappedHandler = withX402(handler, {
      priceUSD: 0.01,
      description: 'Test API',
    });

    const req = new NextRequest(new URL('http://localhost/api/test'), {
      headers: {
        'x-payment': 'test-payment-header',
      },
    });

    const response = await wrappedHandler(req);

    expect(handler).toHaveBeenCalled();
    expect(response.headers.get('x-payment-response')).toBeTruthy();
  });

  it('should return 402 for invalid payment', async () => {
    const { parseX402Payment } = require('@x402-solana/core');
    parseX402Payment.mockReturnValue({
      success: false,
      error: 'Invalid payment',
    });

    const handler = jest.fn().mockResolvedValue(
      Response.json({ data: 'premium' })
    );

    const wrappedHandler = withX402(handler, {
      priceUSD: 0.01,
      description: 'Test API',
    });

    const req = new NextRequest(new URL('http://localhost/api/test'), {
      headers: {
        'x-payment': 'invalid-header',
      },
    });

    const response = await wrappedHandler(req);

    expect(response.status).toBe(402);
    expect(handler).not.toHaveBeenCalled();
  });

  it('should attach payment info to request', async () => {
    let capturedPayment: any;

    const handler = jest.fn().mockImplementation((req) => {
      capturedPayment = getPaymentInfo(req);
      return Response.json({ data: 'premium' });
    });

    const wrappedHandler = withX402(handler, {
      priceUSD: 0.01,
      description: 'Test API',
    });

    const req = new NextRequest(new URL('http://localhost/api/test'), {
      headers: {
        'x-payment': 'test-payment-header',
      },
    });

    await wrappedHandler(req);

    expect(capturedPayment).toEqual({
      signature: 'test-signature',
      amount: 0.01,
      payer: 'test-payer',
      blockTime: 1234567890,
      slot: 12345,
    });
  });
});

describe('getPaymentInfo', () => {
  it('should extract payment info from request', () => {
    const req = new NextRequest(new URL('http://localhost/api/test'));
    (req as any).payment = {
      signature: 'test-sig',
      amount: 0.01,
      payer: 'test-payer',
    };

    const payment = getPaymentInfo(req);

    expect(payment).toEqual({
      signature: 'test-sig',
      amount: 0.01,
      payer: 'test-payer',
    });
  });

  it('should return undefined if no payment', () => {
    const req = new NextRequest(new URL('http://localhost/api/test'));

    const payment = getPaymentInfo(req);

    expect(payment).toBeUndefined();
  });
});
