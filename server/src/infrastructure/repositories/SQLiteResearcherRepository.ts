import {
  ResearcherRepository,
  ResearcherRepositoryStats,
  ResearcherSearchCriteria,
  ValidationResult,
  DuplicateCheckResult,
  ResearcherUsageStats
} from '@domain/repositories/ResearcherRepository';
import { Researcher } from '@domain/entities/Researcher';
import { Person } from '@domain/entities/Person';
import { PersonRepository } from '@domain/repositories/PersonRepository';
import { SQLiteContext } from '@infrastructure/database/SQLiteContext';
import { ResearcherMapper, ResearcherRow } from '@infrastructure/database/mappers/ResearcherMapper';
import { SqliteDateMapper } from '@infrastructure/database/SqliteDateMapper';

/**
 * SQLiteResearcherRepository - Researcher data access
 *
 * Implements ResearcherRepository interface using SQLite.
 * Handles all researcher persistence operations.
 *
 * IMPORTANT: After Person entity implementation, Researcher no longer contains
 * profile fields (firstName, lastName, email, position, department).
 * These are now in Person entity. Many methods below need refactoring to JOIN
 * with persons table or work at Person level instead.
 *
 * TODO: Refactor bulk operations (saveMany, createFromNames, updateMany, etc.)
 * to work with Person entity properly. Currently marked for cleanup.
 */
export class SQLiteResearcherRepository implements ResearcherRepository {

  constructor(
    private context: SQLiteContext,
    private personRepository: PersonRepository
  ) {}

  // BASIC CRUD OPERATIONS

  async findById(id: string): Promise<Researcher | null> {
    const row = await this.context.queryOne<ResearcherRow>(
      'SELECT * FROM researchers WHERE id = ?',
      [id]
    );
    return row ? ResearcherMapper.fromRow(row) : null;
  }

  async findByName(firstName: string, lastName: string): Promise<Researcher | null> {
    // Note: Names are now in Person entity, need to JOIN
    const row = await this.context.queryOne<ResearcherRow>(`
      SELECT r.* FROM researchers r
      INNER JOIN persons p ON r.personId = p.id
      WHERE p.firstName = ? AND p.lastName = ?
    `, [firstName, lastName]);
    return row ? ResearcherMapper.fromRow(row) : null;
  }

  async findAll(): Promise<Researcher[]> {
    // Note: Ordering by Person name requires JOIN
    const rows = await this.context.queryMany<ResearcherRow>(`
      SELECT r.* FROM researchers r
      INNER JOIN persons p ON r.personId = p.id
      ORDER BY p.lastName, p.firstName
    `);
    return ResearcherMapper.fromRows(rows);
  }

  async save(researcher: Researcher): Promise<void> {
    const row = ResearcherMapper.toRow(researcher);

    await this.context.execute(`
      INSERT OR REPLACE INTO researchers (
        id, personId, active, createdAt
      ) VALUES (?, ?, ?, ?)
    `, [
      row.id, row.personId, row.active, row.createdAt
    ]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.context.execute('DELETE FROM researchers WHERE id = ?', [id]);
    return result.changes > 0;
  }

  // STATUS-BASED OPERATIONS

  async findActive(): Promise<Researcher[]> {
    return this.findByStatus(true);
  }

  async findInactive(): Promise<Researcher[]> {
    return this.findByStatus(false);
  }

  async isActive(id: string): Promise<boolean> {
    const result = await this.context.queryOne<{ active: number }>(
      'SELECT active FROM researchers WHERE id = ?',
      [id]
    );
    return Boolean(result?.active);
  }

  async findByStatus(isActive: boolean): Promise<Researcher[]> {
    // Note: Ordering by Person name requires JOIN
    const rows = await this.context.queryMany<ResearcherRow>(`
      SELECT r.* FROM researchers r
      INNER JOIN persons p ON r.personId = p.id
      WHERE r.active = ?
      ORDER BY p.lastName, p.firstName
    `, [isActive ? 1 : 0]);
    return ResearcherMapper.fromRows(rows);
  }

  async updateStatus(id: string, isActive: boolean): Promise<boolean> {
    const result = await this.context.execute(
      'UPDATE researchers SET active = ? WHERE id = ?',
      [isActive ? 1 : 0, id]
    );
    return result.changes > 0;
  }

  async updateStatusForMany(ids: string[], isActive: boolean): Promise<number> {
    if (ids.length === 0) return 0;
    
    const result = await this.context.execute(
      `UPDATE researchers SET active = ? WHERE id IN (${ids.map(() => '?').join(',')})`,
      [isActive ? 1 : 0, ...ids]
    );
    return result.changes;
  }

  // QUERY OPERATIONS

  async nameExists(firstName: string, lastName: string): Promise<boolean> {
    const result = await this.context.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM researchers WHERE firstName = ? AND lastName = ?',
      [firstName, lastName]
    );
    return (result?.count || 0) > 0;
  }

