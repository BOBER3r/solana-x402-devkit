import chalk from 'chalk';

/**
 * Formatter utilities for CLI output
 */

/**
 * Format USDC amount with proper decimals
 */
export function formatUSDC(amount: number): string {
  return amount.toFixed(6) + ' USDC';
}

/**
 * Format SOL amount with proper decimals
 */
export function formatSOL(amount: number): string {
  return amount.toFixed(9) + ' SOL';
}

/**
 * Format USD amount
 */
export function formatUSD(amount: number): string {
  return '$' + amount.toFixed(6);
}

/**
 * Truncate Solana address for display
 */
export function truncateAddress(address: string, length = 8): string {
  if (address.length <= length * 2) return address;
  return address.slice(0, length) + '...' + address.slice(-length);
}

/**
 * Format transaction signature for display
 */
export function formatSignature(signature: string): string {
  return truncateAddress(signature, 8);
}

/**
 * Format timestamp to human-readable string
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / 1048576).toFixed(2) + ' MB';
}

/**
 * Format network name
 */
export function formatNetwork(network: string): string {
  const networkMap: Record<string, string> = {
    'devnet': 'Devnet',
    'mainnet-beta': 'Mainnet',
    'testnet': 'Testnet',
    'localnet': 'Localnet',
  };
  return networkMap[network] || network;
}

/**
 * Format boolean as colored yes/no
 */
export function formatBoolean(value: boolean): string {
  return value ? chalk.green('Yes') : chalk.red('No');
}

/**
 * Create a box around text
 */
export function createBox(text: string, padding = 1): string {
  const lines = text.split('\n');
  const maxLength = Math.max(...lines.map((l) => l.length));
  const width = maxLength + padding * 2;

  const top = '┌' + '─'.repeat(width) + '┐';
  const bottom = '└' + '─'.repeat(width) + '┘';
  const paddedLines = lines.map(
    (line) => '│' + ' '.repeat(padding) + line.padEnd(maxLength) + ' '.repeat(padding) + '│'
  );

  return [top, ...paddedLines, bottom].join('\n');
}

/**
 * Format JSON for pretty display
 */
export function formatJSON(data: any, colorize = true): string {
  const json = JSON.stringify(data, null, 2);
  if (!colorize) return json;

  return json
    .replace(/"([^"]+)":/g, (_match, key) => chalk.cyan(`"${key}":`))
    .replace(/: "([^"]+)"/g, (_match, value) => `: ${chalk.green(`"${value}"`)}`)
    .replace(/: (\d+)/g, (_match, value) => `: ${chalk.yellow(value)}`)
    .replace(/: (true|false)/g, (_match, value) =>
      value === 'true' ? `: ${chalk.green(value)}` : `: ${chalk.red(value)}`
    )
    .replace(/: null/g, `: ${chalk.gray('null')}`);
}

/**
 * Create a progress bar
 */
export function createProgressBar(
  current: number,
  total: number,
  width = 30
): string {
  const percentage = Math.min(current / total, 1);
  const filled = Math.floor(percentage * width);
  const empty = width - filled;

  const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  const percent = (percentage * 100).toFixed(0).padStart(3);

  return `[${bar}] ${percent}%`;
}

/**
 * Format error message
 */
export function formatError(error: Error | string): string {
  if (typeof error === 'string') {
    return chalk.red(error);
  }
  return chalk.red(`Error: ${error.message}`);
}

/**
 * Format success message
 */
export function formatSuccess(message: string): string {
  return chalk.green(message);
}

/**
 * Format warning message
 */
export function formatWarning(message: string): string {
  return chalk.yellow(message);
}
