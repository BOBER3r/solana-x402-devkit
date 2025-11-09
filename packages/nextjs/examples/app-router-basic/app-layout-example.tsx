/**
 * Example: Root Layout with X402Provider
 * File: app/layout.tsx
 */

import { X402Provider } from '@x402-solana/nextjs';
import './globals.css';

export const metadata = {
  title: 'x402 Next.js App Router Example',
  description: 'Example of x402 payment integration with Next.js',
};

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
            debug: true,
          }}
        >
          <main className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">
              x402 Next.js App Router Example
            </h1>
            {children}
          </main>
        </X402Provider>
      </body>
    </html>
  );
}
