# Fastify x402 API Example

**High-performance Fastify API with x402 micropayments on Solana.**

## What This Shows

- **Fastify framework** - One of the fastest Node.js web frameworks
- **Plugin system** - x402 as a Fastify plugin
- **Route options** - Payment configuration via route options
- **Type safety** - Full TypeScript support
- **Performance** - Optimized for speed and low latency
- **3 Endpoints** - FREE, $0.001, $0.005

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your values:
- `RECIPIENT_WALLET` - Your wallet public key (receives payments)
- `WALLET_PRIVATE_KEY` - Client wallet private key in base58 format

### 3. Run the Demo

Option A - Run both server and client automatically:
```bash
npm run demo
```

Option B - Run separately:
```bash
# Terminal 1 - Start server
npm run server

# Terminal 2 - Run client
npm run client
```

## How It Works

### Server Setup (server.ts)

Register x402 plugin with Fastify:

```typescript
import Fastify from 'fastify';
import { x402FastifyPlugin } from '@x402-solana/server';

const app = Fastify({ logger: true });

// Register plugin
await app.register(x402FastifyPlugin, {
  solanaRpcUrl: 'https://api.devnet.solana.com',
  recipientWallet: process.env.RECIPIENT_WALLET,
  network: 'devnet',
  debug: true,
});
```

### Routes with Payment Options

Use `x402` route option to require payment:

```typescript
// Free endpoint
app.get('/api/hello', async (request, reply) => {
  return { message: 'Free!' };
});

// Paid endpoint with x402 option
app.get('/api/premium',
  {
    x402: {
      priceUSD: 0.001,
      description: 'Premium data',
      resource: '/api/premium',
    },
  },
  async (request, reply) => {
    return {
      message: 'Premium content!',
      paidBy: request.payment?.payer,
      amount: `$${request.payment?.amountUSD}`,
    };
  }
);
```

### Client (client.ts)

Same simple client as all examples:

```typescript
import { X402Client } from '@x402-solana/client';

const client = new X402Client({
  solanaRpcUrl: 'https://api.devnet.solana.com',
  walletPrivateKey: process.env.WALLET_PRIVATE_KEY,
  network: 'devnet',
});

// Automatically handles payments!
const response = await client.fetch('http://localhost:3000/api/premium');
```

## API Endpoints

### FREE Endpoints

#### `GET /api/hello`
Returns a free greeting message.

**Response:**
```json
{
  "message": "Hello! This endpoint is free.",
  "timestamp": "2025-11-09T10:30:00.000Z"
}
```

### PAID Endpoints

#### `GET /api/premium` - $0.001
Access to premium data.

**Response:**
```json
{
  "message": "Premium content! You paid for this.",
  "tier": "premium",
  "paidBy": "wallet-address...",
  "amount": "$0.001",
  "signature": "transaction-signature...",
  "timestamp": "2025-11-09T10:30:00.000Z"
}
```

#### `GET /api/analytics` - $0.005
Advanced analytics data.

**Response:**
```json
{
  "message": "Analytics data access granted",
  "tier": "analytics",
  "data": {
    "totalUsers": 10543,
    "activeNow": 234,
    "growth": "+12.3%",
    "revenue": "$45,678"
  },
  "paidBy": "wallet-address...",
  "amount": "$0.005",
  "timestamp": "2025-11-09T10:30:00.000Z"
}
```

## Expected Output

```
╔════════════════════════════════════════════════════════════════╗
║            Fastify x402 Client Demo                          ║
╚════════════════════════════════════════════════════════════════╝

1. FREE TIER - Hello Endpoint
   ===========================

   Response: {
     "message": "Hello! This endpoint is free.",
     "timestamp": "2025-11-09T10:30:00.000Z"
   }

2. PREMIUM TIER - $0.001
   =====================

   Making payment automatically...

   Response: {
     "message": "Premium content! You paid for this.",
     "tier": "premium",
     "paidBy": "8xK7m...",
     "amount": "$0.001"
   }

   ✓ Payment verified! Paid by: 8xK7m...

3. ANALYTICS TIER - $0.005
   =======================

   Making payment automatically...

   Response: {
     "message": "Analytics data access granted",
     "tier": "analytics",
     "data": {...}
   }

   ✓ Payment verified! Paid by: 8xK7m...

╔════════════════════════════════════════════════════════════════╗
║                    Demo Complete!                             ║
╚════════════════════════════════════════════════════════════════╝

Summary:
  - Called FREE endpoint (no payment)
  - Paid $0.001 for premium data
  - Paid $0.005 for analytics data
  - Total spent: $0.006 (0.6 cents)

All payments were handled automatically by x402!
```

## Fastify Features Used

- **Plugin System** - x402 as reusable plugin
- **Route Options** - Payment config in route definition
- **Hooks** - preHandler hook for payment verification
- **Decorators** - Extend request with payment info
- **TypeScript** - Full type definitions
- **Performance** - Optimized for speed

## Why Fastify for x402?

✅ **Performance** - 2-3x faster than Express
✅ **Low Latency** - Perfect for high-frequency APIs
✅ **Plugin System** - Clean architecture with plugins
✅ **Type Safety** - Excellent TypeScript support
✅ **Schema Validation** - Built-in JSON schema validation
✅ **Logging** - Pino logger built-in

## Performance Comparison

```
Requests/sec (higher is better):
Express:  ~30,000 req/s
NestJS:   ~25,000 req/s
Fastify:  ~70,000 req/s  ← 2-3x faster!
```

Perfect for:
- High-frequency trading APIs
- Real-time data feeds
- Streaming services
- Payment gateways
- Gaming backends

## Production Considerations

For production deployment:

1. **Use mainnet** - Change `network: 'mainnet-beta'`
2. **Add Redis** - For distributed payment cache
3. **Rate limiting** - Use @fastify/rate-limit
4. **Monitoring** - Use @fastify/metrics (Prometheus)
5. **CORS** - Add @fastify/cors
6. **Helmet** - Add @fastify/helmet for security
7. **Compression** - Add @fastify/compress
8. **Validation** - Use JSON schemas
9. **Swagger** - Add @fastify/swagger
10. **Clustering** - Use cluster module for multi-core

## Next Steps

- See `examples/01-basic-api/` for simplest Express example
- See `examples/04-nestjs-api/` for NestJS example
- See `examples/02-solex-betting/` for complete application
- Read the [main README](../../README.md) for more info

## Troubleshooting

**"Cannot find module 'fastify'"**
- Run `npm install`

**"RECIPIENT_WALLET not set"**
- Copy `.env.example` to `.env` and fill in values

**"Insufficient funds"**
- Get devnet SOL: https://faucet.solana.com
- Get devnet USDC: https://spl-token-faucet.com

**"Payment verification failed"**
- Ensure same network (devnet) on server and client
- Check recipient wallet address is correct

## Learn More

- [x402 Protocol](https://github.com/Anthropic/x402)
- [Fastify Documentation](https://www.fastify.io)
- [x402 Solana Toolkit](../../README.md)
