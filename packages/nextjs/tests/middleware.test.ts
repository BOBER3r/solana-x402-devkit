/**
 * Tests for Next.js App Router middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import { x402Middleware, getPaymentFromRequest } from '../src/middleware/app-router';

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
          payTo: {
            address: 'test-recipient-usdc-account',
          },
          amount: 10000,
        },
      ],
    }),
    getRecipientUSDCAccount: jest.fn().mockReturnValue('test-recipient-usdc-account'),
  })),
  parseX402Payment: jest.fn().mockReturnValue({
    success: true,
    payment: {
      scheme: 'solana',
      network: 'devnet',
      payload: {
        signature: 'test-signature',
      },
    },
  }),
}));

describe('x402Middleware', () => {
  const config = {
    solanaRpcUrl: 'https://api.devnet.solana.com',
    recipientWallet: 'test-wallet',
    network: 'devnet' as const,
    protectedRoutes: ['/api/premium/*'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should allow unprotected routes', async () => {
    const middleware = x402Middleware(config);
    const req = new NextRequest(new URL('http://localhost/api/public'));

    const response = await middleware(req);

    expect(response).toBeInstanceOf(NextResponse);
    expect((response as NextResponse).status).not.toBe(402);
  });

  it('should return 402 for protected route without payment', async () => {
    const middleware = x402Middleware({
      ...config,
      protectedRoutes: ['/api/premium'],
    });
    const req = new NextRequest(new URL('http://localhost/api/premium'));

    const response = await middleware(req);

    expect(response).toBeInstanceOf(NextResponse);
    expect((response as NextResponse).status).toBe(402);
  });

  it('should verify payment and allow access', async () => {
    const { parseX402Payment } = require('@x402-solana/core');
    parseX402Payment.mockReturnValue({
      success: true,
      payment: {
        scheme: 'solana',
        network: 'devnet',
        payload: { signature: 'test-sig' },
      },
    });

    const middleware = x402Middleware({
      ...config,
      protectedRoutes: ['/api/premium'],
    });

    const req = new NextRequest(new URL('http://localhost/api/premium'), {
      headers: {
        'x-payment': 'test-payment-header',
      },
    });

    const response = await middleware(req);

    expect(response).toBeInstanceOf(NextResponse);
    expect((response as NextResponse).headers.get('x-payment-verified')).toBe('true');
  });

  it('should return 402 for invalid payment header', async () => {
    const { parseX402Payment } = require('@x402-solana/core');
    parseX402Payment.mockReturnValue({
      success: false,
      error: 'Invalid header format',
    });

    const middleware = x402Middleware({
      ...config,
      protectedRoutes: ['/api/premium'],
    });

    const req = new NextRequest(new URL('http://localhost/api/premium'), {
      headers: {
        'x-payment': 'invalid-header',
      },
    });

    const response = await middleware(req);

    expect(response).toBeInstanceOf(NextResponse);
    expect((response as NextResponse).status).toBe(402);
  });
});

describe('getPaymentFromRequest', () => {
  it('should extract payment info from headers', () => {
    const req = new NextRequest(new URL('http://localhost/api/test'), {
      headers: {
        'x-payment-verified': 'true',
        'x-payment-signature': 'test-signature',
        'x-payment-payer': 'test-payer',
        'x-payment-amount': '0.01',
      },
    });

    const payment = getPaymentFromRequest(req);

    expect(payment).toEqual({
      signature: 'test-signature',
      payer: 'test-payer',
      amount: 0.01,
    });
  });

  it('should return undefined if payment not verified', () => {
    const req = new NextRequest(new URL('http://localhost/api/test'));

    const payment = getPaymentFromRequest(req);

    expect(payment).toBeUndefined();
  });
});
