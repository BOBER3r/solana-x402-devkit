# @x402-solana/testing

Comprehensive testing utilities for x402-solana-toolkit. Write fast, reliable tests without depending on Solana devnet RPC.

## Features

- **Mock Payment Verifier** - Verify payments without blockchain calls
- **Mock x402 Responses** - Generate valid PaymentRequirements objects
- **Mock Solana RPC** - Simulate Connection without real RPC endpoints
- **Mock Transactions** - Create realistic Solana transactions with USDC transfers
- **Test Helpers** - Generate signatures, addresses, wallets, and manipulate time
- **Failure Simulation** - Test error handling with configurable failure modes
- **Fast & Reliable** - No network calls, no devnet dependency, deterministic tests

## Installation

```bash
npm install --save-dev @x402-solana/testing
```

## Quick Start

```typescript
import {
  mockX402Response,
  mockPaymentVerifier,
  mockX402PaymentHeader,
  createTestWallet,
} from '@x402-solana/testing';

describe('Payment API', () => {
  it('should handle 402 response', () => {
    const wallet = createTestWallet('test');
    const requirements = mockX402Response({
      priceUSD: 0.001,
      recipientWallet: wallet.address,
    });

    expect(requirements.x402Version).toBe(1);
    expect(requirements.accepts[0].maxAmountRequired).toBe('1000');
  });

  it('should verify payment', async () => {
    const verifier = mockPaymentVerifier({ autoApprove: true });
    const wallet = createTestWallet('test');
    const signature = 'MockSignature123';

    const result = await verifier.verifyPayment(
      signature,
      wallet.usdcAccount,
      0.001
    );

    expect(result.valid).toBe(true);
    expect(result.transfer.amount).toBe(1000);
  });
});
```

## Mock x402 Responses

Generate valid PaymentRequirements for testing 402 responses:

```typescript
import { mockX402Response, createTestWallet } from '@x402-solana/testing';

const wallet = createTestWallet('recipient');

// Basic payment requirements
const requirements = mockX402Response({
  priceUSD: 0.001,
  recipientWallet: wallet.address,
});

// Custom options
const custom = mockX402Response({
  priceUSD: 0.005,
  recipientWallet: wallet.address,
  network: 'mainnet-beta',
  description: 'Premium API access',
  resource: '/api/premium',
  timeoutSeconds: 600,
});

// Multiple payment tiers
const tiered = mockX402MultiResponse([
  { priceUSD: 0.001, recipientWallet: wallet.address, description: 'Basic' },
  { priceUSD: 0.01, recipientWallet: wallet.address, description: 'Premium' },
]);
```

### Generate X-PAYMENT Header

```typescript
import {
  mockX402PaymentHeader,
  generateMockSignature,
} from '@x402-solana/testing';

// With signature
const signature = generateMockSignature();
const header = mockX402PaymentHeader({ signature, network: 'devnet' });

// Use in HTTP request
fetch('/api/endpoint', {
  headers: {
    'X-PAYMENT': header,
  },
});
```

### Complete Payment Flow

```typescript
import { mockX402PaymentFlow, createTestWallet } from '@x402-solana/testing';

const wallet = createTestWallet('recipient');
const { requirements, paymentHeader, signature } = mockX402PaymentFlow({
  priceUSD: 0.001,
  recipientWallet: wallet.address,
});

// First request - get 402
const res1 = await fetch('/api/endpoint');
expect(res1.status).toBe(402);
expect(await res1.json()).toEqual(requirements);

// Second request - provide payment
const res2 = await fetch('/api/endpoint', {
  headers: { 'X-PAYMENT': paymentHeader },
});
expect(res2.status).toBe(200);
```

## Mock Payment Verifier

Test payment verification without blockchain calls:

```typescript
import { mockPaymentVerifier, createTestWallet } from '@x402-solana/testing';

// Auto-approve all payments
const verifier = mockPaymentVerifier({ autoApprove: true });

const wallet = createTestWallet('recipient');
const result = await verifier.verifyPayment(
  'signature',
  wallet.usdcAccount,
  0.001
);

expect(result.valid).toBe(true);
```

### Simulate Failures

```typescript
// Amount mismatch (paid less)
const amountVerifier = mockPaymentVerifier({
  failureMode: 'amount_mismatch',
});

// Wrong recipient
const recipientVerifier = mockPaymentVerifier({
  failureMode: 'wrong_recipient',
});

// Expired payment
const expiredVerifier = mockPaymentVerifier({
  failureMode: 'expired_payment',
});

// Transaction not found
const notFoundVerifier = mockPaymentVerifier({
  failureMode: 'tx_not_found',
});
```

### Replay Attack Detection

```typescript
const verifier = mockPaymentVerifier({
  autoApprove: true,
  trackReplays: true,
});

// First payment succeeds
const result1 = await verifier.verifyPayment('sig', recipient, 0.001);
expect(result1.valid).toBe(true);

// Second payment with same signature fails
const result2 = await verifier.verifyPayment('sig', recipient, 0.001);
expect(result2.valid).toBe(false);
expect(result2.code).toBe('REPLAY_ATTACK');
```

### Available Failure Modes

- `amount_mismatch` - Paid less than required
- `wrong_recipient` - Paid to wrong address
- `replay_attack` - Signature already used
- `expired_payment` - Transaction too old
- `wrong_mint` - Not USDC
- `wrong_network` - Mainnet vs devnet mismatch
- `tx_not_found` - Transaction doesn't exist
- `tx_failed` - Transaction failed on chain
- `no_usdc_transfer` - No USDC transfer found
- `rpc_error` - RPC failure

## Mock Solana RPC

Simulate Solana Connection without real RPC:

```typescript
import {
  mockSolanaRPC,
  generateMockTransaction,
  getTransactionSignature,
} from '@x402-solana/testing';

// Create mock transaction
const tx = generateMockTransaction({ amount: 1000 });
const signature = getTransactionSignature(tx);

// Set up mock RPC with transaction
const txMap = new Map([[signature, tx]]);
const rpc = mockSolanaRPC({ transactions: txMap });

// Fetch transaction (no network call)
const fetchedTx = await rpc.getTransaction(signature);
expect(fetchedTx).toEqual(tx);
```

### Simulate RPC Failures

```typescript
// Timeout
const timeoutRPC = mockSolanaRPC({ failureMode: 'timeout' });
await expect(timeoutRPC.getTransaction('sig')).rejects.toThrow('timeout');

// Rate limiting
const rateLimitRPC = mockSolanaRPC({ failureMode: 'rate_limit' });

// Network errors
const networkRPC = mockSolanaRPC({ failureMode: 'network_error' });
```

### Simulate Latency

```typescript
const slowRPC = mockSolanaRPC({ latencyMs: 500 });

const start = Date.now();
await slowRPC.getTransaction('sig');
const duration = Date.now() - start;

expect(duration).toBeGreaterThanOrEqual(500);
```

### Random Failures

```typescript
// 20% failure rate
const unreliableRPC = mockSolanaRPC({ failureRate: 0.2 });
```

## Test Helpers

### Signatures

```typescript
import {
  generateMockSignature,
  generateMockSignatures,
  isValidSignatureFormat,
} from '@x402-solana/testing';

// Random signature
const sig = generateMockSignature();

// Deterministic signature
const detSig = generateMockSignature({ seed: 'test' });

// Multiple signatures
const signatures = generateMockSignatures(5);

// Validate format
if (isValidSignatureFormat(sig)) {
  // Valid base58 signature
}
```

### Addresses & Wallets

