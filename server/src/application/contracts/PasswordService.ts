/**
 * Password Service Interface
 *
 * Password hashing and verification, decoupled from the hashing algorithm.
 */

export interface PasswordService {
  hash(plainPassword: string): Promise<string>;

  verify(plainPassword: string, storedHash: string, salt?: string): Promise<boolean>;

  /** Returns true if the stored hash should be re-hashed with the current algorithm. */
  needsUpgrade(storedHash: string, salt?: string): boolean;
}
