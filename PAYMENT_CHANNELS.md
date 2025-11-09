# Payment Channels Implementation Guide for x402-solana-toolkit

**Status:** Future Enhancement (Optional)
**Effort:** 2-3 weeks full-time
**Complexity:** High
**ROI:** High for specific use cases (streaming, high-frequency)

---

## Table of Contents

1. [Overview](#overview)
2. [When to Use Payment Channels](#when-to-use-payment-channels)
3. [Architecture](#architecture)
4. [Technical Specification](#technical-specification)
5. [Implementation Plan](#implementation-plan)
6. [Security Considerations](#security-considerations)
7. [Testing Strategy](#testing-strategy)
8. [Migration Path](#migration-path)

---

## Overview

### What Are Payment Channels?

Payment channels are Layer 2 scaling solutions that enable two parties to conduct unlimited off-chain transactions by exchanging signed messages, only settling the final state on-chain.

**Key Benefits:**
- **Cost**: 99.8% fee reduction for high-frequency usage
- **Speed**: <10ms payment verification (vs 400-800ms on-chain)
- **Throughput**: Unlimited transactions between channel parties
- **Privacy**: Only open/close transactions visible on-chain

**Key Tradeoffs:**
- **Complexity**: Significant implementation overhead
- **Liquidity**: Requires upfront capital lockup
- **State Management**: Must track nonces, handle disputes
- **UX**: Channel setup adds friction to first interaction

### Cost Comparison

```
Scenario: 1000 API calls at $0.01 each

WITHOUT CHANNELS:
- 1000 on-chain payments
- Fee: 1000 × $0.00025 = $0.25
- API cost: $10.00
- Total: $10.25

WITH CHANNELS:
- 1 channel open: $0.00025
- 1000 off-chain signatures: $0
- 1 channel close: $0.00025
- Total fees: $0.0005
- API cost: $10.00
- Total: $10.0005

Savings: $0.2495 (97.5% fee reduction)
```

---

## When to Use Payment Channels

### ✅ **IDEAL Use Cases**

1. **High-Frequency Trading / Price Feeds**
   - 100+ requests per second
   - Same server repeatedly
   - Continuous usage over hours/days
   - **ROI: Excellent** (save $100+ per day)

2. **Real-Time Data Streaming**
   - Live sports scores
   - Market data feeds
   - IoT sensor data
   - **ROI: Excellent** (save $50+ per day)

3. **AI Token-Based Billing**
   - Pay per LLM token ($0.00001 per token)
   - Sub-cent granularity needed
   - Millions of micro-transactions
   - **ROI: Excellent** (enables new business model)

4. **Gaming Micro-Transactions**
   - In-game actions (100+ per session)
   - Item purchases
   - Loot boxes
   - **ROI: Good** (save $1-5 per player per day)

### ❌ **POOR Use Cases**

1. **Sporadic API Usage** (Current Solex betting agent)
   - 5-10 calls per hour
   - Different APIs each call
   - Channel setup overhead > savings
   - **ROI: Negative**

2. **One-Off Requests**
   - Research/exploration
   - Trying new APIs
   - Channel never amortizes
   - **ROI: Negative**

3. **Multi-Provider Scenarios**
   - Agent calls 20 different APIs
   - Need 20 separate channels
   - Liquidity spread across providers
   - **ROI: Poor**

### Decision Matrix

| Use Case | Req/Hour | Same Server | Duration | Channels? |
|----------|----------|-------------|----------|-----------|
| HFT Bot | 360,000 | Yes | Days | ✅ YES |
| Streaming | 36,000 | Yes | Hours | ✅ YES |
| Gaming | 600 | Yes | 1-2hr | ⚠️ MAYBE |
| Betting Agent | 5-10 | No | Sporadic | ❌ NO |
| Research | 1-5 | No | One-off | ❌ NO |

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT (Off-Chain)                                          │
│                                                              │
│  • Channel Manager                                           │
│  • State Signature Generator                                 │
│  • Nonce Tracker                                             │
│  • Balance Manager                                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Signed Off-Chain States
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  SERVER (Off-Chain)                                          │
│                                                              │
│  • State Validator                                           │
│  • Nonce Verification                                        │
│  • Balance Tracking                                          │
│  • Dispute Handler                                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ On-Chain Settlements
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  SOLANA PROGRAM (On-Chain)                                   │
│                                                              │
│  • Channel State Storage                                     │
│  • Open Channel                                              │
│  • Cooperative Close                                         │
│  • Force Close + Dispute                                     │
│  • Timeout Handling                                          │
└─────────────────────────────────────────────────────────────┘
```

### Channel Lifecycle

```
1. OPEN CHANNEL (On-Chain Transaction)
   ├─ Client initiates with deposit
   ├─ Server optionally deposits (bidirectional)
   ├─ Program locks funds in escrow
   ├─ Channel ID generated
   └─ Initial state: { nonce: 0, clientBalance: 100, serverBalance: 0 }

2. OFF-CHAIN PAYMENTS (Signed Messages)
   ├─ State 1: { nonce: 1, clientBalance: 99.99, serverBalance: 0.01 }
   ├─ State 2: { nonce: 2, clientBalance: 99.98, serverBalance: 0.02 }
   ├─ State 3: { nonce: 3, clientBalance: 99.97, serverBalance: 0.03 }
   └─ ... thousands more (no blockchain)

3. CLOSE CHANNEL (On-Chain Transaction)
   a) COOPERATIVE CLOSE (Happy Path)
      ├─ Both parties agree on final state
      ├─ Submit state N: { nonce: 1000, clientBalance: 90, serverBalance: 10 }
      ├─ Program verifies signatures
      └─ Funds released instantly

   b) FORCE CLOSE (Dispute Path)
      ├─ One party submits latest known state
      ├─ Challenge period begins (e.g., 24 hours)
      ├─ Other party can submit higher nonce state
      ├─ After timeout, highest nonce state settles
      └─ Penalty for submitting old state
```

### State Structure

```typescript
interface ChannelState {
  channelId: string;          // Unique channel identifier
  nonce: bigint;              // Monotonically increasing counter
  clientBalance: bigint;      // Client's remaining balance (micro-USDC)
  serverBalance: bigint;      // Server's earned balance (micro-USDC)
  clientSignature: Uint8Array; // Client's Ed25519 signature
  serverSignature?: Uint8Array; // Optional: for bidirectional
}
```

---

## Technical Specification

### Package Structure

```
packages/
├── channels/                           # New package
│   ├── src/
│   │   ├── program/                    # Solana program (Anchor)
│   │   │   ├── instructions/
│   │   │   │   ├── open_channel.rs
│   │   │   │   ├── cooperative_close.rs
│   │   │   │   ├── force_close.rs
│   │   │   │   ├── challenge.rs
│   │   │   │   └── settle.rs
│   │   │   ├── state/
│   │   │   │   └── channel.rs
│   │   │   ├── errors.rs
│   │   │   └── lib.rs
│   │   │
│   │   ├── client/                     # Off-chain client SDK
│   │   │   ├── channel-manager.ts
│   │   │   ├── state-signer.ts
│   │   │   ├── balance-tracker.ts
│   │   │   └── x402-channel-client.ts
│   │   │
│   │   ├── server/                     # Off-chain server SDK
│   │   │   ├── channel-validator.ts
│   │   │   ├── state-verifier.ts
│   │   │   ├── dispute-handler.ts
│   │   │   └── x402-channel-middleware.ts
│   │   │
│   │   └── types/
│   │       ├── channel-state.types.ts
│   │       └── channel-error.types.ts
│   │
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── e2e/
```

### Solana Program (Anchor)

```rust
// programs/x402-channels/src/lib.rs

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("X402Ch4nn31s1111111111111111111111111111111");

#[program]
pub mod x402_channels {
    use super::*;

    /// Open a new payment channel
    pub fn open_channel(
        ctx: Context<OpenChannel>,
        channel_id: [u8; 32],
        client_deposit: u64,
        challenge_period: i64,
    ) -> Result<()> {
        let channel = &mut ctx.accounts.channel;

        require!(client_deposit > 0, ChannelError::InvalidDeposit);
        require!(challenge_period >= 3600, ChannelError::ChallengePeriodTooShort);

        // Transfer USDC from client to escrow
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.client_usdc.to_account_info(),
                    to: ctx.accounts.escrow_usdc.to_account_info(),
                    authority: ctx.accounts.client.to_account_info(),
                },
            ),
            client_deposit,
        )?;

        // Initialize channel state
        channel.channel_id = channel_id;
        channel.client = ctx.accounts.client.key();
        channel.server = ctx.accounts.server.key();
        channel.client_balance = client_deposit;
        channel.server_balance = 0;
        channel.nonce = 0;
        channel.challenge_period = challenge_period;
        channel.status = ChannelStatus::Open;
        channel.opened_at = Clock::get()?.unix_timestamp;

        Ok(())
    }

    /// Cooperatively close channel (both parties agree)
    pub fn cooperative_close(
        ctx: Context<CooperativeClose>,
        nonce: u64,
        client_balance: u64,
        server_balance: u64,
        client_signature: [u8; 64],
        server_signature: [u8; 64],
    ) -> Result<()> {
        let channel = &mut ctx.accounts.channel;

        require!(channel.status == ChannelStatus::Open, ChannelError::ChannelNotOpen);
        require!(nonce >= channel.nonce, ChannelError::NonceNotIncreasing);
        require!(
            client_balance + server_balance == channel.client_balance + channel.server_balance,
            ChannelError::BalanceMismatch
        );

        // Verify signatures
        let state_message = create_state_message(
            &channel.channel_id,
            nonce,
            client_balance,
            server_balance,
        );

        verify_signature(&state_message, &client_signature, &channel.client)?;
        verify_signature(&state_message, &server_signature, &channel.server)?;

        // Transfer funds from escrow
        if client_balance > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.escrow_usdc.to_account_info(),
                        to: ctx.accounts.client_usdc.to_account_info(),
                        authority: ctx.accounts.escrow_authority.to_account_info(),
                    },
                    &[&[b"escrow", &channel.channel_id, &[channel.escrow_bump]]],
                ),
                client_balance,
            )?;
        }

        if server_balance > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.escrow_usdc.to_account_info(),
                        to: ctx.accounts.server_usdc.to_account_info(),
                        authority: ctx.accounts.escrow_authority.to_account_info(),
                    },
                    &[&[b"escrow", &channel.channel_id, &[channel.escrow_bump]]],
                ),
                server_balance,
            )?;
        }

        channel.status = ChannelStatus::Closed;
        channel.closed_at = Some(Clock::get()?.unix_timestamp);

        Ok(())
    }

    /// Force close channel (dispute)
    pub fn force_close(
        ctx: Context<ForceClose>,
        nonce: u64,
        client_balance: u64,
        server_balance: u64,
        signature: [u8; 64],
    ) -> Result<()> {
        let channel = &mut ctx.accounts.channel;

        require!(channel.status == ChannelStatus::Open, ChannelError::ChannelNotOpen);
        require!(nonce >= channel.nonce, ChannelError::NonceNotIncreasing);

        // Verify signature from submitter
        let state_message = create_state_message(
            &channel.channel_id,
            nonce,
            client_balance,
            server_balance,
        );

        let submitter = ctx.accounts.submitter.key();
        if submitter == channel.client {
            verify_signature(&state_message, &signature, &channel.client)?;
        } else if submitter == channel.server {
            verify_signature(&state_message, &signature, &channel.server)?;
        } else {
            return Err(ChannelError::UnauthorizedSubmitter.into());
        }

        // Update channel state and start challenge period
        channel.nonce = nonce;
        channel.client_balance = client_balance;
        channel.server_balance = server_balance;
        channel.status = ChannelStatus::Challenging;
        channel.challenge_deadline = Some(
            Clock::get()?.unix_timestamp + channel.challenge_period
        );

        Ok(())
    }

    /// Challenge a force close with newer state
    pub fn challenge(
        ctx: Context<Challenge>,
        nonce: u64,
        client_balance: u64,
        server_balance: u64,
        signature: [u8; 64],
    ) -> Result<()> {
        let channel = &mut ctx.accounts.channel;

        require!(
            channel.status == ChannelStatus::Challenging,
            ChannelError::ChannelNotChallenging
        );
        require!(
            Clock::get()?.unix_timestamp < channel.challenge_deadline.unwrap(),
            ChannelError::ChallengePeriodExpired
        );
        require!(nonce > channel.nonce, ChannelError::NonceNotHigher);

        // Verify signature
        let state_message = create_state_message(
            &channel.channel_id,
            nonce,
            client_balance,
            server_balance,
        );

        let challenger = ctx.accounts.challenger.key();
        if challenger == channel.client {
            verify_signature(&state_message, &signature, &channel.client)?;
        } else if challenger == channel.server {
            verify_signature(&state_message, &signature, &channel.server)?;
        } else {
            return Err(ChannelError::UnauthorizedChallenger.into());
        }

        // Update to newer state
        channel.nonce = nonce;
        channel.client_balance = client_balance;
        channel.server_balance = server_balance;

        Ok(())
    }

    /// Settle channel after challenge period
    pub fn settle(ctx: Context<Settle>) -> Result<()> {
        let channel = &mut ctx.accounts.channel;

        require!(
            channel.status == ChannelStatus::Challenging,
            ChannelError::ChannelNotChallenging
        );
        require!(
            Clock::get()?.unix_timestamp >= channel.challenge_deadline.unwrap(),
            ChannelError::ChallengePeriodNotExpired
        );

        // Transfer final balances
        if channel.client_balance > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.escrow_usdc.to_account_info(),
                        to: ctx.accounts.client_usdc.to_account_info(),
                        authority: ctx.accounts.escrow_authority.to_account_info(),
                    },
                    &[&[b"escrow", &channel.channel_id, &[channel.escrow_bump]]],
                ),
                channel.client_balance,
            )?;
        }

        if channel.server_balance > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.escrow_usdc.to_account_info(),
                        to: ctx.accounts.server_usdc.to_account_info(),
                        authority: ctx.accounts.escrow_authority.to_account_info(),
                    },
                    &[&[b"escrow", &channel.channel_id, &[channel.escrow_bump]]],
                ),
                channel.server_balance,
            )?;
        }

        channel.status = ChannelStatus::Settled;
        channel.closed_at = Some(Clock::get()?.unix_timestamp);

        Ok(())
    }
}

