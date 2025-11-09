/**
 * PaymentHistoryDisplay Component
 * Displays payment history with details
 */

import React from 'react';
import { usePaymentHistory } from '@x402-solana/react';

export const PaymentHistoryDisplay: React.FC = () => {
  const {
    history,
    totalSpent,
    successfulPayments,
    clear,
  } = usePaymentHistory({
    maxSize: 50,
    persist: true,
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatAmount = (amount: number) => {
    return `$${amount.toFixed(6)} USDC`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#4CAF50';
      case 'pending':
        return '#FFC107';
      case 'failed':
        return '#F44336';
      default:
        return '#888';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '✅';
      case 'pending':
        return '⏳';
      case 'failed':
        return '❌';
      default:
        return '❓';
    }
  };

  return (
    <div>
      <div style={styles.header}>
        <h2 style={styles.heading}>Payment History</h2>
        {history.length > 0 && (
          <button onClick={clear} style={styles.clearButton}>
            Clear History
          </button>
        )}
      </div>

      {/* Summary Stats */}
      {history.length > 0 && (
        <div style={styles.stats}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Total Spent:</span>
            <span style={styles.statValue}>{formatAmount(totalSpent)}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Successful Payments:</span>
            <span style={styles.statValue}>{successfulPayments}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Total Transactions:</span>
            <span style={styles.statValue}>{history.length}</span>
          </div>
        </div>
      )}

      {/* Payment List */}
      {history.length === 0 ? (
        <p style={styles.empty}>No payment history yet. Make a payment to see it here!</p>
      ) : (
        <div style={styles.list}>
          {history.map((payment) => (
            <div key={payment.id} style={styles.paymentCard}>
              {/* Header */}
              <div style={styles.paymentHeader}>
                <span style={{ color: getStatusColor(payment.status) }}>
                  {getStatusIcon(payment.status)} {payment.status.toUpperCase()}
                </span>
                <span style={styles.amount}>{formatAmount(payment.amount)}</span>
              </div>

              {/* Details */}
              <div style={styles.paymentDetails}>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>URL:</span>
                  <span style={styles.detailValue}>
                    {payment.url.length > 50
                      ? `${payment.url.slice(0, 50)}...`
                      : payment.url}
                  </span>
                </div>

                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Time:</span>
                  <span style={styles.detailValue}>{formatDate(payment.timestamp)}</span>
                </div>

                {payment.signature && (
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Transaction:</span>
                    <a
                      href={`https://explorer.solana.com/tx/${payment.signature}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.link}
                    >
                      {payment.signature.slice(0, 8)}...{payment.signature.slice(-8)}
                    </a>
                  </div>
                )}

                {payment.requirements && (
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Description:</span>
                    <span style={styles.detailValue}>
                      {payment.requirements.accepts[0]?.description || 'N/A'}
                    </span>
                  </div>
                )}

                {payment.error && (
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Error:</span>
                    <span style={{ ...styles.detailValue, color: '#ff6b6b' }}>
                      {payment.error}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  heading: {
    marginTop: 0,
    marginBottom: 0,
    fontSize: '20px',
  },
  clearButton: {
    padding: '8px 16px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statItem: {
    padding: '16px',
    backgroundColor: '#0a0a0a',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  statLabel: {
    color: '#888',
    fontSize: '13px',
  },
  statValue: {
    fontSize: '20px',
    fontWeight: 'bold' as const,
    color: '#4CAF50',
  },
  empty: {
    color: '#888',
    textAlign: 'center' as const,
    padding: '40px',
    fontSize: '14px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  paymentCard: {
    padding: '16px',
    backgroundColor: '#0a0a0a',
    borderRadius: '8px',
    border: '1px solid #333',
  },
  paymentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '1px solid #333',
    fontSize: '14px',
    fontWeight: '600' as const,
  },
  amount: {
    color: '#4CAF50',
    fontSize: '16px',
  },
  paymentDetails: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    gap: '16px',
  },
  detailLabel: {
    color: '#888',
    minWidth: '100px',
  },
  detailValue: {
    color: '#ccc',
    textAlign: 'right' as const,
    flex: 1,
  },
  link: {
    color: '#2196F3',
    textDecoration: 'none',
    fontFamily: 'monospace',
  },
};