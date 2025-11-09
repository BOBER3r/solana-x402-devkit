# @x402-solana/cli

> Command-line testing tool for x402-enabled APIs on Solana

A comprehensive CLI tool for testing HTTP APIs that implement the x402 payment protocol on Solana. Test payment flows, manage wallets, and verify transactions without writing any code.

## Features

- **Wallet Management**: Create, import, and manage Solana wallets
- **API Testing**: Automatically handle 402 payment requirements
- **Payment Verification**: Verify payments on-chain
- **Configuration**: Persistent settings for network, RPC, and more
- **Beautiful Output**: Colorful, user-friendly CLI interface
- **JSON Mode**: Machine-readable output for scripting

## Installation

### Global Installation (Recommended)

```bash
npm install -g @x402-solana/cli
```

### Local Installation

```bash
npm install @x402-solana/cli
```

## Quick Start

### 1. Create a Wallet

```bash
x402 wallet create
```

This creates a new Solana wallet and saves it to `~/.x402/wallet.json`.

### 2. Fund Your Wallet

On devnet, you can use the built-in airdrop command:

```bash
x402 wallet airdrop --amount 2
```

For USDC, you'll need to:
- Get devnet USDC from a faucet
- Or use the Solana devnet faucet and swap for USDC

### 3. Test an API

```bash
x402 test http://localhost:3000/api/premium --price 0.001
```

The CLI will:
1. Check your balances
2. Make the request
3. Detect 402 payment requirement
4. Create and send payment automatically
5. Retry request with payment proof
6. Show the response

## Commands

### Wallet Commands

#### Create Wallet

```bash
x402 wallet create [options]
```

**Options:**
- `-o, --output <path>` - Output file path (default: `~/.x402/wallet.json`)

**Example:**
```bash
x402 wallet create --output ./my-wallet.json
```

#### Import Wallet

```bash
x402 wallet import <private-key> [options]
```

**Options:**
- `-o, --output <path>` - Output file path

**Example:**
```bash
x402 wallet import 5J7s6NiJS3JAkvgkoc18... --output ./wallet.json
```

#### Show Wallet Info

```bash
x402 wallet show [options]
```

**Options:**
- `-w, --wallet <path>` - Wallet file path
- `--json` - Output as JSON

**Example:**
```bash
x402 wallet show
x402 wallet show --json
```

#### Check Balance

```bash
x402 wallet balance [options]
```

**Options:**
- `-w, --wallet <path>` - Wallet file path
- `--json` - Output as JSON

**Example:**
```bash
x402 wallet balance
```

#### Export Private Key

```bash
x402 wallet export [options]
```

**Options:**
- `-w, --wallet <path>` - Wallet file path

**Example:**
```bash
x402 wallet export
```

**Warning:** Keep your private key secure! Never share it.

#### Request Airdrop (Devnet Only)

```bash
x402 wallet airdrop [options]
```

**Options:**
- `-w, --wallet <path>` - Wallet file path
- `-a, --amount <sol>` - Amount of SOL to request (default: 1)

**Example:**
```bash
x402 wallet airdrop --amount 2
```

### API Testing Commands

#### Test Endpoint

```bash
x402 test <url> [options]
```

**Options:**
- `--price <usd>` - Expected payment price for validation
- `-w, --wallet <path>` - Wallet file path
- `-m, --method <method>` - HTTP method (default: GET)
- `-H, --header <header...>` - HTTP headers (format: "Key: Value")
- `-d, --data <data>` - Request body data (JSON string)
- `-v, --verbose` - Verbose output with debug logging
- `--json` - Output as JSON

**Examples:**

Basic GET request:
```bash
x402 test http://localhost:3000/api/data
```

POST request with data:
```bash
x402 test http://localhost:3000/api/create \
  --method POST \
  --data '{"name":"test"}' \
  --header "Content-Type: application/json"
```

Test with price validation:
```bash
x402 test http://localhost:3000/api/premium --price 0.001
```

Verbose output:
```bash
x402 test http://localhost:3000/api/data --verbose
```

JSON output (for scripting):
```bash
x402 test http://localhost:3000/api/data --json
```

