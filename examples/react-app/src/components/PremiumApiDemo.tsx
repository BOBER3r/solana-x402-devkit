/**
 * PremiumApiDemo Component
 * Demonstrates automatic 402 payment handling
 */

import React, { useState } from 'react';
import { useX402Payment } from '@x402-solana/react';

export const PremiumApiDemo: React.FC = () => {
  const [responseData, setResponseData] = useState<any>(null);
  const [paymentInfo, setPaymentInfo] = useState<string | null>(null);

  const {
    fetch,
    isLoading,
    error,
    lastPaymentSignature,
    lastPaymentAmount,
  } = useX402Payment({
    onPaymentRequired: (requirements) => {
      const requirement = requirements.accepts[0];
      const amount = parseInt(requirement.maxAmountRequired) / 1_000_000;
      setPaymentInfo(`Payment required: ${amount} USDC - ${requirement.description}`);
    },
    onPaymentSent: (signature, amount) => {
      setPaymentInfo(`Payment sent: ${amount} USDC (tx: ${signature.slice(0, 8)}...)`);
    },
    onPaymentConfirmed: (signature) => {
      setPaymentInfo(`Payment confirmed! (tx: ${signature.slice(0, 8)}...)`);
    },
    onError: (err) => {
      console.error('Payment error:', err);
    },
  });

  const fetchPremiumData = async () => {
    try {
      setResponseData(null);
      setPaymentInfo(null);

      // Example: Call your API endpoint that returns 402
      // For demo, this would be your actual API endpoint
      const response = await fetch('https://your-api.com/premium-endpoint');

      if (response.ok) {
        const data = await response.json();
        setResponseData(data);
        setPaymentInfo(null);
      } else {
        setPaymentInfo(`Error: ${response.status} - ${response.statusText}`);
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
    }
  };

  const fetchFreeData = async () => {
    try {
      setResponseData(null);
      setPaymentInfo(null);

      // Example: Call a free endpoint
      const response = await fetch('https://your-api.com/free-endpoint');

      if (response.ok) {
        const data = await response.json();
        setResponseData(data);
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
    }
  };

  return (
    <div>
      <h2 style={styles.heading}>Premium API Demo</h2>

      <p style={styles.description}>
        This demo shows automatic 402 payment handling. When you request premium data,
        the hook will automatically:
      </p>

      <ol style={styles.list}>
        <li>Detect the 402 Payment Required response</li>
        <li>Parse payment requirements</li>
        <li>Create and send USDC payment</li>
        <li>Retry the request with payment proof</li>
      </ol>

      <div style={styles.buttonGroup}>
        <button
          onClick={fetchPremiumData}
          disabled={isLoading}
          style={{
            ...styles.button,
            ...(isLoading ? styles.buttonDisabled : styles.buttonPrimary),
          }}
        >
          {isLoading ? 'Processing...' : 'Fetch Premium Data ($0.001)'}
        </button>

        <button
          onClick={fetchFreeData}
          disabled={isLoading}
          style={{
            ...styles.button,
            ...(isLoading ? styles.buttonDisabled : styles.buttonSecondary),
          }}
        >
          Fetch Free Data
        </button>
      </div>

      {/* Payment Info */}
      {paymentInfo && (
        <div style={styles.infoBox}>
          <span style={styles.infoIcon}>💳</span>
          <span>{paymentInfo}</span>
        </div>
      )}

      {/* Last Payment Info */}
      {lastPaymentSignature && (
        <div style={styles.paymentDetails}>
          <h3 style={styles.subheading}>Last Payment</h3>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Amount:</span>
            <span style={styles.detailValue}>${lastPaymentAmount?.toFixed(6)} USDC</span>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Transaction:</span>
            <a
              href={`https://explorer.solana.com/tx/${lastPaymentSignature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.link}
            >
              {lastPaymentSignature.slice(0, 8)}...{lastPaymentSignature.slice(-8)}
            </a>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={styles.errorBox}>
          <span style={styles.errorIcon}>❌</span>
          <div>
            <div style={styles.errorTitle}>Error</div>
            <div style={styles.errorMessage}>{error.message}</div>
          </div>
        </div>
      )}

      {/* Response Data */}
      {responseData && (
        <div style={styles.responseBox}>
          <h3 style={styles.subheading}>Response Data</h3>
          <pre style={styles.code}>
            {JSON.stringify(responseData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

const styles = {
  heading: {
    marginTop: 0,
    marginBottom: '16px',
    fontSize: '20px',
  },
  description: {
    color: '#ccc',
    lineHeight: '1.6',
    marginBottom: '16px',
  },
  list: {
    color: '#ccc',
    lineHeight: '1.8',
    marginBottom: '24px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
  },
  button: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500' as const,
    transition: 'all 0.2s',
  },
  buttonPrimary: {
    backgroundColor: '#4CAF50',
    color: 'white',
  },
  buttonSecondary: {
    backgroundColor: '#2196F3',
    color: 'white',
  },
  buttonDisabled: {
    backgroundColor: '#555',
    color: '#888',
    cursor: 'not-allowed',
  },
  infoBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#2a5298',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  infoIcon: {
    fontSize: '20px',
  },
  paymentDetails: {
    padding: '16px',
    backgroundColor: '#0a0a0a',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  subheading: {
    marginTop: 0,
    marginBottom: '12px',
    fontSize: '16px',
    fontWeight: '600' as const,
  },
  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '14px',
  },
  detailLabel: {
    color: '#888',
  },
  detailValue: {
    color: '#4CAF50',
    fontWeight: '600' as const,
  },
  link: {
    color: '#2196F3',
    textDecoration: 'none',
    fontFamily: 'monospace',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#5a2a2a',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  errorIcon: {
    fontSize: '20px',
  },
  errorTitle: {
    fontWeight: 'bold' as const,
    marginBottom: '4px',
  },
  errorMessage: {
    fontSize: '14px',
    color: '#ffcccc',
  },
  responseBox: {
    padding: '16px',
    backgroundColor: '#0a0a0a',
    borderRadius: '8px',
    marginTop: '16px',
  },
  code: {
    margin: 0,
    padding: '12px',
    backgroundColor: '#000',
    borderRadius: '4px',
    fontSize: '12px',
    overflow: 'auto',
    color: '#4CAF50',
  },
};