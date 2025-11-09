import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Configuration structure for the CLI
 */
export interface X402Config {
  /** Solana network (devnet or mainnet-beta) */
  network: 'devnet' | 'mainnet-beta';

  /** Solana RPC URL */
  rpcUrl: string;

  /** Default wallet path */
  walletPath: string;

  /** Commitment level */
  commitment: 'processed' | 'confirmed' | 'finalized';
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: X402Config = {
  network: 'devnet',
  rpcUrl: 'https://api.devnet.solana.com',
  walletPath: path.join(os.homedir(), '.x402', 'wallet.json'),
  commitment: 'confirmed',
};

/**
 * Configuration manager for CLI settings
 */
export class ConfigManager {
  private configPath: string;
  private config: X402Config;

  constructor(configPath?: string) {
    this.configPath =
      configPath || path.join(os.homedir(), '.x402', 'config.json');
    this.config = this.load();
  }

  /**
   * Load configuration from file
   */
  private load(): X402Config {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        const parsed = JSON.parse(data);
        return { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch (error) {
      // If config file is corrupted, use defaults
    }

    return { ...DEFAULT_CONFIG };
  }

  /**
   * Save configuration to file
   */
  private save(): void {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        'utf-8'
      );
    } catch (error) {
      throw new Error(`Failed to save config: ${error}`);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): X402Config {
    return { ...this.config };
  }

  /**
   * Get network setting
   */
  getNetwork(): 'devnet' | 'mainnet-beta' {
    return this.config.network;
  }

  /**
   * Set network setting
   */
  setNetwork(network: 'devnet' | 'mainnet-beta'): void {
    this.config.network = network;

    // Update RPC URL to match network if using default
    if (
      this.config.rpcUrl === 'https://api.devnet.solana.com' ||
      this.config.rpcUrl === 'https://api.mainnet-beta.solana.com'
    ) {
      this.config.rpcUrl =
        network === 'devnet'
          ? 'https://api.devnet.solana.com'
          : 'https://api.mainnet-beta.solana.com';
    }

    this.save();
  }

  /**
   * Get RPC URL setting
   */
  getRpcUrl(): string {
    return this.config.rpcUrl;
  }

  /**
   * Set RPC URL setting
   */
  setRpcUrl(rpcUrl: string): void {
    this.config.rpcUrl = rpcUrl;
    this.save();
  }

  /**
   * Get wallet path setting
   */
  getWalletPath(): string {
    return this.config.walletPath;
  }

  /**
   * Set wallet path setting
   */
  setWalletPath(walletPath: string): void {
    this.config.walletPath = walletPath;
    this.save();
  }

  /**
   * Get commitment level setting
   */
  getCommitment(): 'processed' | 'confirmed' | 'finalized' {
    return this.config.commitment;
  }

  /**
   * Set commitment level setting
   */
  setCommitment(commitment: 'processed' | 'confirmed' | 'finalized'): void {
    this.config.commitment = commitment;
    this.save();
  }

  /**
   * Reset configuration to defaults
   */
  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.save();
  }

  /**
   * Get configuration file path
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Check if configuration file exists
   */
  exists(): boolean {
    return fs.existsSync(this.configPath);
  }
}
