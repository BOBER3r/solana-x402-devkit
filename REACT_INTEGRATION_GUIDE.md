# React Integration Guide

Complete guide for integrating x402 payments into React applications using `@x402-solana/react`.

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Core Concepts](#core-concepts)
4. [Hooks Reference](#hooks-reference)
5. [Advanced Patterns](#advanced-patterns)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Installation

### 1. Install Dependencies

```bash
npm install @x402-solana/react \
  @solana/wallet-adapter-react \
  @solana/wallet-adapter-react-ui \
  @solana/wallet-adapter-wallets \
  @solana/web3.js
```

### 2. Install Wallet Adapters

Choose the wallets you want to support:

```bash
# Install specific wallet adapters
npm install @solana/wallet-adapter-phantom \
  @solana/wallet-adapter-solflare \
  @solana/wallet-adapter-backpack
```

---

## Quick Start

### Minimal Setup

```tsx
import React from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { X402Provider } from '@x402-solana/react';
import '@solana/wallet-adapter-react-ui/styles.css';

function App() {
  const endpoint = 'https://api.devnet.solana.com';
  const wallets = [new PhantomWalletAdapter()];

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <X402Provider config={{ solanaRpcUrl: endpoint }}>
            <div>
              <WalletMultiButton />
              <YourApp />
            </div>
          </X402Provider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

### Simple Component with Auto-Payment

```tsx
import { useX402Payment } from '@x402-solana/react';

function PremiumContent() {
  const { fetch, isLoading, error } = useX402Payment();
  const [data, setData] = useState(null);

  const loadPremiumData = async () => {
    try {
      const response = await fetch('https://api.example.com/premium');
      const json = await response.json();
      setData(json);
    } catch (err) {
      console.error('Failed to load:', err);
    }
  };

  return (
    <div>
      <button onClick={loadPremiumData} disabled={isLoading}>
        {isLoading ? 'Processing Payment...' : 'Load Premium Data'}
      </button>
      {error && <p>Error: {error.message}</p>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
```

---

## Core Concepts

### Provider Hierarchy

The providers must be nested in this order:

```
ConnectionProvider (Solana RPC connection)
  └── WalletProvider (Wallet management)
      └── WalletModalProvider (Wallet selection UI)
          └── X402Provider (x402 payment functionality)
              └── Your App Components
```

### Payment Flow

1. **User triggers request** - Component calls `fetch()` from `useX402Payment()`
2. **402 detected** - Hook automatically detects 402 Payment Required
3. **Payment created** - Hook creates USDC payment using connected wallet
4. **Request retried** - Hook retries request with payment proof
5. **Success** - Response returned to component

### Network Configuration

**Devnet (for testing):**
```tsx
<X402Provider config={{
  solanaRpcUrl: 'https://api.devnet.solana.com',
  network: 'devnet'
}}>
```

**Mainnet (for production):**
```tsx
<X402Provider config={{
  solanaRpcUrl: 'https://api.mainnet-beta.solana.com',
  network: 'mainnet-beta'
}}>
```

---

## Hooks Reference

### useX402Payment

**Purpose:** Automatic 402 payment handling

**Basic Usage:**
```tsx
const { fetch, isLoading, error } = useX402Payment();
```

**With Callbacks:**
```tsx
const payment = useX402Payment({
  onPaymentRequired: (requirements) => {
    const amount = parseInt(requirements.accepts[0].maxAmountRequired) / 1_000_000;
    toast.info(`Payment required: $${amount} USDC`);
  },
  onPaymentSent: (signature, amount) => {
    toast.success(`Paid $${amount} USDC`);
  },
  onError: (error) => {
    toast.error(`Payment failed: ${error.message}`);
  },
});
```

**Return Values:**
- `fetch` - Fetch function with auto-402 handling
- `isLoading` - Boolean indicating payment processing
- `error` - Error object if payment failed
- `lastPaymentSignature` - Signature of last payment
- `lastPaymentAmount` - Amount of last payment in USDC
- `paymentHistory` - Array of payment history entries

### useWalletBalance

**Purpose:** Monitor wallet USDC and SOL balances

**Basic Usage:**
```tsx
const { usdcBalance, solBalance, refresh } = useWalletBalance();
```

**With Auto-Refresh:**
```tsx
const balance = useWalletBalance({
  refreshInterval: 10000, // Refresh every 10 seconds
  onBalanceChange: (newBalance) => {
    if (newBalance < 0.01) {
      alert('Low USDC balance!');
    }
  },
});
```

**Return Values:**
- `usdcBalance` - USDC balance in standard units
- `solBalance` - SOL balance in standard units
- `isLoading` - Boolean indicating loading state
- `error` - Error object if fetch failed
- `refresh()` - Function to manually refresh balances

### usePaymentHistory

**Purpose:** Track payment history with localStorage persistence

**Basic Usage:**
```tsx
const { history, totalSpent, successfulPayments } = usePaymentHistory();
```

**With Custom Configuration:**
```tsx
const history = usePaymentHistory({
  maxSize: 50,              // Keep only last 50 payments
  persist: true,            // Save to localStorage
  storageKey: 'my-app-payments'
});
```

**Return Values:**
- `history` - Array of payment entries
- `totalSpent` - Total USDC spent (confirmed only)
- `successfulPayments` - Count of successful payments
- `addPayment(payment)` - Add payment to history
- `updatePayment(id, updates)` - Update existing payment
- `clear()` - Clear all history
- `getPayment(id)` - Get payment by ID
- `getPaymentsForUrl(url)` - Get all payments for URL

### useX402 (Context Hook)

**Purpose:** Access global X402 context

**Usage:**
```tsx
const {
  config,
  connection,
  wallet,
  publicKey,
  connected,
  fetch,
  getBalance,
  paymentHistory,
} = useX402();
```

**Use Cases:**
- Check wallet connection status
- Access Solana connection
- Use global fetch function
- Check configuration

---

## Advanced Patterns

### Conditional Payment UI

```tsx
function ConditionalContent() {
  const { fetch, isLoading } = useX402Payment();
  const { usdcBalance } = useWalletBalance();
  const { connected } = useWallet();
  const [content, setContent] = useState(null);

  const loadContent = async () => {
    if (!connected) {
      alert('Please connect your wallet');
      return;
    }

    if (usdcBalance < 0.001) {
      alert('Insufficient USDC balance');
      return;
    }

    const response = await fetch('/api/premium');
    setContent(await response.json());
  };

  return (
    <div>
      <button onClick={loadContent} disabled={isLoading || !connected}>
        Load Content
      </button>
      {content && <ContentDisplay data={content} />}
    </div>
  );
}
```

### Payment Confirmation Modal

```tsx
function PaymentConfirmationModal() {
  const [showModal, setShowModal] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(null);

  const payment = useX402Payment({
    onPaymentRequired: (requirements) => {
      setPendingRequest({
        url: requirements.accepts[0].resource,
        amount: parseInt(requirements.accepts[0].maxAmountRequired) / 1_000_000,
        description: requirements.accepts[0].description,
      });
      setShowModal(true);
    },
  });

  const confirmPayment = async () => {
    setShowModal(false);
    // Payment will proceed automatically
  };

  return (
    <>
      {showModal && (
        <Modal>
          <h2>Confirm Payment</h2>
          <p>Amount: ${pendingRequest.amount} USDC</p>
          <p>For: {pendingRequest.description}</p>
          <button onClick={confirmPayment}>Confirm</button>
          <button onClick={() => setShowModal(false)}>Cancel</button>
        </Modal>
      )}
    </>
  );
}
```

### Payment Budget Tracker

```tsx
function BudgetTracker() {
  const { totalSpent, history } = usePaymentHistory();
  const MONTHLY_BUDGET = 10; // $10 USDC

  const thisMonthSpent = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    return history
      .filter(p => p.timestamp >= monthStart.getTime() && p.status === 'confirmed')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [history]);

  const budgetRemaining = MONTHLY_BUDGET - thisMonthSpent;
  const percentUsed = (thisMonthSpent / MONTHLY_BUDGET) * 100;

  return (
    <div>
      <h3>Monthly Budget</h3>
      <ProgressBar value={percentUsed} />
      <p>Used: ${thisMonthSpent.toFixed(2)} / ${MONTHLY_BUDGET}</p>
      <p>Remaining: ${budgetRemaining.toFixed(2)}</p>
      {budgetRemaining < 1 && (
        <Alert>Warning: Low budget remaining!</Alert>
      )}
    </div>
  );
}
```

### Retry with Exponential Backoff

```tsx
function ResilientFetch() {
  const { fetch } = useX402Payment({ maxRetries: 5 });

  const fetchWithRetry = async (url, maxAttempts = 3) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fetch(url);
      } catch (err) {
        if (attempt === maxAttempts) throw err;
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  };

  return {
    fetchWithRetry,
  };
}
```

---

## Best Practices

### 1. Error Handling

Always handle errors gracefully:

```tsx
const { fetch, error } = useX402Payment({
  onError: (err) => {
    // Log to error tracking service
    Sentry.captureException(err);

    // Show user-friendly message
    if (err.message.includes('Insufficient balance')) {
      toast.error('Please add USDC to your wallet');
    } else if (err.message.includes('Wallet not connected')) {
      toast.error('Please connect your wallet first');
    } else {
      toast.error('Payment failed. Please try again.');
    }
  },
});
```

### 2. Loading States

Show appropriate loading UI:

```tsx
function LoadingExample() {
  const { fetch, isLoading } = useX402Payment();

  return (
    <button disabled={isLoading}>
      {isLoading ? (
        <>
          <Spinner />
          <span>Processing payment...</span>
        </>
      ) : (
        'Load Data'
      )}
    </button>
  );
}
```

### 3. Balance Checks

Check balance before expensive operations:

```tsx
const { usdcBalance } = useWalletBalance();
const REQUIRED_BALANCE = 0.01;

const canAffordOperation = usdcBalance >= REQUIRED_BALANCE;

<button disabled={!canAffordOperation}>
  {canAffordOperation
    ? 'Perform Operation'
    : `Need at least ${REQUIRED_BALANCE} USDC`
  }
</button>
```

### 4. Network Consistency

Ensure network matches across providers:

```tsx
// ❌ BAD: Mismatched networks
<ConnectionProvider endpoint="https://api.devnet.solana.com">
  <X402Provider config={{ network: 'mainnet-beta' }}>

// ✅ GOOD: Consistent networks
<ConnectionProvider endpoint="https://api.devnet.solana.com">
  <X402Provider config={{
    solanaRpcUrl: 'https://api.devnet.solana.com',
    network: 'devnet'
  }}>
```

### 5. Payment History Management

Clear old history periodically:

```tsx
const { history, clear } = usePaymentHistory({ maxSize: 100 });

useEffect(() => {
  // Clear history older than 30 days
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const recentHistory = history.filter(p => p.timestamp > thirtyDaysAgo);

  if (recentHistory.length < history.length) {
    // History was trimmed, update storage
    localStorage.setItem('x402-payment-history', JSON.stringify(recentHistory));
  }
}, [history]);
```

---

## Troubleshooting

### Wallet Not Connecting

**Symptoms:** Wallet button doesn't work, no wallets detected

**Solutions:**
1. Ensure wallet extension is installed
2. Check that WalletProvider includes wallet adapters:
   ```tsx
   const wallets = [new PhantomWalletAdapter()];
   <WalletProvider wallets={wallets}>
   ```
3. Import wallet adapter CSS:
   ```tsx
   import '@solana/wallet-adapter-react-ui/styles.css';
   ```

### 402 Payments Not Working

**Symptoms:** Fetch returns 402 but no payment is created

**Solutions:**
1. Verify wallet is connected and has USDC
2. Check network matches (devnet/mainnet)
3. Ensure API returns proper x402 format:
   ```json
   {
     "x402Version": 1,
     "accepts": [{
       "scheme": "exact",
       "network": "solana-devnet",
       "payTo": "token-account-address",
       "asset": "usdc-mint-address",
       "maxAmountRequired": "1000"
     }]
   }
   ```
4. Enable debug mode to see detailed logs:
   ```tsx
   <X402Provider config={{ debug: true }}>
   ```

### Balance Shows Zero

**Symptoms:** useWalletBalance returns 0 even though wallet has USDC

**Solutions:**
1. Check wallet is connected
2. Verify network configuration matches wallet network
3. Ensure USDC token account exists for wallet
4. Check RPC endpoint is responding:
   ```tsx
   const { error } = useWalletBalance();
   console.log('Balance error:', error);
   ```

### Payment History Not Persisting

**Symptoms:** Payment history disappears on page refresh

**Solutions:**
1. Ensure persistence is enabled:
   ```tsx
   usePaymentHistory({ persist: true })
   ```
2. Check localStorage is available (not in incognito mode)
3. Verify browser isn't blocking localStorage
4. Check for storage quota errors in console

### Type Errors with Wallet Adapter

**Symptoms:** TypeScript errors with wallet types

**Solutions:**
1. Ensure all packages are compatible versions
2. Install @types packages:
   ```bash
   npm install --save-dev @types/react @types/react-dom
   ```
3. Update tsconfig.json:
   ```json
   {
     "compilerOptions": {
       "jsx": "react",
       "esModuleInterop": true,
       "skipLibCheck": true
     }
   }
   ```

---

## Production Checklist

Before deploying to production:

- [ ] Switch to mainnet RPC endpoint
- [ ] Update network config to 'mainnet-beta'
- [ ] Disable debug logging
- [ ] Implement error tracking (Sentry, etc.)
- [ ] Add analytics for payment events
- [ ] Test with real USDC on mainnet-beta
- [ ] Implement rate limiting on API
- [ ] Set up monitoring for failed payments
- [ ] Document payment flows for users
- [ ] Test with multiple wallet providers
- [ ] Implement payment confirmation UI
- [ ] Add budget/spending limits if needed
- [ ] Set up alerting for payment errors

---

## Next Steps

- Review the [complete API documentation](./packages/react/README.md)
- Explore the [example application](./examples/react-app)
- Read about [x402 protocol compliance](./X402_COMPLIANCE.md)
- Join our [Discord community](https://discord.gg/x402-solana)

---

Built with ❤️ by the x402-solana-toolkit team
