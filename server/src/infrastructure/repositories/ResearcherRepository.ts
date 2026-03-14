/**
 * Researcher Repository
 *
 * Data access for researcher records. JOIN queries use persons table for name-based operations.
 */

import type { Researcher } from '@domain/entities/Researcher';
import type { ResearcherRepository as IResearcherRepository } from '@domain/repositories/ResearcherRepository';
import type { ResearcherRow } from '@infrastructure/database/mappers/ResearcherMapper';
import { ResearcherMapper } from '@infrastructure/database/mappers/ResearcherMapper';
import type { PostgresContext } from '@infrastructure/database/PostgresContext';

const RESEARCHER_COLUMNS = 'id, person_id, active, created_at, approval_status, source, lab_id';
const RESEARCHER_COLUMNS_JOINED = 'r.id, r.person_id, r.active, r.created_at, r.approval_status, r.source, r.lab_id';

export class ResearcherRepository implements IResearcherRepository {

  constructor(private context: PostgresContext) {}

  async findById(id: string): Promise<Researcher | null> {
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
    const rows = await this.context.queryMany<ResearcherRow>(`
      SELECT ${RESEARCHER_COLUMNS_JOINED} FROM researchers r
      INNER JOIN persons p ON r.person_id = p.id
      WHERE r.lab_id = $1
      ORDER BY p.last_name, p.first_name
    `, [labId]);
    return ResearcherMapper.fromRows(rows);
  }

  async findActiveByLabId(labId: string): Promise<Researcher[]> {
    const rows = await this.context.queryMany<ResearcherRow>(`
      SELECT ${RESEARCHER_COLUMNS_JOINED} FROM researchers r
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

  // QUERY OPERATIONS

  async nameExists(firstName: string, lastName: string, labId?: string): Promise<boolean> {
    const labFilter = labId ? ' AND r.lab_id = $3' : '';
    const params = labId ? [firstName, lastName, labId] : [firstName, lastName];
    const row = await this.context.queryOne<{ exists: boolean }>(
      `SELECT EXISTS(
        SELECT 1 FROM researchers r
        INNER JOIN persons p ON r.person_id = p.id
        WHERE p.first_name = $1 AND p.last_name = $2${labFilter}
      ) as exists`,
      params
    );
    return row?.exists ?? false;
  }

  async searchByName(namePattern: string, labId: string): Promise<Researcher[]> {
    const rows = await this.context.queryMany<ResearcherRow>(`
      SELECT ${RESEARCHER_COLUMNS_JOINED} FROM researchers r
      INNER JOIN persons p ON r.person_id = p.id
      WHERE (p.first_name ILIKE $1 OR p.last_name ILIKE $1) AND r.lab_id = $2
      ORDER BY p.last_name, p.first_name
    `, [`%${namePattern}%`, labId]);
    return ResearcherMapper.fromRows(rows);
  }

  // INTEGRATION QUERIES

  async getMostActiveResearchers(limit: number = 10, labId: string): Promise<Array<{ researcher: Researcher, tubeCount: number }>> {
    const rows = await this.context.queryMany<{ researcher_id: string; tube_count: string }>(
      `SELECT t.researcher_id, COUNT(*)::text as tube_count
       FROM tubes t
       INNER JOIN researchers r ON t.researcher_id = r.id
       WHERE r.active = TRUE AND r.lab_id = $1
       GROUP BY t.researcher_id
       ORDER BY COUNT(*) DESC
       LIMIT $2`,
      [labId, limit]
    );

    const ids = rows.map(r => r.researcher_id);
    const researchers = await this.findByIds(ids);
    const researcherMap = new Map(researchers.map(r => [r.id, r]));
    return rows
      .filter(row => researcherMap.has(row.researcher_id))
      .map(row => ({ researcher: researcherMap.get(row.researcher_id)!, tubeCount: parseInt(row.tube_count, 10) }));
  }

  async getTubeCountByResearcher(researcherId: string): Promise<number> {
    const result = await this.context.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM tubes WHERE researcher_id = $1',
      [researcherId]
    );
    return parseInt(result?.count ?? '0', 10);
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

  // MAINTENANCE

  async isHealthy(): Promise<boolean> {
    return this.context.isHealthy();
  }
}
