/**
 * X402 React Context
 * Provides x402 payment functionality to React components
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { X402ContextValue } from '../types';

/**
 * X402 Context - DO NOT use directly
 * Use useX402() hook instead
 */
export const X402Context = createContext<X402ContextValue | null>(null);

X402Context.displayName = 'X402Context';

/**
 * Hook to access X402 context
 * Must be used within X402Provider
 *
 * @returns X402 context value
 * @throws Error if used outside X402Provider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { fetch, connected, getBalance } = useX402();
 *
 *   const loadData = async () => {
 *     const response = await fetch('/api/premium');
 *     const data = await response.json();
 *   };
 *
 *   return <button onClick={loadData}>Load Data</button>;
 * }
 * ```
 */
export function useX402(): X402ContextValue {
  const context = useContext(X402Context);

  if (!context) {
    throw new Error(
      'useX402 must be used within X402Provider. ' +
      'Wrap your app with <X402Provider>...</X402Provider>'
    );
  }

  return context;
}

/**
 * Props for X402Context.Provider
 * Internal use only - use X402Provider instead
 */
export interface X402ContextProviderProps {
  value: X402ContextValue;
  children: ReactNode;
}

/**
 * X402 Context Provider component
 * Internal use only - use X402Provider instead
 */
export const X402ContextProvider: React.FC<X402ContextProviderProps> = ({
  value,
  children,
}) => {
  return (
    <X402Context.Provider value={value}>
      {children}
    </X402Context.Provider>
  );
};