# x402 CLI Usage Guide

Comprehensive guide for using the x402 CLI tool to test payment-enabled APIs.

## Table of Contents

1. [Installation](#installation)
2. [First-Time Setup](#first-time-setup)
3. [Testing Workflow](#testing-workflow)
4. [Command Reference](#command-reference)
5. [Advanced Usage](#advanced-usage)
6. [Troubleshooting](#troubleshooting)

## Installation

### Option 1: Global Installation

```bash
npm install -g @x402-solana/cli
```

### Option 2: Run with npx

```bash
npx @x402-solana/cli --help
```

### Option 3: Build from Source

```bash
# Clone repository
git clone https://github.com/your-org/x402-solana-toolkit.git
cd x402-solana-toolkit

# Install dependencies
npm install

# Build packages
npm run build

# Link CLI globally
cd packages/cli
npm link

# Verify installation
x402 --version
```

## First-Time Setup

### Step 1: Create a Wallet

```bash
x402 wallet create
```

Output:
```
Creating new wallet...
✓ Wallet created successfully

Public Key : 9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin
Wallet File: /Users/you/.x402/wallet.json

⚠ IMPORTANT: Keep your wallet file secure!
ℹ Use "x402 wallet export" to view your private key
```

### Step 2: Configure Network

```bash
# For testing (default)
x402 config set --network devnet

# For production
x402 config set --network mainnet-beta
```

### Step 3: Fund Your Wallet

#### On Devnet:

```bash
# Request SOL airdrop
x402 wallet airdrop --amount 2

# Check balance
x402 wallet balance
```

Output:
```
SOL : 2.000000000 SOL
USDC: 0.000000 USDC
```

#### Get USDC on Devnet:

1. Visit Solana Devnet Faucet
2. Use your wallet address: `x402 wallet show`
3. Or swap SOL for USDC using a DEX on devnet

#### On Mainnet:

- Transfer SOL and USDC to your wallet address
- Use `x402 wallet show` to get your public key

### Step 4: Verify Setup

```bash
x402 wallet show
```

Output:
```
══════════════════════════════════════════════════════
Wallet Information
──────────────────────────────────────────────────────
Public Key           : 9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin
Short Address        : 9xQeWvG8...rpZb9PusVFin
SOL Balance          : 2.000000000 SOL
USDC Balance         : 10.000000 USDC
USDC Token Account   : 7yLCa9k2PmVsFf1qH5cVx8pYKN2qF9zMHc8E4jQ9Xx1d
Network              : devnet
──────────────────────────────────────────────────────
```

## Testing Workflow

### Basic Test Flow

```bash
# 1. Start with a simple GET request
x402 test http://localhost:3000/api/data

# 2. Test a paid endpoint
x402 test http://localhost:3000/api/premium --price 0.001

# 3. Verify the payment
x402 pay info <signature-from-output>
```

### Example Test Session

```bash
$ x402 test http://localhost:3000/api/premium --price 0.001

Testing GET http://localhost:3000/api/premium...

✓ Request successful! (200) in 2.3s

ℹ Payment Required: $0.001000
ℹ Description: Access to premium API data
✓ Payment sent and confirmed!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Response Data
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "data": "Premium content here!",
  "paidBy": "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
  "signature": "5j7s6NiJS3JAkvgkoc18WVAsiSaci2pxB2A6ueCJP4tprA2TFg9wSyTLeYouxPBJEMzJinENTkpA52YStRW5Dia7"
}

✓ Price validation: PASSED ($0.001000)
```

## Command Reference

### Wallet Commands

#### Create New Wallet

```bash
x402 wallet create [--output <path>]
```

**Example:**
```bash
# Use default location (~/.x402/wallet.json)
x402 wallet create

# Specify custom location
x402 wallet create --output ./my-project-wallet.json
```

#### Import Existing Wallet

```bash
x402 wallet import <private-key> [--output <path>]
```

**Example:**
```bash
# Import from base58 private key
x402 wallet import 5J7s6NiJS3JAkvgkoc18...

# Import to specific location
x402 wallet import 5J7s6NiJS3JAkvgkoc18... --output ./wallet.json
```

#### Check Wallet Info

```bash
x402 wallet show [--wallet <path>] [--json]
```

**Example:**
```bash
# Show default wallet
x402 wallet show

# Show specific wallet
x402 wallet show --wallet ./other-wallet.json

# JSON output for scripting
x402 wallet show --json
```

#### Check Balances

```bash
x402 wallet balance [--wallet <path>] [--json]
```

**Example:**
```bash
x402 wallet balance
x402 wallet balance --json | jq '.usdc'  # Get just USDC balance
```

#### Export Private Key

```bash
x402 wallet export [--wallet <path>]
```

**Example:**
```bash
x402 wallet export
```

Output:
```
Are you sure you want to export your private key? (y/N): y

⚠ KEEP THIS PRIVATE KEY SECURE!

Private Key (base58): 5J7s6NiJS3JAkvgkoc18WVAsiSaci2pxB2A6ueCJP4tprA2TFg9wSyTLeYouxPBJEMzJinENTkpA52YStRW5Dia7
```

#### Request Airdrop (Devnet Only)

```bash
x402 wallet airdrop [--wallet <path>] [--amount <sol>]
```

**Example:**
```bash
# Request 1 SOL (default)
x402 wallet airdrop

# Request 2 SOL
x402 wallet airdrop --amount 2
```

### API Testing Commands

#### Test Endpoint

```bash
x402 test <url> [options]
```

**Options:**
- `--price <usd>` - Expected payment price for validation
- `--wallet <path>` - Wallet file path
- `--method <method>` - HTTP method (GET, POST, PUT, DELETE)
- `--header <header>` - HTTP header (can be used multiple times)
- `--data <json>` - Request body data
- `--verbose` - Show debug logging
- `--json` - Output as JSON

**Examples:**

Simple GET:
```bash
x402 test http://localhost:3000/api/data
```

POST with data:
```bash
x402 test http://localhost:3000/api/create \
  --method POST \
  --header "Content-Type: application/json" \
  --data '{"name": "test", "value": 123}'
```

With price validation:
```bash
x402 test http://localhost:3000/api/premium \
  --price 0.001 \
  --verbose
```

Multiple headers:
```bash
x402 test http://localhost:3000/api/data \
  --header "Authorization: Bearer token123" \
  --header "X-Custom-Header: value"
```

JSON output:
```bash
x402 test http://localhost:3000/api/data --json > result.json
cat result.json | jq '.responseData'
```

### Payment Verification Commands

#### Verify Payment

```bash
x402 pay verify <signature> [options]
```

**Options:**
- `--recipient <address>` - Expected recipient token account
- `--amount <usd>` - Expected payment amount
- `--network <network>` - Network (devnet or mainnet-beta)
- `--json` - Output as JSON

**Example:**
```bash
x402 pay verify 5j7s6NiJS3JAkvgkoc18... \
  --recipient 7yLCa9k2PmVsFf1qH5cVx8pYKN2qF9zMHc8E4jQ9Xx1d \
  --amount 0.001 \
  --network devnet
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

Output:
```
══════════════════════════════════════════════════════
Payment Information
──────────────────────────────────────────────────────

Transaction
  Signature  : 5j7s6NiJS3JAkvgkoc18WVAsiSaci2pxB2A6ueCJP4tprA2TFg9wSyTLeYouxPBJEMzJinENTkpA52YStRW5Dia7
  Slot       : 123456789
  Timestamp  : 1/1/2024, 12:00:00 PM
  Age        : 30.5s
  Valid      : Yes

Transfer
  From        : 9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin
  To          : 7yLCa9k2PmVsFf1qH5cVx8pYKN2qF9zMHc8E4jQ9Xx1d
  Amount      : 1000 micro-USDC
  Amount (USD): $0.001000
  Amount (USDC): 0.001000 USDC
  Mint        : Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr
```

### Configuration Commands

#### Show Config

```bash
x402 config show
```

Output:
```
══════════════════════════════════════════════════════
Current Configuration
──────────────────────────────────────────────────────
Network     : Devnet
RPC URL     : https://api.devnet.solana.com
Wallet Path : /Users/you/.x402/wallet.json
Commitment  : confirmed
Config File : /Users/you/.x402/config.json
```

#### Update Config

```bash
x402 config set [options]
```

**Options:**
- `--network <network>` - Set network
- `--rpc-url <url>` - Set RPC URL
- `--wallet-path <path>` - Set default wallet path
- `--commitment <level>` - Set commitment level

**Example:**
```bash
# Set network
x402 config set --network mainnet-beta

# Set custom RPC
x402 config set --rpc-url https://my-premium-rpc.com

# Set default wallet
x402 config set --wallet-path ./prod-wallet.json

# Set commitment
x402 config set --commitment finalized
```

#### Reset Config

```bash
x402 config reset
```

## Advanced Usage

### Testing in CI/CD

```bash
#!/bin/bash
set -e

# Setup
x402 config set --network devnet
echo "$WALLET_JSON" > /tmp/wallet.json

# Run tests
x402 test http://api.example.com/endpoint1 --wallet /tmp/wallet.json --json > result1.json
x402 test http://api.example.com/endpoint2 --wallet /tmp/wallet.json --json > result2.json

# Verify results
jq -e '.success == true' result1.json
jq -e '.success == true' result2.json

echo "All tests passed!"
```

### Batch Testing

```bash
#!/bin/bash

ENDPOINTS=(
  "http://localhost:3000/api/data1:0.001"
  "http://localhost:3000/api/data2:0.005"
  "http://localhost:3000/api/data3:0.01"
)

for endpoint in "${ENDPOINTS[@]}"; do
  IFS=':' read -r url price <<< "$endpoint"
  echo "Testing $url (expected price: \$$price)"

  if x402 test "$url" --price "$price"; then
    echo "✓ PASS: $url"
  else
    echo "✗ FAIL: $url"
    exit 1
  fi

  echo ""
done

echo "All tests passed!"
```

### Monitoring Balance

```bash
#!/bin/bash

# Check balance before test suite
INITIAL=$(x402 wallet balance --json | jq -r '.usdc')
echo "Initial balance: $INITIAL USDC"

# Run tests...
x402 test http://localhost:3000/api/test1
x402 test http://localhost:3000/api/test2

# Check balance after
FINAL=$(x402 wallet balance --json | jq -r '.usdc')
echo "Final balance: $FINAL USDC"

# Calculate spent
SPENT=$(echo "$INITIAL - $FINAL" | bc)
echo "Total spent: $SPENT USDC"
```

### Multiple Wallets

```bash
# Development wallet
x402 test http://localhost:3000/api/data --wallet ./dev-wallet.json

# Staging wallet
x402 test http://staging.example.com/api/data --wallet ./staging-wallet.json

# Production wallet (be careful!)
x402 test http://api.example.com/api/data --wallet ./prod-wallet.json
```

### JSON Processing

```bash
# Get specific field from response
x402 test http://localhost:3000/api/data --json | jq '.responseData.users[]'

# Check if payment was required
x402 test http://localhost:3000/api/data --json | jq '.paymentRequired'

# Get payment signature
SIG=$(x402 test http://localhost:3000/api/data --json | jq -r '.paymentSignature')

# Verify that payment
x402 pay info $SIG --json
```

## Troubleshooting

### Issue: "Wallet not found"

**Solution:**
```bash
# Check config
x402 config show

# Create wallet if needed
x402 wallet create

# Or specify wallet path
x402 test http://localhost:3000/api/data --wallet ./my-wallet.json
```

### Issue: "Insufficient USDC balance"

**Solution:**
```bash
# Check balance
x402 wallet balance

# On devnet, get from faucet
# On mainnet, transfer USDC to wallet
x402 wallet show  # Get your address
```

### Issue: "Airdrop failed" or "Rate limit exceeded"

**Solution:**
```bash
# Wait a few minutes and try again
x402 wallet airdrop --amount 1

# Or use Solana CLI
solana airdrop 2 $(x402 wallet show --json | jq -r '.publicKey')
```

### Issue: "Payment failed: Transaction simulation failed"

**Possible causes:**
1. Insufficient SOL for transaction fees
2. Insufficient USDC for payment
3. RPC endpoint issues

**Solution:**
```bash
# Check both balances
x402 wallet balance

# Try with verbose logging
x402 test http://localhost:3000/api/data --verbose

# Try different RPC
x402 config set --rpc-url https://different-rpc.com
```

### Issue: "Transaction not found"

**Solution:**
```bash
# Wait a few seconds and try again
sleep 5
x402 pay info <signature>

# Check you're on the right network
x402 config show

# Verify signature is correct (64 characters)
```

### Issue: "Price validation failed"

**Reason:** The API returned a different price than expected.

**Solution:**
```bash
# Check actual price without validation
x402 test http://localhost:3000/api/data --verbose

# Update expected price
x402 test http://localhost:3000/api/data --price 0.005
```

## Tips and Best Practices

1. **Use separate wallets for dev/staging/prod**
   ```bash
   x402 wallet create --output ./dev-wallet.json
   x402 wallet create --output ./prod-wallet.json
   ```

2. **Always check balances before testing**
   ```bash
   x402 wallet balance
   ```

3. **Use verbose mode for debugging**
   ```bash
   x402 test http://localhost:3000/api/data --verbose
   ```

4. **Use JSON mode for automation**
   ```bash
   x402 test http://localhost:3000/api/data --json | jq
   ```

5. **Monitor your spending**
   ```bash
   # Before tests
   x402 wallet balance --json > before.json

   # Run tests...

   # After tests
   x402 wallet balance --json > after.json

   # Calculate difference
   jq -s '.[0].usdc - .[1].usdc' before.json after.json
   ```

6. **Keep your wallet secure**
   - Never commit wallet files to git
   - Use `.gitignore` to exclude wallet files
   - Back up wallet files securely
   - Use separate wallets for testing

7. **Use environment-specific configs**
   ```bash
   # Development
   x402 config set --network devnet --wallet-path ./dev-wallet.json

   # Production
   x402 config set --network mainnet-beta --wallet-path ./prod-wallet.json
   ```