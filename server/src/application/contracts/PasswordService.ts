/**
 * Password Service Interface
 *
 * Defines the contract for password hashing and verification operations.
 * This abstraction allows for different password hashing implementations
 * (bcrypt, argon2, etc.) without changing application logic.
 */

export interface PasswordService {
  hash(plainPassword: string): Promise<string>;

  verify(plainPassword: string, storedHash: string, salt?: string): Promise<boolean>;

  /** Returns true if the stored hash should be re-hashed with the current algorithm. */
  needsUpgrade(storedHash: string, salt?: string): boolean;
}
