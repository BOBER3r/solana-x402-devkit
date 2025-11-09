/**
 * Tests for RSC Provider
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { X402Provider, useX402Config, createX402Config } from '../src/rsc/provider';

describe('X402Provider', () => {
  it('should provide config to children', () => {
    const config = {
      network: 'devnet' as const,
      recipientWallet: 'test-wallet',
      solanaRpcUrl: 'https://api.devnet.solana.com',
      debug: false,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <X402Provider config={config}>{children}</X402Provider>
    );

    const { result } = renderHook(() => useX402Config(), { wrapper });

    expect(result.current).toEqual(config);
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      renderHook(() => useX402Config());
    }).toThrow('useX402Config must be used within X402Provider');

    consoleSpy.mockRestore();
  });
});

describe('createX402Config', () => {
  it('should create config object', () => {
    const config = createX402Config({
      network: 'devnet',
      recipientWallet: 'test-wallet',
      solanaRpcUrl: 'https://api.devnet.solana.com',
    });

    expect(config).toEqual({
      network: 'devnet',
      recipientWallet: 'test-wallet',
      solanaRpcUrl: 'https://api.devnet.solana.com',
      debug: false,
    });
  });

  it('should set debug to false by default', () => {
    const config = createX402Config({
      network: 'mainnet-beta',
      recipientWallet: 'test-wallet',
    });

    expect(config.debug).toBe(false);
  });

  it('should preserve debug setting', () => {
    const config = createX402Config({
      network: 'devnet',
      recipientWallet: 'test-wallet',
      debug: true,
    });

    expect(config.debug).toBe(true);
  });
});
