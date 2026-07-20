/**
 * Password Service Interface
 *
 * Password hashing and verification, decoupled from the hashing algorithm.
 */

export interface PasswordService {
  hash(plainPassword: string): Promise<string>;

  verify(plainPassword: string, storedHash: string, salt?: string): Promise<boolean>;

  /**
   * Returns true if the stored credential should be re-hashed with the current
   * algorithm. Legacy PBKDF2 credentials carry a salt and need re-hashing to bcrypt.
   */
  needsUpgrade(salt?: string): boolean;
}