#[derive(Accounts)]
pub struct OpenChannel<'info> {
    #[account(
        init,
        payer = client,
        space = 8 + Channel::SIZE,
        seeds = [b"channel", channel_id.as_ref()],
        bump
    )]
    pub channel: Account<'info, Channel>,

    #[account(mut)]
    pub client: Signer<'info>,

    /// CHECK: Server public key
    pub server: AccountInfo<'info>,

    #[account(mut)]
    pub client_usdc: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = client,
        token::mint = usdc_mint,
        token::authority = escrow_authority,
        seeds = [b"escrow", channel_id.as_ref()],
        bump
    )]
    pub escrow_usdc: Account<'info, TokenAccount>,

    /// CHECK: PDA authority for escrow
    pub escrow_authority: AccountInfo<'info>,

    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[account]
pub struct Channel {
    pub channel_id: [u8; 32],
    pub client: Pubkey,
    pub server: Pubkey,
    pub client_balance: u64,
    pub server_balance: u64,
    pub nonce: u64,
    pub status: ChannelStatus,
    pub challenge_period: i64,
    pub challenge_deadline: Option<i64>,
    pub opened_at: i64,
    pub closed_at: Option<i64>,
    pub escrow_bump: u8,
}

impl Channel {
    pub const SIZE: usize = 32 + // channel_id
        32 + // client
        32 + // server
        8 + // client_balance
        8 + // server_balance
        8 + // nonce
        1 + // status
        8 + // challenge_period
        1 + 8 + // challenge_deadline
        8 + // opened_at
        1 + 8 + // closed_at
        1; // escrow_bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ChannelStatus {
    Open,
    Challenging,
    Closed,
    Settled,
}

