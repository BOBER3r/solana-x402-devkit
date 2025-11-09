/**
 * usePaymentHistory hook
 * React hook for managing payment history with localStorage persistence
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  UsePaymentHistoryOptions,
  UsePaymentHistoryReturn,
  PaymentHistoryEntry,
} from '../types';

/**
 * Hook for managing payment history
 *
 * Provides payment history tracking with localStorage persistence,
 * allowing users to view past payments and track spending.
 *
 * @param options - Hook options
 * @returns Payment history state and management functions
 *
 * @example
 * ```tsx
 * function PaymentHistory() {
 *   const {
 *     history,
 *     totalSpent,
 *     successfulPayments,
 *     clear
 *   } = usePaymentHistory({
 *     maxSize: 50,
 *     persist: true
 *   });
 *
 *   return (
 *     <div>
 *       <h2>Payment History</h2>
 *       <p>Total Spent: ${totalSpent} USDC</p>
 *       <p>Successful Payments: {successfulPayments}</p>
 *       <button onClick={clear}>Clear History</button>
 *       <ul>
 *         {history.map(payment => (
 *           <li key={payment.id}>
 *             {payment.amount} USDC - {payment.url}
 *           </li>
 *         ))}
 *       </ul>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePaymentHistory(
  options: UsePaymentHistoryOptions = {}
): UsePaymentHistoryReturn {
  const {
    maxSize = 100,
    persist = true,
    storageKey = 'x402-payment-history',
  } = options;

  // Initialize from localStorage if persist is enabled
  const [history, setHistory] = useState<PaymentHistoryEntry[]>(() => {
    if (!persist || typeof window === 'undefined') {
      return [];
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (err) {
      console.error('Failed to load payment history from localStorage:', err);
    }

    return [];
  });

  // Save to localStorage when history changes
  useEffect(() => {
    if (persist && typeof window !== 'undefined' && history.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(history));
      } catch (err) {
        console.error('Failed to save payment history to localStorage:', err);
      }
    }
  }, [history, persist, storageKey]);

  // Add payment to history
  const addPayment = useCallback(
    (payment: Omit<PaymentHistoryEntry, 'id' | 'timestamp'>) => {
      const newPayment: PaymentHistoryEntry = {
        ...payment,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      };

      setHistory(prev => {
        const updated = [newPayment, ...prev];
        // Limit history size
        return updated.slice(0, maxSize);
      });
    },
    [maxSize]
  );

  // Update existing payment
  const updatePayment = useCallback(
    (id: string, updates: Partial<PaymentHistoryEntry>) => {
      setHistory(prev =>
        prev.map(payment =>
          payment.id === id ? { ...payment, ...updates } : payment
        )
      );
    },
    []
  );

  // Clear all history
  const clear = useCallback(() => {
    setHistory([]);
    if (persist && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(storageKey);
      } catch (err) {
        console.error('Failed to clear payment history from localStorage:', err);
      }
    }
  }, [persist, storageKey]);

  // Get payment by ID
  const getPayment = useCallback(
    (id: string): PaymentHistoryEntry | undefined => {
      return history.find(p => p.id === id);
    },
    [history]
  );

  // Get payments for specific URL
  const getPaymentsForUrl = useCallback(
    (url: string): PaymentHistoryEntry[] => {
      return history.filter(p => p.url === url);
    },
    [history]
  );

  // Calculate total spent
  const totalSpent = useMemo(() => {
    return history
      .filter(p => p.status === 'confirmed')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [history]);

  // Count successful payments
  const successfulPayments = useMemo(() => {
    return history.filter(p => p.status === 'confirmed').length;
  }, [history]);

  return {
    history,
    addPayment,
    updatePayment,
    clear,
    getPayment,
    getPaymentsForUrl,
    totalSpent,
    successfulPayments,
  };
}