import {
  ResearcherRepository as IResearcherRepository,
  ResearcherValidationResult,
  DuplicateCheckResult
} from '@domain/repositories/ResearcherRepository';
import type {
  ResearcherRepositoryStats,
  ResearcherSearchCriteria,
  ResearcherUsageStats
} from '@domain/types/repository';
import { Researcher } from '@domain/entities/Researcher';
import { Person } from '@domain/entities/Person';
import { PersonRepository } from '@domain/repositories/PersonRepository';
import { PostgresContext } from '@infrastructure/database/PostgresContext';
import { ResearcherMapper, ResearcherRow } from '@infrastructure/database/mappers/ResearcherMapper';

/**
 * Explicit column list for researchers table queries
 */
const RESEARCHER_COLUMNS = 'id, person_id, active, created_at, approval_status, source, lab_id';

/**
 * ResearcherRepository - Researcher data access
 *
 * Researcher entity links to Person entity for profile data (firstName, lastName, email, etc.)
 * Many methods JOIN with persons table for name-based operations.
 */
export class ResearcherRepository implements IResearcherRepository {

  constructor(
    private context: PostgresContext,
    private personRepository: PersonRepository
  ) {}

  // BASIC CRUD OPERATIONS

  async findById(id: string): Promise<Researcher | null> {
    const row = await this.context.queryOne<ResearcherRow>(
      `SELECT ${RESEARCHER_COLUMNS} FROM researchers WHERE id = $1`,
      [id]
    );
    return row ? ResearcherMapper.fromRow(row) : null;
  }

  async findByName(firstName: string, lastName: string): Promise<Researcher | null> {
    const row = await this.context.queryOne<ResearcherRow>(`
      SELECT r.id, r.person_id, r.active, r.created_at, r.approval_status, r.source, r.lab_id FROM researchers r
      INNER JOIN persons p ON r.person_id = p.id
      WHERE p.first_name = $1 AND p.last_name = $2
    `, [firstName, lastName]);
    return row ? ResearcherMapper.fromRow(row) : null;
  }

  async findByPersonId(personId: string): Promise<Researcher | null> {
    const row = await this.context.queryOne<ResearcherRow>(
      `SELECT ${RESEARCHER_COLUMNS} FROM researchers WHERE person_id = $1`,
      [personId]
    );
    return row ? ResearcherMapper.fromRow(row) : null;
  }

  async findAll(): Promise<Researcher[]> {
    const rows = await this.context.queryMany<ResearcherRow>(`
      SELECT r.id, r.person_id, r.active, r.created_at, r.approval_status, r.source, r.lab_id FROM researchers r
      INNER JOIN persons p ON r.person_id = p.id
      ORDER BY p.last_name, p.first_name
    `);
    return ResearcherMapper.fromRows(rows);
  }

  async findByLabId(labId: string): Promise<Researcher[]> {
    const rows = await this.context.queryMany<ResearcherRow>(`
      SELECT r.id, r.person_id, r.active, r.created_at, r.approval_status, r.source, r.lab_id FROM researchers r
      INNER JOIN persons p ON r.person_id = p.id
      WHERE r.lab_id = $1
      ORDER BY p.last_name, p.first_name
    `, [labId]);
    return ResearcherMapper.fromRows(rows);
  }

  async findActiveByLabId(labId: string): Promise<Researcher[]> {
    const rows = await this.context.queryMany<ResearcherRow>(`
      SELECT r.id, r.person_id, r.active, r.created_at, r.approval_status, r.source, r.lab_id FROM researchers r
      INNER JOIN persons p ON r.person_id = p.id
      WHERE r.lab_id = $1 AND r.active = TRUE
      ORDER BY p.last_name, p.first_name
    `, [labId]);
    return ResearcherMapper.fromRows(rows);
  }

  async findByIds(ids: string[]): Promise<Researcher[]> {
    const rows = await this.context.queryByIds<ResearcherRow>('researchers', RESEARCHER_COLUMNS, ids);
    return ResearcherMapper.fromRows(rows);
  }