```typescript
import {
  generateMockAddress,
  generateMockTokenAccount,
  createTestWallet,
  createTestWallets,
  getCommonTestAddresses,
} from '@x402-solana/testing';

// Random address
const address = generateMockAddress();

// Deterministic address
const detAddress = generateMockAddress('seed');

// USDC token account
const usdcAccount = generateMockTokenAccount({
  owner: address,
  network: 'devnet',
});

// Complete wallet setup
const wallet = createTestWallet('test-user');
console.log({
  address: wallet.address,
  usdcAccount: wallet.usdcAccount,
  keypair: wallet.keypair,
});

// Multiple wallets
const [sender, recipient, facilitator] = createTestWallets(3, 'user');

// Common test addresses
const addresses = getCommonTestAddresses();
const { sender, senderUSDC, recipient, recipientUSDC } = addresses;
```

### Time Manipulation

```typescript
import {
  mockCurrentTime,
  restoreTime,
  timeTravel,
  createTimestamp,
  createExpiredTimestamp,
  createValidTimestamp,
} from '@x402-solana/testing';

// Mock to specific time
mockCurrentTime({ now: 1609459200000 }); // Jan 1, 2021
console.log(Date.now()); // 1609459200000

// Travel forward 5 minutes
timeTravel(5 * 60 * 1000);

// Restore real time
restoreTime();

// Create timestamps
const now = createTimestamp();
const fiveMinutesAgo = createTimestamp({ minutesAgo: 5 });
const tomorrow = createTimestamp({ daysFromNow: 1 });

// Expired timestamp (for testing max age)
const maxAge = 5 * 60 * 1000; // 5 minutes
const expired = createExpiredTimestamp(maxAge);
// Returns timestamp older than maxAge

// Valid timestamp (within max age)
const valid = createValidTimestamp(maxAge);
// Returns timestamp within maxAge limit
```

## Mock Transactions

```typescript
import {
  generateMockTransaction,
  generateMockTransactions,
  getTransactionSignature,
} from '@x402-solana/testing';

// Basic USDC transfer
const tx = generateMockTransaction({
  amount: 1000, // $0.001 in micro-USDC
  from: 'SourceAccount...',
  to: 'DestAccount...',
  network: 'devnet',
});

// Failed transaction
const failedTx = generateMockTransaction({
  amount: 1000,
  success: false,
});

// Old transaction (for expiry testing)
const oldTx = generateMockTransaction({
  amount: 1000,
  blockTime: Math.floor(Date.now() / 1000) - 600, // 10 minutes ago
});

// Multiple transactions
const transactions = generateMockTransactions(5, { amount: 1000 });

// Extract signature
const signature = getTransactionSignature(tx);
```

## Integration Examples

### Express API Test

```typescript
import request from 'supertest';
import express from 'express';
import {
  mockX402Response,
  mockX402PaymentHeader,
  createTestWallet,
} from '@x402-solana/testing';

describe('Express API with x402', () => {
  const app = express();
  const wallet = createTestWallet('api');

  app.get('/api/premium', (req, res) => {
    const payment = req.headers['x-payment'];

    if (!payment) {
      return res.status(402).json(
        mockX402Response({
          priceUSD: 0.001,
          recipientWallet: wallet.address,
        })
      );
    }

    // In real code, verify payment here
    res.json({ data: 'premium content' });
  });

  it('should return 402 without payment', async () => {
    const res = await request(app).get('/api/premium');

    expect(res.status).toBe(402);
    expect(res.body.x402Version).toBe(1);
  });

  it('should return 200 with valid payment', async () => {
    const header = mockX402PaymentHeader({
      signature: 'MockSignature',
      network: 'devnet',
    });

    const res = await request(app)
      .get('/api/premium')
      .set('X-PAYMENT', header);

    expect(res.status).toBe(200);
  });
});
```

### Testing with Real Verifier (Mocked RPC)

