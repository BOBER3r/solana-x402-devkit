/**
 * Payment Channel Verifier for x402 protocol
 * Verifies off-chain payment channel claims
 *
 * Verification flow:
 * 1. Fetch channel state from Solana blockchain (PDA)
 * 2. Reconstruct signed message using x402-channel-claim-v1 domain
 * 3. Verify Ed25519 signature against client's public key
 * 4. Validate all constraints (status, nonce, amount, expiry, server)
 */

import { Connection, PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import { VerificationResult } from '../types/solana.types';
import { ChannelPayload, X402ErrorCode } from '../types/x402.types';
import {
  createVerificationError,
} from './verification-result';

/**
 * Channel state as stored on Solana blockchain
 * Must match your channel program's account structure
 */
export interface ChannelState {
  /** Channel PDA address */
  address: PublicKey;

  /** Client's wallet public key */
  client: PublicKey;

  /** Server's wallet public key */
  server: PublicKey;

  /** Client's initial deposit amount (micro-USDC) */
  clientDeposit: bigint;

  /** Amount server has claimed so far (micro-USDC) */
  serverClaimed: bigint;

  /** Optional: credit limit for overdraft (micro-USDC) */
  creditLimit?: bigint;

  /** Current nonce (last processed claim) */
  nonce: bigint;

  /** Channel status */
  status: 'Open' | 'Closed' | 'Disputed';

  /** Optional: expiry timestamp of channel */
  channelExpiry?: bigint;
}

/**
 * Configuration for channel verifier
 */
export interface ChannelVerifierConfig {
  /** Solana RPC connection */
  connection: Connection;

  /** Your channel program ID */
  programId: string;

  /** Domain string for signature verification (default: "x402-channel-claim-v1") */
  domain?: string;
}

/**
 * Options for channel verification
 */
export interface ChannelVerificationOptions {
  /** Expected server public key (defaults to payTo from requirements) */
  expectedServer?: string;

  /** Minimum claim increment in micro-USDC (default: 0 - allow any increase) */
  minClaimIncrement?: bigint;

  /** Skip expiry validation (default: false) */
  skipExpiryCheck?: boolean;
}

/**
 * Payment channel verifier
 * Verifies off-chain channel claims for x402 protocol
 *
 * @example
 * ```typescript
 * const verifier = new ChannelPaymentVerifier({
 *   connection: new Connection('https://api.devnet.solana.com'),
 *   programId: 'YourChannelProgram111111111111111111111111',
 * });
 *
 * const result = await verifier.verifyChannelPayment(
 *   {
 *     channelId: 'ChannelPDA...',
 *     amount: '1000000',  // $1 claimed
 *     nonce: '5',
 *     signature: 'base64Signature...',
 *     expiry: '1735689600',
 *   },
 *   'ServerPubkey...',
 *   { minClaimIncrement: 1000n } // Minimum $0.001 increment
 * );
 *
 * if (result.valid) {
 *   console.log('Channel payment verified!');
 * }
 * ```
 */
export class ChannelPaymentVerifier {
  private connection: Connection;
  private domain: string;

  /**
   * Domain string used for signature message construction
   * Format: "x402-channel-claim-v1" (21 bytes UTF-8)
   */
  public static readonly DEFAULT_DOMAIN = 'x402-channel-claim-v1';

  constructor(config: ChannelVerifierConfig) {
    this.connection = config.connection;
    // Note: programId is stored in config but not used in current implementation
    // It's available for future use when implementing fetchChannelState()
    this.domain = config.domain || ChannelPaymentVerifier.DEFAULT_DOMAIN;
  }

  /**
   * Verify a payment channel claim
   *
   * @param payload - Channel payment payload from X-PAYMENT header
   * @param expectedServer - Expected server public key
   * @param options - Verification options
   * @returns Verification result
   */
  async verifyChannelPayment(
    payload: ChannelPayload,
    expectedServer: string,
    options: ChannelVerificationOptions = {}
  ): Promise<VerificationResult> {
    try {
      // 1. Parse and validate payload
      const validationResult = this.validateChannelPayload(payload);
      if (!validationResult.valid) {
        return validationResult;
      }

      // 2. Parse payload values
      const channelId = new PublicKey(payload.channelId);
      const claimAmount = BigInt(payload.amount);
      const claimNonce = BigInt(payload.nonce);
      const signatureBytes = Buffer.from(payload.signature, 'base64');
      const claimExpiry = payload.expiry ? BigInt(payload.expiry) : undefined;
      const serverPubkey = new PublicKey(expectedServer);

      // 3. Fetch channel state from blockchain
      const channelState = await this.fetchChannelState(channelId);
      if (!channelState) {
        return {
          valid: false,
          error: 'Channel not found on-chain',
          code: X402ErrorCode.CHANNEL_NOT_FOUND,
          debug: { channelId: payload.channelId },
        };
      }

      // 4. Validate channel status
      if (channelState.status !== 'Open') {
        return {
          valid: false,
          error: `Channel is not open (status: ${channelState.status})`,
          code: X402ErrorCode.CHANNEL_NOT_OPEN,
          debug: { status: channelState.status },
        };
      }

      // 5. Validate server matches
      if (!channelState.server.equals(serverPubkey)) {
        return {
          valid: false,
          error: 'Server pubkey mismatch',
          code: X402ErrorCode.CHANNEL_WRONG_SERVER,
          debug: {
            expected: serverPubkey.toBase58(),
            actual: channelState.server.toBase58(),
          },
        };
      }

      // 6. Validate nonce is increasing
      if (claimNonce <= channelState.nonce) {
        return {
          valid: false,
          error: `Nonce must be greater than current nonce (${claimNonce} <= ${channelState.nonce})`,
          code: X402ErrorCode.CHANNEL_INVALID_NONCE,
          debug: {
            claimNonce: claimNonce.toString(),
            currentNonce: channelState.nonce.toString(),
          },
        };
      }

      // 7. Validate amount is not going backwards
      if (claimAmount < channelState.serverClaimed) {
        return {
          valid: false,
          error: `Claim amount cannot go backwards (${claimAmount} < ${channelState.serverClaimed})`,
          code: X402ErrorCode.CHANNEL_AMOUNT_BACKWARDS,
          debug: {
            claimAmount: claimAmount.toString(),
            currentClaimed: channelState.serverClaimed.toString(),
          },
        };
      }

      // 8. Validate sufficient balance (including optional credit limit)
      const maxAllowed = channelState.clientDeposit + (channelState.creditLimit || 0n);
      if (claimAmount > maxAllowed) {
        return {
          valid: false,
          error: `Claim amount exceeds available balance (${claimAmount} > ${maxAllowed})`,
          code: X402ErrorCode.CHANNEL_INSUFFICIENT_BALANCE,
          debug: {
            claimAmount: claimAmount.toString(),
            maxAllowed: maxAllowed.toString(),
            clientDeposit: channelState.clientDeposit.toString(),
            creditLimit: (channelState.creditLimit || 0n).toString(),
          },
        };
      }

      // 9. Validate minimum claim increment (if specified)
      if (options.minClaimIncrement !== undefined) {
        const increment = claimAmount - channelState.serverClaimed;
        if (increment < options.minClaimIncrement) {
          return {
            valid: false,
            error: `Claim increment too small (${increment} < ${options.minClaimIncrement})`,
            code: X402ErrorCode.INSUFFICIENT_AMOUNT,
            debug: {
              increment: increment.toString(),
              minIncrement: options.minClaimIncrement.toString(),
            },
          };
        }
      }

      // 10. Validate expiry (if provided and not skipped)
      if (!options.skipExpiryCheck && claimExpiry !== undefined) {
        const now = BigInt(Math.floor(Date.now() / 1000));
        if (now > claimExpiry) {
          return {
            valid: false,
            error: `Channel claim has expired`,
            code: X402ErrorCode.CHANNEL_CLAIM_EXPIRED,
            debug: {
              now: now.toString(),
              expiry: claimExpiry.toString(),
            },
          };
        }
      }

      // 11. Reconstruct signed message
      const message = this.constructSignedMessage(
        channelId,
        serverPubkey,
        claimAmount,
        claimNonce,
        claimExpiry || 0n
      );

      // 12. Verify Ed25519 signature
      const isValidSignature = nacl.sign.detached.verify(
        message,
        signatureBytes,
        channelState.client.toBytes()
      );

      if (!isValidSignature) {
        return {
          valid: false,
          error: 'Invalid channel signature',
          code: X402ErrorCode.CHANNEL_INVALID_SIGNATURE,
          debug: {
            messageLength: message.length,
            signatureLength: signatureBytes.length,
            clientPubkey: channelState.client.toBase58(),
          },
        };
      }

      // 13. Return success with payment details
      const amountIncrement = Number(claimAmount - channelState.serverClaimed);

      return {
        valid: true,
        signature: payload.channelId, // Use channelId as identifier
        transfer: {
          source: channelId.toBase58(), // Channel PDA
          destination: serverPubkey.toBase58(), // Server
          authority: channelState.client.toBase58(), // Client
          amount: amountIncrement, // Amount of this specific claim
          mint: '', // Not applicable for channels
        },
        blockTime: Math.floor(Date.now() / 1000), // Current time
        debug: {
          channelId: payload.channelId,
          totalClaimed: claimAmount.toString(),
          previousClaimed: channelState.serverClaimed.toString(),
          increment: amountIncrement.toString(),
          nonce: claimNonce.toString(),
          scheme: 'channel',
        },
      };
    } catch (error: any) {
      return createVerificationError(error.message, error);
    }
  }

  /**
   * Validate channel payload structure
   */
  private validateChannelPayload(payload: ChannelPayload): VerificationResult {
    // Validate channelId
    if (!payload.channelId || typeof payload.channelId !== 'string') {
      return {
        valid: false,
        error: 'Missing or invalid channelId',
        code: X402ErrorCode.CHANNEL_INVALID_PAYLOAD,
      };
    }

    try {
      new PublicKey(payload.channelId);
    } catch {
      return {
        valid: false,
        error: `Invalid channelId format: ${payload.channelId}`,
        code: X402ErrorCode.CHANNEL_INVALID_PAYLOAD,
      };
    }

    // Validate amount
    if (!payload.amount || typeof payload.amount !== 'string') {
      return {
        valid: false,
        error: 'Missing or invalid amount',
        code: X402ErrorCode.CHANNEL_INVALID_PAYLOAD,
      };
    }

    try {
      const amount = BigInt(payload.amount);
      if (amount < 0n) {
        return {
          valid: false,
          error: 'Amount cannot be negative',
          code: X402ErrorCode.CHANNEL_INVALID_PAYLOAD,
        };
      }
    } catch {
      return {
        valid: false,
        error: `Invalid amount format: ${payload.amount}`,
        code: X402ErrorCode.CHANNEL_INVALID_PAYLOAD,
      };
    }

    // Validate nonce
    if (!payload.nonce || typeof payload.nonce !== 'string') {
      return {
        valid: false,
        error: 'Missing or invalid nonce',
        code: X402ErrorCode.CHANNEL_INVALID_PAYLOAD,
      };
    }

    try {
      const nonce = BigInt(payload.nonce);
      if (nonce < 0n) {
        return {
          valid: false,
          error: 'Nonce cannot be negative',
          code: X402ErrorCode.CHANNEL_INVALID_PAYLOAD,
        };
      }
    } catch {
      return {
        valid: false,
        error: `Invalid nonce format: ${payload.nonce}`,
        code: X402ErrorCode.CHANNEL_INVALID_PAYLOAD,
      };
    }

    // Validate signature
    if (!payload.signature || typeof payload.signature !== 'string') {
      return {
        valid: false,
        error: 'Missing or invalid signature',
        code: X402ErrorCode.CHANNEL_INVALID_PAYLOAD,
      };
    }

    try {
      const sig = Buffer.from(payload.signature, 'base64');
      if (sig.length !== 64) {
        return {
          valid: false,
          error: `Signature must be 64 bytes (got ${sig.length})`,
          code: X402ErrorCode.CHANNEL_INVALID_PAYLOAD,
        };
      }
    } catch {
      return {
        valid: false,
        error: 'Invalid signature encoding (expected base64)',
        code: X402ErrorCode.CHANNEL_INVALID_PAYLOAD,
      };
    }

    // Validate expiry (optional)
    if (payload.expiry !== undefined) {
      try {
        const expiry = BigInt(payload.expiry);
        if (expiry < 0n) {
          return {
            valid: false,
            error: 'Expiry cannot be negative',
            code: X402ErrorCode.CHANNEL_INVALID_PAYLOAD,
          };
        }
      } catch {
        return {
          valid: false,
          error: `Invalid expiry format: ${payload.expiry}`,
          code: X402ErrorCode.CHANNEL_INVALID_PAYLOAD,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Fetch channel state from Solana blockchain
   *
   * Deserializes payment channel account data based on the standard
   * payment channel program structure:
   *
   * Account Layout (170 bytes total):
   * - Discriminator: 8 bytes (Anchor)
   * - channel_id: [u8; 32] (32 bytes)
   * - client: Pubkey (32 bytes)
   * - server: Pubkey (32 bytes)
   * - client_deposit: u64 (8 bytes)
   * - server_claimed: u64 (8 bytes)
   * - nonce: u64 (8 bytes)
   * - expiry: i64 (8 bytes, signed)
   * - status: enum (1 byte: 0=Open, 1=Closed, 2=Disputed)
   * - created_at: i64 (8 bytes)
   * - last_update: i64 (8 bytes)
   * - debt_owed: u64 (8 bytes)
   * - credit_limit: u64 (8 bytes)
   * - bump: u8 (1 byte)
   *
   * @param channelId - Channel PDA address
   * @returns Channel state or null if not found
   */
  private async fetchChannelState(channelId: PublicKey): Promise<ChannelState | null> {
    try {
      const accountInfo = await this.connection.getAccountInfo(channelId);

      if (!accountInfo) {
        return null;
      }

      const data = accountInfo.data;

      // Verify minimum account size (8-byte discriminator + account data)
      if (data.length < 170) {
        throw new Error(`Invalid account data size: ${data.length} bytes (expected 170)`);
      }

      let offset = 8; // Skip 8-byte Anchor discriminator

      // channel_id: [u8; 32] - skip, not needed for verification
      offset += 32;

      // client: Pubkey (32 bytes)
      const client = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      // server: Pubkey (32 bytes)
      const server = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      // client_deposit: u64 (8 bytes, little-endian)
      const clientDeposit = data.readBigUInt64LE(offset);
      offset += 8;

      // server_claimed: u64 (8 bytes, little-endian)
      const serverClaimed = data.readBigUInt64LE(offset);
      offset += 8;

      // nonce: u64 (8 bytes, little-endian)
      const nonce = data.readBigUInt64LE(offset);
      offset += 8;

      // expiry: i64 (8 bytes, little-endian, SIGNED)
      const expiry = data.readBigInt64LE(offset);
      offset += 8;

      // status: enum (1 byte: 0=Open, 1=Closed, 2=Disputed)
      const statusByte = data.readUInt8(offset);
      offset += 1;

      const status: 'Open' | 'Closed' | 'Disputed' =
        statusByte === 0 ? 'Open' :
        statusByte === 1 ? 'Closed' : 'Disputed';

      // created_at: i64 (8 bytes) - skip, not needed for verification
      offset += 8;

      // last_update: i64 (8 bytes) - skip, not needed for verification
      offset += 8;

      // debt_owed: u64 (8 bytes) - skip, not needed for verification
      offset += 8;

      // credit_limit: u64 (8 bytes)
      const creditLimit = data.readBigUInt64LE(offset);
      offset += 8;

      // bump: u8 (1 byte) - skip, not needed for verification

      return {
        address: channelId,
        client,
        server,
        clientDeposit,
        serverClaimed,
        creditLimit,
        nonce,
        status,
        channelExpiry: expiry,
      };
    } catch (error) {
      console.error('Error fetching channel state:', error);
      return null;
    }
  }

  /**
   * Construct the signed message for verification
   *
   * Message structure (109 bytes total):
   * - Domain: "x402-channel-claim-v1" (21 bytes UTF-8)
   * - Channel ID: 32 bytes (Solana public key)
   * - Server pubkey: 32 bytes (Solana public key)
   * - Amount: 8 bytes (u64 little-endian)
   * - Nonce: 8 bytes (u64 little-endian)
   * - Expiry: 8 bytes (u64 little-endian)
   *
   * @param channelId - Channel PDA address
   * @param server - Server public key
   * @param amount - Claim amount in micro-USDC
   * @param nonce - Claim nonce
   * @param expiry - Claim expiry timestamp
   * @returns Message bytes for signature verification
   */
  private constructSignedMessage(
    channelId: PublicKey,
    server: PublicKey,
    amount: bigint,
    nonce: bigint,
    expiry: bigint
  ): Uint8Array {
    const message = Buffer.alloc(109);

    let offset = 0;

    // Domain (21 bytes)
    Buffer.from(this.domain, 'utf-8').copy(message, offset);
    offset += 21;

    // Channel ID (32 bytes)
    channelId.toBuffer().copy(message, offset);
    offset += 32;

    // Server pubkey (32 bytes)
    server.toBuffer().copy(message, offset);
    offset += 32;

    // Amount (8 bytes, little-endian u64)
    message.writeBigUInt64LE(amount, offset);
    offset += 8;

    // Nonce (8 bytes, little-endian u64)
    message.writeBigUInt64LE(nonce, offset);
    offset += 8;

    // Expiry (8 bytes, little-endian u64)
    message.writeBigUInt64LE(expiry, offset);

    return message;
  }

  /**
   * Helper: Get the expected message length for a domain
   */
  public static getMessageLength(domain?: string): number {
    const domainLength = domain ? Buffer.from(domain, 'utf-8').length : 21;
    return domainLength + 32 + 32 + 8 + 8 + 8;
  }
}