#[error_code]
pub enum ChannelError {
    #[msg("Invalid deposit amount")]
    InvalidDeposit,
    #[msg("Challenge period too short")]
    ChallengePeriodTooShort,
    #[msg("Channel is not open")]
    ChannelNotOpen,
    #[msg("Nonce must be increasing")]
    NonceNotIncreasing,
    #[msg("Balance mismatch")]
    BalanceMismatch,
    #[msg("Invalid signature")]
    InvalidSignature,
    #[msg("Unauthorized submitter")]
    UnauthorizedSubmitter,
    #[msg("Channel not in challenging state")]
    ChannelNotChallenging,
    #[msg("Challenge period expired")]
    ChallengePeriodExpired,
    #[msg("Nonce not higher")]
    NonceNotHigher,
    #[msg("Unauthorized challenger")]
    UnauthorizedChallenger,
    #[msg("Challenge period not expired")]
    ChallengePeriodNotExpired,
}

fn create_state_message(
    channel_id: &[u8; 32],
    nonce: u64,
    client_balance: u64,
    server_balance: u64,
) -> Vec<u8> {
    let mut message = Vec::new();
    message.extend_from_slice(channel_id);
    message.extend_from_slice(&nonce.to_le_bytes());
    message.extend_from_slice(&client_balance.to_le_bytes());
    message.extend_from_slice(&server_balance.to_le_bytes());
    message
}

