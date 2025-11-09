# @x402-solana/nextjs

Next.js 14+ and 16+ App Router integration for x402 payment protocol on Solana.

Complete integration package for building paid APIs and Server Actions in Next.js applications using the x402 payment protocol on Solana blockchain.

## ✨ Next.js 16 Compatible

Fully compatible with Next.js 16's new proxy pattern and async request APIs. See [NEXTJS_16_MIGRATION.md](./NEXTJS_16_MIGRATION.md) for migration guide.

## Features

- **✅ Next.js 14, 15, and 16 Support**: Works with all modern Next.js versions
- **App Router Middleware/Proxy**: Intercept and verify payments at the middleware level
- **API Route Helpers**: Wrap API routes with payment requirements
- **Server Actions Support**: Protect Server Actions with payment verification (async-ready)
- **RSC Compatible**: Full React Server Components support
- **Dual Runtime**: Edge Runtime (Next.js 14/15) and Node.js (Next.js 16 proxy)
- **TypeScript**: Full type safety with TypeScript
- **Zero Config**: Sensible defaults with easy customization

## Installation

```bash
npm install @x402-solana/nextjs @x402-solana/core
```

### Peer Dependencies

```bash
# For Next.js 14/15
npm install next@14 react@18 @solana/web3.js

# For Next.js 16
npm install next@16 react@19 @solana/web3.js
```

**Version Compatibility:**
- Next.js: 14.0+ to 16.x
- React: 18.0+ or 19.0+

## Quick Start

### 1. Configure Environment Variables

Create `.env.local`:

```env
# Server-side only (for payment verification)
SOLANA_RPC_URL=https://api.devnet.solana.com
RECIPIENT_WALLET=YourWalletPublicKey...

# Client-side (for UI components)
NEXT_PUBLIC_RECIPIENT_WALLET=YourWalletPublicKey...
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
```

### 2. Set Up Middleware/Proxy

#### For Next.js 14/15 (middleware.ts)

Create `middleware.ts` in your project root:

```typescript
import { x402Middleware } from '@x402-solana/nextjs';

export default x402Middleware({
  solanaRpcUrl: process.env.SOLANA_RPC_URL!,
  recipientWallet: process.env.RECIPIENT_WALLET!,
  network: 'devnet',
  protectedRoutes: ['/api/premium/*'],
  debug: true,
});

export const config = {
  matcher: ['/api/premium/:path*'],
};
```

#### For Next.js 16+ (proxy.ts)

Create `proxy.ts` in your project root:

```typescript
import { x402Middleware } from '@x402-solana/nextjs';

// Note: Export as 'proxy' in Next.js 16
export const proxy = x402Middleware({
  solanaRpcUrl: process.env.SOLANA_RPC_URL!,
  recipientWallet: process.env.RECIPIENT_WALLET!,
  network: 'devnet',
  protectedRoutes: ['/api/premium/*'],
  debug: true,
});

export const config = {
  matcher: ['/api/premium/:path*'],
};
```

> **💡 Tip:** You can keep both files for dual Next.js 14/16 support!

### 3. Create Protected API Route

Create `app/api/config.ts`:

```typescript
import { configureX402ApiRoutes } from '@x402-solana/nextjs';

configureX402ApiRoutes({
  solanaRpcUrl: process.env.SOLANA_RPC_URL!,
  recipientWallet: process.env.RECIPIENT_WALLET!,
  network: 'devnet',
});
```

Create `app/api/premium/route.ts`:

```typescript
import { withX402 } from '@x402-solana/nextjs';
import '../config';

export const GET = withX402(
  async (req) => {
    return Response.json({
      message: 'Premium content!',
      paidBy: req.payment?.payer,
    });
  },
  {
    priceUSD: 0.01,
    description: 'Access to premium API',
  }
);
```

### 4. Add Provider to Layout

Update `app/layout.tsx`:

```typescript
import { X402Provider } from '@x402-solana/nextjs';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <X402Provider
          config={{
            network: 'devnet',
            recipientWallet: process.env.NEXT_PUBLIC_RECIPIENT_WALLET!,
          }}
        >
          {children}
        </X402Provider>
      </body>
    </html>
  );
}
```

## Usage Guide

### App Router Middleware

The middleware automatically intercepts requests to protected routes and verifies payments.

```typescript
// middleware.ts
import { x402Middleware, createMatcher } from '@x402-solana/nextjs';

export default x402Middleware({
  solanaRpcUrl: process.env.SOLANA_RPC_URL!,
  recipientWallet: process.env.RECIPIENT_WALLET!,
  network: 'devnet',
  protectedRoutes: [
    '/api/premium/*',
    '/api/private/*',
  ],
  redis: process.env.REDIS_URL
    ? { url: process.env.REDIS_URL }
    : undefined,
  maxPaymentAgeMs: 300_000, // 5 minutes
  debug: process.env.NODE_ENV === 'development',
});

export const config = createMatcher([
  '/api/premium/:path*',
  '/api/private/:path*',
]);
```

**Configuration Options:**

