/**
 * Example: Protected API Route
 * File: app/api/premium/route.ts
 */

import { withX402 } from '@x402-solana/nextjs';
import { NextRequest } from 'next/server';

// Make sure to import config to initialize
import '../config';

export const GET = withX402(
  async (req: NextRequest) => {
    // Payment is verified, access payment info
    const payment = req.payment;

    return Response.json({
      message: 'This is premium content!',
      timestamp: new Date().toISOString(),
      payment: {
        payer: payment?.payer,
        amount: payment?.amount,
        signature: payment?.signature,
      },
    });
  },
  {
    priceUSD: 0.01,
    description: 'Access to premium API endpoint',
    resource: '/api/premium',
  }
);

export const POST = withX402(
  async (req: NextRequest) => {
    const body = await req.json();
    const payment = req.payment;

    // Process the request with payment verification
    return Response.json({
      message: 'Data processed successfully',
      received: body,
      paidBy: payment?.payer,
    });
  },
  {
    priceUSD: 0.02,
    description: 'Process premium data',
    resource: '/api/premium',
  }
);
