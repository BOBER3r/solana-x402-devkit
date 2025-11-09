/**
 * React Server Component Provider for x402 configuration
 *
 * Provides client-side context for x402 payment integration
 * while maintaining RSC compatibility.
 */

'use client';

import React, { createContext, useContext, ReactNode } from 'react';

/**
 * x402 configuration for client-side components
 */
export interface X402ClientConfig {
  /** Solana network */
  network: 'devnet' | 'mainnet-beta';

  /** Recipient wallet address (public info) */
  recipientWallet: string;

  /** Optional: Custom RPC URL for client */
  solanaRpcUrl?: string;

  /** Enable debug mode */
  debug?: boolean;
}

/**
 * Context for x402 configuration
 */
const X402Context = createContext<X402ClientConfig | null>(null);

/**
 * Props for X402Provider
 */
export interface X402ProviderProps {
  /** Configuration object */
  config: X402ClientConfig;

  /** Child components */
  children: ReactNode;
}

/**
 * X402 Provider Component
 *
 * Wraps your app to provide x402 configuration to client components.
 * This is compatible with React Server Components.
 *
 * @example
 * ```typescript
 * // app/layout.tsx
 * import { X402Provider } from '@x402-solana/nextjs';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <X402Provider
 *           config={{
 *             network: 'devnet',
 *             recipientWallet: process.env.NEXT_PUBLIC_RECIPIENT_WALLET!,
 *             solanaRpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
 *           }}
 *         >
 *           {children}
 *         </X402Provider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function X402Provider({ config, children }: X402ProviderProps) {
  return <X402Context.Provider value={config}>{children}</X402Context.Provider>;
}

/**
 * Hook to access x402 configuration
 *
 * @returns x402 configuration
 * @throws Error if used outside of X402Provider
 *
 * @example
 * ```typescript
 * 'use client';
 *
 * import { useX402Config } from '@x402-solana/nextjs';
 *
 * export function MyComponent() {
 *   const config = useX402Config();
 *
 *   return (
 *     <div>
 *       <p>Network: {config.network}</p>
 *       <p>Recipient: {config.recipientWallet}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useX402Config(): X402ClientConfig {
  const config = useContext(X402Context);

  if (!config) {
    throw new Error('useX402Config must be used within X402Provider');
  }

  return config;
}

/**
 * Server-side helper to create config object
 *
 * This can be used in Server Components to prepare config
 * that will be passed to the client provider.
 *
 * @param options - Configuration options
 * @returns Client config object
 *
 * @example
 * ```typescript
 * // app/layout.tsx (Server Component)
 * import { createX402Config, X402Provider } from '@x402-solana/nextjs';
 *
 * export default function RootLayout({ children }) {
 *   const x402Config = createX402Config({
 *     network: 'devnet',
 *     recipientWallet: process.env.NEXT_PUBLIC_RECIPIENT_WALLET!,
 *     solanaRpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
 *   });
 *
 *   return (
 *     <html>
 *       <body>
 *         <X402Provider config={x402Config}>
 *           {children}
 *         </X402Provider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function createX402Config(options: X402ClientConfig): X402ClientConfig {
  return {
    network: options.network,
    recipientWallet: options.recipientWallet,
    solanaRpcUrl: options.solanaRpcUrl,
    debug: options.debug ?? false,
  };
}