  async searchByName(namePattern: string): Promise<Researcher[]> {
    // Note: Names are in Person entity, need to JOIN
    const rows = await this.context.queryMany<ResearcherRow>(`
      SELECT r.* FROM researchers r
      INNER JOIN persons p ON r.personId = p.id
      WHERE p.firstName LIKE ? OR p.lastName LIKE ?
      ORDER BY p.lastName, p.firstName
    `, [`%${namePattern}%`, `%${namePattern}%`]);
    return ResearcherMapper.fromRows(rows);
  }

  async findSimilarNames(firstName: string, lastName: string): Promise<Researcher[]> {
    // Names are now in Person entity, need to JOIN
    const rows = await this.context.queryMany<ResearcherRow>(
      `SELECT r.* FROM researchers r
       INNER JOIN persons p ON r.personId = p.id
       WHERE (p.firstName LIKE ? OR p.lastName LIKE ?)
       AND NOT (p.firstName = ? AND p.lastName = ?)
       ORDER BY p.lastName, p.firstName`,
      [`%${firstName}%`, `%${lastName}%`, firstName, lastName]
    );
    return ResearcherMapper.fromRows(rows);
  }

  async search(criteria: ResearcherSearchCriteria): Promise<Researcher[]> {
    const conditions: string[] = [];
    const params: any[] = [];

    // Name criteria
    if (criteria.name) {
      // Legacy support: search in both firstName and lastName
      conditions.push('(firstName LIKE ? OR lastName LIKE ?)');
      params.push(`%${criteria.name}%`, `%${criteria.name}%`);
    }
    if (criteria.namePattern) {
      conditions.push('(firstName LIKE ? OR lastName LIKE ?)');
      params.push(`%${criteria.namePattern}%`, `%${criteria.namePattern}%`);
    }

    // Status criteria
    if (criteria.isActive !== undefined) {
      conditions.push('active = ?');
      params.push(criteria.isActive ? 1 : 0);
    }

    // Date criteria
    if (criteria.createdAfter) {
      conditions.push('createdAt >= ?');
      params.push(SqliteDateMapper.toDbDateTime(criteria.createdAfter));
    }
    if (criteria.createdBefore) {
      conditions.push('createdAt <= ?');
      params.push(SqliteDateMapper.toDbDateTime(criteria.createdBefore));
    }

    // Integration criteria
    if (criteria.hasTubes !== undefined) {
      if (criteria.hasTubes) {
        conditions.push('EXISTS (SELECT 1 FROM tubes WHERE researcherId = r.id)');
      } else {
        conditions.push('NOT EXISTS (SELECT 1 FROM tubes WHERE researcherId = r.id)');
      }
    }

    // Build query
    let query = 'SELECT * FROM researchers r';
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add sorting
    const sortBy = criteria.sortBy || 'lastName';
    const sortOrder = criteria.sortOrder || 'asc';
    query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
    if (sortBy !== 'firstName') {
      query += `, firstName ${sortOrder.toUpperCase()}`; // Secondary sort by firstName
    }

    // Add pagination
    if (criteria.limit) {
      query += ` LIMIT ${criteria.limit}`;
      if (criteria.offset) {
        query += ` OFFSET ${criteria.offset}`;
      }
    }

    const rows = await this.context.queryMany<ResearcherRow>(query, params);
    return ResearcherMapper.fromRows(rows);
  }

