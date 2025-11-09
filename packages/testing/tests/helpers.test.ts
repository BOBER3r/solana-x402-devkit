/**
 * Tests for test helpers
 */

import {
  generateMockSignature,
  generateMockSignatures,
  isValidSignatureFormat,
  signatureFromPattern,
  generateMockAddress,
  generateMockTokenAccount,
  createTestWallet,
  createTestWallets,
  isValidAddress,
  getCommonTestAddresses,
  mockCurrentTime,
  restoreTime,
  timeTravel,
  createTimestamp,
  createBlockTime,
  createExpiredTimestamp,
  createValidTimestamp,
} from '../src';

describe('Signature Helpers', () => {
  it('should generate random signatures', () => {
    const sig1 = generateMockSignature();
    const sig2 = generateMockSignature();

    expect(sig1).toBeTruthy();
    expect(sig2).toBeTruthy();
    expect(sig1).not.toBe(sig2);
  });

  it('should generate deterministic signatures', () => {
    const sig1 = generateMockSignature({ seed: 'test' });
    const sig2 = generateMockSignature({ seed: 'test' });
    const sig3 = generateMockSignature({ seed: 'different' });

    expect(sig1).toBe(sig2);
    expect(sig1).not.toBe(sig3);
  });

  it('should generate multiple signatures', () => {
    const signatures = generateMockSignatures(5);

    expect(signatures).toHaveLength(5);
    expect(new Set(signatures).size).toBe(5); // All unique
  });

  it('should validate signature format', () => {
    const validSig = generateMockSignature();
    const invalidSig = 'not-a-signature';

    expect(isValidSignatureFormat(validSig)).toBe(true);
    expect(isValidSignatureFormat(invalidSig)).toBe(false);
  });

  it('should create signature from pattern', () => {
    const zeroSig = signatureFromPattern(0);
    const oneSig = signatureFromPattern(255);

    expect(isValidSignatureFormat(zeroSig)).toBe(true);
    expect(isValidSignatureFormat(oneSig)).toBe(true);
    expect(zeroSig).not.toBe(oneSig);
  });
});

describe('Account Helpers', () => {
  it('should generate random addresses', () => {
    const addr1 = generateMockAddress();
    const addr2 = generateMockAddress();

    expect(addr1).toBeTruthy();
    expect(addr2).toBeTruthy();
    expect(addr1).not.toBe(addr2);
  });

  it('should generate deterministic addresses', () => {
    const addr1 = generateMockAddress('test');
    const addr2 = generateMockAddress('test');
    const addr3 = generateMockAddress('different');

    expect(addr1).toBe(addr2);
    expect(addr1).not.toBe(addr3);
  });

  it('should generate token accounts', () => {
    const account = generateMockTokenAccount();

    expect(account).toBeTruthy();
    expect(isValidAddress(account)).toBe(true);
  });

  it('should generate token account for specific owner', () => {
    const owner = generateMockAddress('owner');
    const account1 = generateMockTokenAccount({ owner });
    const account2 = generateMockTokenAccount({ owner });

    // With ATA derivation, same owner = same account
    expect(account1).toBe(account2);
  });

  it('should create test wallet with all details', () => {
    const wallet = createTestWallet('test');

    expect(wallet.address).toBeTruthy();
    expect(wallet.publicKey).toBeTruthy();
    expect(wallet.keypair).toBeDefined();
    expect(wallet.usdcAccount).toBeTruthy();
    expect(wallet.usdcMint).toBeTruthy();

    expect(isValidAddress(wallet.address)).toBe(true);
    expect(isValidAddress(wallet.usdcAccount)).toBe(true);
  });

  it('should create multiple test wallets', () => {
    const wallets = createTestWallets(3, 'user');

    expect(wallets).toHaveLength(3);
    wallets.forEach(wallet => {
      expect(wallet.address).toBeTruthy();
      expect(wallet.usdcAccount).toBeTruthy();
    });

    // All wallets should be unique
    const addresses = wallets.map(w => w.address);
    expect(new Set(addresses).size).toBe(3);
  });

  it('should get common test addresses', () => {
    const addresses = getCommonTestAddresses();

    expect(addresses.sender).toBeTruthy();
    expect(addresses.recipient).toBeTruthy();
    expect(addresses.facilitator).toBeTruthy();
    expect(addresses.senderUSDC).toBeTruthy();
    expect(addresses.recipientUSDC).toBeTruthy();
    expect(addresses.usdcMint).toBeTruthy();

    // All should be valid
    expect(isValidAddress(addresses.sender)).toBe(true);
    expect(isValidAddress(addresses.recipient)).toBe(true);
  });

  it('should validate addresses', () => {
    const validAddr = generateMockAddress();
    const invalidAddr = 'not-an-address';

    expect(isValidAddress(validAddr)).toBe(true);
    expect(isValidAddress(invalidAddr)).toBe(false);
  });
});

describe('Time Helpers', () => {
  afterEach(() => {
    restoreTime();
  });

  it('should mock current time', () => {
    const fixedTime = 1000000;
    mockCurrentTime({ now: fixedTime });

    expect(Date.now()).toBe(fixedTime);
    expect(Date.now()).toBe(fixedTime); // Stays fixed
  });

  it('should mock time with offset', () => {
    const realTime = Date.now();
    const offset = 60000; // 1 minute

    mockCurrentTime({ offset });

    const mockedTime = Date.now();
    expect(mockedTime).toBeGreaterThanOrEqual(realTime + offset);
  });

  it('should restore time', () => {
    mockCurrentTime({ now: 0 });
    expect(Date.now()).toBe(0);

    restoreTime();
    expect(Date.now()).toBeGreaterThan(1000000000000); // Real time
  });

  it('should travel forward in time', () => {
    mockCurrentTime({ now: 0 });
    expect(Date.now()).toBe(0);

    timeTravel(5000);
    expect(Date.now()).toBe(5000);

    timeTravel(3000);
    expect(Date.now()).toBe(8000);
  });

  it('should create timestamps', () => {
    const now = createTimestamp();
    expect(now).toBeGreaterThan(0);

    const past = createTimestamp({ minutesAgo: 5 });
    expect(past).toBeLessThan(now);
    expect(now - past).toBeGreaterThanOrEqual(5 * 60 * 1000);

    const future = createTimestamp({ minutesFromNow: 5 });
    expect(future).toBeGreaterThan(now);
  });

  it('should create block times', () => {
    const blockTime = createBlockTime();
    expect(blockTime).toBeGreaterThan(0);
    expect(blockTime).toBeLessThan(Date.now()); // Block time is in seconds
  });

  it('should create expired timestamps', () => {
    const maxAge = 300000; // 5 minutes
    const expired = createExpiredTimestamp(maxAge);

    const age = Date.now() - expired;
    expect(age).toBeGreaterThan(maxAge);
  });

  it('should create valid timestamps', () => {
    const maxAge = 300000; // 5 minutes
    const valid = createValidTimestamp(maxAge);

    const age = Date.now() - valid;
    expect(age).toBeLessThan(maxAge);
    expect(age).toBeGreaterThan(0);
  });
});