fn verify_signature(
    message: &[u8],
    signature: &[u8; 64],
    pubkey: &Pubkey,
) -> Result<()> {
    use ed25519_dalek::{Verifier, PublicKey, Signature};

    let public_key = PublicKey::from_bytes(&pubkey.to_bytes())
        .map_err(|_| ChannelError::InvalidSignature)?;

    let sig = Signature::from_bytes(signature)
        .map_err(|_| ChannelError::InvalidSignature)?;

    public_key
        .verify(message, &sig)
        .map_err(|_| ChannelError::InvalidSignature.into())
}
```

### Client SDK

```typescript
// packages/channels/src/client/x402-channel-client.ts

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@project-serum/anchor';
import nacl from 'tweetnacl';
import { ChannelState } from '../types/channel-state.types';

export class X402ChannelClient {
  private connection: Connection;
  private wallet: Keypair;
  private program: Program;
  private channels: Map<string, ChannelManager>;

  constructor(config: {
    solanaRpcUrl: string;
    walletPrivateKey: string;
    programId: string;
  }) {
    this.connection = new Connection(config.solanaRpcUrl);
    this.wallet = Keypair.fromSecretKey(bs58.decode(config.walletPrivateKey));
    this.channels = new Map();

    // Initialize Anchor program
    const provider = new AnchorProvider(this.connection, this.wallet, {});
    this.program = new Program(IDL, new PublicKey(config.programId), provider);
  }

