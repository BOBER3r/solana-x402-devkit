/**
 * @x402-solana/react
 * React hooks and components for x402 payment protocol on Solana
 *
 * @packageDocumentation
 */

// Main provider component
export { X402Provider } from './components/X402Provider';
export type { X402ProviderProps } from './components/X402Provider';

// Context
export { useX402, X402Context } from './context/X402Context';

// Hooks
export { useX402Payment } from './hooks/useX402Payment';
export { useWalletBalance } from './hooks/useWalletBalance';
export { usePaymentHistory } from './hooks/usePaymentHistory';

// Types
export type {
  X402ProviderConfig,
  X402ContextValue,
  PaymentHistoryEntry,
  UseX402PaymentOptions,
  UseX402PaymentReturn,
  UseWalletBalanceOptions,
  UseWalletBalanceReturn,
  UsePaymentHistoryOptions,
  UsePaymentHistoryReturn,
  X402PaymentError,
} from './types';

// Utility functions (for advanced use cases)
export {
  createPaymentWithWallet,
  getUSDCBalance,
  getSOLBalance,
  encodePaymentProof,
  isWalletSupported,
  getUSDCMint,
  validatePaymentRequirements,
} from './utils/wallet-adapter';