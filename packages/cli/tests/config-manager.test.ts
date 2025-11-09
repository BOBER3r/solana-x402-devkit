import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigManager } from '../src/lib/config-manager';

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let testConfigPath: string;

  beforeEach(() => {
    testConfigPath = path.join(os.tmpdir(), `test-config-${Date.now()}.json`);
    configManager = new ConfigManager(testConfigPath);
  });

  afterEach(() => {
    // Clean up test config file
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
  });

  describe('getConfig', () => {
    it('should return default config on first load', () => {
      const config = configManager.getConfig();

      expect(config).toEqual({
        network: 'devnet',
        rpcUrl: 'https://api.devnet.solana.com',
        walletPath: path.join(os.homedir(), '.x402', 'wallet.json'),
        commitment: 'confirmed',
      });
    });
  });

  describe('setNetwork', () => {
    it('should set network to devnet', () => {
      configManager.setNetwork('devnet');
      expect(configManager.getNetwork()).toBe('devnet');
    });

    it('should set network to mainnet-beta', () => {
      configManager.setNetwork('mainnet-beta');
      expect(configManager.getNetwork()).toBe('mainnet-beta');
    });

    it('should update RPC URL when setting network', () => {
      configManager.setNetwork('mainnet-beta');
      expect(configManager.getRpcUrl()).toBe(
        'https://api.mainnet-beta.solana.com'
      );

      configManager.setNetwork('devnet');
      expect(configManager.getRpcUrl()).toBe('https://api.devnet.solana.com');
    });

    it('should persist network setting', () => {
      configManager.setNetwork('mainnet-beta');

      const newManager = new ConfigManager(testConfigPath);
      expect(newManager.getNetwork()).toBe('mainnet-beta');
    });
  });

  describe('setRpcUrl', () => {
    it('should set custom RPC URL', () => {
      const customUrl = 'https://custom-rpc.solana.com';
      configManager.setRpcUrl(customUrl);

      expect(configManager.getRpcUrl()).toBe(customUrl);
    });

    it('should persist RPC URL setting', () => {
      const customUrl = 'https://custom-rpc.solana.com';
      configManager.setRpcUrl(customUrl);

      const newManager = new ConfigManager(testConfigPath);
      expect(newManager.getRpcUrl()).toBe(customUrl);
    });
  });

  describe('setWalletPath', () => {
    it('should set custom wallet path', () => {
      const customPath = '/custom/path/wallet.json';
      configManager.setWalletPath(customPath);

      expect(configManager.getWalletPath()).toBe(customPath);
    });

    it('should persist wallet path setting', () => {
      const customPath = '/custom/path/wallet.json';
      configManager.setWalletPath(customPath);

      const newManager = new ConfigManager(testConfigPath);
      expect(newManager.getWalletPath()).toBe(customPath);
    });
  });

  describe('setCommitment', () => {
    it('should set commitment level', () => {
      configManager.setCommitment('finalized');
      expect(configManager.getCommitment()).toBe('finalized');
    });

    it('should persist commitment setting', () => {
      configManager.setCommitment('processed');

      const newManager = new ConfigManager(testConfigPath);
      expect(newManager.getCommitment()).toBe('processed');
    });
  });

  describe('reset', () => {
    it('should reset all settings to defaults', () => {
      configManager.setNetwork('mainnet-beta');
      configManager.setRpcUrl('https://custom-rpc.solana.com');
      configManager.setCommitment('finalized');

      configManager.reset();

      const config = configManager.getConfig();
      expect(config.network).toBe('devnet');
      expect(config.rpcUrl).toBe('https://api.devnet.solana.com');
      expect(config.commitment).toBe('confirmed');
    });
  });

  describe('exists', () => {
    it('should return false for non-existent config', () => {
      expect(configManager.exists()).toBe(false);
    });

    it('should return true after saving config', () => {
      configManager.setNetwork('devnet');
      expect(configManager.exists()).toBe(true);
    });
  });

  describe('getConfigPath', () => {
    it('should return config file path', () => {
      expect(configManager.getConfigPath()).toBe(testConfigPath);
    });
  });
});
