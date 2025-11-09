# Next.js App Router Basic Example

This example demonstrates the basic usage of `@x402-solana/nextjs` with Next.js 14+ App Router.

## Features

- App Router middleware for route protection
- API routes with payment requirements
- Server Actions with payment verification
- Client-side components with x402 context

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local`:
```env
SOLANA_RPC_URL=https://api.devnet.solana.com
RECIPIENT_WALLET=YourWalletPublicKey...
NEXT_PUBLIC_RECIPIENT_WALLET=YourWalletPublicKey...
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
```

3. Run the development server:
```bash
npm run dev
```

## File Structure

```
app/
├── layout.tsx           # Root layout with X402Provider
├── page.tsx             # Home page
├── api/
│   ├── config.ts        # API route configuration
│   └── premium/
│       └── route.ts     # Protected API route
├── actions/
│   ├── config.ts        # Server Actions configuration
│   └── premium.ts       # Protected Server Action
└── components/
    └── PremiumContent.tsx  # Client component using x402

middleware.ts            # x402 middleware configuration
next.config.js
package.json
```

## Usage

Visit `http://localhost:3000` and try accessing the premium content. The application will prompt for payment using the x402 protocol.
