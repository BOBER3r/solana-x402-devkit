# NestJS x402 API Example

**Production-ready NestJS microservice with x402 micropayments on Solana.**

## What This Shows

- **NestJS framework** - Enterprise-grade TypeScript framework
- **Decorators** - `@RequirePayment()`, `@Payment()` decorators
- **Guards** - `X402Guard` for route protection
- **Module system** - Proper NestJS module architecture
- **Type safety** - Full TypeScript type definitions
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

### Server Setup (app.module.ts)

Configure x402 module in your NestJS app:

```typescript
import { Module } from '@nestjs/common';
import { X402Module } from '@x402-solana/server';

@Module({
  imports: [
    X402Module.register({
      solanaRpcUrl: 'https://api.devnet.solana.com',
      recipientWallet: process.env.RECIPIENT_WALLET,
      network: 'devnet',
      debug: true,
    }),
  ],
  controllers: [ApiController],
})
export class AppModule {}
```

### Controller with Guards (api.controller.ts)

Use decorators to protect routes:

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { X402Guard, RequirePayment, Payment } from '@x402-solana/server';

@Controller('api')
@UseGuards(X402Guard)  // Apply guard to all routes
export class ApiController {
  // Free endpoint
  @Get('hello')
  getHello() {
    return { message: 'Free!' };
  }

  // Paid endpoint with payment injection
  @Get('premium')
  @RequirePayment(0.001, {
    description: 'Premium data',
    resource: '/api/premium',
  })
  getPremium(@Payment() payment: X402PaymentInfo) {
    return {
      message: 'Premium content!',
      paidBy: payment.payer,
      amount: payment.amount,
    };
  }
}
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
║            NestJS x402 Client Demo                            ║
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

## NestJS Features Used

- **Dependency Injection** - X402Guard is injectable
- **Decorators** - `@RequirePayment()`, `@Payment()`, `@UseGuards()`
- **Modules** - Clean separation with X402Module
- **Guards** - CanActivate interface for route protection
- **Metadata** - Reflector for reading decorator metadata
- **Type Safety** - Full TypeScript support

## Why NestJS for x402?

✅ **Enterprise Ready** - Built for scalable microservices
✅ **Type Safety** - First-class TypeScript support
✅ **Dependency Injection** - Clean, testable architecture
✅ **Decorators** - Beautiful syntax for payment requirements
✅ **Microservices** - Perfect for x402 payment gateways
✅ **Testing** - Built-in testing utilities

## Production Considerations

For production deployment:

1. **Use mainnet** - Change `network: 'mainnet-beta'`
2. **Add Redis** - For distributed payment cache
3. **Rate limiting** - Prevent abuse
4. **Monitoring** - Track payment metrics
5. **Error handling** - Global exception filters
6. **Logging** - Use NestJS logger service
7. **Validation** - Add class-validator for inputs
8. **Health checks** - Terminus module
9. **Swagger** - API documentation
10. **Testing** - Unit and E2E tests

## Next Steps

- See `examples/01-basic-api/` for simplest Express example
- See `examples/05-fastify-api/` for Fastify example
- See `examples/02-solex-betting/` for complete application
- Read the [main README](../../README.md) for more info

## Troubleshooting

**"Cannot find module '@nestjs/common'"**
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
- [NestJS Documentation](https://docs.nestjs.com)
- [x402 Solana Toolkit](../../README.md)
