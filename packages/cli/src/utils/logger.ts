import chalk from 'chalk';

/**
 * Logger utility for CLI output with colors and formatting
 */
export class Logger {
  private verbose: boolean;
  private jsonMode: boolean;

  constructor(verbose = false, jsonMode = false) {
    this.verbose = verbose;
    this.jsonMode = jsonMode;
  }

  /**
   * Log success message
   */
  success(message: string): void {
    if (this.jsonMode) return;
    console.log(chalk.green('✓') + ' ' + message);
  }

  /**
   * Log error message
   */
  error(message: string): void {
    if (this.jsonMode) return;
    console.error(chalk.red('✗') + ' ' + message);
  }

  /**
   * Log warning message
   */
  warning(message: string): void {
    if (this.jsonMode) return;
    console.log(chalk.yellow('⚠') + ' ' + message);
  }

  /**
   * Log info message
   */
  info(message: string): void {
    if (this.jsonMode) return;
    console.log(chalk.blue('ℹ') + ' ' + message);
  }

  /**
   * Log verbose message (only if verbose mode is enabled)
   */
  debug(message: string): void {
    if (this.jsonMode) return;
    if (this.verbose) {
      console.log(chalk.gray('[DEBUG]') + ' ' + message);
    }
  }

  /**
   * Log plain message
   */
  log(message: string): void {
    if (this.jsonMode) return;
    console.log(message);
  }

  /**
   * Log JSON output
   */
  json(data: any): void {
    console.log(JSON.stringify(data, null, 2));
  }

  /**
   * Log heading
   */
  heading(message: string): void {
    if (this.jsonMode) return;
    console.log('\n' + chalk.bold.underline(message) + '\n');
  }

  /**
   * Log key-value pair
   */
  keyValue(key: string, value: string): void {
    if (this.jsonMode) return;
    console.log(chalk.cyan(key + ':') + ' ' + value);
  }

  /**
   * Log table data
   */
  table(data: Record<string, string>): void {
    if (this.jsonMode) return;
    const maxKeyLength = Math.max(...Object.keys(data).map((k) => k.length));
    for (const [key, value] of Object.entries(data)) {
      const paddedKey = key.padEnd(maxKeyLength);
      console.log(chalk.cyan(paddedKey) + ' : ' + value);
    }
  }

  /**
   * Create a styled section
   */
  section(title: string, content: () => void): void {
    if (this.jsonMode) return;
    console.log('\n' + chalk.bold(title));
    console.log(chalk.gray('─'.repeat(50)));
    content();
    console.log(chalk.gray('─'.repeat(50)) + '\n');
  }

  /**
   * Set verbose mode
   */
  setVerbose(verbose: boolean): void {
    this.verbose = verbose;
  }

  /**
   * Set JSON mode
   */
  setJsonMode(jsonMode: boolean): void {
    this.jsonMode = jsonMode;
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();