  async count(): Promise<number> {
    const result = await this.context.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM researchers'
    );
    return result?.count || 0;
  }

  async findByCreationDateRange(startDate: Date, endDate: Date): Promise<Researcher[]> {
    const rows = await this.context.queryMany<ResearcherRow>(
      'SELECT * FROM researchers WHERE createdAt >= ? AND createdAt <= ? ORDER BY createdAt',
      [SqliteDateMapper.toDbDateTime(startDate), SqliteDateMapper.toDbDateTime(endDate)]
    );
    return ResearcherMapper.fromRows(rows);
  }

  async findAllSortedByName(ascending: boolean = true): Promise<Researcher[]> {
    const order = ascending ? 'ASC' : 'DESC';
    const rows = await this.context.queryMany<ResearcherRow>(
      `SELECT * FROM researchers ORDER BY lastName ${order}, firstName ${order}`
    );
    return ResearcherMapper.fromRows(rows);
  }

  async countByStatus(isActive: boolean): Promise<number> {
    const result = await this.context.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM researchers WHERE active = ?',
      [isActive ? 1 : 0]
    );
    return result?.count || 0;
  }

  async getAllNames(): Promise<string[]> {
    const rows = await this.context.queryMany<{ firstName: string; lastName: string }>(
      'SELECT firstName, lastName FROM researchers ORDER BY lastName, firstName'
    );
    return rows.map(row => `${row.firstName} ${row.lastName}`);
  }

  async getActiveNames(): Promise<string[]> {
    const rows = await this.context.queryMany<{ firstName: string; lastName: string }>(
      'SELECT firstName, lastName FROM researchers WHERE active = 1 ORDER BY lastName, firstName'
    );
    return rows.map(row => `${row.firstName} ${row.lastName}`);
  }

  // INTEGRATION QUERIES

  async findWithAssignedTubes(): Promise<Researcher[]> {
    const rows = await this.context.queryMany<ResearcherRow>(
      `SELECT DISTINCT r.* FROM researchers r
       INNER JOIN tubes t ON r.id = t.researcherId
       WHERE r.active = 1
       ORDER BY r.lastName, r.firstName`
    );
    return ResearcherMapper.fromRows(rows);
  }

  async findWithoutTubes(): Promise<Researcher[]> {
    const rows = await this.context.queryMany<ResearcherRow>(
      `SELECT r.* FROM researchers r
       LEFT JOIN tubes t ON r.id = t.researcherId
       WHERE t.researcherId IS NULL AND r.active = 1
       ORDER BY r.lastName, r.firstName`
    );
    return ResearcherMapper.fromRows(rows);
  }

  async getUsageStats(): Promise<ResearcherUsageStats[]> {
    const rows = await this.context.queryMany<{
      id: string;
      firstName: string;
      lastName: string;
      active: number;
      tubeCount: number;
      lastTubeCreated: string | null;
      activeTubes: number;
      expiredTubes: number;
    }>(`
      SELECT
        r.id,
        r.firstName,
        r.lastName,
        r.active,
        COUNT(t.id) as tubeCount,
        MAX(t.createdAt) as lastTubeCreated,
        COUNT(CASE WHEN t.date IS NULL OR DATE(t.date) >= DATE('now') THEN 1 END) as activeTubes,
        COUNT(CASE WHEN t.date IS NOT NULL AND DATE(t.date) < DATE('now') THEN 1 END) as expiredTubes
      FROM researchers r
      LEFT JOIN tubes t ON r.id = t.researcherId
      GROUP BY r.id, r.firstName, r.lastName, r.active
      ORDER BY tubeCount DESC, r.lastName, r.firstName
    `);

    return rows.map(row => ({
      researcherId: row.id,
      researcherName: `${row.firstName} ${row.lastName}`,
      isActive: Boolean(row.active),
      tubeCount: row.tubeCount,
      lastTubeCreated: row.lastTubeCreated ? SqliteDateMapper.fromDbDateTime(row.lastTubeCreated) || undefined : undefined,
      activeTubes: row.activeTubes,
      expiredTubes: row.expiredTubes
    }));
  }

  // VALIDATION OPERATIONS

  async validateName(firstName: string, lastName: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if firstName is empty or whitespace
    if (!firstName || !firstName.trim()) {
      errors.push('First name cannot be empty');
    }

    // Check if lastName is empty or whitespace
    if (!lastName || !lastName.trim()) {
      errors.push('Last name cannot be empty');
    }

    // Check length constraints for firstName
    if (firstName && firstName.length < 1) {
      errors.push('First name must be at least 1 character long');
    }
    if (firstName && firstName.length > 50) {
      errors.push('First name cannot exceed 50 characters');
    }

    // Check length constraints for lastName
    if (lastName && lastName.length < 1) {
      errors.push('Last name must be at least 1 character long');
    }
    if (lastName && lastName.length > 50) {
      errors.push('Last name cannot exceed 50 characters');
    }

    // Check for special characters that might cause issues
    if (firstName && /[<>\"'&]/.test(firstName)) {
      warnings.push('First name contains special characters that might cause display issues');
    }
    if (lastName && /[<>\"'&]/.test(lastName)) {
      warnings.push('Last name contains special characters that might cause display issues');
    }

    // Check if name already exists
    if (firstName && firstName.trim() && lastName && lastName.trim()) {
      const exists = await this.nameExists(firstName.trim(), lastName.trim());
      if (exists) {
        errors.push('A researcher with this name already exists');
      }
    }

    // Check for similar names
    if (firstName && firstName.trim() && lastName && lastName.trim() && errors.length === 0) {
      const similar = await this.findSimilarNames(firstName.trim(), lastName.trim());
      if (similar.length > 0) {
        const names = await Promise.all(
          similar.map(async (r) => {
            const person = await this.personRepository.findById(r.personId);
            return person ? person.fullName : 'Unknown';
          })
        );
        warnings.push(`Similar names found: ${names.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async checkForDuplicates(researchers: Array<{ firstName: string; lastName: string }>): Promise<DuplicateCheckResult[]> {
    const results: DuplicateCheckResult[] = [];

    for (const { firstName, lastName } of researchers) {
      const trimmedFirst = firstName.trim();
      const trimmedLast = lastName.trim();
      const fullName = `${trimmedFirst} ${trimmedLast}`;

      if (!trimmedFirst || !trimmedLast) {
        results.push({
          name: fullName,
          isDuplicate: false,
          similarNames: []
        });
        continue;
      }

      // Check exact match
      const existing = await this.findByName(trimmedFirst, trimmedLast);
      const similarResearchers = await this.findSimilarNames(trimmedFirst, trimmedLast);

      // Get Person data for existing researcher
      let existingPerson: Person | null = null;
      if (existing) {
        existingPerson = await this.personRepository.findById(existing.personId);
      }

      // Get Person data for similar researchers
      const similarNames = await Promise.all(
        similarResearchers.map(async (r) => {
          const person = await this.personRepository.findById(r.personId);
          return person ? person.fullName : 'Unknown';
        })
      );

      results.push({
        name: fullName,
        isDuplicate: Boolean(existing),
        existingResearcher: existing && existingPerson ? {
          id: existing.id,
          name: existingPerson.fullName,
          isActive: existing.active
        } : undefined,
        similarNames
      });
    }

    return results;
  }



  // BULK OPERATIONS

  async saveMany(researchers: Researcher[]): Promise<void> {
    await this.context.transaction(async () => {
      for (const researcher of researchers) {
        // Fetch Person entity for this researcher
        const person = await this.personRepository.findById(researcher.personId);
        if (!person) {
          throw new Error(`Person not found for researcher: ${researcher.personId}`);
        }

        // Save Person entity first
        await this.personRepository.save(person);

        // Save Researcher entity
        const row = ResearcherMapper.toRow(researcher);
        await this.context.execute(`
          INSERT OR REPLACE INTO researchers (
            id, personId, active, createdAt
          ) VALUES (?, ?, ?, ?)
        `, [
          row.id, row.personId, row.active, row.createdAt
        ]);
      }
    });
  }

  async deleteMany(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    
    const result = await this.context.execute(
      `DELETE FROM researchers WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
    return result.changes;
  }



  async createFromNames(researchers: Array<{ firstName: string; lastName: string; position?: string; department?: string; email?: string }>): Promise<Researcher[]> {
    const createdResearchers: Researcher[] = [];

    await this.context.transaction(async () => {
      for (const data of researchers) {
        if (!data.firstName.trim() || !data.lastName.trim()) continue;

        // Create Person entity (single source of truth for profile data)
        const person = Person.create(
          data.firstName.trim(),
          data.lastName.trim(),
          data.email || '',  // Email required
          data.position,
          data.department
        );

        // Create Researcher entity (links to Person)
        const researcher = Researcher.create(person.id);

        // Save Person first
        await this.personRepository.save(person);

        // Save Researcher
        const row = ResearcherMapper.toRow(researcher);
        await this.context.execute(`
          INSERT OR IGNORE INTO researchers (
            id, personId, active, createdAt
          ) VALUES (?, ?, ?, ?)
        `, [
          row.id, row.personId, row.active, row.createdAt
        ]);

        createdResearchers.push(researcher);
      }
    });

    return createdResearchers;
  }

  async updateMany(updates: Array<{ id: string; firstName?: string; lastName?: string; position?: string; department?: string; email?: string; active?: boolean }>): Promise<number> {
    if (updates.length === 0) return 0;

    let totalUpdated = 0;

    await this.context.transaction(async () => {
      for (const update of updates) {
        // Fetch Researcher
        const researcher = await this.findById(update.id);
        if (!researcher) continue;

        // Fetch Person
        const person = await this.personRepository.findById(researcher.personId);
        if (!person) continue;

        let personUpdated = false;
        let researcherUpdated = false;

        // Update Person for profile fields
        if (update.firstName !== undefined || update.lastName !== undefined ||
            update.position !== undefined || update.department !== undefined) {
          person.updateProfile(
            update.firstName ?? person.firstName,
            update.lastName ?? person.lastName,
            update.position ?? person.position,
            update.department ?? person.department
          );
          personUpdated = true;
        }

        // Update email separately if provided
        if (update.email !== undefined) {
          person.updateEmail(update.email);
          personUpdated = true;
        }

        // Save Person if modified
        if (personUpdated) {
          await this.personRepository.save(person);
        }

        // Update Researcher for active status
        if (update.active !== undefined) {
          if (update.active && !researcher.active) {
            researcher.activate();
            researcherUpdated = true;
          } else if (!update.active && researcher.active) {
            researcher.deactivate();
            researcherUpdated = true;
          }
        }

        // Save Researcher if modified
        if (researcherUpdated) {
          const row = ResearcherMapper.toRow(researcher);
          await this.context.execute(
            `UPDATE researchers SET active = ? WHERE id = ?`,
            [row.active, row.id]
          );
        }

        if (personUpdated || researcherUpdated) {
          totalUpdated++;
        }
      }
    });

    return totalUpdated;
  }

  // MAINTENANCE OPERATIONS

  async isHealthy(): Promise<boolean> {
    return this.context.isHealthy();
  }

  async cleanupInactive(daysSinceCreation: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceCreation);
    
    const result = await this.context.execute(
      'DELETE FROM researchers WHERE active = 0 AND createdAt < ?',
      [SqliteDateMapper.toDbDateTime(cutoffDate)]
    );
    return result.changes;
  }

  async getStats(): Promise<ResearcherRepositoryStats> {
    // Get basic counts
    const totalResearchers = await this.count();
    const activeResearchers = await this.countActive();
    const inactiveResearchers = await this.countInactive();

    // Get researchers with and without tubes
    const researchersWithTubes = await this.findWithAssignedTubes();
    const researchersWithoutTubes = await this.findWithoutTubes();

    // Get most active researchers
    const mostActiveResearchers = await this.getMostActiveResearchers(5);
    
    // Calculate average tubes per researcher
    const totalTubesResult = await this.context.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM tubes WHERE researcherId IS NOT NULL'
    );
    const totalTubes = totalTubesResult?.count || 0;
    const averageTubesPerResearcher = researchersWithTubes.length > 0 ? totalTubes / researchersWithTubes.length : 0;

    // Get oldest and newest researchers (JOIN with persons for names)
    const oldestResearcherRow = await this.context.queryOne<{ id: string; firstName: string; lastName: string; createdAt: string }>(
      `SELECT r.id, p.firstName, p.lastName, r.createdAt
       FROM researchers r
       INNER JOIN persons p ON r.personId = p.id
       ORDER BY r.createdAt ASC LIMIT 1`
    );
    const newestResearcherRow = await this.context.queryOne<{ id: string; firstName: string; lastName: string; createdAt: string }>(
      `SELECT r.id, p.firstName, p.lastName, r.createdAt
       FROM researchers r
       INNER JOIN persons p ON r.personId = p.id
       ORDER BY r.createdAt DESC LIMIT 1`
    );

    // Get most productive researcher Person data
    let mostProductiveName: string | undefined;
    if (mostActiveResearchers[0]?.researcher) {
      const person = await this.personRepository.findById(mostActiveResearchers[0].researcher.personId);
      mostProductiveName = person ? person.fullName : 'Unknown';
    }

    return {
      totalResearchers,
      activeResearchers,
      inactiveResearchers,
      researchersWithTubes: researchersWithTubes.length,
      researchersWithoutTubes: researchersWithoutTubes.length,
      averageTubesPerResearcher,
      mostProductiveResearcher: mostActiveResearchers[0]?.researcher && mostProductiveName ? {
        id: mostActiveResearchers[0].researcher.id,
        name: mostProductiveName,
        tubeCount: mostActiveResearchers[0].tubeCount
      } : undefined,
      oldestResearcher: oldestResearcherRow ? {
        id: oldestResearcherRow.id,
        name: `${oldestResearcherRow.firstName} ${oldestResearcherRow.lastName}`,
        createdAt: SqliteDateMapper.fromDbDateTime(oldestResearcherRow.createdAt)!
      } : undefined,
      newestResearcher: newestResearcherRow ? {
        id: newestResearcherRow.id,
        name: `${newestResearcherRow.firstName} ${newestResearcherRow.lastName}`,
        createdAt: SqliteDateMapper.fromDbDateTime(newestResearcherRow.createdAt)!
      } : undefined
    };
  }

  // BACKWARD COMPATIBILITY METHODS

  async findWithTubes(): Promise<Researcher[]> {
    return this.findWithAssignedTubes();
  }

  async countActive(): Promise<number> {
    return this.countByStatus(true);
  }

  async countInactive(): Promise<number> {
    return this.countByStatus(false);
  }

  async activate(id: string): Promise<boolean> {
    return this.updateStatus(id, true);
  }

  async deactivate(id: string): Promise<boolean> {
    return this.updateStatus(id, false);
  }

  async activateMany(ids: string[]): Promise<number> {
    return this.updateStatusForMany(ids, true);
  }

  async deactivateMany(ids: string[]): Promise<number> {
    return this.updateStatusForMany(ids, false);
  }

  async getMostActiveResearchers(limit: number = 10): Promise<Array<{ researcher: Researcher, tubeCount: number }>> {
    const rows = await this.context.queryMany<{ researcherId: string; tubeCount: number }>(
      `SELECT t.researcherId, COUNT(*) as tubeCount
       FROM tubes t
       INNER JOIN researchers r ON t.researcherId = r.id
       WHERE r.active = 1
       GROUP BY t.researcherId
       ORDER BY tubeCount DESC
       LIMIT ?`,
      [limit]
    );

    const results = [];
    for (const row of rows) {
      const researcher = await this.findById(row.researcherId);
      if (researcher) {
        results.push({ researcher, tubeCount: row.tubeCount });
      }
    }
    return results;
  }

  async getTubeCountByResearcher(researcherId: string): Promise<number> {
    const result = await this.context.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM tubes WHERE researcherId = ?',
      [researcherId]
    );
    return result?.count || 0;
  }
}