- `solanaRpcUrl`: Solana RPC endpoint URL
- `recipientWallet`: Your wallet address to receive payments
- `network`: `'devnet'` or `'mainnet-beta'`
- `protectedRoutes`: Array of route patterns (supports wildcards)
- `redis`: Optional Redis configuration for replay attack prevention
- `maxPaymentAgeMs`: Maximum age of payment (default: 300000 = 5 minutes)
- `debug`: Enable debug logging

### API Route Helpers

Wrap API route handlers to require payment:

```typescript
// app/api/premium/route.ts
import { withX402 } from '@x402-solana/nextjs';

export const GET = withX402(
  async (req) => {
    // Access payment info
    const payment = req.payment;

    return Response.json({
      data: 'Premium data',
      paidBy: payment?.payer,
      amount: payment?.amount,
    });
  },
  {
    priceUSD: 0.01,
    description: 'Premium API access',
    resource: '/api/premium',
  }
);

export const POST = withX402(
  async (req) => {
    const body = await req.json();
    // Process with payment verification
    return Response.json({ success: true });
  },
  {
    priceUSD: 0.02,
    description: 'Process premium data',
  }
);
```

**Alternative: Inline Configuration**

```typescript
import { createWithX402 } from '@x402-solana/nextjs';

const withX402 = createWithX402({
  solanaRpcUrl: process.env.SOLANA_RPC_URL!,
  recipientWallet: process.env.RECIPIENT_WALLET!,
  network: 'devnet',
});

export const GET = withX402(
  async (req) => Response.json({ data: 'Premium' }),
  { priceUSD: 0.01 }
);
```

### Server Actions

Protect Server Actions with payment requirements:

```typescript
// app/actions/config.ts
import { configureX402ServerActions } from '@x402-solana/nextjs';

configureX402ServerActions({
  solanaRpcUrl: process.env.SOLANA_RPC_URL!,
  recipientWallet: process.env.RECIPIENT_WALLET!,
  network: 'devnet',
});
```

```typescript
// app/actions/premium.ts
'use server';

import { requirePayment } from '@x402-solana/nextjs';
import './config';

export const getPremiumData = requirePayment(
  async () => {
    return { message: 'Premium data!' };
  },
  {
    priceUSD: 0.01,
    description: 'Access premium data',
    resource: '/actions/getPremiumData',
  }
);

// With parameters
export const processPremiumRequest = requirePayment(
  async (userId: string, data: any) => {
    // Business logic
    return { userId, processed: true };
  },
  {
    priceUSD: 0.02,
    description: 'Process premium request',
  }
);
```

**Using in Client Components:**

```typescript
'use client';

import { getPremiumData } from '@/app/actions/premium';

export function MyComponent() {
  const handleClick = async () => {
    const result = await getPremiumData();

    if (result.success) {
      console.log('Data:', result.data);
    } else if (result.paymentRequired) {
      console.log('Payment needed:', result.paymentRequired);
      // Handle payment flow
    }
  };

  return <button onClick={handleClick}>Get Data</button>;
}
```

### RSC Provider

The provider makes x402 configuration available to client components:

```typescript
// app/layout.tsx
import { X402Provider, createX402Config } from '@x402-solana/nextjs';

export default function RootLayout({ children }) {
  const x402Config = createX402Config({
    network: 'devnet',
    recipientWallet: process.env.NEXT_PUBLIC_RECIPIENT_WALLET!,
    solanaRpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
    debug: true,
  });

  return (
    <html>
      <body>
        <X402Provider config={x402Config}>
          {children}
        </X402Provider>
      </body>
    </html>
  );
}
```

**Using in Components:**

```typescript
'use client';

import { useX402Config } from '@x402-solana/nextjs';

export function ConfigDisplay() {
  const config = useX402Config();

  return (
    <div>
      <p>Network: {config.network}</p>
      <p>Recipient: {config.recipientWallet}</p>
    </div>
  );
}
```

## API Reference

### Middleware

#### `x402Middleware(config)`

Creates Next.js middleware for payment verification.

```typescript
function x402Middleware(config: X402MiddlewareConfig): NextMiddleware
```

#### `createMatcher(patterns)`

Helper to create Next.js middleware matcher config.

```typescript
function createMatcher(patterns: string[]): { matcher: string[] }
```

#### `getPaymentFromRequest(request)`

Extract payment info from request headers.

```typescript
function getPaymentFromRequest(request: NextRequest): PaymentInfo | undefined
```

### API Routes

#### `configureX402ApiRoutes(config)`

Global configuration for API routes.

```typescript
function configureX402ApiRoutes(config: ApiRouteConfig): void
```

#### `withX402(handler, options)`

Wrap API route handler with payment requirement.

```typescript
function withX402<T>(
  handler: NextApiHandler<T>,
  options: WithX402Options
): NextApiHandler<T>
```

#### `createWithX402(config)`

Create configured withX402 wrapper.

```typescript
function createWithX402(config: ApiRouteConfig): typeof withX402
```

#### `getPaymentInfo(request)`

Extract payment info from request.

```typescript
function getPaymentInfo(request: NextRequest): PaymentInfo | undefined
```

### Server Actions

#### `configureX402ServerActions(config)`

