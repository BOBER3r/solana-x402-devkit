/**
 * React App Example - Complete x402 Integration
 * Demonstrates all features of @x402-solana/react
 */

import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { X402Provider } from '@x402-solana/react';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

// Import components
import { PremiumApiDemo } from './components/PremiumApiDemo';
import { WalletInfo } from './components/WalletInfo';
import { PaymentHistoryDisplay } from './components/PaymentHistoryDisplay';

/**
 * Main App Component
 *
 * Sets up the complete provider hierarchy:
 * 1. ConnectionProvider - Solana RPC connection
 * 2. WalletProvider - Wallet management
 * 3. WalletModalProvider - Wallet selection UI
 * 4. X402Provider - x402 payment functionality
 */
function App() {
  // Configure network (devnet for testing)
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // Configure wallet adapters
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <div style={styles.container}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <X402Provider
              config={{
                solanaRpcUrl: endpoint,
                network: 'devnet',
                debug: true,
                enableHistory: true,
              }}
            >
              <div style={styles.header}>
                <h1 style={styles.title}>x402 React Demo</h1>
                <WalletMultiButton />
              </div>

              <div style={styles.content}>
                {/* Wallet Information */}
                <div style={styles.section}>
                  <WalletInfo />
                </div>

                {/* Premium API Demo */}
                <div style={styles.section}>
                  <PremiumApiDemo />
                </div>

                {/* Payment History */}
                <div style={styles.section}>
                  <PaymentHistoryDisplay />
                </div>
              </div>

              <div style={styles.footer}>
                <p>Powered by @x402-solana/react</p>
                <p style={styles.footerNote}>
                  Connect your wallet and try fetching premium data!
                </p>
              </div>
            </X402Provider>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </div>
  );
}

// Inline styles for demo
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0a0a0a',
    color: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 40px',
    borderBottom: '1px solid #333',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 'bold',
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  section: {
    marginBottom: '40px',
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #333',
  },
  footer: {
    textAlign: 'center' as const,
    padding: '40px',
    borderTop: '1px solid #333',
    color: '#888',
  },
  footerNote: {
    fontSize: '14px',
    marginTop: '8px',
  },
};

export default App;