  /**
   * Open a new payment channel with server
   */
  async openChannel(
    serverPublicKey: string,
    depositAmount: number,
    challengePeriod: number = 86400 // 24 hours
  ): Promise<string> {
    const channelId = nacl.randomBytes(32);
    const depositMicroUSDC = new BN(depositAmount * 1_000_000);

    // Derive PDAs
    const [channelPDA] = await PublicKey.findProgramAddress(
      [Buffer.from('channel'), Buffer.from(channelId)],
      this.program.programId
    );

    const [escrowPDA] = await PublicKey.findProgramAddress(
      [Buffer.from('escrow'), Buffer.from(channelId)],
      this.program.programId
    );

    // Call open_channel instruction
    const tx = await this.program.methods
      .openChannel(
        Array.from(channelId),
        depositMicroUSDC,
        new BN(challengePeriod)
      )
      .accounts({
        channel: channelPDA,
        client: this.wallet.publicKey,
        server: new PublicKey(serverPublicKey),
        clientUsdc: await this.getUSDCAccount(this.wallet.publicKey),
        escrowUsdc: escrowPDA,
        escrowAuthority: escrowPDA,
        usdcMint: this.getUSDCMint(),
      })
      .rpc();

    await this.connection.confirmTransaction(tx);

    // Create local channel manager
    const channelIdHex = Buffer.from(channelId).toString('hex');
    const manager = new ChannelManager(
      channelIdHex,
      this.wallet,
      new PublicKey(serverPublicKey),
      depositMicroUSDC.toNumber(),
      0
    );

    this.channels.set(channelIdHex, manager);

    return channelIdHex;
  }

  /**
   * Make off-chain payment via channel
   */
  async pay(
    channelId: string,
    amount: number
  ): Promise<ChannelState> {
    const manager = this.channels.get(channelId);
    if (!manager) {
      throw new Error('Channel not found');
    }

    return manager.createPayment(amount);
  }

