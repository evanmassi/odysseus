/**
 * Donor Repository
 *
 * PostgreSQL implementation for donor records and collection history.
 */

import type { Donor } from '@domain/entities/Donor';
import type { DonorCollectionHistory } from '@domain/entities/DonorCollectionHistory';
import type { DonorRepository as IDonorRepository } from '@domain/repositories/DonorRepository';
import { escapeLikePattern } from '@infrastructure/database/likePattern';
import type { DonorRow, DonorCollectionHistoryRow } from '@infrastructure/database/mappers/DonorMapper';
import { DonorMapper } from '@infrastructure/database/mappers/DonorMapper';
import type { PostgresContext } from '@infrastructure/database/PostgresContext';
import { parseCount } from '@infrastructure/database/PostgresContext';

const DONOR_COLUMNS = 'id, lab_id, donor_source_id, donor_internal_id, species, age, sex, ethnicity, clinical_status, diagnosis, disease_stage, notes, is_curated, created_at, updated_at';
const HISTORY_COLUMNS = 'id, donor_id, collection_date, specimen_type, source, created_at';
// Read collection_date as text — a parsed DATE column becomes a timezone-shifting Date object.
const HISTORY_SELECT_COLUMNS =
  'id, donor_id, collection_date::text AS collection_date, specimen_type, source, created_at';

export class DonorRepository implements IDonorRepository {

  constructor(private db: PostgresContext) {}

  async findById(id: string, labId: string): Promise<Donor | null> {
    const row = await this.db.queryOne<DonorRow>(
      `SELECT ${DONOR_COLUMNS} FROM donors WHERE id = $1 AND lab_id = $2`,
      [id, labId]
    );
    return row ? DonorMapper.fromRow(row) : null;
  }

  async findByLabId(labId: string): Promise<Donor[]> {
    const rows = await this.db.queryMany<DonorRow>(
      `SELECT ${DONOR_COLUMNS} FROM donors WHERE lab_id = $1 ORDER BY updated_at DESC`,
      [labId]
    );
    return DonorMapper.fromRows(rows);
  }

  async findByDonorIds(labId: string, sourceId?: string, internalId?: string): Promise<Donor | null> {
    if (!sourceId && !internalId) return null;

    const conditions: string[] = ['lab_id = $1'];
    const params: (string | undefined)[] = [labId];
    const orClauses: string[] = [];

    if (sourceId) {
      params.push(sourceId);
      orClauses.push(`donor_source_id = $${params.length}`);
    }
    if (internalId) {
      params.push(internalId);
      orClauses.push(`donor_internal_id = $${params.length}`);
    }

    conditions.push(`(${orClauses.join(' OR ')})`);

    const row = await this.db.queryOne<DonorRow>(
      `SELECT ${DONOR_COLUMNS} FROM donors WHERE ${conditions.join(' AND ')} LIMIT 1`,
      params
    );
    return row ? DonorMapper.fromRow(row) : null;
  }

