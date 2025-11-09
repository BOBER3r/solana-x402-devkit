import { X402Client } from '@x402-solana/client';
import { Keypair } from '@solana/web3.js';

/**
 * Test result from API call
 */
export interface TestResult {
  success: boolean;
  statusCode: number;
  paymentRequired: boolean;
  paymentAmount?: number;
  paymentDescription?: string;
  paymentSignature?: string;
  responseData?: any;
  error?: string;
  duration: number;
}

/**
 * API tester for x402-enabled endpoints
 */
export class ApiTester {
  private client: X402Client;

  constructor(
    rpcUrl: string,
    wallet: Keypair,
    network: 'devnet' | 'mainnet-beta',
    debug = false
  ) {
    this.client = new X402Client({
      solanaRpcUrl: rpcUrl,
      walletPrivateKey: wallet.secretKey,
      network,
      autoRetry: true,
      maxRetries: 3,
      commitment: 'confirmed',
      debug,
    });
  }

  /**
   * Test an x402-enabled API endpoint
   */
  async test(
    url: string,
    options?: RequestInit
  ): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // First, try request without payment to see if 402 is returned
      let response = await fetch(url, options);
      const duration = Date.now() - startTime;

      if (response.status === 402) {
        // Parse payment requirements
        const paymentReq: any = await response.json();
        const requirement = paymentReq.accepts?.[0];

        if (!requirement) {
          return {
            success: false,
            statusCode: 402,
            paymentRequired: true,
            error: 'Invalid payment requirements',
            duration,
          };
        }

        const amountMicroUSDC = parseInt(requirement.maxAmountRequired);
        const amountUSD = amountMicroUSDC / 1_000_000;

        // Now use X402Client to handle payment automatically
        const clientStartTime = Date.now();
        response = await this.client.fetch(url, options);
        const clientDuration = Date.now() - clientStartTime;

        if (response.status === 200) {
          let responseData;
          try {
            responseData = await response.json();
          } catch {
            responseData = await response.text();
          }

          return {
            success: true,
            statusCode: response.status,
            paymentRequired: true,
            paymentAmount: amountUSD,
            paymentDescription: requirement.description,
            responseData,
            duration: duration + clientDuration,
          };
        } else {
          return {
            success: false,
            statusCode: response.status,
            paymentRequired: true,
            paymentAmount: amountUSD,
            error: `Request failed with status ${response.status}`,
            duration: duration + clientDuration,
          };
        }
      } else if (response.status === 200) {
        // No payment required
        let responseData;
        try {
          responseData = await response.json();
        } catch {
          responseData = await response.text();
        }

        return {
          success: true,
          statusCode: response.status,
          paymentRequired: false,
          responseData,
          duration,
        };
      } else {
        return {
          success: false,
          statusCode: response.status,
          paymentRequired: false,
          error: `Request failed with status ${response.status}`,
          duration,
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        statusCode: 0,
        paymentRequired: false,
        error: `${error}`,
        duration,
      };
    }
  }

  /**
   * Get wallet balances
   */
  async getBalances(): Promise<{ sol: number; usdc: number }> {
    const [sol, usdc] = await Promise.all([
      this.client.getSOLBalance(),
      this.client.getUSDCBalance(),
    ]);

    return { sol, usdc };
  }

  /**
   * Get wallet public key
   */
  getPublicKey(): string {
    return this.client.getPublicKey().toString();
  }
}
