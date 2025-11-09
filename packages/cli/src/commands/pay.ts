import { Command } from 'commander';
import { PaymentVerifier } from '../lib/payment-verifier';
import { ConfigManager } from '../lib/config-manager';
import { Logger } from '../utils/logger';
import { Spinner } from '../utils/spinner';
import {
  formatUSDC,
  formatUSD,
  formatTimestamp,
  formatDuration,
  truncateAddress,
  formatBoolean,
} from '../utils/formatter';

/**
 * Create pay command
 */
export function createPayCommand(): Command {
  const command = new Command('pay');
  command.description('Payment verification commands');

  // pay verify
  command
    .command('verify <signature>')
    .description('Verify a payment transaction on-chain')
    .option('--recipient <address>', 'Expected recipient token account')
    .option('--amount <usd>', 'Expected payment amount in USD')
    .option('--network <network>', 'Network (devnet or mainnet-beta)')
    .option('--json', 'Output as JSON')
    .action(async (signature, options) => {
      const logger = new Logger(false, options.json);
      const spinner = new Spinner(options.json);
      const configManager = new ConfigManager();

      try {
        const config = configManager.getConfig();
        const network = options.network || config.network;

        // Determine RPC URL based on network
        let rpcUrl = config.rpcUrl;
        if (options.network) {
          rpcUrl =
            network === 'devnet'
              ? 'https://api.devnet.solana.com'
              : 'https://api.mainnet-beta.solana.com';
        }

        const verifier = new PaymentVerifier(rpcUrl);

        spinner.start('Fetching transaction...');
        const details = await verifier.getPaymentDetails(signature);
        spinner.succeed();

        if (options.json) {
          logger.json(details);
        } else {
          logger.heading('Payment Transaction Details');

          logger.table({
            Signature: signature,
            'Short Signature': truncateAddress(signature),
            From: details.from || 'N/A',
            'From (short)': details.from ? truncateAddress(details.from) : 'N/A',
            To: details.to || 'N/A',
            'To (short)': details.to ? truncateAddress(details.to) : 'N/A',
            Amount: details.amount ? `${details.amount} micro-USDC` : 'N/A',
            'Amount (USD)': details.amountUSD
              ? formatUSD(details.amountUSD)
              : 'N/A',
            Mint: details.mint || 'N/A',
            Timestamp: details.timestamp
              ? formatTimestamp(details.timestamp)
              : 'N/A',
            Slot: details.slot.toString(),
            Valid: formatBoolean(details.valid),
          });

          if (details.error) {
            logger.log('');
            logger.error(`Error: ${details.error}`);
          }

          // Verify against expected values if provided
          if (options.recipient || options.amount) {
            logger.log('');
            logger.heading('Verification Results');

            if (options.recipient) {
              const recipientMatch = details.to === options.recipient;
              logger.keyValue(
                'Recipient Match',
                formatBoolean(recipientMatch)
              );
              if (!recipientMatch && details.to) {
                logger.warning(`Expected: ${options.recipient}`);
                logger.warning(`Actual: ${details.to}`);
              }
            }

            if (options.amount) {
              const expectedAmount = parseFloat(options.amount);
              const amountMatch = Math.abs(details.amountUSD - expectedAmount) < 0.000001;
              logger.keyValue('Amount Match', formatBoolean(amountMatch));
              if (!amountMatch) {
                logger.warning(`Expected: ${formatUSD(expectedAmount)}`);
                logger.warning(`Actual: ${formatUSD(details.amountUSD)}`);
              }
            }
          }
        }
      } catch (error) {
        spinner.fail('Verification failed');
        logger.error(`${error}`);
        process.exit(1);
      }
    });

  // pay info
  command
    .command('info <signature>')
    .description('Get payment transaction information')
    .option('--network <network>', 'Network (devnet or mainnet-beta)')
    .option('--json', 'Output as JSON')
    .action(async (signature, options) => {
      const logger = new Logger(false, options.json);
      const spinner = new Spinner(options.json);
      const configManager = new ConfigManager();

      try {
        const config = configManager.getConfig();
        const network = options.network || config.network;

        let rpcUrl = config.rpcUrl;
        if (options.network) {
          rpcUrl =
            network === 'devnet'
              ? 'https://api.devnet.solana.com'
              : 'https://api.mainnet-beta.solana.com';
        }

        const verifier = new PaymentVerifier(rpcUrl);

        spinner.start('Fetching payment information...');
        const details = await verifier.getPaymentDetails(signature);
        const age = await verifier.getTransactionAge(signature);
        spinner.succeed();

        if (options.json) {
          logger.json({ ...details, ageMs: age });
        } else {
          logger.heading('Payment Information');

          logger.section('Transaction', () => {
            logger.keyValue('Signature', signature);
            logger.keyValue('Slot', details.slot.toString());
            logger.keyValue(
              'Timestamp',
              details.timestamp ? formatTimestamp(details.timestamp) : 'N/A'
            );
            logger.keyValue('Age', formatDuration(age));
            logger.keyValue('Valid', formatBoolean(details.valid));
          });

          logger.section('Transfer', () => {
            logger.keyValue('From', details.from || 'N/A');
            logger.keyValue('To', details.to || 'N/A');
            logger.keyValue(
              'Amount',
              details.amount ? `${details.amount} micro-USDC` : 'N/A'
            );
            logger.keyValue(
              'Amount (USD)',
              details.amountUSD ? formatUSD(details.amountUSD) : 'N/A'
            );
            logger.keyValue(
              'Amount (USDC)',
              details.amountUSD ? formatUSDC(details.amountUSD) : 'N/A'
            );
            logger.keyValue('Mint', details.mint || 'N/A');
          });

          if (details.error) {
            logger.log('');
            logger.error(`Error: ${details.error}`);
          }
        }
      } catch (error) {
        spinner.fail('Failed to fetch payment info');
        logger.error(`${error}`);
        process.exit(1);
      }
    });

  return command;
}
