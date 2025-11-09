# Next.js Integration Guide

Quick guide to integrate `@x402-solana/nextjs` into your existing Next.js 14+ application.

## Prerequisites

- Next.js 14.0.0 or higher
- React 18.0.0 or higher
- Node.js 18.0.0 or higher
- A Solana wallet for receiving payments

## Step-by-Step Integration

### Step 1: Install Dependencies

```bash
npm install @x402-solana/nextjs @x402-solana/core @solana/web3.js
```

### Step 2: Environment Setup

Create or update `.env.local`:

```env
# Server-side only (keep these secret)
SOLANA_RPC_URL=https://api.devnet.solana.com
RECIPIENT_WALLET=<YOUR_WALLET_PUBLIC_KEY>

# Client-side (safe to expose)
NEXT_PUBLIC_RECIPIENT_WALLET=<YOUR_WALLET_PUBLIC_KEY>
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
```

Replace `<YOUR_WALLET_PUBLIC_KEY>` with your actual Solana wallet address.

### Step 3: Choose Your Integration Approach

You can use any combination of these features:

#### Option A: Middleware (Recommended for API Routes)

Create `middleware.ts` in your project root:

```typescript
import { x402Middleware } from '@x402-solana/nextjs';

export default x402Middleware({
  solanaRpcUrl: process.env.SOLANA_RPC_URL!,
  recipientWallet: process.env.RECIPIENT_WALLET!,
  network: 'devnet',
  protectedRoutes: ['/api/premium/*'],
});

export const config = {
  matcher: ['/api/premium/:path*'],
};
```

#### Option B: API Route Wrappers

1. Create `app/api/x402-config.ts`:

```typescript
import { configureX402ApiRoutes } from '@x402-solana/nextjs';

configureX402ApiRoutes({
  solanaRpcUrl: process.env.SOLANA_RPC_URL!,
  recipientWallet: process.env.RECIPIENT_WALLET!,
  network: 'devnet',
});
```

2. Create a protected API route (e.g., `app/api/premium/data/route.ts`):

```typescript
import { withX402 } from '@x402-solana/nextjs';
import '../../x402-config'; // Import config

export const GET = withX402(
  async (req) => {
    return Response.json({
      message: 'Premium data!',
      paidBy: req.payment?.payer,
    });
  },
  {
    priceUSD: 0.01,
    description: 'Access to premium data',
  }
);
```

#### Option C: Server Actions

1. Create `app/actions/x402-config.ts`:

```typescript
import { configureX402ServerActions } from '@x402-solana/nextjs';

configureX402ServerActions({
  solanaRpcUrl: process.env.SOLANA_RPC_URL!,
  recipientWallet: process.env.RECIPIENT_WALLET!,
  network: 'devnet',
});
```

2. Create protected actions (e.g., `app/actions/premium.ts`):

```typescript
'use server';

import { requirePayment } from '@x402-solana/nextjs';
import './x402-config'; // Import config

export const getPremiumData = requirePayment(
  async () => {
    return { message: 'Premium data!' };
  },
  {
    priceUSD: 0.01,
    description: 'Access to premium data',
  }
);
```

### Step 4: Add Provider to Layout

Update `app/layout.tsx`:

```typescript
import { X402Provider } from '@x402-solana/nextjs';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <X402Provider
          config={{
            network: 'devnet',
            recipientWallet: process.env.NEXT_PUBLIC_RECIPIENT_WALLET!,
            solanaRpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
          }}
        >
          {children}
        </X402Provider>
      </body>
    </html>
  );
}
```

### Step 5: Use in Client Components

Create a client component that uses the protected actions:

```typescript
'use client';

import { useState } from 'react';
import { getPremiumData } from '@/app/actions/premium';

export function PremiumButton() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const handleClick = async () => {
    const result = await getPremiumData();

    if (result.success) {
      setData(result.data);
    } else if (result.paymentRequired) {
      // Show payment UI
      alert('Payment required: $' + result.paymentRequired.priceUSD);
    } else {
      setError(result.error);
    }
  };

  return (
    <div>
      <button onClick={handleClick}>
        Get Premium Data
      </button>
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
      {error && <p>Error: {error}</p>}
    </div>
  );
}
```

