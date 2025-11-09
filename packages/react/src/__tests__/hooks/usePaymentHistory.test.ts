/**
 * Tests for usePaymentHistory hook
 */

import { renderHook, act } from '@testing-library/react';
import { usePaymentHistory } from '../../hooks/usePaymentHistory';
import { PaymentHistoryEntry } from '../../types';

describe('usePaymentHistory', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should initialize with empty history', () => {
    const { result } = renderHook(() => usePaymentHistory());

    expect(result.current.history).toEqual([]);
    expect(result.current.totalSpent).toBe(0);
    expect(result.current.successfulPayments).toBe(0);
  });

  it('should add payment to history', () => {
    const { result } = renderHook(() => usePaymentHistory());

    const payment: Omit<PaymentHistoryEntry, 'id' | 'timestamp'> = {
      signature: 'test-signature',
      url: 'https://api.example.com/test',
      amount: 0.001,
      amountMicroUSDC: 1000,
      requirements: {
        x402Version: 1,
        accepts: [{
          scheme: 'exact',
          network: 'solana-devnet',
          maxAmountRequired: '1000',
          resource: '/test',
          description: 'Test payment',
          mimeType: 'application/json',
          outputSchema: null,
          payTo: 'test-address',
          maxTimeoutSeconds: 300,
          asset: 'test-mint',
          extra: null,
        }],
        error: 'Payment Required',
      },
      status: 'confirmed',
    };

    act(() => {
      result.current.addPayment(payment);
    });

    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0]).toMatchObject(payment);
    expect(result.current.history[0].id).toBeDefined();
    expect(result.current.history[0].timestamp).toBeDefined();
  });

  it('should calculate totalSpent correctly', () => {
    const { result } = renderHook(() => usePaymentHistory());

    act(() => {
      result.current.addPayment({
        signature: 'sig-1',
        url: 'url-1',
        amount: 0.001,
        amountMicroUSDC: 1000,
        requirements: {} as any,
        status: 'confirmed',
      });

      result.current.addPayment({
        signature: 'sig-2',
        url: 'url-2',
        amount: 0.002,
        amountMicroUSDC: 2000,
        requirements: {} as any,
        status: 'confirmed',
      });
    });

    expect(result.current.totalSpent).toBe(0.003);
    expect(result.current.successfulPayments).toBe(2);
  });

  it('should not count failed payments in totalSpent', () => {
    const { result } = renderHook(() => usePaymentHistory());

    act(() => {
      result.current.addPayment({
        signature: 'sig-1',
        url: 'url-1',
        amount: 0.001,
        amountMicroUSDC: 1000,
        requirements: {} as any,
        status: 'confirmed',
      });

      result.current.addPayment({
        signature: '',
        url: 'url-2',
        amount: 0.002,
        amountMicroUSDC: 2000,
        requirements: {} as any,
        status: 'failed',
      });
    });

    expect(result.current.totalSpent).toBe(0.001);
    expect(result.current.successfulPayments).toBe(1);
  });

  it('should update payment', () => {
    const { result } = renderHook(() => usePaymentHistory());

    act(() => {
      result.current.addPayment({
        signature: '',
        url: 'url-1',
        amount: 0.001,
        amountMicroUSDC: 1000,
        requirements: {} as any,
        status: 'pending',
      });
    });

    const paymentId = result.current.history[0].id;

    act(() => {
      result.current.updatePayment(paymentId, {
        signature: 'new-signature',
        status: 'confirmed',
      });
    });

    expect(result.current.history[0].signature).toBe('new-signature');
    expect(result.current.history[0].status).toBe('confirmed');
  });

  it('should clear history', () => {
    const { result } = renderHook(() => usePaymentHistory());

    act(() => {
      result.current.addPayment({
        signature: 'sig-1',
        url: 'url-1',
        amount: 0.001,
        amountMicroUSDC: 1000,
        requirements: {} as any,
        status: 'confirmed',
      });
    });

    expect(result.current.history).toHaveLength(1);

    act(() => {
      result.current.clear();
    });

    expect(result.current.history).toHaveLength(0);
  });

  it('should get payment by ID', () => {
    const { result } = renderHook(() => usePaymentHistory());

    act(() => {
      result.current.addPayment({
        signature: 'sig-1',
        url: 'url-1',
        amount: 0.001,
        amountMicroUSDC: 1000,
        requirements: {} as any,
        status: 'confirmed',
      });
    });

    const paymentId = result.current.history[0].id;
    const payment = result.current.getPayment(paymentId);

    expect(payment).toBeDefined();
    expect(payment?.signature).toBe('sig-1');
  });

  it('should get payments for URL', () => {
    const { result } = renderHook(() => usePaymentHistory());

    act(() => {
      result.current.addPayment({
        signature: 'sig-1',
        url: 'url-1',
        amount: 0.001,
        amountMicroUSDC: 1000,
        requirements: {} as any,
        status: 'confirmed',
      });

      result.current.addPayment({
        signature: 'sig-2',
        url: 'url-1',
        amount: 0.002,
        amountMicroUSDC: 2000,
        requirements: {} as any,
        status: 'confirmed',
      });

      result.current.addPayment({
        signature: 'sig-3',
        url: 'url-2',
        amount: 0.003,
        amountMicroUSDC: 3000,
        requirements: {} as any,
        status: 'confirmed',
      });
    });

    const paymentsForUrl1 = result.current.getPaymentsForUrl('url-1');

    expect(paymentsForUrl1).toHaveLength(2);
    expect(paymentsForUrl1[0].signature).toBe('sig-2'); // Most recent first
    expect(paymentsForUrl1[1].signature).toBe('sig-1');
  });

  it('should respect maxSize limit', () => {
    const { result } = renderHook(() => usePaymentHistory({ maxSize: 2 }));

    act(() => {
      result.current.addPayment({
        signature: 'sig-1',
        url: 'url-1',
        amount: 0.001,
        amountMicroUSDC: 1000,
        requirements: {} as any,
        status: 'confirmed',
      });

      result.current.addPayment({
        signature: 'sig-2',
        url: 'url-2',
        amount: 0.002,
        amountMicroUSDC: 2000,
        requirements: {} as any,
        status: 'confirmed',
      });

      result.current.addPayment({
        signature: 'sig-3',
        url: 'url-3',
        amount: 0.003,
        amountMicroUSDC: 3000,
        requirements: {} as any,
        status: 'confirmed',
      });
    });

    // Should only keep the 2 most recent
    expect(result.current.history).toHaveLength(2);
    expect(result.current.history[0].signature).toBe('sig-3');
    expect(result.current.history[1].signature).toBe('sig-2');
  });

  it('should persist to localStorage when enabled', () => {
    const { result } = renderHook(() => usePaymentHistory({ persist: true }));

    act(() => {
      result.current.addPayment({
        signature: 'sig-1',
        url: 'url-1',
        amount: 0.001,
        amountMicroUSDC: 1000,
        requirements: {} as any,
        status: 'confirmed',
      });
    });

    expect(localStorage.setItem).toHaveBeenCalledWith(
      'x402-payment-history',
      expect.any(String)
    );
  });

  it('should not persist when disabled', () => {
    const { result } = renderHook(() => usePaymentHistory({ persist: false }));

    act(() => {
      result.current.addPayment({
        signature: 'sig-1',
        url: 'url-1',
        amount: 0.001,
        amountMicroUSDC: 1000,
        requirements: {} as any,
        status: 'confirmed',
      });
    });

    expect(localStorage.setItem).not.toHaveBeenCalled();
  });
});
