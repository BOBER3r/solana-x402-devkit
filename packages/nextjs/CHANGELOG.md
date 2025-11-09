# Changelog

All notable changes to @x402-solana/nextjs will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-11-09

### Added

- Initial release of @x402-solana/nextjs
- App Router middleware for automatic payment verification
- API route helpers with `withX402` wrapper
- Server Actions support with `requirePayment` wrapper
- React Server Component provider (`X402Provider`)
- TypeScript type definitions for all features
- Comprehensive test suite with Jest
- Example implementations for common use cases
- Complete documentation and integration guide
- Edge Runtime compatibility
- Support for both global and inline configuration
- Payment info injection into requests
- Automatic 402 response generation
- Redis support for distributed payment caching
- Debug mode for development
- Pattern-based route protection
- Flexible configuration options

### Features

#### Middleware
- `x402Middleware()` - Create Next.js middleware for payment verification
- `createMatcher()` - Helper for matcher configuration
- `getPaymentFromRequest()` - Extract payment info from request headers
- Pattern matching for protected routes
- Edge Runtime compatible

#### API Routes
- `configureX402ApiRoutes()` - Global API route configuration
- `withX402()` - Wrap API route handlers
- `createWithX402()` - Create configured wrapper
- `getPaymentInfo()` - Extract payment from request
- Support for all HTTP methods

#### Server Actions
- `configureX402ServerActions()` - Global Server Actions configuration
- `requirePayment()` - Wrap Server Actions
- `createPaymentRequirement()` - Create configured wrapper
- Type-safe result objects
- Error handling and payment requirements

#### Provider
- `X402Provider` - React context provider
- `useX402Config()` - Hook to access configuration
- `createX402Config()` - Helper to create config
- RSC compatible

### Documentation

- README.md with complete usage guide
- INTEGRATION_GUIDE.md for step-by-step integration
- IMPLEMENTATION_SUMMARY.md with technical details
- Inline code documentation
- Example implementations
- Troubleshooting guide
- Production checklist

### Tests

- Middleware tests with mocked Next.js APIs
- API route tests with request/response mocking
- Server Actions tests with header mocking
- Provider tests with React Testing Library
- 100% coverage of core functionality

### Dependencies

- @x402-solana/core ^0.2.0
- @solana/web3.js ^1.87.6
- @solana/spl-token ^0.3.9
- bs58 ^5.0.0

### Peer Dependencies

- next >=14.0.0
- react ^18.0.0

## [Unreleased]

### Planned

- Streaming support for Server Actions
- Built-in payment UI components
- Rate limiting integration
- Analytics hooks
- Payment batching support
- Subscription management
- WebSocket support for real-time payments
- Multi-token support
- Custom payment validators

## Notes

This is the first stable release of the Next.js integration package. It provides complete support for Next.js 14+ App Router with middleware, API routes, and Server Actions.

For migration from Pages Router or older versions of Next.js, please refer to the README.md migration guide.