  /**
   * Fetch via x402 using payment channel
   */
  async fetch(
    url: string,
    channelId: string,
    options?: RequestInit
  ): Promise<Response> {
    const manager = this.channels.get(channelId);
    if (!manager) {
      throw new Error('Channel not found');
    }

    // Get price from 402 response
    const initialResponse = await fetch(url, options);

    if (initialResponse.status !== 402) {
      return initialResponse;
    }

    const paymentDetails = await initialResponse.json();
    const priceUSD = paymentDetails.paymentDetails.amount;

    // Create off-chain payment
    const state = await this.pay(channelId, priceUSD);

    // Retry with channel state
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
        'X-Channel-Id': channelId,
        'X-Channel-Nonce': state.nonce.toString(),
        'X-Channel-Client-Balance': state.clientBalance.toString(),
        'X-Channel-Server-Balance': state.serverBalance.toString(),
        'X-Channel-Signature': Buffer.from(state.clientSignature).toString('hex'),
      },
    });

    return response;
  }

  /**
   * Cooperatively close channel
   */
  async closeChannel(channelId: string): Promise<string> {
    const manager = this.channels.get(channelId);
    if (!manager) {
      throw new Error('Channel not found');
    }

    const finalState = manager.getLatestState();

    // Get server signature (via API call)
    const serverSignature = await this.requestServerSignature(
      channelId,
      finalState
    );

    // Call cooperative_close instruction
    const [channelPDA] = await PublicKey.findProgramAddress(
      [Buffer.from('channel'), Buffer.from(channelId, 'hex')],
      this.program.programId
    );

    const tx = await this.program.methods
      .cooperativeClose(
        new BN(finalState.nonce),
        new BN(finalState.clientBalance),
        new BN(finalState.serverBalance),
        Array.from(finalState.clientSignature),
        Array.from(serverSignature)
      )
      .accounts({
        channel: channelPDA,
        client: this.wallet.publicKey,
        server: manager.serverPublicKey,
        clientUsdc: await this.getUSDCAccount(this.wallet.publicKey),
        serverUsdc: await this.getUSDCAccount(manager.serverPublicKey),
        escrowUsdc: await this.getEscrowAccount(channelId),
        escrowAuthority: await this.getEscrowAuthority(channelId),
      })
      .rpc();

    await this.connection.confirmTransaction(tx);

    this.channels.delete(channelId);

    return tx;
  }

  /**
   * Force close channel (dispute)
   */
  async forceClose(channelId: string): Promise<string> {
    const manager = this.channels.get(channelId);
    if (!manager) {
      throw new Error('Channel not found');
    }

    const finalState = manager.getLatestState();

    const [channelPDA] = await PublicKey.findProgramAddress(
      [Buffer.from('channel'), Buffer.from(channelId, 'hex')],
      this.program.programId
    );

    const tx = await this.program.methods
      .forceClose(
        new BN(finalState.nonce),
        new BN(finalState.clientBalance),
        new BN(finalState.serverBalance),
        Array.from(finalState.clientSignature)
      )
      .accounts({
        channel: channelPDA,
        submitter: this.wallet.publicKey,
      })
      .rpc();

    await this.connection.confirmTransaction(tx);

    return tx;
  }

  private async requestServerSignature(
    channelId: string,
    state: ChannelState
  ): Promise<Uint8Array> {
    // API call to server to get cooperative close signature
    const response = await fetch('/api/channel/close-signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId,
        nonce: state.nonce,
        clientBalance: state.clientBalance,
        serverBalance: state.serverBalance,
        clientSignature: Buffer.from(state.clientSignature).toString('hex'),
      }),
    });

    const data = await response.json();
    return Buffer.from(data.serverSignature, 'hex');
  }
}

class ChannelManager {
  private channelId: string;
  private wallet: Keypair;
  public serverPublicKey: PublicKey;
  private clientBalance: number;
  private serverBalance: number;
  private nonce: bigint;
  private latestState: ChannelState;

  constructor(
    channelId: string,
    wallet: Keypair,
    serverPublicKey: PublicKey,
    initialBalance: number,
    initialNonce: number
  ) {
    this.channelId = channelId;
    this.wallet = wallet;
    this.serverPublicKey = serverPublicKey;
    this.clientBalance = initialBalance;
    this.serverBalance = 0;
    this.nonce = BigInt(initialNonce);
  }

  createPayment(amountUSD: number): ChannelState {
    const amountMicroUSDC = amountUSD * 1_000_000;

    if (amountMicroUSDC > this.clientBalance) {
      throw new Error('Insufficient channel balance');
    }

    // Update balances
    this.clientBalance -= amountMicroUSDC;
    this.serverBalance += amountMicroUSDC;
    this.nonce += 1n;

    // Create state message
    const message = this.createStateMessage(
      this.nonce,
      this.clientBalance,
      this.serverBalance
    );

    // Sign with client private key
    const signature = nacl.sign.detached(message, this.wallet.secretKey);

    this.latestState = {
      channelId: this.channelId,
      nonce: this.nonce,
      clientBalance: this.clientBalance,
      serverBalance: this.serverBalance,
      clientSignature: signature,
    };

    return this.latestState;
  }

  getLatestState(): ChannelState {
    return this.latestState;
  }

