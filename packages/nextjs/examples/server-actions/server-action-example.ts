/**
 * Example: Protected Server Action
 * File: app/actions/premium.ts
 */

'use server';

import { requirePayment } from '@x402-solana/nextjs';

// Make sure to import config to initialize
import './config';

/**
 * Get premium data (requires payment)
 */
export const getPremiumData = requirePayment(
  async () => {
    // This code only runs if payment is verified
    return {
      message: 'This is premium data!',
      timestamp: new Date().toISOString(),
      data: {
        secretInfo: 'Only available to paying customers',
        specialOffer: 'Get 50% off your next purchase',
      },
    };
  },
  {
    priceUSD: 0.01,
    description: 'Access to premium data',
    resource: '/actions/getPremiumData',
  }
);

/**
 * Process premium request with parameters
 */
export const processPremiumRequest = requirePayment(
  async (userId: string, requestType: string) => {
    // Business logic here
    return {
      userId,
      requestType,
      result: 'Request processed successfully',
      timestamp: new Date().toISOString(),
    };
  },
  {
    priceUSD: 0.02,
    description: 'Process premium request',
    resource: '/actions/processPremiumRequest',
  }
);

/**
 * Example with dynamic pricing based on parameters
 */
export const createPremiumReport = requirePayment(
  async (reportType: 'basic' | 'advanced', pages: number) => {
    // Generate report
    return {
      reportType,
      pages,
      downloadUrl: '/reports/premium-report.pdf',
      generatedAt: new Date().toISOString(),
    };
  },
  {
    priceUSD: 0.05, // Base price, could be dynamic in real implementation
    description: 'Generate premium report',
    resource: '/actions/createPremiumReport',
  }
);
