import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  external: [
    'react',
    'react-dom',
    '@solana/web3.js',
    '@solana/spl-token',
    '@solana/wallet-adapter-base',
    '@solana/wallet-adapter-react',
    '@x402-solana/core',
    '@x402-solana/client',
  ],
});