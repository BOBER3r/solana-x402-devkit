#!/usr/bin/env node

import { Command } from 'commander';
import { createWalletCommand } from './commands/wallet';
import { createTestCommand } from './commands/test';
import { createPayCommand } from './commands/pay';
import { createConfigCommand } from './commands/config';
import chalk from 'chalk';

const VERSION = '0.2.0';

/**
 * Main CLI program
 */
const program = new Command();

program
  .name('x402')
  .description(
    chalk.cyan('CLI tool for testing x402-enabled APIs on Solana')
  )
  .version(VERSION, '-v, --version', 'Output the current version');

// Add commands
program.addCommand(createWalletCommand());
program.addCommand(createTestCommand());
program.addCommand(createPayCommand());
program.addCommand(createConfigCommand());

// Show help if no command provided
if (process.argv.length <= 2) {
  program.help();
}

// Parse arguments
program.parse(process.argv);