  async save(researcher: Researcher): Promise<void> {
    const row = ResearcherMapper.toRow(researcher);

    await this.context.execute(`
      INSERT INTO researchers (id, person_id, active, created_at, approval_status, source, lab_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        person_id = EXCLUDED.person_id,
        active = EXCLUDED.active,
        created_at = EXCLUDED.created_at,
        approval_status = EXCLUDED.approval_status,
        source = EXCLUDED.source,
        lab_id = EXCLUDED.lab_id
    `, [row.id, row.person_id, row.active, row.created_at, row.approval_status, row.source, row.lab_id]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.context.execute('DELETE FROM researchers WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // STATUS-BASED OPERATIONS

  async findActive(): Promise<Researcher[]> {
    return this.findByStatus(true);
  }

  async findInactive(): Promise<Researcher[]> {
    return this.findByStatus(false);
  }

  async isActive(id: string): Promise<boolean> {
    const result = await this.context.queryOne<{ active: boolean }>(
      'SELECT active FROM researchers WHERE id = $1',
      [id]
    );
    return result?.active ?? false;
  }

  async findByStatus(isActive: boolean): Promise<Researcher[]> {
    const rows = await this.context.queryMany<ResearcherRow>(`
      SELECT r.id, r.person_id, r.active, r.created_at, r.approval_status, r.source, r.lab_id FROM researchers r
      INNER JOIN persons p ON r.person_id = p.id
      WHERE r.active = $1
      ORDER BY p.last_name, p.first_name
    `, [isActive]);
    return ResearcherMapper.fromRows(rows);
  }

  async findApprovedAndActive(): Promise<Researcher[]> {
    const rows = await this.context.queryMany<ResearcherRow>(`
      SELECT r.id, r.person_id, r.active, r.created_at, r.approval_status, r.source, r.lab_id FROM researchers r
      INNER JOIN persons p ON r.person_id = p.id
      WHERE r.active = TRUE AND r.approval_status = 'approved'
      ORDER BY p.last_name, p.first_name
    `);
    return ResearcherMapper.fromRows(rows);
  }

  async updateStatus(id: string, isActive: boolean): Promise<boolean> {
    const result = await this.context.execute(
      'UPDATE researchers SET active = $1 WHERE id = $2',
      [isActive, id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async updateStatusForMany(ids: string[], isActive: boolean): Promise<number> {
    if (ids.length === 0) return 0;

    const placeholders = ids.map((_, i) => `$${i + 2}`).join(',');
    const result = await this.context.execute(
      `UPDATE researchers SET active = $1 WHERE id IN (${placeholders})`,
      [isActive, ...ids]
    );
    return result.rowCount ?? 0;
  }

  // QUERY OPERATIONS

  async nameExists(firstName: string, lastName: string): Promise<boolean> {
    const result = await this.context.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM researchers r
       INNER JOIN persons p ON r.person_id = p.id
       WHERE p.first_name = $1 AND p.last_name = $2`,
      [firstName, lastName]
    );
    return parseInt(result?.count || '0', 10) > 0;
  }

  async searchByName(namePattern: string): Promise<Researcher[]> {
    const rows = await this.context.queryMany<ResearcherRow>(`
      SELECT r.id, r.person_id, r.active, r.created_at, r.approval_status, r.source, r.lab_id FROM researchers r
      INNER JOIN persons p ON r.person_id = p.id
      WHERE p.first_name ILIKE $1 OR p.last_name ILIKE $1
      ORDER BY p.last_name, p.first_name
    `, [`%${namePattern}%`]);
    return ResearcherMapper.fromRows(rows);
  }

  async findSimilarNames(firstName: string, lastName: string): Promise<Researcher[]> {
    const rows = await this.context.queryMany<ResearcherRow>(
      `SELECT r.id, r.person_id, r.active, r.created_at, r.approval_status, r.source, r.lab_id FROM researchers r
       INNER JOIN persons p ON r.person_id = p.id
       WHERE (p.first_name ILIKE $1 OR p.last_name ILIKE $2)
       AND NOT (p.first_name = $3 AND p.last_name = $4)
       ORDER BY p.last_name, p.first_name`,
      [`%${firstName}%`, `%${lastName}%`, firstName, lastName]
    );
    return ResearcherMapper.fromRows(rows);
  }

  async search(criteria: ResearcherSearchCriteria): Promise<Researcher[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Name criteria - names are in persons table, need JOIN
    if (criteria.name) {
      conditions.push(`(p.first_name ILIKE $${paramIndex} OR p.last_name ILIKE $${paramIndex})`);
      params.push(`%${criteria.name}%`);
      paramIndex++;
    }
    if (criteria.namePattern) {
      conditions.push(`(p.first_name ILIKE $${paramIndex} OR p.last_name ILIKE $${paramIndex})`);
      params.push(`%${criteria.namePattern}%`);
      paramIndex++;
    }

    // Status criteria
    if (criteria.isActive !== undefined) {
      conditions.push(`r.active = $${paramIndex++}`);
      params.push(criteria.isActive);
    }

    // Date criteria
    if (criteria.createdAfter) {
      conditions.push(`r.created_at >= $${paramIndex++}`);
      params.push(criteria.createdAfter);
    }
    if (criteria.createdBefore) {
      conditions.push(`r.created_at <= $${paramIndex++}`);
      params.push(criteria.createdBefore);
    }

    // Integration criteria
    if (criteria.hasTubes !== undefined) {
      if (criteria.hasTubes) {
        conditions.push('EXISTS (SELECT 1 FROM tubes WHERE researcher_id = r.id)');
      } else {
        conditions.push('NOT EXISTS (SELECT 1 FROM tubes WHERE researcher_id = r.id)');
      }
    }

    // Build query with JOIN for name sorting
    let query = `SELECT r.id, r.person_id, r.active, r.created_at, r.approval_status, r.source, r.lab_id FROM researchers r
                 INNER JOIN persons p ON r.person_id = p.id`;
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add sorting - map to actual column names
    const sortColumn = this.mapSortColumn(criteria.sortBy || 'lastName');
    const sortOrder = (criteria.sortOrder || 'asc').toUpperCase();
    query += ` ORDER BY ${sortColumn} ${sortOrder}`;
    if (criteria.sortBy !== 'firstName') {
      query += `, p.first_name ${sortOrder}`;
    }

    // Add pagination
    if (criteria.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(criteria.limit);
      if (criteria.offset) {
        query += ` OFFSET $${paramIndex++}`;
        params.push(criteria.offset);
      }
    }

    const rows = await this.context.queryMany<ResearcherRow>(query, params);
    return ResearcherMapper.fromRows(rows);
  }

  private mapSortColumn(sortBy: string): string {
    const columnMap: Record<string, string> = {
      'firstName': 'p.first_name',
      'lastName': 'p.last_name',
      'createdAt': 'r.created_at'
    };
    return columnMap[sortBy] || 'p.last_name';
  }

  async count(): Promise<number> {
    const result = await this.context.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM researchers'
    );
    return parseInt(result?.count || '0', 10);
  }

  async findByCreationDateRange(startDate: Date, endDate: Date): Promise<Researcher[]> {
    const rows = await this.context.queryMany<ResearcherRow>(
      `SELECT ${RESEARCHER_COLUMNS} FROM researchers WHERE created_at >= $1 AND created_at <= $2 ORDER BY created_at`,
      [startDate, endDate]
    );
    return ResearcherMapper.fromRows(rows);
  }

  async findAllSortedByName(ascending: boolean = true): Promise<Researcher[]> {
    const order = ascending ? 'ASC' : 'DESC';
    const rows = await this.context.queryMany<ResearcherRow>(
      `SELECT r.id, r.person_id, r.active, r.created_at, r.approval_status, r.source, r.lab_id FROM researchers r
       INNER JOIN persons p ON r.person_id = p.id
       ORDER BY p.last_name ${order}, p.first_name ${order}`
    );
    return ResearcherMapper.fromRows(rows);
  }

  async countByStatus(isActive: boolean): Promise<number> {
    const result = await this.context.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM researchers WHERE active = $1',
      [isActive]
    );
    return parseInt(result?.count || '0', 10);
  }

  async getAllNames(): Promise<string[]> {
    const rows = await this.context.queryMany<{ first_name: string; last_name: string }>(
      `SELECT p.first_name, p.last_name FROM researchers r
       INNER JOIN persons p ON r.person_id = p.id
       ORDER BY p.last_name, p.first_name`
    );
    return rows.map(row => `${row.first_name} ${row.last_name}`);
  }

  async getActiveNames(): Promise<string[]> {
    const rows = await this.context.queryMany<{ first_name: string; last_name: string }>(
      `SELECT p.first_name, p.last_name FROM researchers r
       INNER JOIN persons p ON r.person_id = p.id
       WHERE r.active = TRUE
       ORDER BY p.last_name, p.first_name`
    );
    return rows.map(row => `${row.first_name} ${row.last_name}`);
  }

  // INTEGRATION QUERIES

  async findWithAssignedTubes(): Promise<Researcher[]> {
    const rows = await this.context.queryMany<ResearcherRow>(
      `SELECT DISTINCT r.id, r.person_id, r.active, r.created_at, r.approval_status, r.source, r.lab_id FROM researchers r
       INNER JOIN persons p ON r.person_id = p.id
       INNER JOIN tubes t ON r.id = t.researcher_id
       WHERE r.active = TRUE
       ORDER BY p.last_name, p.first_name`
    );
    return ResearcherMapper.fromRows(rows);
  }

  async findWithoutTubes(): Promise<Researcher[]> {
    const rows = await this.context.queryMany<ResearcherRow>(
      `SELECT r.id, r.person_id, r.active, r.created_at, r.approval_status, r.source, r.lab_id FROM researchers r
       INNER JOIN persons p ON r.person_id = p.id
       LEFT JOIN tubes t ON r.id = t.researcher_id
       WHERE t.researcher_id IS NULL AND r.active = TRUE
       ORDER BY p.last_name, p.first_name`
    );
    return ResearcherMapper.fromRows(rows);
  }

  async getUsageStats(): Promise<ResearcherUsageStats[]> {
    const rows = await this.context.queryMany<{
      id: string;
      first_name: string;
      last_name: string;
      active: boolean;
      tube_count: string;
      last_tube_created: Date | string | null;
      active_tubes: string;
      expired_tubes: string;
    }>(`
      SELECT
        r.id,
        p.first_name,
        p.last_name,
        r.active,
        COUNT(t.id)::text as tube_count,
        MAX(t.created_at) as last_tube_created,
        COUNT(CASE WHEN t.date IS NULL OR t.date::date >= CURRENT_DATE THEN 1 END)::text as active_tubes,
        COUNT(CASE WHEN t.date IS NOT NULL AND t.date::date < CURRENT_DATE THEN 1 END)::text as expired_tubes
      FROM researchers r
      INNER JOIN persons p ON r.person_id = p.id
      LEFT JOIN tubes t ON r.id = t.researcher_id
      GROUP BY r.id, p.first_name, p.last_name, r.active
      ORDER BY COUNT(t.id) DESC, p.last_name, p.first_name
    `);

    return rows.map(row => ({
      researcherId: row.id,
      researcherName: `${row.first_name} ${row.last_name}`,
      isActive: row.active,
      tubeCount: parseInt(row.tube_count, 10),
      lastTubeCreated: row.last_tube_created
        ? (row.last_tube_created instanceof Date ? row.last_tube_created : new Date(row.last_tube_created))
        : undefined,
      activeTubes: parseInt(row.active_tubes, 10),
      expiredTubes: parseInt(row.expired_tubes, 10)
    }));
  }

  // VALIDATION OPERATIONS

  async validateName(firstName: string, lastName: string): Promise<ResearcherValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!firstName || !firstName.trim()) {
      errors.push('First name cannot be empty');
    }

    if (!lastName || !lastName.trim()) {
      errors.push('Last name cannot be empty');
    }

    if (firstName && firstName.length < 1) {
      errors.push('First name must be at least 1 character long');
    }
    if (firstName && firstName.length > 50) {
      errors.push('First name cannot exceed 50 characters');
    }

    if (lastName && lastName.length < 1) {
      errors.push('Last name must be at least 1 character long');
    }
    if (lastName && lastName.length > 50) {
      errors.push('Last name cannot exceed 50 characters');
    }

    if (firstName && /[<>"'&]/.test(firstName)) {
      warnings.push('First name contains special characters that might cause display issues');
    }
    if (lastName && /[<>"'&]/.test(lastName)) {
      warnings.push('Last name contains special characters that might cause display issues');
    }

    if (firstName && firstName.trim() && lastName && lastName.trim()) {
      const exists = await this.nameExists(firstName.trim(), lastName.trim());
      if (exists) {
        errors.push('A researcher with this name already exists');
      }
    }

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

      const existing = await this.findByName(trimmedFirst, trimmedLast);
      const similarResearchers = await this.findSimilarNames(trimmedFirst, trimmedLast);

      let existingPerson: Person | null = null;
      if (existing) {
        existingPerson = await this.personRepository.findById(existing.personId);
      }

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
    for (const researcher of researchers) {
      const person = await this.personRepository.findById(researcher.personId);
      if (!person) {
        throw new Error(`Person not found for researcher: ${researcher.personId}`);
      }

      await this.personRepository.save(person);

      const row = ResearcherMapper.toRow(researcher);
      await this.context.execute(`
        INSERT INTO researchers (id, person_id, active, created_at, approval_status, source, lab_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          person_id = EXCLUDED.person_id,
          active = EXCLUDED.active,
          created_at = EXCLUDED.created_at,
          approval_status = EXCLUDED.approval_status,
          source = EXCLUDED.source,
          lab_id = EXCLUDED.lab_id
      `, [row.id, row.person_id, row.active, row.created_at, row.approval_status, row.source, row.lab_id]);
    }
  }

  async deleteMany(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const result = await this.context.execute(
      `DELETE FROM researchers WHERE id IN (${placeholders})`,
      ids
    );
    return result.rowCount ?? 0;
  }

  async createFromNames(researchers: Array<{ firstName: string; lastName: string; position?: string; department?: string; email?: string }>): Promise<Researcher[]> {
    const createdResearchers: Researcher[] = [];

    for (const data of researchers) {
      if (!data.firstName.trim() || !data.lastName.trim()) continue;

      const person = Person.create(
        data.firstName.trim(),
        data.lastName.trim(),
        data.email || '',
        data.position,
        data.department
      );

      const researcher = Researcher.create(person.id);

      await this.personRepository.save(person);

      const row = ResearcherMapper.toRow(researcher);
      await this.context.execute(`
        INSERT INTO researchers (id, person_id, active, created_at, approval_status, source, lab_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING
      `, [row.id, row.person_id, row.active, row.created_at, row.approval_status, row.source, row.lab_id]);

      createdResearchers.push(researcher);
    }

    return createdResearchers;
  }

  async updateMany(updates: Array<{ id: string; firstName?: string; lastName?: string; position?: string; department?: string; email?: string; active?: boolean }>): Promise<number> {
    if (updates.length === 0) return 0;

    let totalUpdated = 0;

    for (const update of updates) {
      const researcher = await this.findById(update.id);
      if (!researcher) continue;

      const person = await this.personRepository.findById(researcher.personId);
      if (!person) continue;

      let personUpdated = false;
      let researcherUpdated = false;

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

      if (update.email !== undefined) {
        person.updateEmail(update.email);
        personUpdated = true;
      }

      if (personUpdated) {
        await this.personRepository.save(person);
      }

      if (update.active !== undefined) {
        if (update.active && !researcher.active) {
          researcher.activate();
          researcherUpdated = true;
        } else if (!update.active && researcher.active) {
          researcher.deactivate();
          researcherUpdated = true;
        }
      }

      if (researcherUpdated) {
        const row = ResearcherMapper.toRow(researcher);
        await this.context.execute(
          'UPDATE researchers SET active = $1 WHERE id = $2',
          [row.active, row.id]
        );
      }

      if (personUpdated || researcherUpdated) {
        totalUpdated++;
      }
    }

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
      'DELETE FROM researchers WHERE active = FALSE AND created_at < $1',
      [cutoffDate]
    );
    return result.rowCount ?? 0;
  }

  async getStats(): Promise<ResearcherRepositoryStats> {
    const totalResearchers = await this.count();
    const activeResearchers = await this.countByStatus(true);
    const inactiveResearchers = await this.countByStatus(false);

    const researchersWithTubes = await this.findWithAssignedTubes();
    const researchersWithoutTubes = await this.findWithoutTubes();

    const mostActiveResearchers = await this.getMostActiveResearchers(5);

    const totalTubesResult = await this.context.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM tubes WHERE researcher_id IS NOT NULL'
    );
    const totalTubes = parseInt(totalTubesResult?.count || '0', 10);
    const averageTubesPerResearcher = researchersWithTubes.length > 0 ? totalTubes / researchersWithTubes.length : 0;

    const oldestResearcherRow = await this.context.queryOne<{ id: string; first_name: string; last_name: string; created_at: Date | string }>(
      `SELECT r.id, p.first_name, p.last_name, r.created_at
       FROM researchers r
       INNER JOIN persons p ON r.person_id = p.id
       ORDER BY r.created_at ASC LIMIT 1`
    );
    const newestResearcherRow = await this.context.queryOne<{ id: string; first_name: string; last_name: string; created_at: Date | string }>(
      `SELECT r.id, p.first_name, p.last_name, r.created_at
       FROM researchers r
       INNER JOIN persons p ON r.person_id = p.id
       ORDER BY r.created_at DESC LIMIT 1`
    );

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
        name: `${oldestResearcherRow.first_name} ${oldestResearcherRow.last_name}`,
        createdAt: oldestResearcherRow.created_at instanceof Date
          ? oldestResearcherRow.created_at
          : new Date(oldestResearcherRow.created_at)
      } : undefined,
      newestResearcher: newestResearcherRow ? {
        id: newestResearcherRow.id,
        name: `${newestResearcherRow.first_name} ${newestResearcherRow.last_name}`,
        createdAt: newestResearcherRow.created_at instanceof Date
          ? newestResearcherRow.created_at
          : new Date(newestResearcherRow.created_at)
      } : undefined
    };
  }

  async getMostActiveResearchers(limit: number = 10): Promise<Array<{ researcher: Researcher, tubeCount: number }>> {
    const rows = await this.context.queryMany<{ researcher_id: string; tube_count: string }>(
      `SELECT t.researcher_id, COUNT(*)::text as tube_count
       FROM tubes t
       INNER JOIN researchers r ON t.researcher_id = r.id
       WHERE r.active = TRUE
       GROUP BY t.researcher_id
       ORDER BY COUNT(*) DESC
       LIMIT $1`,
      [limit]
    );

    const results = [];
    for (const row of rows) {
      const researcher = await this.findById(row.researcher_id);
      if (researcher) {
        results.push({ researcher, tubeCount: parseInt(row.tube_count, 10) });
      }
    }
    return results;
  }

  async getTubeCountByResearcher(researcherId: string): Promise<number> {
    const result = await this.context.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM tubes WHERE researcher_id = $1',
      [researcherId]
    );
    return parseInt(result?.count || '0', 10);
  }

  async getTubeCountsByResearcherIds(researcherIds: string[]): Promise<Map<string, number>> {
    if (researcherIds.length === 0) return new Map();

    const placeholders = researcherIds.map((_, i) => `$${i + 1}`).join(', ');
    const rows = await this.context.queryMany<{ researcher_id: string; count: string }>(
      `SELECT researcher_id, COUNT(*) as count FROM tubes WHERE researcher_id IN (${placeholders}) GROUP BY researcher_id`,
      researcherIds
    );

    return new Map(rows.map(r => [r.researcher_id, parseInt(r.count, 10)]));
  }
}
