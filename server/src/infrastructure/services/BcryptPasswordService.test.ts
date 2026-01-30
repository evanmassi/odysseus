/**
 * Bcrypt Password Service Tests
 *
 * Tests password hashing, verification, and strength validation.
 */

import { BcryptPasswordService } from './BcryptPasswordService';

describe('BcryptPasswordService', () => {
  let service: BcryptPasswordService;
  let mockConfigurationRepository: {
    getSecurityConfig: jest.Mock;
  };

  const defaultSecurityConfig = {
    passwordMinLength: 8,
    requireStrongPasswords: false,
    passwordRequireSpecialChars: false,
  };

  const strongSecurityConfig = {
    passwordMinLength: 12,
    requireStrongPasswords: true,
    passwordRequireSpecialChars: true,
  };

  beforeEach(() => {
    mockConfigurationRepository = {
      getSecurityConfig: jest.fn().mockResolvedValue(defaultSecurityConfig),
    };

    // Use lower salt rounds for faster tests
    service = new BcryptPasswordService(mockConfigurationRepository as any, 4);
  });

  describe('hash()', () => {
    it('should hash a valid password', async () => {
      const password = 'ValidPass123';
      const hash = await service.hash(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2b$')).toBe(true); // bcrypt prefix
    });

    it('should produce different hashes for same password', async () => {
      const password = 'SecureStr0ng!Key';

      const hash1 = await service.hash(password);
      const hash2 = await service.hash(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should throw error for empty password', async () => {
      await expect(service.hash('')).rejects.toThrow('Password cannot be empty');
    });

    it('should throw error for password below minimum length', async () => {
      await expect(service.hash('short')).rejects.toThrow(
        'Password must be at least 8 characters long'
      );
    });

    it('should throw error for password with forbidden words', async () => {
      await expect(service.hash('password123!')).rejects.toThrow(
        'Password contains common words that are not allowed'
      );
    });

    it('should throw error for password exceeding max length', async () => {
      const longPassword = 'A'.repeat(129) + '1';

      await expect(service.hash(longPassword)).rejects.toThrow(
        'Password cannot exceed 128 characters'
      );
    });
  });

  describe('verify()', () => {
    it('should verify correct password against hash', async () => {
      const testPass = 'Str0ngT3stK3y!';
      const hash = await service.hash(testPass);

      const isValid = await service.verify(testPass, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const testPass = 'Str0ngT3stK3y!';
      const hash = await service.hash(testPass);

      const isValid = await service.verify('WrongStr0ngK3y!', hash);

      expect(isValid).toBe(false);
    });

    it('should return false for empty password', async () => {
      const hash = await service.hash('Val1dStr0ngK3y!');

      const isValid = await service.verify('', hash);

      expect(isValid).toBe(false);
    });

    it('should return false for empty hash', async () => {
      const isValid = await service.verify('SomePassword123', '');

      expect(isValid).toBe(false);
    });

    it('should return false for invalid hash format', async () => {
      const isValid = await service.verify('SomePassword123', 'not-a-valid-bcrypt-hash');

      expect(isValid).toBe(false);
    });

    it('should handle null/undefined inputs gracefully', async () => {
      expect(await service.verify(null as any, 'hash')).toBe(false);
      expect(await service.verify('password', null as any)).toBe(false);
    });
  });

  describe('validateStrength() - Default Config', () => {
    beforeEach(() => {
      mockConfigurationRepository.getSecurityConfig.mockResolvedValue(defaultSecurityConfig);
    });

    it('should validate password meeting minimum requirements', async () => {
      const result = await service.validateStrength('ValidPas');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password below minimum length', async () => {
      const result = await service.validateStrength('Short1');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password exceeding maximum length', async () => {
      const result = await service.validateStrength('A'.repeat(129));

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password cannot exceed 128 characters');
    });

    it('should reject forbidden passwords', async () => {
      const forbiddenPasswords = [
        'password123456',
        '12345678910',
        'adminadmin',
        'letmeinnow',
        'welcometoday',
        'monkeymonkey',
        'qwertyuiop',
      ];

      for (const pwd of forbiddenPasswords) {
        const result = await service.validateStrength(pwd);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password contains common words that are not allowed');
      }
    });

    it('should calculate score for password complexity', async () => {
      // Simple password (no special chars, no uppercase)
      const simpleResult = await service.validateStrength('simplest');
      expect(simpleResult.score).toBeGreaterThanOrEqual(0);

      // Complex password (mixed case, special chars, numbers)
      const complexResult = await service.validateStrength('C0mpl3x@Key!');
      expect(complexResult.score).toBeGreaterThanOrEqual(simpleResult.score ?? 0);
    });

    it('should increase score for longer passwords', async () => {
      const shortResult = await service.validateStrength('Pass123!');
      const mediumResult = await service.validateStrength('Password123!');
      const longResult = await service.validateStrength('VeryLongPassword123!');

      expect(mediumResult.score).toBeGreaterThanOrEqual(shortResult.score ?? 0);
      expect(longResult.score).toBeGreaterThanOrEqual(mediumResult.score ?? 0);
    });

    it('should cap score at 4', async () => {
      const result = await service.validateStrength('SuperSecureP@ssw0rd!123456');

      expect(result.score).toBeLessThanOrEqual(4);
    });
  });

  describe('validateStrength() - Strong Password Config', () => {
    beforeEach(() => {
      mockConfigurationRepository.getSecurityConfig.mockResolvedValue(strongSecurityConfig);
    });

    it('should enforce longer minimum length', async () => {
      const result = await service.validateStrength('ShortPass1');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 12 characters long');
    });

    it('should require uppercase letter', async () => {
      const result = await service.validateStrength('lowercaseonly123!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should require lowercase letter', async () => {
      const result = await service.validateStrength('UPPERCASEONLY123!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should require number', async () => {
      const result = await service.validateStrength('NoNumbersHere!ABC');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should require special character when configured', async () => {
      const result = await service.validateStrength('NoSpecialChars123');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should accept password meeting all strong requirements', async () => {
      const result = await service.validateStrength('StrongP@ssw0rd!');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should report multiple errors for weak password', async () => {
      const result = await service.validateStrength('abc');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('validateStrength() - Edge Cases', () => {
    it('should handle unicode characters', async () => {
      mockConfigurationRepository.getSecurityConfig.mockResolvedValue(defaultSecurityConfig);

      const result = await service.validateStrength('Pässwörd123');

      expect(result.isValid).toBe(true);
    });

    it('should handle passwords with spaces', async () => {
      mockConfigurationRepository.getSecurityConfig.mockResolvedValue(defaultSecurityConfig);

      const result = await service.validateStrength('Pass word 123');

      expect(result.isValid).toBe(true);
    });

    it('should detect forbidden words case-insensitively', async () => {
      mockConfigurationRepository.getSecurityConfig.mockResolvedValue(defaultSecurityConfig);

      const result = await service.validateStrength('PASSWORD123456');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password contains common words that are not allowed');
    });

    it('should detect forbidden words as substring', async () => {
      mockConfigurationRepository.getSecurityConfig.mockResolvedValue(defaultSecurityConfig);

      const result = await service.validateStrength('myqwertypassphrase');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password contains common words that are not allowed');
    });
  });

  describe('Integration - Hash Then Verify', () => {
    it('should hash and verify complex password', async () => {
      const password = 'C0mpl3x!P@ssw0rd#2024';

      const hash = await service.hash(password);
      const isValid = await service.verify(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject similar but different password', async () => {
      const password = 'MySecurePass123';
      const similarPassword = 'MySecurePass124';

      const hash = await service.hash(password);
      const isValid = await service.verify(similarPassword, hash);

      expect(isValid).toBe(false);
    });
  });
});
