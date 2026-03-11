/**
 * Password Service Interface
 *
 * Defines the contract for password hashing and verification operations.
 * This abstraction allows for different password hashing implementations
 * (bcrypt, argon2, etc.) without changing application logic.
 */

export interface PasswordService {
  hash(plainPassword: string): Promise<string>;

  verify(plainPassword: string, hashedPassword: string): Promise<boolean>;

  /** Reads current SecurityConfig to enforce dynamic password policies. */
  validateStrength(password: string): Promise<PasswordValidationResult>;
}

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  score?: number; // 0-4, where 4 is strongest
}
