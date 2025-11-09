/**
 * Example: Client Component using Server Actions
 * File: app/components/PremiumContent.tsx
 */

'use client';

import { useState } from 'react';
import { useX402Config } from '@x402-solana/nextjs';
import { getPremiumData, processPremiumRequest } from '../actions/premium';

export function PremiumContent() {
  const config = useX402Config();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetPremiumData = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getPremiumData();

      if (result.success) {
        setData(result.data);
      } else if (result.paymentRequired) {
        // Handle payment required
        console.log('Payment required:', result.paymentRequired);
        setError('Payment required. Please pay to access this content.');

        // In a real app, you would integrate with a wallet here
        // to make the payment and retry the request
      } else {
        setError(result.error || 'Unknown error');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRequest = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await processPremiumRequest('user123', 'analysis');

      if (result.success) {
        setData(result.data);
      } else if (result.paymentRequired) {
        setError('Payment required');
        console.log('Payment required:', result.paymentRequired);
      } else {
        setError(result.error || 'Unknown error');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="text-xl font-bold mb-2">x402 Configuration</h2>
        <p>Network: {config.network}</p>
        <p>Recipient: {config.recipientWallet.slice(0, 8)}...</p>
      </div>

      <div className="space-x-2">
        <button
          onClick={handleGetPremiumData}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? 'Loading...' : 'Get Premium Data'}
        </button>

        <button
          onClick={handleProcessRequest}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
        >
          {loading ? 'Loading...' : 'Process Request'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      )}

      {data && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <h3 className="font-bold mb-2">Success!</h3>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}