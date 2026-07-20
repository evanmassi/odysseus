/**
 * Researcher Repository
 *
 * Data access for researcher records. JOIN queries use persons table for name-based operations.
 */

import type { Researcher } from '@domain/entities/Researcher';
import type { ResearcherRepository as IResearcherRepository } from '@domain/repositories/ResearcherRepository';
import type { ResearcherRow } from '@infrastructure/database/mappers/ResearcherMapper';
import { ResearcherMapper } from '@infrastructure/database/mappers/ResearcherMapper';
import { parseCount } from '@infrastructure/database/PostgresContext';
import type { Queryable } from '@infrastructure/database/Queryable';

const RESEARCHER_COLUMNS = 'id, person_id, active, created_at, source, lab_id';
const RESEARCHER_COLUMNS_JOINED = 'r.id, r.person_id, r.active, r.created_at, r.source, r.lab_id';

export class ResearcherRepository implements IResearcherRepository {
  constructor(private context: Queryable) {}

  async findById(id: string, labId: string): Promise<Researcher | null> {
    const row = await this.context.queryOne<ResearcherRow>(
      `SELECT ${RESEARCHER_COLUMNS} FROM researchers WHERE id = $1 AND lab_id = $2`,
      [id, labId]
    );
    return row ? ResearcherMapper.fromRow(row) : null;
  }

  async findByIdAnyLab(id: string): Promise<Researcher | null> {
    const row = await this.context.queryOne<ResearcherRow>(
      `SELECT ${RESEARCHER_COLUMNS} FROM researchers WHERE id = $1`,
      [id]
    );
    return row ? ResearcherMapper.fromRow(row) : null;
  }

  async findByPersonId(personId: string): Promise<Researcher | null> {
    const row = await this.context.queryOne<ResearcherRow>(
      `SELECT ${RESEARCHER_COLUMNS} FROM researchers WHERE person_id = $1`,
      [personId]
    );
    return row ? ResearcherMapper.fromRow(row) : null;
  }

  async findByLabId(labId: string): Promise<Researcher[]> {
    const rows = await this.context.queryMany<ResearcherRow>(
      `
      SELECT ${RESEARCHER_COLUMNS_JOINED} FROM researchers r
      INNER JOIN persons p ON r.person_id = p.id
      WHERE r.lab_id = $1
      ORDER BY p.last_name, p.first_name
    `,
      [labId]
    );
    return ResearcherMapper.fromRows(rows);
  }

  async findActiveByLabId(labId: string): Promise<Researcher[]> {
    const rows = await this.context.queryMany<ResearcherRow>(
      `
      SELECT ${RESEARCHER_COLUMNS_JOINED} FROM researchers r
      INNER JOIN persons p ON r.person_id = p.id
      WHERE r.lab_id = $1 AND r.active = TRUE
      ORDER BY p.last_name, p.first_name
    `,
      [labId]
    );
    return ResearcherMapper.fromRows(rows);
  }

  async findByIds(ids: string[], labId: string): Promise<Researcher[]> {
    if (ids.length === 0) return [];
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const rows = await this.context.queryMany<ResearcherRow>(
      `SELECT ${RESEARCHER_COLUMNS} FROM researchers WHERE id IN (${placeholders}) AND lab_id = $${ids.length + 1}`,
      [...ids, labId]
    );
    return ResearcherMapper.fromRows(rows);
  }

  async save(researcher: Researcher): Promise<void> {
    const row = ResearcherMapper.toRow(researcher);

    await this.context.execute(
      `
      INSERT INTO researchers (id, person_id, active, created_at, source, lab_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        person_id = EXCLUDED.person_id,
        active = EXCLUDED.active,
        created_at = EXCLUDED.created_at,
        source = EXCLUDED.source,
        lab_id = EXCLUDED.lab_id
    `,
      [row.id, row.person_id, row.active, row.created_at, row.source, row.lab_id]
    );
  }

  async delete(id: string, labId: string): Promise<boolean> {
    const result = await this.context.execute(
      'DELETE FROM researchers WHERE id = $1 AND lab_id = $2',
      [id, labId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // QUERY OPERATIONS

  async nameExists(firstName: string, lastName: string, labId?: string): Promise<boolean> {
    const labFilter = labId ? ' AND r.lab_id = $3' : '';
    const params = labId ? [firstName, lastName, labId] : [firstName, lastName];
    const row = await this.context.queryOne<{ exists: boolean }>(
      `SELECT EXISTS(
        SELECT 1 FROM researchers r
        INNER JOIN persons p ON r.person_id = p.id
        WHERE LOWER(p.first_name) = LOWER($1) AND LOWER(p.last_name) = LOWER($2) AND r.active = TRUE${labFilter}
      ) as exists`,
      params
    );
    return row?.exists ?? false;
  }

  async findDeactivatedByName(
    firstName: string,
    lastName: string,
    labId: string
  ): Promise<Researcher | null> {
    const row = await this.context.queryOne<ResearcherRow>(
      `SELECT ${RESEARCHER_COLUMNS_JOINED} FROM researchers r
       INNER JOIN persons p ON r.person_id = p.id
       WHERE LOWER(p.first_name) = LOWER($1) AND LOWER(p.last_name) = LOWER($2)
         AND r.active = FALSE AND r.lab_id = $3
       LIMIT 1`,
      [firstName, lastName, labId]
    );
    return row ? ResearcherMapper.fromRow(row) : null;
  }

  // INTEGRATION QUERIES

  async countByLabIds(labIds: string[]): Promise<Map<string, number>> {
    if (labIds.length === 0) return new Map();
    const placeholders = labIds.map((_, i) => `$${i + 1}`).join(', ');
    const rows = await this.context.queryMany<{ lab_id: string; count: string }>(
      `SELECT lab_id, COUNT(*) as count FROM researchers WHERE lab_id IN (${placeholders}) GROUP BY lab_id`,
      labIds
    );
    return new Map(rows.map(r => [r.lab_id, parseCount(r)]));
  }

  async getTubeCountByResearcher(researcherId: string): Promise<number> {
    const result = await this.context.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM tubes WHERE researcher_id = $1',
      [researcherId]
    );
    return parseCount(result);
  }

  async getTubeCountsByResearcherIds(researcherIds: string[]): Promise<Map<string, number>> {
    if (researcherIds.length === 0) return new Map();

    const placeholders = researcherIds.map((_, i) => `$${i + 1}`).join(', ');
    const rows = await this.context.queryMany<{ researcher_id: string; count: string }>(
      `SELECT researcher_id, COUNT(*) as count FROM tubes WHERE researcher_id IN (${placeholders}) GROUP BY researcher_id`,
      researcherIds
    );

    return new Map(rows.map(r => [r.researcher_id, parseCount(r)]));
  }

  // MAINTENANCE

  async isHealthy(): Promise<boolean> {
    return this.context.isHealthy();
  }
}
