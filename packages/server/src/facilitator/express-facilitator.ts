/**
 * Express facilitator routes for x402 protocol
 * Implements the three required endpoints: /verify, /settle, /supported
 *
 * Compliant with: https://github.com/coinbase/x402
 */

import { Router, Request, Response } from 'express';
import { X402Facilitator, FacilitatorConfig } from '@x402-solana/core';

/**
 * Create Express router with x402 facilitator endpoints
 *
 * This creates three routes:
 * - POST /verify: Validate payment without blockchain interaction
 * - POST /settle: Execute payment verification on blockchain
 * - GET /supported: List supported (scheme, network) pairs
 *
 * @param config - Facilitator configuration
 * @returns Express router with facilitator endpoints
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { createFacilitatorRoutes } from '@x402-solana/server';
 *
 * const app = express();
 * app.use(express.json());
 *
 * const facilitatorRoutes = createFacilitatorRoutes({
 *   rpcUrl: 'https://api.devnet.solana.com',
 *   commitment: 'confirmed',
 *   debug: true,
 * });
 *
 * // Mount facilitator routes
 * app.use('/x402', facilitatorRoutes);
 *
 * // Now available:
 * // POST /x402/verify
 * // POST /x402/settle
 * // GET /x402/supported
 * ```
 */
export function createFacilitatorRoutes(config: FacilitatorConfig): Router {
  const router = Router();
  const facilitator = new X402Facilitator(config);

  /**
   * POST /verify
   * Validates payment authenticity without blockchain interaction
   */
  router.post('/verify', (req: Request, res: Response) => {
    facilitator.verify(req.body)
      .then((result) => {
        res.json(result);
      })
      .catch((error: any) => {
        res.status(500).json({
          isValid: false,
          invalidReason: `Server error: ${error.message}`,
        });
      });
  });

  /**
   * POST /settle
   * Executes payment verification on blockchain
   */
  router.post('/settle', (req: Request, res: Response) => {
    facilitator.settle(req.body)
      .then((result) => {
        res.json(result);
      })
      .catch((error: any) => {
        res.status(500).json({
          success: false,
          error: `Server error: ${error.message}`,
          txHash: null,
          networkId: null,
        });
      });
  });

  /**
   * GET /supported
   * Lists supported (scheme, network) pairs
   */
  router.get('/supported', (_req: Request, res: Response) => {
    facilitator.supported()
      .then((result) => {
        res.json(result);
      })
      .catch((error: any) => {
        res.status(500).json({
          supported: [],
          error: error.message,
        });
      });
  });

  return router;
}

/**
 * Express facilitator middleware with configurable paths
 *
 * Alternative to createFacilitatorRoutes that provides more control
 * over the facilitator instance and endpoint paths.
 *
 * @example
 * ```typescript
 * import { X402FacilitatorMiddleware } from '@x402-solana/server';
 *
 * const facilitatorMiddleware = new X402FacilitatorMiddleware({
 *   rpcUrl: process.env.SOLANA_RPC_URL!,
 *   commitment: 'confirmed',
 * });
 *
 * // Mount with custom paths
 * app.post('/api/x402/verify', facilitatorMiddleware.verify());
 * app.post('/api/x402/settle', facilitatorMiddleware.settle());
 * app.get('/api/x402/supported', facilitatorMiddleware.supported());
 *
 * // Cleanup on shutdown
 * process.on('SIGTERM', async () => {
 *   await facilitatorMiddleware.close();
 * });
 * ```
 */
export class X402FacilitatorMiddleware {
  private facilitator: X402Facilitator;

  /**
   * Create facilitator middleware
   *
   * @param config - Facilitator configuration
   */
  constructor(config: FacilitatorConfig) {
    this.facilitator = new X402Facilitator(config);
  }

  /**
   * POST /verify endpoint handler
   * Validates payment authenticity without blockchain interaction
   *
   * @returns Express handler function
   */
  verify() {
    return async (req: Request, res: Response) => {
      try {
        const result = await this.facilitator.verify(req.body);
        res.json(result);
      } catch (error: any) {
        res.status(500).json({
          isValid: false,
          invalidReason: `Server error: ${error.message}`,
        });
      }
    };
  }

  /**
   * POST /settle endpoint handler
   * Executes payment verification on blockchain
   *
   * @returns Express handler function
   */
  settle() {
    return async (req: Request, res: Response) => {
      try {
        const result = await this.facilitator.settle(req.body);
        res.json(result);
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: `Server error: ${error.message}`,
          txHash: null,
          networkId: null,
        });
      }
    };
  }

  /**
   * GET /supported endpoint handler
   * Lists supported (scheme, network) pairs
   *
   * @returns Express handler function
   */
  supported() {
    return async (_req: Request, res: Response) => {
      try {
        const result = await this.facilitator.supported();
        res.json(result);
      } catch (error: any) {
        res.status(500).json({
          supported: [],
          error: error.message,
        });
      }
    };
  }

  /**
   * Get facilitator instance for advanced usage
   *
   * @returns X402Facilitator instance
   */
  getFacilitator(): X402Facilitator {
    return this.facilitator;
  }

  /**
   * Close facilitator and cleanup resources
   */
  async close(): Promise<void> {
    await this.facilitator.close();
  }
}

/**
 * Factory function to create facilitator middleware
 *
 * @param config - Facilitator configuration
 * @returns X402FacilitatorMiddleware instance
 *
 * @example
 * ```typescript
 * const facilitator = createFacilitatorMiddleware({
 *   rpcUrl: process.env.SOLANA_RPC_URL!,
 *   commitment: 'confirmed',
 *   debug: true,
 * });
 * ```
 */
export function createFacilitatorMiddleware(
  config: FacilitatorConfig
): X402FacilitatorMiddleware {
  return new X402FacilitatorMiddleware(config);
}