Global configuration for Server Actions.

```typescript
function configureX402ServerActions(config: ServerActionConfig): void
```

#### `requirePayment(action, options)`

Wrap Server Action with payment requirement.

```typescript
function requirePayment<T extends (...args: any[]) => Promise<any>>(
  action: T,
  options: ServerActionOptions
): (...args: Parameters<T>) => Promise<ServerActionResult<Awaited<ReturnType<T>>>>
```

#### `createPaymentRequirement(config)`

Create configured requirePayment wrapper.

```typescript
function createPaymentRequirement(config: ServerActionConfig): typeof requirePayment
```

### Provider

#### `X402Provider`

React context provider for x402 configuration.

```typescript
function X402Provider(props: X402ProviderProps): JSX.Element
```

#### `useX402Config()`

Hook to access x402 configuration.

```typescript
function useX402Config(): X402ClientConfig
```

#### `createX402Config(options)`

Helper to create config object.

```typescript
function createX402Config(options: X402ClientConfig): X402ClientConfig
```

## Type Definitions

### `PaymentInfo`

```typescript
interface PaymentInfo {
  signature: string;
  amount: number;
  payer: string;
  blockTime?: number;
  slot?: number;
}
```

### `X402MiddlewareConfig`

```typescript
interface X402MiddlewareConfig {
  solanaRpcUrl: string;
  recipientWallet: string;
  network: 'devnet' | 'mainnet-beta';
  redis?: { url: string };
  maxPaymentAgeMs?: number;
  debug?: boolean;
  protectedRoutes?: string[];
}
```

### `ServerActionResult`

```typescript
interface ServerActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  paymentRequired?: {
    priceUSD: number;
    requirements: PaymentRequirements;
  };
}
```

## Examples

See the `examples/` directory for complete working examples:

- `app-router-basic/` - Basic App Router setup
- `server-actions/` - Server Actions implementation

## Edge Runtime Support

All features are compatible with Next.js Edge Runtime:

```typescript
// app/api/edge/route.ts
import { withX402 } from '@x402-solana/nextjs';

export const runtime = 'edge';

export const GET = withX402(
  async (req) => Response.json({ data: 'Edge!' }),
  { priceUSD: 0.01 }
);
```

## Error Handling

All functions handle errors gracefully:

```typescript
// API Routes return 402 with payment requirements
// Server Actions return { success: false, error: string }

const result = await getPremiumData();

if (result.success) {
  // Use result.data
} else if (result.paymentRequired) {
  // Handle payment flow
  console.log('Price:', result.paymentRequired.priceUSD);
  console.log('Requirements:', result.paymentRequired.requirements);
} else {
  // Handle error
  console.error('Error:', result.error);
}
```

## Security Considerations

1. **Environment Variables**: Never expose private keys or sensitive RPC URLs to the client
2. **Payment Validation**: All payments are verified on-chain before granting access
3. **Replay Protection**: Signatures are cached to prevent reuse (use Redis in production)
4. **Network Validation**: Ensure network matches between client and server
5. **Amount Verification**: Payments are verified against expected amounts

## Migration from Pages Router

If you're migrating from Next.js Pages Router:

1. Move API routes from `pages/api/` to `app/api/`
2. Update imports to use `NextRequest`/`NextResponse`
3. Replace middleware with App Router middleware
4. Convert API route handlers to use new format:

```typescript
// Old (Pages Router)
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.json({ data: 'test' });
}

// New (App Router)
export const GET = withX402(
  async (req: NextRequest) => Response.json({ data: 'test' }),
  { priceUSD: 0.01 }
);
```

## Troubleshooting

### "x402 not configured" error

Make sure you call the configuration function before using the wrapper:

```typescript
// Import config file in your route/action file
import './config';
```

### Payments not verifying

1. Check RPC URL is correct and accessible
2. Verify recipient wallet address is correct
3. Ensure network matches (devnet vs mainnet)
4. Check payment signature exists on-chain
5. Enable debug mode to see detailed logs

### Middleware not running

1. Verify `middleware.ts` is in project root
2. Check `matcher` config includes your routes
3. Ensure routes match the protected patterns

### TypeScript errors

Make sure you have the correct peer dependencies:

```bash
npm install --save-dev @types/node @types/react
```

## Production Checklist

- [ ] Use mainnet-beta network
- [ ] Configure Redis for payment cache
- [ ] Set appropriate maxPaymentAgeMs
- [ ] Disable debug mode
- [ ] Use environment variables for sensitive data
- [ ] Set up monitoring for payment verification
- [ ] Test payment flows thoroughly
- [ ] Implement proper error handling
- [ ] Add rate limiting if needed
- [ ] Configure CORS appropriately

## Contributing

Contributions welcome! Please see the main repository for guidelines.

## License

MIT

## Support

- GitHub Issues: [x402-solana-toolkit](https://github.com/BOBER3r/solana-x402-devkit)
- Documentation: See main README

## Related Packages

- `@x402-solana/core` - Core payment verification
- `@x402-solana/server` - Express, NestJS, Fastify
- `@x402-solana/client` - Client SDK
- `@x402-solana/react` - React hooks and components