  async search(labId: string, query: string, limit: number = 20): Promise<Donor[]> {
    // Strip # and spaces so "LP8", "LP#8", "LP #8" all match
    const normalized = query.replace(/[\s#]+/g, '');
    const pattern = `%${escapeLikePattern(normalized)}%`;
    const rows = await this.db.queryMany<DonorRow>(`
      SELECT ${DONOR_COLUMNS} FROM donors
      WHERE lab_id = $1
        AND (
          REPLACE(REPLACE(donor_source_id, '#', ''), ' ', '') ILIKE $2 ESCAPE '\\'
          OR REPLACE(REPLACE(donor_internal_id, '#', ''), ' ', '') ILIKE $2 ESCAPE '\\'
        )
      ORDER BY donor_source_id, donor_internal_id
      LIMIT $3
    `, [labId, pattern, limit]);
    return DonorMapper.fromRows(rows);
  }

  async save(donor: Donor): Promise<void> {
    const row = DonorMapper.toRow(donor);

    await this.db.execute(`
      INSERT INTO donors (${DONOR_COLUMNS})
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO UPDATE SET
        donor_source_id = EXCLUDED.donor_source_id,
        donor_internal_id = EXCLUDED.donor_internal_id,
        species = EXCLUDED.species,
        age = EXCLUDED.age,
        sex = EXCLUDED.sex,
        ethnicity = EXCLUDED.ethnicity,
        clinical_status = EXCLUDED.clinical_status,
        diagnosis = EXCLUDED.diagnosis,
        disease_stage = EXCLUDED.disease_stage,
        notes = EXCLUDED.notes,
        is_curated = EXCLUDED.is_curated,
        updated_at = EXCLUDED.updated_at
    `, [
      row.id, row.lab_id, row.donor_source_id, row.donor_internal_id,
      row.species, row.age, row.sex, row.ethnicity,
      row.clinical_status, row.diagnosis, row.disease_stage, row.notes,
      row.is_curated, row.created_at, row.updated_at
    ]);
  }

  async delete(id: string, labId: string): Promise<boolean> {
    const result = await this.db.execute('DELETE FROM donors WHERE id = $1 AND lab_id = $2', [id, labId]);
    return (result.rowCount ?? 0) > 0;
  }

  /** Atomic insert-if-not-exists for tube auto-creation. */
  async saveIfNotExists(donor: Donor): Promise<boolean> {
    const row = DonorMapper.toRow(donor);

    const conditions: string[] = ['lab_id = $2'];
    const orClauses: string[] = [];

    if (row.donor_source_id) {
      orClauses.push(`donor_source_id = $3`);
    }
    if (row.donor_internal_id) {
      orClauses.push(`donor_internal_id = $4`);
    }

    if (orClauses.length === 0) return false;
    conditions.push(`(${orClauses.join(' OR ')})`);

    const result = await this.db.execute(`
      INSERT INTO donors (${DONOR_COLUMNS})
      SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      WHERE NOT EXISTS (
        SELECT 1 FROM donors WHERE ${conditions.join(' AND ')}
      )
    `, [
      row.id, row.lab_id, row.donor_source_id, row.donor_internal_id,
      row.species, row.age, row.sex, row.ethnicity,
      row.clinical_status, row.diagnosis, row.disease_stage, row.notes,
      row.is_curated, row.created_at, row.updated_at
    ]);

    return (result.rowCount ?? 0) > 0;
  }

  async getTubeCountsForDonors(labId: string, donors: Donor[]): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (donors.length === 0) return result;

    // Build per-donor matching conditions
    const caseWhenClauses: string[] = [];
    const params: string[] = [labId];

    for (const donor of donors) {
      const orParts: string[] = [];
      if (donor.donorSourceId) {
        params.push(donor.donorSourceId);
        orParts.push(`t.donor_source_id = $${params.length}`);
      }
      if (donor.donorInternalId) {
        params.push(donor.donorInternalId);
        orParts.push(`t.donor_internal_id = $${params.length}`);
      }
      if (orParts.length > 0) {
        params.push(donor.id);
        caseWhenClauses.push(`WHEN ${orParts.join(' OR ')} THEN $${params.length}`);
      }
    }

    if (caseWhenClauses.length === 0) return result;

    const rows = await this.db.queryMany<{ donor_id: string; count: string }>(`
      SELECT
        CASE ${caseWhenClauses.join(' ')} END AS donor_id,
        COUNT(*) AS count
      FROM tubes t
      WHERE t.lab_id = $1
        AND (CASE ${caseWhenClauses.join(' ')} END) IS NOT NULL
      GROUP BY donor_id
    `, params);

    for (const row of rows) {
      result.set(row.donor_id, parseCount(row));
    }

    // Ensure all donors have an entry (0 for those with no tubes)
    for (const donor of donors) {
      if (!result.has(donor.id)) {
        result.set(donor.id, 0);
      }
    }

    return result;
  }

  async findCollectionHistory(donorId: string, labId: string): Promise<DonorCollectionHistory[]> {
    const rows = await this.db.queryMany<DonorCollectionHistoryRow>(
      `SELECT ${HISTORY_SELECT_COLUMNS} FROM donor_collection_history WHERE donor_id = $1 AND donor_id IN (SELECT id FROM donors WHERE lab_id = $2) ORDER BY COALESCE(collection_date, created_at::date) DESC, created_at DESC`,
      [donorId, labId]
    );
    return DonorMapper.historyFromRows(rows);
  }

  async findCollectionHistoryById(id: string, labId: string): Promise<DonorCollectionHistory | null> {
    const row = await this.db.queryOne<DonorCollectionHistoryRow>(
      `SELECT dch.id, dch.donor_id, dch.collection_date::text AS collection_date, dch.specimen_type, dch.source, dch.created_at
       FROM donor_collection_history dch
       JOIN donors d ON d.id = dch.donor_id
       WHERE dch.id = $1 AND d.lab_id = $2`,
      [id, labId]
    );
    return row ? DonorMapper.historyFromRow(row) : null;
  }

  async saveCollectionHistory(entry: DonorCollectionHistory): Promise<void> {
    const row = DonorMapper.historyToRow(entry);
    await this.db.execute(`
      INSERT INTO donor_collection_history (${HISTORY_COLUMNS})
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [row.id, row.donor_id, row.collection_date, row.specimen_type, row.source, row.created_at]);
  }

  async updateCollectionHistory(entry: DonorCollectionHistory, labId: string): Promise<void> {
    const row = DonorMapper.historyToRow(entry);
    await this.db.execute(
      `UPDATE donor_collection_history SET collection_date = $2, specimen_type = $3, source = $4 WHERE id = $1 AND donor_id IN (SELECT id FROM donors WHERE lab_id = $5)`,
      [row.id, row.collection_date, row.specimen_type, row.source, labId]
    );
  }

  async deleteCollectionHistory(id: string, labId: string): Promise<boolean> {
    const result = await this.db.execute(
      'DELETE FROM donor_collection_history WHERE id = $1 AND donor_id IN (SELECT id FROM donors WHERE lab_id = $2)',
      [id, labId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async countCollectionEntriesUsingSpecimenType(value: string, labId: string): Promise<number> {
    const result = await this.db.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM donor_collection_history dch
       JOIN donors d ON d.id = dch.donor_id
       WHERE dch.specimen_type = $1 AND d.lab_id = $2`,
      [value, labId]
    );
    return parseCount(result);
  }

  async renameSpecimenType(oldValue: string, newValue: string, labId: string): Promise<number> {
    const result = await this.db.execute(
      `UPDATE donor_collection_history SET specimen_type = $1
       WHERE specimen_type = $2 AND donor_id IN (SELECT id FROM donors WHERE lab_id = $3)`,
      [newValue, oldValue, labId]
    );
    return result.rowCount ?? 0;
  }
}