### Payment Verification Commands

#### Verify Payment

```bash
x402 pay verify <signature> [options]
```

**Options:**
- `--recipient <address>` - Expected recipient token account
- `--amount <usd>` - Expected payment amount in USD
- `--network <network>` - Network (devnet or mainnet-beta)
- `--json` - Output as JSON

**Example:**
```bash
x402 pay verify 5j7s6NiJS3JAkvgkoc18... \
  --recipient 9xQeWvG816bUx9EPjHmaT23... \
  --amount 0.001
```

#### Get Payment Info

```bash
x402 pay info <signature> [options]
```

**Options:**
- `--network <network>` - Network (devnet or mainnet-beta)
- `--json` - Output as JSON

**Example:**
```bash
x402 pay info 5j7s6NiJS3JAkvgkoc18...
```

### Configuration Commands

#### Show Configuration

```bash
x402 config show
```

**Example:**
```bash
x402 config show
```

#### Update Configuration

```bash
x402 config set [options]
```

**Options:**
- `--network <network>` - Set network (devnet or mainnet-beta)
- `--rpc-url <url>` - Set RPC URL
- `--wallet-path <path>` - Set default wallet path
- `--commitment <level>` - Set commitment level (processed, confirmed, finalized)

**Examples:**

Set network:
```bash
x402 config set --network mainnet-beta
```

Set custom RPC:
```bash
x402 config set --rpc-url https://my-rpc.solana.com
```

Set default wallet path:
```bash
x402 config set --wallet-path ./my-wallet.json
```

Set commitment level:
```bash
x402 config set --commitment finalized
```

#### Reset Configuration

```bash
x402 config reset
```

**Example:**
```bash
x402 config reset
```

## Complete Workflow Example

Here's a complete example of testing an x402-enabled API:

```bash
# 1. Create and fund wallet
x402 wallet create
x402 wallet airdrop --amount 2

# Check balance
x402 wallet balance

# 2. Configure for devnet
x402 config set --network devnet

# 3. Test a free endpoint
x402 test http://localhost:3000/api/public

# 4. Test a paid endpoint
x402 test http://localhost:3000/api/premium --price 0.001

# 5. Verify the payment transaction
x402 pay info <signature-from-test-output>

# 6. Test with custom headers
x402 test http://localhost:3000/api/data \
  --method POST \
  --header "Content-Type: application/json" \
  --data '{"query":"test"}' \
  --verbose
```

## Configuration

The CLI stores configuration in `~/.x402/config.json`:

```json
{
  "network": "devnet",
  "rpcUrl": "https://api.devnet.solana.com",
  "walletPath": "/Users/you/.x402/wallet.json",
  "commitment": "confirmed"
}
```

## Wallet Storage

Wallets are stored in JSON format (standard Solana wallet format):

```json
[1,2,3,...,64]  // 64-byte secret key
```

**Security Notes:**
- Wallet files have restrictive permissions (0600 - read/write for owner only)
- Never share your wallet file or private key
- Back up your wallet file securely
- Use separate wallets for testing and production

## Output Formats

### Human-Readable Output (Default)

Colorful, formatted output with:
- Green checkmarks for success
- Red X marks for errors
- Yellow warnings
- Blue info messages
- Tables for structured data

### JSON Output

Use `--json` flag for machine-readable output:

```bash
x402 wallet balance --json
```

Output:
```json
{
  "sol": 1.5,
  "usdc": 10.0
}
```

Perfect for:
- CI/CD pipelines
- Automated testing
- Scripting
- Monitoring

## Environment Variables

While the CLI uses its configuration file, you can override settings:

```bash
# Override network
x402 config set --network devnet

# Override RPC URL
x402 config set --rpc-url https://custom-rpc.solana.com
```

## Troubleshooting

### "Wallet not found"

```bash
# Create a wallet first
x402 wallet create

# Or specify wallet path
x402 test http://localhost:3000/api/data --wallet ./my-wallet.json
```

### "Insufficient USDC balance"

```bash
# Check your balance
x402 wallet balance

# On devnet, get USDC from a faucet
# On mainnet, you need to buy USDC
```

