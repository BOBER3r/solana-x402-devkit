import {
  formatUSDC,
  formatSOL,
  formatUSD,
  truncateAddress,
  formatSignature,
  formatTimestamp,
  formatDuration,
  formatBytes,
  formatNetwork,
} from '../src/utils/formatter';

describe('Formatter', () => {
  describe('formatUSDC', () => {
    it('should format USDC amount with 6 decimals', () => {
      expect(formatUSDC(1.234567)).toBe('1.234567 USDC');
      expect(formatUSDC(0.000001)).toBe('0.000001 USDC');
      expect(formatUSDC(1000)).toBe('1000.000000 USDC');
    });
  });

  describe('formatSOL', () => {
    it('should format SOL amount with 9 decimals', () => {
      expect(formatSOL(1.234567891)).toBe('1.234567891 SOL');
      expect(formatSOL(0.000000001)).toBe('0.000000001 SOL');
      expect(formatSOL(1000)).toBe('1000.000000000 SOL');
    });
  });

  describe('formatUSD', () => {
    it('should format USD amount with dollar sign', () => {
      expect(formatUSD(1.23)).toBe('$1.230000');
      expect(formatUSD(0.001)).toBe('$0.001000');
      expect(formatUSD(1000)).toBe('$1000.000000');
    });
  });

  describe('truncateAddress', () => {
    it('should truncate long addresses', () => {
      const address = '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin';
      expect(truncateAddress(address, 8)).toBe('9xQeWvG8...rpZb9PusVFin');
    });

    it('should not truncate short addresses', () => {
      const address = 'short';
      expect(truncateAddress(address, 8)).toBe('short');
    });
  });

  describe('formatSignature', () => {
    it('should format transaction signature', () => {
      const signature =
        '5j7s6NiJS3JAkvgkoc18WVAsiSaci2pxB2A6ueCJP4tprA2TFg9wSyTLeYouxPBJEMzJinENTkpA52YStRW5Dia7';
      expect(formatSignature(signature)).toBe(
        '5j7s6NiJ...YStRW5Dia7'
      );
    });
  });

  describe('formatTimestamp', () => {
    it('should format Unix timestamp', () => {
      const timestamp = 1609459200; // 2021-01-01 00:00:00 UTC
      const formatted = formatTimestamp(timestamp);
      expect(formatted).toMatch(/2021/);
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds', () => {
      expect(formatDuration(500)).toBe('500ms');
      expect(formatDuration(1500)).toBe('1.5s');
      expect(formatDuration(60000)).toBe('1.0m');
      expect(formatDuration(90000)).toBe('1.5m');
    });
  });

  describe('formatBytes', () => {
    it('should format bytes with appropriate unit', () => {
      expect(formatBytes(500)).toBe('500 B');
      expect(formatBytes(1536)).toBe('1.50 KB');
      expect(formatBytes(1048576)).toBe('1.00 MB');
      expect(formatBytes(2097152)).toBe('2.00 MB');
    });
  });

  describe('formatNetwork', () => {
    it('should format network names', () => {
      expect(formatNetwork('devnet')).toBe('Devnet');
      expect(formatNetwork('mainnet-beta')).toBe('Mainnet');
      expect(formatNetwork('testnet')).toBe('Testnet');
      expect(formatNetwork('localnet')).toBe('Localnet');
    });

    it('should return unknown networks as-is', () => {
      expect(formatNetwork('custom')).toBe('custom');
    });
  });
});
