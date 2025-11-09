import { Command } from 'commander';
import inquirer from 'inquirer';
import { WalletManager } from '../lib/wallet-manager';
import { ConfigManager } from '../lib/config-manager';
import { Logger } from '../utils/logger';
import { Spinner } from '../utils/spinner';
import { formatSOL, formatUSDC, truncateAddress } from '../utils/formatter';

/**
 * Create wallet command
 */
export function createWalletCommand(): Command {
  const command = new Command('wallet');
  command.description('Manage Solana wallets');

  // wallet create
  command
    .command('create')
    .description('Create a new Solana wallet')
    .option('-o, --output <path>', 'Output file path for wallet')
    .action(async (options) => {
      const logger = new Logger();
      const spinner = new Spinner();
      const configManager = new ConfigManager();

      try {
        const config = configManager.getConfig();
        const walletPath = options.output || config.walletPath;

        const walletManager = new WalletManager(config.rpcUrl, config.network);

        // Check if wallet already exists
        if (walletManager.walletExists(walletPath)) {
          const answers = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'overwrite',
              message: `Wallet already exists at ${walletPath}. Overwrite?`,
              default: false,
            },
          ]);

          if (!answers.overwrite) {
            logger.warning('Wallet creation cancelled');
            return;
          }
        }

        spinner.start('Creating new wallet...');
        const wallet = walletManager.createWallet();

        walletManager.saveWallet(wallet, walletPath);
        spinner.succeed('Wallet created successfully');

        logger.log('');
        logger.keyValue('Public Key', wallet.publicKey.toString());
        logger.keyValue('Wallet File', walletPath);
        logger.log('');
        logger.warning('IMPORTANT: Keep your wallet file secure!');
        logger.info('Use "x402 wallet export" to view your private key');
      } catch (error) {
        spinner.fail('Failed to create wallet');
        logger.error(`${error}`);
        process.exit(1);
      }
    });

  // wallet import
  command
    .command('import <private-key>')
    .description('Import wallet from private key')
    .option('-o, --output <path>', 'Output file path for wallet')
    .action(async (privateKey, options) => {
      const logger = new Logger();
      const spinner = new Spinner();
      const configManager = new ConfigManager();

      try {
        const config = configManager.getConfig();
        const walletPath = options.output || config.walletPath;

        const walletManager = new WalletManager(config.rpcUrl, config.network);

        // Check if wallet already exists
        if (walletManager.walletExists(walletPath)) {
          const answers = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'overwrite',
              message: `Wallet already exists at ${walletPath}. Overwrite?`,
              default: false,
            },
          ]);

          if (!answers.overwrite) {
            logger.warning('Wallet import cancelled');
            return;
          }
        }

        spinner.start('Importing wallet...');
        const wallet = walletManager.importWallet(privateKey);

        walletManager.saveWallet(wallet, walletPath);
        spinner.succeed('Wallet imported successfully');

        logger.log('');
        logger.keyValue('Public Key', wallet.publicKey.toString());
        logger.keyValue('Wallet File', walletPath);
      } catch (error) {
        spinner.fail('Failed to import wallet');
        logger.error(`${error}`);
        process.exit(1);
      }
    });

  // wallet show
  command
    .command('show')
    .description('Show wallet public key and balances')
    .option('-w, --wallet <path>', 'Wallet file path')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const logger = new Logger(false, options.json);
      const spinner = new Spinner(options.json);
      const configManager = new ConfigManager();

      try {
        const config = configManager.getConfig();
        const walletPath = options.wallet || config.walletPath;

        const walletManager = new WalletManager(config.rpcUrl, config.network);

        if (!walletManager.walletExists(walletPath)) {
          logger.error(`Wallet not found at ${walletPath}`);
          logger.info('Create a wallet with "x402 wallet create"');
          process.exit(1);
        }

        const wallet = walletManager.loadWallet(walletPath);

        spinner.start('Fetching wallet information...');
        const info = await walletManager.getWalletInfo(wallet);
        spinner.succeed();

        if (options.json) {
          logger.json(info);
        } else {
          logger.heading('Wallet Information');
          logger.table({
            'Public Key': info.publicKey,
            'Short Address': truncateAddress(info.publicKey),
            'SOL Balance': formatSOL(info.solBalance),
            'USDC Balance': formatUSDC(info.usdcBalance),
            'USDC Token Account': info.usdcTokenAccount,
            Network: config.network,
          });
        }
      } catch (error) {
        spinner.fail('Failed to fetch wallet info');
        logger.error(`${error}`);
        process.exit(1);
      }
    });

  // wallet balance
  command
    .command('balance')
    .description('Check wallet balances')
    .option('-w, --wallet <path>', 'Wallet file path')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const logger = new Logger(false, options.json);
      const spinner = new Spinner(options.json);
      const configManager = new ConfigManager();

      try {
        const config = configManager.getConfig();
        const walletPath = options.wallet || config.walletPath;

        const walletManager = new WalletManager(config.rpcUrl, config.network);

        if (!walletManager.walletExists(walletPath)) {
          logger.error(`Wallet not found at ${walletPath}`);
          process.exit(1);
        }

        const wallet = walletManager.loadWallet(walletPath);

        spinner.start('Fetching balances...');
        const info = await walletManager.getWalletInfo(wallet);
        spinner.succeed();

        if (options.json) {
          logger.json({
            sol: info.solBalance,
            usdc: info.usdcBalance,
          });
        } else {
          logger.log('');
          logger.keyValue('SOL', formatSOL(info.solBalance));
          logger.keyValue('USDC', formatUSDC(info.usdcBalance));
          logger.log('');
        }
      } catch (error) {
        spinner.fail('Failed to fetch balances');
        logger.error(`${error}`);
        process.exit(1);
      }
    });

  // wallet export
  command
    .command('export')
    .description('Export wallet private key')
    .option('-w, --wallet <path>', 'Wallet file path')
    .action(async (options) => {
      const logger = new Logger();
      const configManager = new ConfigManager();

      try {
        const config = configManager.getConfig();
        const walletPath = options.wallet || config.walletPath;

        const walletManager = new WalletManager(config.rpcUrl, config.network);

        if (!walletManager.walletExists(walletPath)) {
          logger.error(`Wallet not found at ${walletPath}`);
          process.exit(1);
        }

        // Confirm before showing private key
        const answers = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: 'Are you sure you want to export your private key?',
            default: false,
          },
        ]);

        if (!answers.confirm) {
          logger.warning('Export cancelled');
          return;
        }

        const wallet = walletManager.loadWallet(walletPath);
        const privateKey = walletManager.exportPrivateKey(wallet);

        logger.log('');
        logger.warning('KEEP THIS PRIVATE KEY SECURE!');
        logger.log('');
        logger.keyValue('Private Key (base58)', privateKey);
        logger.log('');
      } catch (error) {
        logger.error(`Failed to export wallet: ${error}`);
        process.exit(1);
      }
    });

  // wallet airdrop (devnet only)
  command
    .command('airdrop')
    .description('Request SOL airdrop on devnet')
    .option('-w, --wallet <path>', 'Wallet file path')
    .option('-a, --amount <sol>', 'Amount of SOL to request', '1')
    .action(async (options) => {
      const logger = new Logger();
      const spinner = new Spinner();
      const configManager = new ConfigManager();

      try {
        const config = configManager.getConfig();

        if (config.network !== 'devnet') {
          logger.error('Airdrop only available on devnet');
          logger.info('Set network to devnet: x402 config set --network devnet');
          process.exit(1);
        }

        const walletPath = options.wallet || config.walletPath;
        const amount = parseFloat(options.amount);

        if (isNaN(amount) || amount <= 0) {
          logger.error('Invalid amount. Must be a positive number.');
          process.exit(1);
        }

        const walletManager = new WalletManager(config.rpcUrl, config.network);

        if (!walletManager.walletExists(walletPath)) {
          logger.error(`Wallet not found at ${walletPath}`);
          process.exit(1);
        }

        const wallet = walletManager.loadWallet(walletPath);

        spinner.start(`Requesting ${amount} SOL airdrop...`);
        const signature = await walletManager.requestAirdrop(wallet, amount);
        spinner.succeed(`Airdrop successful!`);

        logger.log('');
        logger.keyValue('Transaction', signature);
        logger.keyValue('Amount', formatSOL(amount));
        logger.log('');
        logger.info('Check balance with "x402 wallet balance"');
      } catch (error) {
        spinner.fail('Airdrop failed');
        logger.error(`${error}`);
        process.exit(1);
      }
    });

  return command;
}