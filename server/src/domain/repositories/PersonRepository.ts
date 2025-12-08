import { Person } from '@domain/entities/Person';

/**
 * PersonRepository Interface
 *
 * Defines the contract for Person entity persistence operations.
 * Implementations handle the actual database interaction.
 */
export interface PersonRepository {
  /**
   * Find a person by their unique identifier
   * @param id - The person's unique ID
   * @returns The Person entity if found, null otherwise
   */
  findById(id: string): Promise<Person | null>;

  /**
   * Find a person by their email address
   * @param email - The person's email (case-insensitive)
   * @returns The Person entity if found, null otherwise
   */
  findByEmail(email: string): Promise<Person | null>;

  /**
   * Check if an email address is already in use
   * @param email - The email to check
   * @returns true if email exists, false otherwise
   */
  emailExists(email: string): Promise<boolean>;

  /**
   * Save a person (create or update)
   * @param person - The Person entity to persist
   */
  save(person: Person): Promise<void>;

  /**
   * Delete a person by ID
   * @param id - The person's unique ID
   * @returns true if deleted, false if not found
   */
  delete(id: string): Promise<boolean>;

  /**
   * Retrieve all persons
   * @returns Array of all Person entities
   */
  findAll(): Promise<Person[]>;

  /**
   * Find multiple persons by their IDs
   * Returns only found persons (no errors for missing IDs)
   * @param ids - Array of person IDs to look up
   * @returns Array of found Person entities
   */
  findByIds(ids: string[]): Promise<Person[]>;
}
