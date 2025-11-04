# x402 v1 Implementation Guide

**Complete guide for implementing x402 v1 protocol on Solana using @x402-solana toolkit v0.2.0**

## Table of Contents

1. [Protocol Overview](#protocol-overview)
2. [Payment Requirements Format](#payment-requirements-format)
3. [Payment Header Format](#payment-header-format)
4. [Server Implementation](#server-implementation)
   - [Express Example](#express-example)
   - [NestJS Example](#nestjs-example)
5. [Client Implementation](#client-implementation)
6. [Type Definitions](#type-definitions)
7. [Real-World Examples](#real-world-examples)
8. [Troubleshooting](#troubleshooting)

---

## Protocol Overview

### What is x402 v1?

x402 v1 is the official protocol for HTTP micropayments defined by Coinbase. It uses:
- HTTP `402 Payment Required` status code
- JSON payment requirements in response body
- Base64-encoded payment proof in `X-PAYMENT` request header
- Blockchain-agnostic design (we implement for Solana)

### Key Concepts

1. **Payment Requirements** - Server tells client how to pay (402 response)
2. **Payment Proof** - Client sends transaction signature/data (X-PAYMENT header)
3. **Payment Verification** - Server validates on-chain transaction
4. **Resource Access** - Server grants access after successful verification

---

## Payment Requirements Format

### Complete Structure

When a client requests a paid resource without payment, the server responds with `402 Payment Required` and this body:

```json
{
  "x402Version": 1,
  "accepts": [
    {
      "scheme": "exact",
      "network": "solana-devnet",
      "maxAmountRequired": "1000",
      "resource": "/api/premium-data",
      "description": "Access to premium data",
      "mimeType": "application/json",
      "outputSchema": null,
      "payTo": "EPgK11Qa7XectzCN7N5XwnhWzg8Bz9TFY1CJyNMib2zD",
      "maxTimeoutSeconds": 300,
      "asset": "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr",
      "extra": null
    }
  ],
  "error": "Payment Required"
}
```

### Field-by-Field Explanation

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `x402Version` | number | ✅ | Protocol version (always 1) | `1` |
| `accepts` | array | ✅ | List of acceptable payment methods | `[{...}]` |
| `error` | string | ✅ | Human-readable error message | `"Payment Required"` |

#### PaymentAccept Fields

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `scheme` | string | ✅ | Payment scheme (`"exact"` for fixed amounts) | `"exact"` |
| `network` | string | ✅ | Network identifier | `"solana-devnet"` or `"solana-mainnet"` |
| `maxAmountRequired` | string | ✅ | Amount in smallest unit (micro-USDC) | `"1000"` = $0.001 |
| `resource` | string | ✅ | Resource being paid for | `"/api/data"` |
| `description` | string | ✅ | What payment is for | `"Premium API access"` |
| `mimeType` | string | ✅ | Response content type | `"application/json"` |
| `outputSchema` | object\|null | ✅ | JSON schema for response (optional) | `null` |
| `payTo` | string | ✅ | **Token account address** (flat string) | `"EPgK11Qa7..."` |
| `maxTimeoutSeconds` | number | ✅ | Payment validity timeout | `300` |
| `asset` | string | ✅ | **USDC mint address** (top-level) | `"Gh9ZwEmdLJ..."` |
| `extra` | object\|null | ✅ | Additional data (optional) | `null` |

### Critical x402 v1 Format Rules

✅ **DO THIS:**
```json
{
  "payTo": "EPgK11Qa7XectzCN7N5XwnhWzg8Bz9TFY1CJyNMib2zD",
  "asset": "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr",
  "maxTimeoutSeconds": 300
}
```

❌ **NOT THIS (v0.1.1 format - deprecated):**
```json
{
  "payTo": {
    "address": "EPgK11Qa7XectzCN7N5XwnhWzg8Bz9TFY1CJyNMib2zD",
    "asset": "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"
  },
  "timeout": 300
}
```

### Network Identifiers

| Solana Network | x402 v1 Identifier |
|----------------|-------------------|
| Devnet | `"solana-devnet"` |
| Mainnet Beta | `"solana-mainnet"` |

### Amount Format

Amounts are in **micro-USDC** (6 decimals):
- $0.001 = `"1000"`
- $0.01 = `"10000"`
- $1.00 = `"1000000"`

---

## Payment Header Format

### X-PAYMENT Header Structure

After creating a payment transaction, the client sends proof in the `X-PAYMENT` header:

```json
{
  "x402Version": 1,
  "scheme": "exact",
  "network": "solana-devnet",
  "payload": {
    "signature": "5j7s6NiJS3JAkvxpdMf4TKe5s2HxunkYvW8NE45pMf..."
  }
}
```

This JSON is **base64-encoded** before being sent as the header value.

### Payload Formats

x402 v1 supports two payload formats:

#### 1. Signature Only (Recommended for Solana)

```json
{
  "x402Version": 1,
  "scheme": "exact",
  "network": "solana-devnet",
  "payload": {
    "signature": "5j7s6NiJS3JAkvxpdMf4TKe5s2HxunkYvW8NE..."
  }
}
```

Server fetches transaction from Solana RPC using the signature.

#### 2. Serialized Transaction (Future-proof)

```json
{
  "x402Version": 1,
  "scheme": "exact",
  "network": "solana-devnet",
  "payload": {
    "serializedTransaction": "base64EncodedTransaction...",
    "signature": "5j7s6NiJS3JAkvxpdMf4TKe5s2HxunkYvW8NE..."
  }
}
```

Includes full transaction data for faster verification.

---

## Server Implementation

The @x402-solana/server package provides x402 v1 compliant middleware for multiple Node.js frameworks. This guide covers **Express** and **NestJS** implementations. Fastify support is also available in the package.

### Express Example

```typescript
import express from 'express';
import { X402Middleware } from '@x402-solana/server';

const app = express();

// Initialize x402 middleware
const x402 = new X402Middleware({
  solanaRpcUrl: 'https://api.devnet.solana.com',
  recipientWallet: 'G1tLVttDddYPk58qWAA4dSpAJEVxScHWovZEzkQQJLFa',
  network: 'devnet',
});

// Free endpoint
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello, World! (free)' });
});

// Paid endpoint
app.get('/api/premium-data',
  x402.requirePayment(0.001),  // $0.001 USDC
  (req, res) => {
    // Payment verified - req.payment contains payment info
    res.json({
      data: 'Premium content',
      paidBy: req.payment?.payer,
      amount: req.payment?.amount,
    });
  }
);

app.listen(3000);
```

### What Happens

1. **Client requests without payment:**
   ```http
   GET /api/premium-data HTTP/1.1
   ```

2. **Server responds with 402:**
   ```http
   HTTP/1.1 402 Payment Required
   Content-Type: application/json

   {
     "x402Version": 1,
     "accepts": [{
       "scheme": "exact",
       "network": "solana-devnet",
       "maxAmountRequired": "1000",
       "payTo": "EPgK11Qa7...",
       "asset": "Gh9ZwEmdLJ...",
       "maxTimeoutSeconds": 300,
       ...
     }],
     "error": "Payment Required"
   }
   ```

3. **Client creates USDC transfer transaction**

4. **Client retries with payment proof:**
   ```http
   GET /api/premium-data HTTP/1.1
   X-PAYMENT: eyJ4NDAyVmVyc2lvbiI6MSwic2NoZW1lIjoi...
   ```

5. **Server verifies transaction on Solana**

6. **Server grants access:**
   ```http
   HTTP/1.1 200 OK
   Content-Type: application/json

   {
     "data": "Premium content",
     "paidBy": "ClientWalletAddress...",
     "amount": 0.001
   }
   ```

### Reading Payment Requirements

If you need to read the generated requirements:

```typescript
import { PaymentRequirementsGenerator } from '@x402-solana/core';

const generator = new PaymentRequirementsGenerator({
  recipientWallet: 'G1tLVttDddYPk58qWAA4dSpAJEVxScHWovZEzkQQJLFa',
  network: 'devnet',
});

const requirements = generator.generate(0.001, {
  description: 'Premium API access',
  resource: '/api/premium-data',
});

// Access fields:
const payTo = requirements.accepts[0].payTo;           // String (token account)
const asset = requirements.accepts[0].asset;           // String (USDC mint)
const amount = requirements.accepts[0].maxAmountRequired;  // String ("1000")
const timeout = requirements.accepts[0].maxTimeoutSeconds; // Number (300)
```

### Verifying Payments Manually

```typescript
import { TransactionVerifier } from '@x402-solana/core';
import { Connection } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com');
const verifier = new TransactionVerifier(connection, {
  network: 'devnet',
});

const result = await verifier.verifyPayment({
  signature: '5j7s6NiJS3JAkvxpdMf4TKe5s2HxunkYvW8NE...',
  expectedRecipient: 'EPgK11Qa7XectzCN7N5XwnhWzg8Bz9TFY1CJyNMib2zD',
  expectedAmountUSD: 0.001,
  maxAgeMs: 300000, // 5 minutes
});

if (result.valid) {
  console.log('✅ Payment verified!');
  console.log('Payer:', result.payer);
  console.log('Amount:', result.amount, 'USDC');
} else {
  console.log('❌ Payment invalid:', result.error);
}
```

### NestJS Example

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { X402Module } from '@x402-solana/server/nestjs';

@Module({
  imports: [
    X402Module.register({
      solanaRpcUrl: 'https://api.devnet.solana.com',
      recipientWallet: 'G1tLVttDddYPk58qWAA4dSpAJEVxScHWovZEzkQQJLFa',
      network: 'devnet',
      debug: true, // Optional: Enable debug logging
    }),
  ],
  controllers: [ApiController],
})
export class AppModule {}
```

```typescript
// api.controller.ts
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { X402Guard, RequirePayment, X402PaymentInfo } from '@x402-solana/server/nestjs';

@Controller('api')
export class ApiController {
  // Free endpoint - no guard
  @Get('hello')
  getHello() {
    return { message: 'Hello, World! (free)' };
  }

  // Basic paid endpoint
  @Get('premium')
  @UseGuards(X402Guard)
  @RequirePayment(0.001)  // $0.001 USDC
  getPremiumData(@Request() req) {
    // Access payment info from request
    const payment: X402PaymentInfo = req.payment;

    return {
      data: 'Premium content',
      paidBy: payment.payer,
      amount: payment.amount,
      signature: payment.signature,
    };
  }

  // Advanced paid endpoint with options
  @Get('analytics')
  @UseGuards(X402Guard)
  @RequirePayment(0.05, {
    description: 'Advanced analytics report',
    resource: '/api/analytics',
    timeoutSeconds: 600, // 10 minutes
  })
  getAnalytics(@Request() req) {
    const payment: X402PaymentInfo = req.payment;

    return {
      analytics: 'Complex data...',
      report: 'Generated for ' + payment.payer,
      timestamp: payment.blockTime,
    };
  }

  // Tiered pricing example
  @Get('basic-report')
  @UseGuards(X402Guard)
  @RequirePayment(0.01, {
    description: 'Basic report',
  })
  getBasicReport() {
    return { report: 'basic data' };
  }

  @Get('pro-report')
  @UseGuards(X402Guard)
  @RequirePayment(0.10, {
    description: 'Pro report with advanced features',
  })
  getProReport() {
    return { report: 'pro data with extras' };
  }
}
```

### NestJS Payment Flow

1. **Client requests without payment:**
   ```http
   GET /api/premium HTTP/1.1
   ```

2. **X402Guard intercepts request:**
   - Checks for `@RequirePayment` decorator
   - No X-PAYMENT header found
   - Generates x402 v1 payment requirements

3. **Server responds with 402:**
   ```http
   HTTP/1.1 402 Payment Required
   Content-Type: application/json

   {
     "x402Version": 1,
     "accepts": [{
       "scheme": "exact",
       "network": "solana-devnet",
       "maxAmountRequired": "1000",
       "payTo": "EPgK11Qa7...",
       "asset": "Gh9ZwEmdLJ...",
       "maxTimeoutSeconds": 300,
       ...
     }],
     "error": "Payment Required"
   }
   ```

4. **Client creates payment and retries with X-PAYMENT header**

5. **X402Guard verifies payment:**
   - Parses X-PAYMENT header using `parseX402Payment()`
   - Verifies transaction on Solana
   - Attaches payment info to request

6. **Controller handler executes:**
   ```typescript
   // Payment info is now available
   const payment = req.payment;
   // { signature, amount, payer, blockTime, slot }
   ```

### NestJS Configuration Options

```typescript
interface X402Config {
  /** Solana RPC URL */
  solanaRpcUrl: string;

  /** Recipient wallet address (your wallet) */
  recipientWallet: string;

  /** Network (devnet or mainnet-beta) */
  network: 'devnet' | 'mainnet-beta';

  /** Redis for replay attack prevention (optional) */
  redis?: {
    url: string;  // e.g., 'redis://localhost:6379'
  };

  /** Maximum payment age in milliseconds (default: 300000) */
  maxPaymentAgeMs?: number;

  /** Enable debug logging (default: false) */
  debug?: boolean;
}
```

### NestJS with Redis (Production Setup)

```typescript
// app.module.ts
@Module({
  imports: [
    X402Module.register({
      solanaRpcUrl: process.env.SOLANA_RPC_URL!,
      recipientWallet: process.env.RECIPIENT_WALLET!,
      network: 'mainnet-beta',
      redis: {
        url: process.env.REDIS_URL!,
      },
      maxPaymentAgeMs: 600_000, // 10 minutes
      debug: false, // Disable in production
    }),
  ],
  controllers: [ApiController],
})
export class AppModule {}
```

### Reading Payment Requirements in NestJS

If you need to generate or inspect payment requirements directly:

```typescript
import { PaymentRequirementsGenerator } from '@x402-solana/core';

@Injectable()
export class PaymentService {
  private generator: PaymentRequirementsGenerator;

  constructor() {
    this.generator = new PaymentRequirementsGenerator({
      recipientWallet: 'G1tLVttDddYPk58qWAA4dSpAJEVxScHWovZEzkQQJLFa',
      network: 'devnet',
    });
  }

  getPaymentRequirements(priceUSD: number) {
    const requirements = this.generator.generate(priceUSD, {
      description: 'Custom payment',
      resource: '/api/custom',
    });

    // Access x402 v1 compliant fields:
    const payTo = requirements.accepts[0].payTo;           // String
    const asset = requirements.accepts[0].asset;           // String
    const amount = requirements.accepts[0].maxAmountRequired;  // String
    const timeout = requirements.accepts[0].maxTimeoutSeconds; // Number

    return requirements;
  }
}
```

---

## Client Implementation

### Automatic Payment Handling

```typescript
import { X402Client } from '@x402-solana/client';

const client = new X402Client({
  solanaRpcUrl: 'https://api.devnet.solana.com',
  walletPrivateKey: process.env.WALLET_PRIVATE_KEY, // Base58 encoded
  network: 'devnet',
});

// Use exactly like fetch() - payments happen automatically!
const response = await client.fetch('https://api.example.com/premium-data');
const data = await response.json();
```

### What the Client Does

1. **Makes initial request**
2. **Receives 402 response with payment requirements**
3. **Parses requirements:**
   ```typescript
   const payTo = requirements.accepts[0].payTo;  // Token account
   const asset = requirements.accepts[0].asset;  // USDC mint
   const amount = requirements.accepts[0].maxAmountRequired; // micro-USDC
   ```
4. **Creates USDC transfer transaction**
5. **Waits for confirmation (~400-800ms)**
6. **Retries request with X-PAYMENT header**
7. **Returns successful response**

### Manual Payment Creation

If you need more control:

```typescript
import { X402Client } from '@x402-solana/client';

const client = new X402Client({
  solanaRpcUrl: 'https://api.devnet.solana.com',
  walletPrivateKey: process.env.WALLET_PRIVATE_KEY,
  network: 'devnet',
  autoRetry: false, // Don't automatically pay
});

// Get 402 response
const response = await client.fetch('https://api.example.com/premium-data');

if (response.status === 402) {
  const requirements = await response.json();

  // Parse x402 v1 format:
  const paymentMethod = requirements.accepts[0];
  const recipientAccount = paymentMethod.payTo;        // Flat string
  const usdcMint = paymentMethod.asset;                // Top-level field
  const amountMicroUSDC = paymentMethod.maxAmountRequired;
  const timeoutSeconds = paymentMethod.maxTimeoutSeconds;

  console.log('Payment required:');
  console.log('- To:', recipientAccount);
  console.log('- Amount:', parseInt(amountMicroUSDC) / 1000000, 'USDC');
  console.log('- Asset:', usdcMint);
  console.log('- Timeout:', timeoutSeconds, 'seconds');

  // Create payment manually...
}
```

---

## Type Definitions

### PaymentRequirements

```typescript
interface PaymentRequirements {
  /** x402 protocol version (always 1) */
  x402Version: number;

  /** List of acceptable payment methods */
  accepts: PaymentAccept[];

  /** Human-readable error message */
  error: string;
}
```

### PaymentAccept

```typescript
interface PaymentAccept {
  /** Payment scheme - use 'exact' for fixed-amount payments */
  scheme: string;

  /** Network identifier (e.g., 'solana-devnet', 'solana-mainnet') */
  network: string;

  /** Maximum amount required in smallest unit (micro-USDC for Solana) */
  maxAmountRequired: string;

  /** Resource being paid for */
  resource: string;

  /** Description of what payment is for */
  description: string;

  /** MIME type of the resource (e.g., 'application/json') */
  mimeType: string;

  /** Optional JSON schema for response output */
  outputSchema?: object | null;

  /** Payment destination address (token account for Solana) */
  payTo: string;  // ⚠️ FLAT STRING, not object

  /** Timeout in seconds for payment to be valid */
  maxTimeoutSeconds: number;  // ⚠️ Note the field name

  /** Asset identifier (e.g., USDC mint address) */
  asset: string;  // ⚠️ TOP-LEVEL, not nested

  /** Optional additional data (scheme-specific) */
  extra?: object | null;
}
```

### X402Payment

```typescript
interface X402Payment {
  /** x402 protocol version */
  x402Version: number;

  /** Payment scheme */
  scheme: string;

  /** Network identifier */
  network: string;

  /** Payment payload */
  payload: PaymentPayload;
}

interface PaymentPayload {
  /** Transaction signature (always included) */
  signature: string;

  /** Optional serialized transaction data */
  serializedTransaction?: string;
}
```

---

## Real-World Examples

### Example 1: Reading 402 Response

```typescript
// Receive 402 response
const response = await fetch('https://api.example.com/premium');

if (response.status === 402) {
  const requirements: PaymentRequirements = await response.json();

  // ✅ CORRECT - x402 v1 format
  const paymentMethod = requirements.accepts[0];
  const destination = paymentMethod.payTo;              // Direct string access
  const mint = paymentMethod.asset;                     // Top-level field
  const amountStr = paymentMethod.maxAmountRequired;    // String micro-USDC
  const timeout = paymentMethod.maxTimeoutSeconds;      // Renamed field

  // Convert amount to USD
  const amountUSD = parseInt(amountStr) / 1_000_000;
  console.log(`Payment of $${amountUSD} USDC required`);
  console.log(`Send to: ${destination}`);
  console.log(`USDC Mint: ${mint}`);
  console.log(`Expires in: ${timeout} seconds`);
}
```

### Example 2: Generating Requirements

```typescript
import { PaymentRequirementsGenerator } from '@x402-solana/core';

const generator = new PaymentRequirementsGenerator({
  recipientWallet: 'G1tLVttDddYPk58qWAA4dSpAJEVxScHWovZEzkQQJLFa',
  network: 'devnet',
});

// Generate payment requirements
const requirements = generator.generate(0.05, {
  description: 'Premium AI analysis',
  resource: '/api/analyze',
  timeoutSeconds: 600, // 10 minutes
});

// Requirements will be in correct x402 v1 format:
console.log(requirements);
/*
{
  x402Version: 1,
  accepts: [{
    scheme: 'exact',
    network: 'solana-devnet',
    maxAmountRequired: '50000',
    resource: '/api/analyze',
    description: 'Premium AI analysis',
    mimeType: 'application/json',
    outputSchema: null,
    payTo: 'EPgK11Qa7XectzCN7N5XwnhWzg8Bz9TFY1CJyNMib2zD',
    maxTimeoutSeconds: 600,
    asset: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
    extra: null
  }],
  error: 'Payment Required'
}
*/
```

### Example 3: Multiple Payment Options

```typescript
const requirements = generator.generateMultiple([
  { priceUSD: 0.001, description: 'Basic API call' },
  { priceUSD: 0.01, description: 'Premium API call with caching' },
  { priceUSD: 0.10, description: 'Ultra premium with priority' },
]);

// Client can choose which payment option to use
console.log(requirements.accepts.length); // 3
```

---

## Troubleshooting

### Common Issues

#### Issue: `payTo.address is undefined`

**Cause:** Using v0.1.1 code with v0.2.0 package

**Fix:**
```typescript
// ❌ OLD (v0.1.1)
const addr = requirements.accepts[0].payTo.address;

// ✅ NEW (v0.2.0)
const addr = requirements.accepts[0].payTo;
```

#### Issue: `asset is undefined`

**Cause:** Looking for `asset` in nested `payTo` object

**Fix:**
```typescript
// ❌ OLD (v0.1.1)
const mint = requirements.accepts[0].payTo.asset;

// ✅ NEW (v0.2.0)
const mint = requirements.accepts[0].asset;
```

#### Issue: `timeout is undefined`

**Cause:** Field renamed to `maxTimeoutSeconds`

**Fix:**
```typescript
// ❌ OLD (v0.1.1)
const timeout = requirements.accepts[0].timeout;

// ✅ NEW (v0.2.0)
const timeout = requirements.accepts[0].maxTimeoutSeconds;
```

#### Issue: `scheme` is `solana-usdc` instead of `exact`

**Cause:** Using old custom format instead of official x402 v1

**Fix:** Upgrade to v0.2.0 - the `scheme` is now `"exact"` for fixed payments

### USDC Mint Addresses

| Network | USDC Mint Address |
|---------|------------------|
| Devnet | `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr` |
| Mainnet | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |

### Network String Format

| Network | Correct Format | Wrong Format |
|---------|---------------|--------------|
| Devnet | `"solana-devnet"` | `"devnet"` |
| Mainnet | `"solana-mainnet"` | `"mainnet-beta"` |

---

## Summary Checklist

When implementing x402 v1 on Solana with v0.2.0:

✅ Use `payTo` as a **flat string** (not nested object)
✅ Access `asset` at **top-level** (not inside payTo)
✅ Use `maxTimeoutSeconds` field (not `timeout`)
✅ Use `scheme: "exact"` for fixed payments
✅ Use network format `"solana-devnet"` or `"solana-mainnet"`
✅ Amounts in **micro-USDC** as strings
✅ Include optional `mimeType`, `outputSchema`, `extra` fields
✅ Set `x402Version: 1` in all responses/headers

---

## Additional Resources

- [X402_COMPLIANCE.md](./X402_COMPLIANCE.md) - Full compliance documentation
- [CHANGELOG.md](./CHANGELOG.md) - Version history and breaking changes
- [Official x402 Spec](https://github.com/coinbase/x402) - Coinbase x402 protocol
- [Examples](./examples/) - Working code examples

---

**Last Updated:** 2025-01-04 (v0.2.0)
**Protocol Version:** x402 v1
**Package Version:** @x402-solana/* v0.2.0
