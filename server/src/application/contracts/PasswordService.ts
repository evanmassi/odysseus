/**
 * Password Service Interface
 * 
 * Defines the contract for password hashing and verification operations.
 * This abstraction allows for different password hashing implementations
 * (bcrypt, argon2, etc.) without changing application logic.
 */

export interface PasswordService {
  /**
   * Hashes a plain text password using a secure algorithm.
   * 
   * @param plainPassword The plain text password to hash
   * @returns Promise that resolves to the hashed password
   */
  hash(plainPassword: string): Promise<string>;

  /**
   * Verifies a plain text password against a hashed password.
   * 
   * @param plainPassword The plain text password to verify
   * @param hashedPassword The hashed password to compare against
   * @returns Promise that resolves to true if password matches, false otherwise
   */
  verify(plainPassword: string, hashedPassword: string): Promise<boolean>;

  /**
   * Checks if a password meets the configured strength requirements.
   * Reads current SecurityConfig to enforce dynamic password policies.
   *
   * @param password The password to validate
   * @returns Promise resolving to validation result and any error messages
   */
  validateStrength(password: string): Promise<PasswordValidationResult>;
}

/**
 * Password Validation Result
 */
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  score?: number; // 0-4, where 4 is strongest
}

/**
 * Password Requirements Configuration
 */
export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  minSpecialChars?: number;
  forbiddenPasswords?: string[]; // Common passwords to reject
}
