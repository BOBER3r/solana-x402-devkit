# Changelog

All notable changes to x402-solana-toolkit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-01-04

### BREAKING CHANGES ⚠️

**Official x402 v1 Protocol Compliance**

This release updates the entire toolkit to comply with the official x402 v1 specification by Coinbase. The payment requirements format has changed to match the official standard.

#### Payment Requirements Format Changes

**What Changed:**
- `payTo`: Changed from nested object `{ address, asset }` to flat string (token account address)
- `asset`: Moved from `payTo.asset` to top-level field
- `timeout`: Renamed to `maxTimeoutSeconds`
- `scheme`: Now uses official `"exact"` value for fixed-amount payments
- `network`: Format changed to `solana-devnet` / `solana-mainnet` (official format)

**OLD Format (v0.1.1 - Custom):**
```json
{
  "x402Version": 1,
  "accepts": [{
    "scheme": "solana-usdc",
    "network": "devnet",
    "maxAmountRequired": "1000",
    "resource": "/api/data",
    "description": "Payment required",
    "payTo": {
      "address": "TokenAccount...",
      "asset": "Gh9ZwEm..."
    },
    "timeout": 300
  }],
  "error": "Payment Required"
}
```

**NEW Format (v0.2.0 - Official x402 v1):**
```json
{
  "x402Version": 1,
  "accepts": [{
    "scheme": "exact",
    "network": "solana-devnet",
    "maxAmountRequired": "1000",
    "resource": "/api/data",
    "description": "Payment required",
    "mimeType": "application/json",
    "outputSchema": null,
    "payTo": "TokenAccount...",
    "maxTimeoutSeconds": 300,
    "asset": "Gh9ZwEm...",
    "extra": null
  }],
  "error": "Payment Required"
}
```

#### Code Changes Required

**Server-side (reading payment requirements):**
```typescript
// OLD (v0.1.1)
const destination = requirements.accepts[0].payTo.address;
const mint = requirements.accepts[0].payTo.asset;
const timeout = requirements.accepts[0].timeout;

// NEW (v0.2.0)
const destination = requirements.accepts[0].payTo;
const mint = requirements.accepts[0].asset;
const timeout = requirements.accepts[0].maxTimeoutSeconds;
```

**Client-side (parsing 402 responses):**
```typescript
// OLD (v0.1.1)
const recipient = response.accepts[0].payTo.address;
const usdcMint = response.accepts[0].payTo.asset;

// NEW (v0.2.0)
const recipient = response.accepts[0].payTo;
const usdcMint = response.accepts[0].asset;
```

### Added

- **[@x402-solana/core]** X402_COMPLIANCE.md - Comprehensive 850+ line documentation proving full x402 v1 compliance
- **[@x402-solana/core]** X402Facilitator class for implementing official facilitator pattern
- **[@x402-solana/core]** Facilitator endpoints: `/verify`, `/settle`, `/supported`
- **[@x402-solana/core]** parseX402Payment utility for parsing X-PAYMENT headers
- **[@x402-solana/core]** Support for both `serializedTransaction` (official) and `signature` (backwards compat) payment formats
- **[@x402-solana/server]** X402FacilitatorMiddleware for Express facilitator endpoints
- **[@x402-solana/server]** createFacilitatorRoutes helper for easy facilitator setup
- **All packages** x402 v1 compliance badges in READMEs
- **All packages** Links to X402_COMPLIANCE.md for verification

### Changed

- **[@x402-solana/core]** Updated PaymentAccept interface to match official x402 v1 spec
- **[@x402-solana/core]** Changed `payTo` from nested object to flat string
- **[@x402-solana/core]** Renamed `timeout` to `maxTimeoutSeconds`
- **[@x402-solana/core]** Moved `asset` to top-level field
- **[@x402-solana/core]** Added optional `mimeType`, `outputSchema`, `extra` fields
- **[@x402-solana/core]** Changed default scheme from `"solana-usdc"` to `"exact"`
- **[@x402-solana/core]** Network format now uses `solana-devnet` / `solana-mainnet`
- **[@x402-solana/core]** All 96 unit tests updated to x402 v1 format
- **[@x402-solana/client]** Updated to parse x402 v1 payment requirements
- **[@x402-solana/client]** Changed USDC mint address to official devnet address
- **[@x402-solana/server]** Updated middleware to generate x402 v1 compliant responses

### Documentation

- **X402_COMPLIANCE.md** - Complete compliance documentation with protocol overview, implementation details, and verification
- **README.md** - Updated with x402 v1 compliance status and hackathon qualification notice
- **All package READMEs** - Updated with compliance badges and links to compliance docs

### Fixed

- **[@x402-solana/core]** Build system now properly handles incremental TypeScript compilation
- **[@x402-solana/server]** TypeScript strict mode errors in test files resolved
- **[@x402-solana/client]** Jest configuration fixed to use `setupFilesAfterEnv` instead of `setupFiles`

## [0.1.1] - 2025-01-02

### Added
- **[@x402-solana/core]** Comprehensive package README for npm registry with code examples and API reference
- **[@x402-solana/server]** Comprehensive package README for npm registry with framework integration guides
- **[@x402-solana/client]** Comprehensive package README for npm registry with MCP integration examples

### Fixed
- **[@x402-solana/client]** Fixed MCP protocol compatibility by changing debug logs from `console.log()` to `console.error()`
  - MCP protocol requires stdout for JSON-RPC only
  - Debug logs now correctly output to stderr
  - This allows `debug: true` to work in MCP server environments
  - Issue discovered during betting-analytics-mcp integration

## [0.1.0] - 2025-01-02

### Added
- **[@x402-solana/core]** Initial release with transaction verification and payment validation
  - TransactionVerifier for parsing Solana transactions
  - USDCVerifier for validating USDC transfers
  - PaymentCache for replay attack prevention
  - Support for both legacy and versioned transaction formats
  - 96 comprehensive unit tests

- **[@x402-solana/server]** Server-side middleware for Express, NestJS, and Fastify
  - X402Middleware for Express with `requirePayment()` method
  - NestJS guard and decorator support
  - Fastify plugin integration
  - Redis caching support for multi-instance deployments

- **[@x402-solana/client]** Auto-payment client SDK
  - X402Client with automatic 402 detection and payment
  - Drop-in replacement for native `fetch()`
  - Automatic USDC payment creation and confirmation
  - Retry logic with exponential backoff
  - Support for devnet and mainnet-beta

### Documentation
- Comprehensive GETTING_STARTED.md with setup instructions
- README.md with quick start examples
- EXAMPLES_OVERVIEW.md documenting all example projects
- PAYMENT_CHANNELS.md specification for future enhancement

### Examples
- 01-basic-api: Simple x402 integration example
- 02-solex-betting: Production-ready betting platform with AI agent
- 03-weather-api: Tiered pricing example

### Infrastructure
- Published to npm registry under @x402-solana scope
- Monorepo structure with workspace support
- TypeScript with strict mode
- Automated testing with Jest
- Continuous integration ready