```typescript
import { TransactionVerifier } from '@x402-solana/core';
import {
  mockSolanaRPC,
  generateMockTransaction,
  getTransactionSignature,
  createTestWallet,
} from '@x402-solana/testing';

describe('Payment Verification', () => {
  it('should verify payment with mocked RPC', async () => {
    const recipient = createTestWallet('recipient');

    // Create transaction
    const tx = generateMockTransaction({
      amount: 1000,
      to: recipient.usdcAccount,
    });
    const signature = getTransactionSignature(tx);

    // Mock RPC
    const rpc = mockSolanaRPC({
      transactions: new Map([[signature, tx]]),
    });

    // Use real verifier with mocked RPC
    // Note: You'd need to modify TransactionVerifier to accept
    // a custom connection, or use dependency injection
    const verifier = new TransactionVerifier({
      rpcUrl: 'mock', // Not used
      // connection: rpc, // If verifier supports custom connection
    });

    const result = await verifier.verifyPayment(
      signature,
      recipient.usdcAccount,
      0.001
    );

    expect(result.valid).toBe(true);
  });
});
```

## CI/CD Setup

### GitHub Actions

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      # No need for Solana devnet access!
```

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};
```

```typescript
// tests/setup.ts
import { restoreTime } from '@x402-solana/testing';

afterEach(() => {
  // Always restore time after each test
  restoreTime();
});
```

## Migration Guide

### From Devnet Tests to Mocks

**Before (slow, unreliable):**

```typescript
import { Connection } from '@solana/web3.js';
import { TransactionVerifier } from '@x402-solana/core';

describe('Payment Verification', () => {
  it('should verify payment', async () => {
    // Requires devnet RPC
    const connection = new Connection('https://api.devnet.solana.com');

    // Requires real transaction on devnet
    const signature = 'RealTransactionSignature...';

    const verifier = new TransactionVerifier({
      rpcUrl: 'https://api.devnet.solana.com',
    });

    // Slow: makes real RPC call
    const result = await verifier.verifyPayment(signature, recipient, 0.001);

    expect(result.valid).toBe(true);
  }, 30000); // 30 second timeout
});
```

**After (fast, reliable):**

```typescript
import { mockPaymentVerifier, createTestWallet } from '@x402-solana/testing';

describe('Payment Verification', () => {
  it('should verify payment', async () => {
    // No RPC needed
    const verifier = mockPaymentVerifier({ autoApprove: true });
    const wallet = createTestWallet('recipient');

    // Fast: no network call
    const result = await verifier.verifyPayment(
      'MockSignature',
      wallet.usdcAccount,
      0.001
    );

    expect(result.valid).toBe(true);
  }); // Completes in <10ms
});
```

## Advanced Usage

### Custom Test Scenarios

```typescript
import { setupTestEnvironment, cleanupTestEnvironment } from '@x402-solana/testing';

describe('Advanced scenarios', () => {
  it('should handle complex payment flow', async () => {
    const env = setupTestEnvironment('full');

    // env includes: wallet, verifier, requirements, rpc

    // Your test logic here

    await cleanupTestEnvironment(env);
  });
});
```

### Deterministic Tests

```typescript
import { generateMockSignature, createTestWallet } from '@x402-solana/testing';

// Always use seeds for reproducible tests
const wallet = createTestWallet('user-123');
const signature = generateMockSignature({ seed: 'payment-1' });

// Tests will produce same results every time
```

## Troubleshooting

### Mock verifier always rejects

Make sure `autoApprove` is set to `true`:

```typescript
const verifier = mockPaymentVerifier({ autoApprove: true });
```

### Time tests are flaky

Always restore time after tests:

```typescript
afterEach(() => {
  restoreTime();
});
```

### Signature validation fails

Use `generateMockSignature()` to create valid signatures:

```typescript
const signature = generateMockSignature();
// ✅ Valid base58 signature

const invalid = 'not-a-signature';
// ❌ Will fail validation
```

## API Reference

See [API Documentation](./docs/api.md) for complete API reference.

## Contributing

Contributions welcome! Please see [CONTRIBUTING.md](../../CONTRIBUTING.md).

## License

MIT