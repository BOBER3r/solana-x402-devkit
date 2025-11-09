import { Command } from 'commander';
import { ApiTester } from '../lib/api-tester';
import { WalletManager } from '../lib/wallet-manager';
import { ConfigManager } from '../lib/config-manager';
import { Logger } from '../utils/logger';
import { Spinner } from '../utils/spinner';
import {
  formatUSD,
  formatSOL,
  formatUSDC,
  formatDuration,
  formatJSON,
} from '../utils/formatter';
import chalk from 'chalk';

/**
 * Create test command
 */
export function createTestCommand(): Command {
  const command = new Command('test');
  command.description('Test x402-enabled API endpoints');

  command
    .argument('<url>', 'API endpoint URL to test')
    .option('--price <usd>', 'Expected payment price in USD (for validation)')
    .option('-w, --wallet <path>', 'Wallet file path')
    .option('-m, --method <method>', 'HTTP method', 'GET')
    .option('-H, --header <header...>', 'HTTP headers (format: "Key: Value")')
    .option('-d, --data <data>', 'Request body data (JSON string)')
    .option('-v, --verbose', 'Verbose output with debug logging')
    .option('--json', 'Output as JSON')
    .action(async (url, options) => {
      const logger = new Logger(options.verbose, options.json);
      const spinner = new Spinner(options.json);
      const configManager = new ConfigManager();

      try {
        const config = configManager.getConfig();
        const walletPath = options.wallet || config.walletPath;

        // Load wallet
        const walletManager = new WalletManager(config.rpcUrl, config.network);

        if (!walletManager.walletExists(walletPath)) {
          logger.error(`Wallet not found at ${walletPath}`);
          logger.info('Create a wallet with "x402 wallet create"');
          process.exit(1);
        }

        const wallet = walletManager.loadWallet(walletPath);

        // Check balances first
        if (!options.json) {
          spinner.start('Checking wallet balances...');
          const info = await walletManager.getWalletInfo(wallet);
          spinner.stop();

          logger.debug(`SOL balance: ${formatSOL(info.solBalance)}`);
          logger.debug(`USDC balance: ${formatUSDC(info.usdcBalance)}`);

          if (info.solBalance < 0.001) {
            logger.warning('Low SOL balance. You may need SOL for transaction fees.');
          }

          if (info.usdcBalance === 0) {
            logger.warning('No USDC balance. You need USDC to make payments.');
          }
        }

        // Create API tester
        const tester = new ApiTester(
          config.rpcUrl,
          wallet,
          config.network,
          options.verbose
        );

        // Build request options
        const requestOptions: RequestInit = {
          method: options.method,
          headers: {},
        };

        // Parse headers
        if (options.header) {
          for (const header of options.header) {
            const [key, ...valueParts] = header.split(':');
            const value = valueParts.join(':').trim();
            (requestOptions.headers as any)[key.trim()] = value;
          }
        }

        // Add body if provided
        if (options.data) {
          requestOptions.body = options.data;
          if (!(requestOptions.headers as any)['Content-Type']) {
            (requestOptions.headers as any)['Content-Type'] = 'application/json';
          }
        }

        // Test the API
        spinner.start(`Testing ${options.method} ${url}...`);
        const result = await tester.test(url, requestOptions);
        spinner.stop();

        // Output results
        if (options.json) {
          logger.json(result);
        } else {
          logger.log('');

          if (result.success) {
            logger.success(
              `Request successful! (${result.statusCode}) in ${formatDuration(result.duration)}`
            );

            if (result.paymentRequired) {
              logger.log('');
              logger.info(
                `Payment Required: ${formatUSD(result.paymentAmount || 0)}`
              );
              if (result.paymentDescription) {
                logger.info(`Description: ${result.paymentDescription}`);
              }
              logger.success('Payment sent and confirmed!');
            }

            logger.log('');
            logger.heading('Response Data');
            if (typeof result.responseData === 'object') {
              logger.log(formatJSON(result.responseData));
            } else {
              logger.log(result.responseData);
            }
          } else {
            logger.error(
              `Request failed (${result.statusCode}) in ${formatDuration(result.duration)}`
            );

            if (result.paymentRequired) {
              logger.log('');
              logger.warning(
                `Payment Required: ${formatUSD(result.paymentAmount || 0)}`
              );
              if (result.paymentDescription) {
                logger.info(`Description: ${result.paymentDescription}`);
              }
            }

            if (result.error) {
              logger.log('');
              logger.error(`Error: ${result.error}`);
            }
          }

          // Validate price if provided
          if (options.price && result.paymentAmount) {
            const expectedPrice = parseFloat(options.price);
            const actualPrice = result.paymentAmount;

            logger.log('');
            if (Math.abs(actualPrice - expectedPrice) < 0.000001) {
              logger.success(
                `Price validation: ${chalk.green('PASSED')} (${formatUSD(actualPrice)})`
              );
            } else {
              logger.warning(
                `Price validation: ${chalk.yellow('FAILED')}`
              );
              logger.warning(`Expected: ${formatUSD(expectedPrice)}`);
              logger.warning(`Actual: ${formatUSD(actualPrice)}`);
            }
          }
        }

        process.exit(result.success ? 0 : 1);
      } catch (error) {
        spinner.fail('Test failed');
        logger.error(`${error}`);
        process.exit(1);
      }
    });

  return command;
}
