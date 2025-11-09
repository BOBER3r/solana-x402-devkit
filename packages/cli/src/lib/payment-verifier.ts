import { Connection } from '@solana/web3.js';
import { TransactionVerifier, VerificationResult } from '@x402-solana/core';

/**
 * Payment details from on-chain transaction
 */
export interface PaymentDetails {
  signature: string;
  from: string;
  to: string;
  amount: number;
  amountUSD: number;
  mint: string;
  timestamp: number;
  slot: number;
  valid: boolean;
  error?: string;
}

/**
 * Payment verifier for CLI
 */
export class PaymentVerifier {
  private verifier: TransactionVerifier;
  private connection: Connection;

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.verifier = new TransactionVerifier({
      rpcUrl,
      commitment: 'confirmed',
    });
  }

  /**
   * Verify a payment transaction
   */
  async verify(
    signature: string,
    recipientTokenAccount: string,
    expectedAmountUSD: number
  ): Promise<VerificationResult> {
    return await this.verifier.verifyPayment(
      signature,
      recipientTokenAccount,
      expectedAmountUSD
    );
  }

  /**
   * Get detailed payment information from transaction
   */
  async getPaymentDetails(signature: string): Promise<PaymentDetails> {
    try {
      // Fetch transaction
      const tx = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) {
        throw new Error('Transaction not found');
      }

      if (tx.meta?.err) {
        return {
          signature,
          from: '',
          to: '',
          amount: 0,
          amountUSD: 0,
          mint: '',
          timestamp: 0,
          slot: tx.slot,
          valid: false,
          error: 'Transaction failed on-chain',
        };
      }

      // Parse transaction to find SPL token transfer
      const transfer = this.parseTokenTransfer(tx);

      if (!transfer) {
        return {
          signature,
          from: '',
          to: '',
          amount: 0,
          amountUSD: 0,
          mint: '',
          timestamp: tx.blockTime || 0,
          slot: tx.slot,
          valid: false,
          error: 'No SPL token transfer found',
        };
      }

      return {
        signature,
        from: transfer.from,
        to: transfer.to,
        amount: transfer.amount,
        amountUSD: transfer.amount / 1_000_000,
        mint: transfer.mint,
        timestamp: tx.blockTime || 0,
        slot: tx.slot,
        valid: true,
      };
    } catch (error) {
      throw new Error(`Failed to fetch payment details: ${error}`);
    }
  }

  /**
   * Parse SPL token transfer from transaction
   */
  private parseTokenTransfer(tx: any): {
    from: string;
    to: string;
    amount: number;
    mint: string;
  } | null {
    try {
      // Check preTokenBalances and postTokenBalances
      const preBalances = tx.meta?.preTokenBalances || [];
      const postBalances = tx.meta?.postTokenBalances || [];

      // Find accounts with balance changes
      for (const post of postBalances) {
        const pre = preBalances.find(
          (p: any) => p.accountIndex === post.accountIndex
        );

        const preAmount = pre?.uiTokenAmount?.amount || '0';
        const postAmount = post.uiTokenAmount?.amount || '0';

        const preAmountNum = parseInt(preAmount);
        const postAmountNum = parseInt(postAmount);

        // If balance increased, this is the recipient
        if (postAmountNum > preAmountNum) {
          const amount = postAmountNum - preAmountNum;

          // Find the sender (balance decreased)
          for (const post2 of postBalances) {
            if (post2.accountIndex === post.accountIndex) continue;

            const pre2 = preBalances.find(
              (p: any) => p.accountIndex === post2.accountIndex
            );

            if (!pre2) continue;

            const preAmount2 = parseInt(pre2.uiTokenAmount?.amount || '0');
            const postAmount2 = parseInt(post2.uiTokenAmount?.amount || '0');

            if (preAmount2 > postAmount2) {
              const amount2 = preAmount2 - postAmount2;

              // Amounts should match (or be close due to fees)
              if (Math.abs(amount - amount2) < 100) {
                return {
                  from: pre2.owner || '',
                  to: post.owner || '',
                  amount,
                  mint: post.mint || '',
                };
              }
            }
          }
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if signature exists on-chain
   */
  async signatureExists(signature: string): Promise<boolean> {
    try {
      const status = await this.connection.getSignatureStatus(signature);
      return status.value !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get transaction age in milliseconds
   */
  async getTransactionAge(signature: string): Promise<number> {
    try {
      const tx = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      if (!tx || !tx.blockTime) {
        throw new Error('Transaction not found or has no timestamp');
      }

      const now = Math.floor(Date.now() / 1000);
      const ageSeconds = now - tx.blockTime;
      return ageSeconds * 1000;
    } catch (error) {
      throw new Error(`Failed to get transaction age: ${error}`);
    }
  }
}