## Testing Your Integration

### 1. Test Without Payment

Try accessing your protected route or action without payment:

```bash
curl http://localhost:3000/api/premium/data
```

You should receive a 402 response with payment requirements.

### 2. Test With Payment

To test with actual payment, you'll need:
1. A funded Solana wallet (devnet SOL and USDC)
2. A client that can make payments (use `@x402-solana/client`)
3. Send payment transaction
4. Include transaction signature in X-PAYMENT header

Example using fetch:

```typescript
const response = await fetch('/api/premium/data', {
  headers: {
    'X-PAYMENT': 'solana:<network>:<signature>',
  },
});
```

## Common Integration Patterns

### Pattern 1: Public + Premium Endpoints

```typescript
// app/api/data/route.ts - Public
export const GET = async () => {
  return Response.json({ data: 'Public data' });
};

// app/api/premium/data/route.ts - Protected
export const GET = withX402(
  async (req) => Response.json({ data: 'Premium data' }),
  { priceUSD: 0.01 }
);
```

### Pattern 2: Dynamic Pricing

```typescript
export const GET = withX402(
  async (req) => {
    const { searchParams } = new URL(req.url);
    const level = searchParams.get('level');
    // Return different data based on level
    return Response.json({ data: `Level ${level} data` });
  },
  {
    priceUSD: 0.01, // Base price
    description: 'Premium data access',
  }
);
```

### Pattern 3: Multiple Payment Tiers

```typescript
// app/api/basic/route.ts
export const GET = withX402(
  async (req) => Response.json({ data: 'Basic' }),
  { priceUSD: 0.01 }
);

// app/api/pro/route.ts
export const GET = withX402(
  async (req) => Response.json({ data: 'Pro' }),
  { priceUSD: 0.05 }
);

// app/api/enterprise/route.ts
export const GET = withX402(
  async (req) => Response.json({ data: 'Enterprise' }),
  { priceUSD: 0.10 }
);
```

## Production Deployment

### 1. Update Environment Variables

For production, update to mainnet:

```env
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
RECIPIENT_WALLET=<YOUR_MAINNET_WALLET>
NEXT_PUBLIC_RECIPIENT_WALLET=<YOUR_MAINNET_WALLET>
```

### 2. Add Redis (Recommended)

For production, use Redis for payment caching:

```typescript
configureX402ApiRoutes({
  solanaRpcUrl: process.env.SOLANA_RPC_URL!,
  recipientWallet: process.env.RECIPIENT_WALLET!,
  network: 'mainnet-beta',
  redis: {
    url: process.env.REDIS_URL!,
  },
});
```

### 3. Disable Debug Mode

```typescript
configureX402ApiRoutes({
  // ... other config
  debug: false,
});
```

### 4. Set Appropriate Payment Timeouts

```typescript
configureX402ApiRoutes({
  // ... other config
  maxPaymentAgeMs: 300_000, // 5 minutes
});
```

## Troubleshooting

### Issue: "x402 not configured" error

**Solution**: Make sure you import the config file:

```typescript
import './x402-config'; // or '../x402-config'
```

### Issue: Middleware not intercepting requests

**Solution**: Check your matcher config matches your routes:

```typescript
export const config = {
  matcher: ['/api/premium/:path*'], // Must match your routes
};
```

### Issue: Payment verification failing

**Solution**: Enable debug mode to see detailed logs:

```typescript
configureX402ApiRoutes({
  // ... other config
  debug: true,
});
```

Check the logs for specific error messages.

### Issue: TypeScript errors

**Solution**: Ensure you have the correct type definitions:

```bash
npm install --save-dev @types/node @types/react
```

## Next Steps

1. Integrate with `@x402-solana/client` for automatic payment handling
2. Add `@x402-solana/react` hooks for wallet integration
3. Implement error handling and retry logic
4. Add monitoring and analytics
5. Test thoroughly before production deployment

## Support

For issues and questions:
- GitHub: [x402-solana-toolkit](https://github.com/BOBER3r/solana-x402-devkit)
- Documentation: See README.md

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [x402 Protocol Specification](https://github.com/coinbase/x402)