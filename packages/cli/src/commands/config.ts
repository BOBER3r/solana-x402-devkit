import { Command } from 'commander';
import { ConfigManager } from '../lib/config-manager';
import { Logger } from '../utils/logger';
import { formatNetwork } from '../utils/formatter';

/**
 * Create config command
 */
export function createConfigCommand(): Command {
  const command = new Command('config');
  command.description('Manage CLI configuration');

  // config show
  command
    .command('show')
    .description('Show current configuration')
    .action(async () => {
      const logger = new Logger();
      const configManager = new ConfigManager();

      try {
        const config = configManager.getConfig();

        logger.heading('Current Configuration');
        logger.table({
          Network: formatNetwork(config.network),
          'RPC URL': config.rpcUrl,
          'Wallet Path': config.walletPath,
          Commitment: config.commitment,
          'Config File': configManager.getConfigPath(),
        });
      } catch (error) {
        logger.error(`Failed to show config: ${error}`);
        process.exit(1);
      }
    });

  // config set
  command
    .command('set')
    .description('Update configuration settings')
    .option('--network <network>', 'Set network (devnet or mainnet-beta)')
    .option('--rpc-url <url>', 'Set RPC URL')
    .option('--wallet-path <path>', 'Set default wallet path')
    .option(
      '--commitment <level>',
      'Set commitment level (processed, confirmed, finalized)'
    )
    .action(async (options) => {
      const logger = new Logger();
      const configManager = new ConfigManager();

      try {
        let updated = false;

        if (options.network) {
          if (options.network !== 'devnet' && options.network !== 'mainnet-beta') {
            logger.error('Network must be "devnet" or "mainnet-beta"');
            process.exit(1);
          }
          configManager.setNetwork(options.network);
          logger.success(`Network set to: ${formatNetwork(options.network)}`);
          updated = true;
        }

        if (options.rpcUrl) {
          configManager.setRpcUrl(options.rpcUrl);
          logger.success(`RPC URL set to: ${options.rpcUrl}`);
          updated = true;
        }

        if (options.walletPath) {
          configManager.setWalletPath(options.walletPath);
          logger.success(`Wallet path set to: ${options.walletPath}`);
          updated = true;
        }

        if (options.commitment) {
          if (
            options.commitment !== 'processed' &&
            options.commitment !== 'confirmed' &&
            options.commitment !== 'finalized'
          ) {
            logger.error(
              'Commitment must be "processed", "confirmed", or "finalized"'
            );
            process.exit(1);
          }
          configManager.setCommitment(options.commitment);
          logger.success(`Commitment set to: ${options.commitment}`);
          updated = true;
        }

        if (!updated) {
          logger.warning('No configuration options provided');
          logger.info('Run "x402 config set --help" for available options');
        }
      } catch (error) {
        logger.error(`Failed to update config: ${error}`);
        process.exit(1);
      }
    });

  // config reset
  command
    .command('reset')
    .description('Reset configuration to defaults')
    .action(async () => {
      const logger = new Logger();
      const configManager = new ConfigManager();

      try {
        configManager.reset();
        logger.success('Configuration reset to defaults');

        const config = configManager.getConfig();
        logger.log('');
        logger.table({
          Network: formatNetwork(config.network),
          'RPC URL': config.rpcUrl,
          'Wallet Path': config.walletPath,
          Commitment: config.commitment,
        });
      } catch (error) {
        logger.error(`Failed to reset config: ${error}`);
        process.exit(1);
      }
    });

  return command;
}
