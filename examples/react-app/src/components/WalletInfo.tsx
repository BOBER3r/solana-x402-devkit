/**
 * WalletInfo Component
 * Displays wallet connection status and balances
 */

import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletBalance } from '@x402-solana/react';

export const WalletInfo: React.FC = () => {
  const { publicKey, connected } = useWallet();

  const {
    usdcBalance,
    solBalance,
    isLoading,
    error,
    refresh,
  } = useWalletBalance({
    refreshInterval: 10000, // Auto-refresh every 10 seconds
  });

  if (!connected) {
    return (
      <div>
        <h2 style={styles.heading}>Wallet Status</h2>
        <p style={styles.notConnected}>
          ❌ Wallet not connected. Please connect your wallet to continue.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={styles.heading}>Wallet Status</h2>

      <div style={styles.infoGrid}>
        <div style={styles.infoItem}>
          <span style={styles.label}>Status:</span>
          <span style={styles.value}>✅ Connected</span>
        </div>

        <div style={styles.infoItem}>
          <span style={styles.label}>Address:</span>
          <span style={styles.address}>
            {publicKey?.toBase58().slice(0, 8)}...
            {publicKey?.toBase58().slice(-8)}
          </span>
        </div>

        <div style={styles.infoItem}>
          <span style={styles.label}>USDC Balance:</span>
          <span style={styles.balance}>
            {isLoading ? 'Loading...' : `${usdcBalance.toFixed(4)} USDC`}
          </span>
        </div>

        <div style={styles.infoItem}>
          <span style={styles.label}>SOL Balance:</span>
          <span style={styles.balance}>
            {isLoading ? 'Loading...' : `${solBalance.toFixed(4)} SOL`}
          </span>
        </div>
      </div>

      {error && (
        <p style={styles.error}>Error: {error.message}</p>
      )}

      <button onClick={refresh} style={styles.button} disabled={isLoading}>
        {isLoading ? 'Refreshing...' : 'Refresh Balances'}
      </button>
    </div>
  );
};

const styles = {
  heading: {
    marginTop: 0,
    marginBottom: '20px',
    fontSize: '20px',
  },
  notConnected: {
    color: '#ff6b6b',
    fontSize: '16px',
  },
  infoGrid: {
    display: 'grid',
    gap: '16px',
    marginBottom: '20px',
  },
  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#0a0a0a',
    borderRadius: '8px',
  },
  label: {
    color: '#888',
    fontSize: '14px',
  },
  value: {
    fontSize: '14px',
    fontWeight: '500' as const,
  },
  address: {
    fontSize: '14px',
    fontFamily: 'monospace',
    color: '#4CAF50',
  },
  balance: {
    fontSize: '16px',
    fontWeight: 'bold' as const,
    color: '#4CAF50',
  },
  error: {
    color: '#ff6b6b',
    fontSize: '14px',
    marginBottom: '12px',
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500' as const,
  },
};