  private createStateMessage(
    nonce: bigint,
    clientBalance: number,
    serverBalance: number
  ): Uint8Array {
    const message = Buffer.alloc(32 + 8 + 8 + 8);
    Buffer.from(this.channelId, 'hex').copy(message, 0);
    message.writeBigUInt64LE(nonce, 32);
    message.writeBigUInt64LE(BigInt(clientBalance), 40);
    message.writeBigUInt64LE(BigInt(serverBalance), 48);
    return message;
  }
}
```

### Server SDK

```typescript
// packages/channels/src/server/x402-channel-middleware.ts

import { Request, Response, NextFunction } from 'express';
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@project-serum/anchor';
import nacl from 'tweetnacl';

export class X402ChannelMiddleware {
  private connection: Connection;
  private program: Program;
  private recipientWallet: PublicKey;

  constructor(config: {
    solanaRpcUrl: string;
    recipientWallet: string;
    programId: string;
  }) {
    this.connection = new Connection(config.solanaRpcUrl);
    this.recipientWallet = new PublicKey(config.recipientWallet);

    const provider = new AnchorProvider(this.connection, null, {});
    this.program = new Program(IDL, new PublicKey(config.programId), provider);
  }

  requireChannelPayment(priceUSD: number) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const channelId = req.headers['x-channel-id'] as string;
      const nonce = req.headers['x-channel-nonce'] as string;
      const clientBalance = req.headers['x-channel-client-balance'] as string;
      const serverBalance = req.headers['x-channel-server-balance'] as string;
      const signature = req.headers['x-channel-signature'] as string;

      if (!channelId || !nonce || !clientBalance || !serverBalance || !signature) {
        return res.status(402).json({
          error: 'Channel payment required',
          paymentDetails: {
            amount: priceUSD,
            currency: 'USDC',
            channelRequired: true,
          },
        });
      }