### "Airdrop only available on devnet"

```bash
# Make sure you're on devnet
x402 config set --network devnet

# Then request airdrop
x402 wallet airdrop
```

### "Transaction not found"

This can happen if:
- The signature is invalid
- The transaction hasn't been confirmed yet (wait a few seconds)
- You're checking on the wrong network

```bash
# Verify you're on the correct network
x402 config show

# Try again after a few seconds
x402 pay info <signature>
```

### RPC Rate Limits

If you encounter RPC rate limits:

```bash
# Use a custom RPC endpoint
x402 config set --rpc-url https://your-premium-rpc.com

# Or use a service like QuickNode, Helius, or Alchemy
```

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/your-org/x402-solana-toolkit.git
cd x402-solana-toolkit/packages/cli

# Install dependencies
npm install

# Build
npm run build

# Link for local testing
npm link

# Now you can use x402 command globally
x402 --help
```

### Running Tests

```bash
npm test
```

### Running in Development Mode

```bash
npm run dev
```

## Examples

### Example 1: Testing Multiple Endpoints

```bash
#!/bin/bash

# Test suite for x402 API

echo "Testing public endpoint (no payment)..."
x402 test http://localhost:3000/api/public

echo "Testing basic premium endpoint ($0.001)..."
x402 test http://localhost:3000/api/premium --price 0.001

echo "Testing advanced premium endpoint ($0.01)..."
x402 test http://localhost:3000/api/advanced --price 0.01

echo "All tests complete!"
```

### Example 2: Automated Balance Checking

```bash
#!/bin/bash

# Check if balance is sufficient before testing

BALANCE=$(x402 wallet balance --json | jq -r '.usdc')
REQUIRED=1.0

if (( $(echo "$BALANCE < $REQUIRED" | bc -l) )); then
  echo "Insufficient balance: $BALANCE USDC (need $REQUIRED USDC)"
  exit 1
fi

echo "Balance OK: $BALANCE USDC"
x402 test http://localhost:3000/api/data
```

### Example 3: CI/CD Integration

```yaml
# .github/workflows/test.yml
name: API Payment Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install CLI
        run: npm install -g @x402-solana/cli

      - name: Configure CLI
        run: |
          x402 config set --network devnet
          echo '${{ secrets.TEST_WALLET }}' > wallet.json

      - name: Test API endpoints
        run: |
          x402 test http://api.example.com/data --json > result.json
          cat result.json

      - name: Verify payment
        run: |
          SIGNATURE=$(jq -r '.paymentSignature' result.json)
          x402 pay verify $SIGNATURE --json
```

## API

### Exit Codes

- `0` - Success
- `1` - Error (wallet not found, payment failed, etc.)

### Output Format

All JSON output follows a consistent structure:

**Wallet Balance:**
```json
{
  "sol": 1.5,
  "usdc": 10.0
}
```

**Test Result:**
```json
{
  "success": true,
  "statusCode": 200,
  "paymentRequired": true,
  "paymentAmount": 0.001,
  "paymentDescription": "API access",
  "paymentSignature": "5j7s6NiJS...",
  "responseData": {...},
  "duration": 1234
}
```

**Payment Details:**
```json
{
  "signature": "5j7s6NiJS...",
  "from": "9xQeWvG816...",
  "to": "7yLCa9k2Pm...",
  "amount": 1000,
  "amountUSD": 0.001,
  "mint": "Gh9ZwEmdLJ...",
  "timestamp": 1609459200,
  "slot": 123456789,
  "valid": true
}
```

## License

MIT

## Contributing

Contributions are welcome! Please see the main repository for contributing guidelines.

## Support

- Documentation: https://github.com/your-org/x402-solana-toolkit
- Issues: https://github.com/your-org/x402-solana-toolkit/issues
- Discord: https://discord.gg/your-server

## Related Packages

- [@x402-solana/core](../core) - Core payment verification
- [@x402-solana/client](../client) - Client SDK for automatic payments
- [@x402-solana/server](../server) - Server-side integrations
- [@x402-solana/react](../react) - React hooks and components