      try {
        // Verify channel state
        const isValid = await this.verifyChannelState(
          channelId,
          BigInt(nonce),
          parseInt(clientBalance),
          parseInt(serverBalance),
          Buffer.from(signature, 'hex'),
          priceUSD
        );

        if (!isValid) {
          return res.status(402).json({
            error: 'Invalid channel payment',
          });
        }

        // Attach channel info to request
        req.channelPayment = {
          channelId,
          nonce: BigInt(nonce),
          amount: priceUSD,
          clientBalance: parseInt(clientBalance),
          serverBalance: parseInt(serverBalance),
        };

        next();
      } catch (error) {
        return res.status(402).json({
          error: 'Channel verification failed',
          details: error.message,
        });
      }
    };
  }

  private async verifyChannelState(
    channelId: string,
    nonce: bigint,
    clientBalance: number,
    serverBalance: number,
    signature: Buffer,
    expectedPayment: number
  ): Promise<boolean> {
    // 1. Fetch channel state from Solana
    const [channelPDA] = await PublicKey.findProgramAddress(
      [Buffer.from('channel'), Buffer.from(channelId, 'hex')],
      this.program.programId
    );

    const channelAccount = await this.program.account.channel.fetch(channelPDA);

    // 2. Verify channel is open
    if (channelAccount.status !== 'Open') {
      throw new Error('Channel is not open');
    }

    // 3. Verify nonce is increasing
    if (nonce <= channelAccount.nonce) {
      throw new Error('Nonce must be increasing');
    }

    // 4. Verify balances match expected payment
    const paymentMicroUSDC = expectedPayment * 1_000_000;
    const previousServerBalance = channelAccount.serverBalance.toNumber();

    if (serverBalance !== previousServerBalance + paymentMicroUSDC) {
      throw new Error('Server balance mismatch');
    }

    // 5. Verify signature
    const message = this.createStateMessage(
      channelId,
      nonce,
      clientBalance,
      serverBalance
    );

    const isValidSignature = nacl.sign.detached.verify(
      message,
      signature,
      channelAccount.client.toBytes()
    );

    if (!isValidSignature) {
      throw new Error('Invalid signature');
    }

    return true;
  }

  private createStateMessage(
    channelId: string,
    nonce: bigint,
    clientBalance: number,
    serverBalance: number
  ): Uint8Array {
    const message = Buffer.alloc(32 + 8 + 8 + 8);
    Buffer.from(channelId, 'hex').copy(message, 0);
    message.writeBigUInt64LE(nonce, 32);
    message.writeBigUInt64LE(BigInt(clientBalance), 40);
    message.writeBigUInt64LE(BigInt(serverBalance), 48);
    return message;
  }
}
```

---

## Implementation Plan

### Phase 1: Solana Program (Week 1)
**Effort:** 5 days

1. **Day 1: Project Setup**
   - Initialize Anchor project
   - Set up development environment
   - Write program structure

2. **Day 2-3: Core Instructions**
   - Implement `open_channel`
   - Implement `cooperative_close`
   - Write unit tests

3. **Day 4-5: Dispute Logic**
   - Implement `force_close`
   - Implement `challenge`
   - Implement `settle`
   - Write dispute scenario tests

### Phase 2: Client SDK (Week 2)
**Effort:** 5 days

1. **Day 1-2: Channel Manager**
   - Implement state signing
   - Implement nonce tracking
   - Implement balance management

2. **Day 3-4: X402ChannelClient**
   - Integrate with Solana program
   - Implement `openChannel()`
   - Implement `pay()`
   - Implement `fetch()` wrapper

3. **Day 5: Testing**
   - Unit tests
   - Integration tests with devnet

### Phase 3: Server SDK (Week 3)
**Effort:** 3 days

1. **Day 1-2: Middleware**
   - Implement state verification
   - Integrate with Solana program
   - Implement nonce checking

2. **Day 3: Testing**
   - Unit tests
   - Integration tests

### Phase 4: Integration & Documentation (Week 3)
**Effort:** 2 days

1. **Day 1: Examples**
   - Build streaming data example
   - Build high-frequency trading example

2. **Day 2: Documentation**
   - API reference
   - Integration guide
   - Migration guide

---

## Security Considerations

### 1. **Signature Verification**
- ✅ Verify Ed25519 signatures on-chain
- ✅ Verify signatures match channel participants
- ✅ Prevent signature malleability

### 2. **Nonce Management**
- ✅ Enforce strictly increasing nonces
- ✅ Prevent replay attacks
- ✅ Handle nonce gaps gracefully

### 3. **Dispute Resolution**
- ✅ Challenge period must be sufficient (24+ hours)
- ✅ Allow challenges with higher nonce states
- ✅ Penalize submitting old states

### 4. **Fund Security**
- ✅ Use PDA for escrow (no private key)
- ✅ Verify balance sum equals initial deposit
- ✅ Prevent reentrancy attacks

### 5. **Denial of Service**
- ✅ Rate limit channel opens
- ✅ Require minimum deposit
- ✅ Charge fees for disputes

---

## Testing Strategy

### Unit Tests (80+ tests)
- ✅ State message creation
- ✅ Signature generation/verification
- ✅ Nonce increment logic
- ✅ Balance calculations

### Integration Tests (20+ scenarios)
- ✅ Open channel successfully
- ✅ Make off-chain payments
- ✅ Cooperative close
- ✅ Force close + challenge
- ✅ Settle after timeout
- ✅ Handle invalid signatures
- ✅ Handle insufficient balance

### E2E Tests (5+ flows)
- ✅ Full happy path (open → pay → close)
- ✅ Dispute scenario (force close → challenge → settle)
- ✅ Multi-channel management
- ✅ High-frequency payment stress test
- ✅ Network failure recovery

---

## Migration Path

### For Existing x402 Users

**Option 1: Hybrid Mode** (Recommended)
```typescript
// Detect if channel available, fallback to regular x402
const client = new X402Client({ ... });

try {
  // Try channel payment first
  const response = await client.fetchWithChannel(url, channelId);
} catch (error) {
  // Fallback to regular on-chain payment
  const response = await client.fetch(url);
}
```

**Option 2: Channel-Only Mode**
```typescript
// Require all users to use channels
const channelClient = new X402ChannelClient({ ... });
const channelId = await channelClient.openChannel(serverPubkey, 100);
const response = await channelClient.fetch(url, channelId);
```

### Backwards Compatibility
- Keep existing x402 packages working
- Add channels as optional feature
- Server can support both modes simultaneously

---

## Conclusion

Payment channels add significant complexity but enable:
- **99.8% cost reduction** for high-frequency use cases
- **<10ms payments** vs 400-800ms on-chain
- **Sub-cent granularity** (enables token-based billing)

**Recommendation:** Implement if you have:
1. Confirmed demand from high-frequency users
2. 2-3 weeks of dedicated development time
3. Resources for ongoing maintenance

**Alternative:** Start with simpler Tab/Subscription system first, add channels later if demand emerges.

---

**Status:** Design Complete, Implementation Pending
**Next Steps:** Validate demand, allocate resources, begin Phase 1
