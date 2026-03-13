/**
 * Tube Repository
 *
 * Data access for tube sample records with multi-layer full-text search and location queries.
 */

import type { Tube } from '@domain/entities/Tube';
import { ConflictError } from '@domain/errors/ConflictError';
import { ValidationError } from '@domain/errors/ValidationError';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { TubeRepository as ITubeRepository } from '@domain/repositories/TubeRepository';
import type { TubeSearchCriteria, TubeSearchResult, TubeRepositoryStats } from '@domain/types/repository';
import type { Location } from '@domain/value-objects/Location';
import { isPositionConstraintError } from '@infrastructure/database/DatabaseErrors';
import type { TubeRow } from '@infrastructure/database/mappers/TubeMapper';
import { TubeMapper } from '@infrastructure/database/mappers/TubeMapper';
import type { PostgresContext } from '@infrastructure/database/PostgresContext';
import {
  normalizeSearchQuery,
  expandWithSynonyms,
  parseQueryIntoConcepts,
  buildTsQueryFromConcepts,
  calculateQueryFuzzyThreshold,
  shouldSkipFuzzyMatching,
  SearchRankTier,
} from '@infrastructure/database/searchQueryPreprocessing';
import { logger } from '@infrastructure/logging/logger';

export class TubeRepository implements ITubeRepository {
  constructor(
    private context: PostgresContext,
    private storageRepository: StorageRepository
  ) {}

  async findById(id: string, labId: string): Promise<Tube | null> {
    const row = await this.context.queryOne<TubeRow>(
      `SELECT ${this.TUBE_COLUMNS} FROM tubes WHERE id = $1 AND lab_id = $2`,
      [id, labId]
    );
    return row ? TubeMapper.fromRow(row) : null;
  }

  async findByIds(ids: string[], labId: string): Promise<Tube[]> {
    if (ids.length === 0) return [];

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const rows = await this.context.queryMany<TubeRow>(
      `SELECT ${this.TUBE_COLUMNS} FROM tubes WHERE id IN (${placeholders}) AND lab_id = $${ids.length + 1}`,
      [...ids, labId]
    );
    return TubeMapper.fromRows(rows);
  }

  async findAllByLabId(labId: string): Promise<Tube[]> {
    const rows = await this.context.queryMany<TubeRow>(
      `SELECT ${this.TUBE_COLUMNS} FROM tubes WHERE lab_id = $1 ORDER BY created_at DESC`,
      [labId]
    );
    return TubeMapper.fromRows(rows);
  }

  async save(tube: Tube): Promise<void> {
    const row = TubeMapper.toRow(tube);
    try {
      await this.context.execute(`
        INSERT INTO tubes (
          id, tank_id, rack_id, box_id, position, cell_type, donor_internal_id,
          donor_source_id, concentration, concentration_unit, date, researcher_id, created_by_name,
          media_type, media_supplements, media_selection, culture_condition, lot_number,
          species, source, catalog_number, passage_number,
          notes, created_at, updated_at, version,
          is_locked, locked_by, lock_note, locked_at, shared_with_user_ids, lab_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32)
        ON CONFLICT (id) DO UPDATE SET
          tank_id = EXCLUDED.tank_id,
          rack_id = EXCLUDED.rack_id,
          box_id = EXCLUDED.box_id,
          position = EXCLUDED.position,
          cell_type = EXCLUDED.cell_type,
          donor_internal_id = EXCLUDED.donor_internal_id,
          donor_source_id = EXCLUDED.donor_source_id,
          concentration = EXCLUDED.concentration,
          concentration_unit = EXCLUDED.concentration_unit,
          date = EXCLUDED.date,
          researcher_id = EXCLUDED.researcher_id,
          created_by_name = EXCLUDED.created_by_name,
          media_type = EXCLUDED.media_type,
          media_supplements = EXCLUDED.media_supplements,
          media_selection = EXCLUDED.media_selection,
          culture_condition = EXCLUDED.culture_condition,
          lot_number = EXCLUDED.lot_number,
          species = EXCLUDED.species,
          source = EXCLUDED.source,
          catalog_number = EXCLUDED.catalog_number,
          passage_number = EXCLUDED.passage_number,
          notes = EXCLUDED.notes,
          updated_at = EXCLUDED.updated_at,
          version = EXCLUDED.version,
          is_locked = EXCLUDED.is_locked,
          locked_by = EXCLUDED.locked_by,
          lock_note = EXCLUDED.lock_note,
          locked_at = EXCLUDED.locked_at,
          shared_with_user_ids = EXCLUDED.shared_with_user_ids,
          lab_id = EXCLUDED.lab_id
      `, [
        row.id, row.tank_id, row.rack_id, row.box_id, row.position,
        row.cell_type, row.donor_internal_id, row.donor_source_id,
        row.concentration, row.concentration_unit, row.date, row.researcher_id, row.created_by_name,
        row.media_type, row.media_supplements, row.media_selection, row.culture_condition, row.lot_number,
        row.species, row.source, row.catalog_number, row.passage_number,
        row.notes,
        row.created_at, row.updated_at, row.version,
        row.is_locked, row.locked_by, row.lock_note, row.locked_at, row.shared_with_user_ids,
        row.lab_id
      ]);
    } catch (error) {
      if (isPositionConstraintError(error)) {
        throw new ValidationError('Position already occupied', {
          code: 'POSITION_OCCUPIED',
          tankId: tube.location.tankId,
          rackId: tube.location.rackId,
          boxId: tube.location.boxId,
          position: tube.location.position
        });
      }
      throw error;
    }
  }

  /**
   * Save tube with optimistic locking.
   * Uses UPDATE...WHERE version=$expected to detect concurrent modifications.
   * @throws ConflictError if version mismatch (another user modified the tube)
   * @throws ValidationError if position already occupied (race condition)
   */
  async saveWithOptimisticLock(tube: Tube, expectedVersion: number): Promise<void> {
    const row = TubeMapper.toRow(tube);
    let result;
    try {
      result = await this.context.execute(`
        UPDATE tubes SET
          tank_id = $2,
          rack_id = $3,
          box_id = $4,
          position = $5,
          cell_type = $6,
          donor_internal_id = $7,
          donor_source_id = $8,
          concentration = $9,
          concentration_unit = $10,
          date = $11,
          researcher_id = $12,
          created_by_name = $13,
          media_type = $14,
          media_supplements = $15,
          media_selection = $16,
          culture_condition = $17,
          lot_number = $18,
          species = $19,
          source = $20,
          catalog_number = $21,
          passage_number = $22,
          notes = $23,
          updated_at = $24,
          version = $25,
          is_locked = $26,
          locked_by = $27,
          lock_note = $28,
          locked_at = $29,
          shared_with_user_ids = $30
        WHERE id = $1 AND version = $31
      `, [
        row.id, row.tank_id, row.rack_id, row.box_id, row.position,
        row.cell_type, row.donor_internal_id, row.donor_source_id,
        row.concentration, row.concentration_unit, row.date, row.researcher_id, row.created_by_name,
        row.media_type, row.media_supplements, row.media_selection, row.culture_condition, row.lot_number,
        row.species, row.source, row.catalog_number, row.passage_number,
        row.notes,
        row.updated_at, row.version,
        row.is_locked, row.locked_by, row.lock_note, row.locked_at, row.shared_with_user_ids,
        expectedVersion
      ]);
    } catch (error) {
      if (isPositionConstraintError(error)) {
        throw new ValidationError('Position already occupied', {
          code: 'POSITION_OCCUPIED',
          tankId: tube.location.tankId,
          rackId: tube.location.rackId,
          boxId: tube.location.boxId,
          position: tube.location.position
        });
      }
      throw error;
    }

    if (result.rowCount === 0) {
      // Version mismatch - fetch current version for error message
      const currentTube = await this.findById(tube.id, tube.labId ?? '');
      const currentVersion = currentTube?.version ?? 0;
      throw ConflictError.tube(tube.id, expectedVersion, currentVersion);
    }
  }

  async delete(id: string, labId: string): Promise<boolean> {
    const result = await this.context.execute('DELETE FROM tubes WHERE id = $1 AND lab_id = $2', [id, labId]);
    return (result.rowCount ?? 0) > 0;
  }

  // LOCATION-BASED QUERIES

  async findByLocation(location: Location, labId: string): Promise<Tube | null> {
    const row = await this.context.queryOne<TubeRow>(
      `SELECT ${this.TUBE_COLUMNS} FROM tubes WHERE tank_id = $1 AND rack_id = $2 AND box_id = $3 AND position = $4 AND lab_id = $5`,
      [location.tankId, location.rackId, location.boxId, location.position, labId]
    );
    return row ? TubeMapper.fromRow(row) : null;
  }

  async findByCompleteLocation(tankId: string, rackId: string, boxId: string, labId: string): Promise<Tube[]> {
    const rows = await this.context.queryMany<TubeRow>(
      `SELECT ${this.TUBE_COLUMNS} FROM tubes WHERE tank_id = $1 AND rack_id = $2 AND box_id = $3 AND lab_id = $4 ORDER BY position`,
      [tankId, rackId, boxId, labId]
    );
    return TubeMapper.fromRows(rows);
  }

  async findByRackAndBox(rackId: string, boxId: string, labId: string): Promise<Tube[]> {
    const rows = await this.context.queryMany<TubeRow>(
      `SELECT ${this.TUBE_COLUMNS} FROM tubes WHERE rack_id = $1 AND box_id = $2 AND lab_id = $3 ORDER BY tank_id, position`,
      [rackId, boxId, labId]
    );
    return TubeMapper.fromRows(rows);
  }

  async findByTank(tankId: string, labId: string): Promise<Tube[]> {
    const rows = await this.context.queryMany<TubeRow>(
      `SELECT ${this.TUBE_COLUMNS} FROM tubes WHERE tank_id = $1 AND lab_id = $2 ORDER BY rack_id, box_id, position`,
      [tankId, labId]
    );
    return TubeMapper.fromRows(rows);
  }

  async findByTankIds(tankIds: string[], labId: string): Promise<Tube[]> {
    if (tankIds.length === 0) return [];

    const placeholders = tankIds.map((_, i) => `$${i + 1}`).join(',');
    const rows = await this.context.queryMany<TubeRow>(
      `SELECT ${this.TUBE_COLUMNS} FROM tubes WHERE tank_id IN (${placeholders}) AND lab_id = $${tankIds.length + 1} ORDER BY tank_id, rack_id, box_id, position`,
      [...tankIds, labId]
    );
    return TubeMapper.fromRows(rows);
  }

  async isPositionAvailable(location: Location, labId: string): Promise<boolean> {
    const tube = await this.findByLocation(location, labId);
    return tube === null;
  }

  async getOccupiedPositions(tankId: string, rackId: string, boxId: string, labId: string): Promise<number[]> {
    const rows = await this.context.queryMany<{ position: number }>(
      'SELECT position FROM tubes WHERE tank_id = $1 AND rack_id = $2 AND box_id = $3 AND lab_id = $4 ORDER BY position',
      [tankId, rackId, boxId, labId]
    );
    return rows.map((row: { position: number }) => row.position);
  }

  // RESEARCHER-BASED QUERIES

  async findByResearcher(researcher: string, labId: string): Promise<Tube[]> {
    const rows = await this.context.queryMany<TubeRow>(
      `SELECT ${this.TUBE_COLUMNS} FROM tubes WHERE researcher_id ILIKE $1 AND lab_id = $2 ORDER BY created_at DESC`,
      [`%${researcher}%`, labId]
    );
    return TubeMapper.fromRows(rows);
  }

  // BUSINESS QUERIES

  async countByLabId(labId: string): Promise<number> {
    const result = await this.context.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM tubes WHERE lab_id = $1',
      [labId]
    );
    return result ? parseInt(result.count, 10) : 0;
  }

  async countByLabIds(labIds: string[]): Promise<Map<string, number>> {
    if (labIds.length === 0) return new Map();
    const placeholders = labIds.map((_, i) => `$${i + 1}`).join(', ');
    const rows = await this.context.queryMany<{ lab_id: string; count: string }>(
      `SELECT lab_id, COUNT(*) as count FROM tubes WHERE lab_id IN (${placeholders}) GROUP BY lab_id`,
      labIds
    );
    return new Map(rows.map(r => [r.lab_id, parseInt(r.count, 10)]));
  }

  async countByResearcher(researcher: string, labId: string): Promise<number> {
    const result = await this.context.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM tubes WHERE researcher_id = $1 AND lab_id = $2',
      [researcher, labId]
    );
    return result ? parseInt(result.count, 10) : 0;
  }

  async countByTank(tankId: string, labId: string): Promise<number> {
    const result = await this.context.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM tubes WHERE tank_id = $1 AND lab_id = $2',
      [tankId, labId]
    );
    return result ? parseInt(result.count, 10) : 0;
  }

  async countByRack(tankId: string, rackId: string, labId: string): Promise<number> {
    const result = await this.context.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM tubes WHERE tank_id = $1 AND rack_id = $2 AND lab_id = $3',
      [tankId, rackId, labId]
    );
    return result ? parseInt(result.count, 10) : 0;
  }

  async countByBox(tankId: string, rackId: string, boxId: string, labId: string): Promise<number> {
    const result = await this.context.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM tubes WHERE tank_id = $1 AND rack_id = $2 AND box_id = $3 AND lab_id = $4',
      [tankId, rackId, boxId, labId]
    );
    return result ? parseInt(result.count, 10) : 0;
  }

  // SEARCH AND FILTERING

  private readonly ALLOWED_SORT_COLUMNS = [
    'rank',
    'created_at',
    'updated_at',
    'cell_type',
    'date',
    'donor_internal_id',
    'donor_source_id',
    'lot_number'
  ] as const;

  private readonly TUBE_COLUMNS = `
    tubes.id,
    tubes.tank_id,
    tubes.rack_id,
    tubes.box_id,
    tubes.position,
    tubes.cell_type,
    tubes.donor_internal_id,
    tubes.donor_source_id,
    tubes.concentration,
    tubes.concentration_unit,
    tubes.date,
    tubes.researcher_id,
    tubes.created_by_name,
    tubes.media_type,
    tubes.media_supplements,
    tubes.media_selection,
    tubes.culture_condition,
    tubes.lot_number,
    tubes.species,
    tubes.source,
    tubes.catalog_number,
    tubes.passage_number,
    tubes.notes,
    tubes.created_at,
    tubes.updated_at,
    tubes.version,
    tubes.is_locked,
    tubes.locked_by,
    tubes.lock_note,
    tubes.locked_at,
    tubes.shared_with_user_ids,
    tubes.lab_id
  `.trim();

  private addLocationFilters(
    baseSql: string,
    params: unknown[],
    criteria: TubeSearchCriteria,
    paramIndex: { current: number }
  ): string {
    let sql = baseSql;

    // Array-based filters (multiple selection support)
    if (criteria.tankIds && criteria.tankIds.length > 0) {
      const placeholders = criteria.tankIds.map(() => `$${paramIndex.current++}`).join(',');
      sql += ` AND tubes.tank_id IN (${placeholders})`;
      params.push(...criteria.tankIds);
    }
    if (criteria.rackIds && criteria.rackIds.length > 0) {
      const placeholders = criteria.rackIds.map(() => `$${paramIndex.current++}`).join(',');
      sql += ` AND tubes.rack_id IN (${placeholders})`;
      params.push(...criteria.rackIds);
    }
    if (criteria.boxIds && criteria.boxIds.length > 0) {
      const placeholders = criteria.boxIds.map(() => `$${paramIndex.current++}`).join(',');
      sql += ` AND tubes.box_id IN (${placeholders})`;
      params.push(...criteria.boxIds);
    }

    // Legacy single-value filters (backwards compatibility)
    if (criteria.tankId) {
      sql += ` AND tubes.tank_id = $${paramIndex.current++}`;
      params.push(criteria.tankId);
    }
    if (criteria.rackId !== undefined) {
      sql += ` AND tubes.rack_id = $${paramIndex.current++}`;
      params.push(criteria.rackId);
    }
    if (criteria.boxId) {
      sql += ` AND tubes.box_id = $${paramIndex.current++}`;
      params.push(criteria.boxId);
    }

    return sql;
  }

  private addSampleFilters(
    baseSql: string,
    params: unknown[],
    criteria: TubeSearchCriteria,
    paramIndex: { current: number }
  ): string {
    let sql = baseSql;

    if (criteria.cellTypes && criteria.cellTypes.length > 0) {
      const placeholders = criteria.cellTypes.map(() => `$${paramIndex.current++}`).join(',');
      sql += ` AND tubes.cell_type IN (${placeholders})`;
      params.push(...criteria.cellTypes);
    }
    if (criteria.species && criteria.species.length > 0) {
      const placeholders = criteria.species.map(() => `$${paramIndex.current++}`).join(',');
      sql += ` AND tubes.species IN (${placeholders})`;
      params.push(...criteria.species);
    }
    if (criteria.sources && criteria.sources.length > 0) {
      const placeholders = criteria.sources.map(() => `$${paramIndex.current++}`).join(',');
      sql += ` AND tubes.source IN (${placeholders})`;
      params.push(...criteria.sources);
    }
    if (criteria.lotNumbers && criteria.lotNumbers.length > 0) {
      const placeholders = criteria.lotNumbers.map(() => `$${paramIndex.current++}`).join(',');
      sql += ` AND tubes.lot_number IN (${placeholders})`;
      params.push(...criteria.lotNumbers);
    }
    if (criteria.donorInternalIds && criteria.donorInternalIds.length > 0) {
      const placeholders = criteria.donorInternalIds.map(() => `$${paramIndex.current++}`).join(',');
      sql += ` AND tubes.donor_internal_id IN (${placeholders})`;
      params.push(...criteria.donorInternalIds);
    }
    if (criteria.donorSourceIds && criteria.donorSourceIds.length > 0) {
      const placeholders = criteria.donorSourceIds.map(() => `$${paramIndex.current++}`).join(',');
      sql += ` AND tubes.donor_source_id IN (${placeholders})`;
      params.push(...criteria.donorSourceIds);
    }
    if (criteria.cultureConditions && criteria.cultureConditions.length > 0) {
      const placeholders = criteria.cultureConditions.map(() => `$${paramIndex.current++}`).join(',');
      sql += ` AND tubes.culture_condition IN (${placeholders})`;
      params.push(...criteria.cultureConditions);
    }

    // Legacy single-value filters (backwards compatibility)
    if (criteria.cellType) {
      sql += ` AND tubes.cell_type = $${paramIndex.current++}`;
      params.push(criteria.cellType);
    }
    if (criteria.donorInternalId) {
      sql += ` AND tubes.donor_internal_id = $${paramIndex.current++}`;
      params.push(criteria.donorInternalId);
    }
    if (criteria.donorSourceId) {
      sql += ` AND tubes.donor_source_id = $${paramIndex.current++}`;
      params.push(criteria.donorSourceId);
    }

    return sql;
  }

  private addResearcherFilters(
    baseSql: string,
    params: unknown[],
    criteria: TubeSearchCriteria,
    paramIndex: { current: number }
  ): string {
    let sql = baseSql;

    // Array-based researcher filter (multiple selection support)
    if (criteria.researcherIds && criteria.researcherIds.length > 0) {
      const placeholders = criteria.researcherIds.map(() => `$${paramIndex.current++}`).join(',');
      sql += ` AND tubes.researcher_id IN (${placeholders})`;
      params.push(...criteria.researcherIds);
    }

    // Legacy single-value filter (backwards compatibility)
    if (criteria.researcher) {
      sql += ` AND tubes.researcher_id = $${paramIndex.current++}`;
      params.push(criteria.researcher);
    }

    return sql;
  }

  private addDateRangeFilters(
    baseSql: string,
    params: unknown[],
    criteria: TubeSearchCriteria,
    paramIndex: { current: number }
  ): string {
    let sql = baseSql;

    if (criteria.dateFrom) {
      sql += ` AND tubes.date >= $${paramIndex.current++}`;
      params.push(criteria.dateFrom);
    }
    if (criteria.dateTo) {
      sql += ` AND tubes.date <= $${paramIndex.current++}`;
      params.push(criteria.dateTo);
    }

    return sql;
  }

  /**
   * Parses alphanumeric position labels (e.g., "C5") using box position display config.
   * Position label is box-specific — when multiple boxes are filtered, uses the first box's config.
   */
  private async addPositionLabelFilter(
    baseSql: string,
    params: unknown[],
    criteria: TubeSearchCriteria,
    paramIndex: { current: number },
    labId?: string
  ): Promise<string> {
    let sql = baseSql;

    if (!criteria.positionLabel) {
      return sql;
    }

    try {
      const boxId = criteria.boxId || criteria.boxIds?.[0];
      const tankId = criteria.tankId || criteria.tankIds?.[0];
      const rackId = criteria.rackId || criteria.rackIds?.[0];

      if (!boxId || !tankId || !rackId) {
        // No box specified - try numeric parsing as fallback
        const numericPosition = parseInt(criteria.positionLabel, 10);
        if (!isNaN(numericPosition)) {
          sql += ` AND tubes.position = $${paramIndex.current++}`;
          params.push(numericPosition);
        }
        // Otherwise skip position filter (invalid label without box context)
        return sql;
      }

      if (!labId) {
        logger.warn('[TubeRepository] No labId provided for position label parsing');
        return sql;
      }
      const configuration = await this.storageRepository.getForLab(labId);
      if (!configuration) {
        logger.warn('[TubeRepository] No configuration found for position label parsing');
        return sql;
      }

      const box = configuration.equipment.findBox(tankId, rackId, boxId);
      if (!box) {
        logger.warn(`[TubeRepository] Box not found: ${tankId}/${rackId}/${boxId}`);
        return sql;
      }

      const numericPosition = box.parsePositionLabel(criteria.positionLabel);

      sql += ` AND tubes.position = $${paramIndex.current++}`;
      params.push(numericPosition);

      logger.info(
        `[TubeRepository] Parsed position label "${criteria.positionLabel}" → ${numericPosition} for box ${boxId}`
      );
    } catch (error) {
      logger.error('[TubeRepository] Failed to parse position label:', error);
      // Continue search without position filter rather than failing entire search
    }

    return sql;
  }

  async search(criteria: TubeSearchCriteria, labId: string): Promise<Tube[]> {
    if (criteria.query?.trim()) {
      return this.comprehensiveSearch(criteria, labId);
    }

    return this.structuredSearch(criteria, labId);
  }

  async searchWithHighlighting(criteria: TubeSearchCriteria, labId: string): Promise<TubeSearchResult> {
    const tubes = await this.search(criteria, labId);

    const matchedTerms: string[] = [];

    if (criteria.query?.trim()) {
      const rawQuery = criteria.query.trim();
      const normalizedQuery = normalizeSearchQuery(rawQuery);
      const expandedTerms = expandWithSynonyms(normalizedQuery);

      matchedTerms.push(rawQuery.toLowerCase());

      if (normalizedQuery !== rawQuery.toLowerCase()) {
        matchedTerms.push(normalizedQuery);
      }

      for (const term of expandedTerms) {
        if (!matchedTerms.includes(term)) {
          matchedTerms.push(term);
        }
      }

      const words = normalizedQuery.split(/\s+/).filter(w => w.length >= 2);
      for (const word of words) {
        if (!matchedTerms.includes(word)) {
          matchedTerms.push(word);
        }
      }
    }

    return { tubes, matchedTerms };
  }

  /**
   * Full-text search across all tube fields
   *
   * Search layers (in order of relevance):
   * 1. tsvector full-text with synonym expansion
   * 2. Fuzzy matching with pg_trgm similarity
   * 3. Researcher name ILIKE
   * 4. ILIKE fallback for edge cases
   */
  private async comprehensiveSearch(criteria: TubeSearchCriteria, labId: string): Promise<Tube[]> {
    const rawQuery = criteria.query!.trim();

    // Step 1: Normalize query (split hyphens, clean punctuation)
    const normalizedQuery = normalizeSearchQuery(rawQuery);

    // Step 2: Parse into concept groups with synonyms and alphanumeric variants
    // "Human T-cells" → [["human", "homo sapiens"], ["t cell", "t-cell", "t lymphocyte"]]
    const concepts = parseQueryIntoConcepts(rawQuery);

    // Step 3: Build tsquery with AND between concepts, OR within synonyms
    // Result: (human:* | homo:* & sapiens:*) & (t:* & cell:* | t:* & lymphocyte:*)
    const tsqueryTerms = buildTsQueryFromConcepts(concepts);

    // Step 4: Calculate fuzzy threshold based on query length
    const fuzzyThreshold = calculateQueryFuzzyThreshold(normalizedQuery);

    const params: unknown[] = [];
    const paramIndex = { current: 1 };

    let ftsSql = `
      SELECT ${this.TUBE_COLUMNS},
             ts_rank(tubes.search_vector, to_tsquery('english', $${paramIndex.current})) * ${SearchRankTier.TSVECTOR_HIGH} as rank
      FROM tubes
      WHERE tubes.search_vector @@ to_tsquery('english', $${paramIndex.current++})
        AND tubes.lab_id = $${paramIndex.current}
    `;
    params.push(tsqueryTerms, labId);
    paramIndex.current++;

    ftsSql = this.addLocationFilters(ftsSql, params, criteria, paramIndex);
    ftsSql = this.addSampleFilters(ftsSql, params, criteria, paramIndex);
    ftsSql = this.addResearcherFilters(ftsSql, params, criteria, paramIndex);
    ftsSql = this.addDateRangeFilters(ftsSql, params, criteria, paramIndex);
    ftsSql = await this.addPositionLabelFilter(ftsSql, params, criteria, paramIndex, labId);

    // Layer 2: Fuzzy matching with pg_trgm (catches typos)
    const fuzzyColumns = ['cell_type', 'species', 'source', 'donor_internal_id', 'donor_source_id', 'lot_number', 'notes', 'media_type', 'culture_condition'];
    const fuzzySearchTerm = normalizedQuery;

    // Skip fuzzy for very short or numeric queries
    const shouldDoFuzzy = !shouldSkipFuzzyMatching(fuzzySearchTerm) && fuzzySearchTerm.length >= 3;

    let fuzzySql = '';
    if (shouldDoFuzzy) {
      const fuzzyConditions = fuzzyColumns.map(col =>
        `similarity(COALESCE(${col}, ''), $${paramIndex.current}) > ${fuzzyThreshold}`
      ).join(' OR ');

      const fuzzyRankParts = fuzzyColumns.map(col =>
        `similarity(COALESCE(${col}, ''), $${paramIndex.current})`
      );
      const fuzzyRankExpr = `GREATEST(${fuzzyRankParts.join(', ')}) * ${SearchRankTier.FUZZY_MATCH}`;

      fuzzySql = `
        SELECT ${this.TUBE_COLUMNS}, ${fuzzyRankExpr} as rank
        FROM tubes
        WHERE (${fuzzyConditions})
          AND tubes.lab_id = $${paramIndex.current}
      `;
      params.push(fuzzySearchTerm, labId);
      paramIndex.current += 2;

      fuzzySql = this.addLocationFilters(fuzzySql, params, criteria, paramIndex);
      fuzzySql = this.addSampleFilters(fuzzySql, params, criteria, paramIndex);
      fuzzySql = this.addResearcherFilters(fuzzySql, params, criteria, paramIndex);
      fuzzySql = this.addDateRangeFilters(fuzzySql, params, criteria, paramIndex);
      fuzzySql = await this.addPositionLabelFilter(fuzzySql, params, criteria, paramIndex, labId);
    }

    // Layer 3: Researcher name search — AND between concepts, OR within variants
    const researcherConceptConditions: string[] = [];
    for (const conceptVariants of concepts) {
      const variantConditions: string[] = [];
      for (const variant of conceptVariants) {
        const paramNum = paramIndex.current++;
        params.push(`%${variant}%`);
        variantConditions.push(`p.first_name ILIKE $${paramNum} OR p.last_name ILIKE $${paramNum}`);
      }
      researcherConceptConditions.push(`(${variantConditions.join(' OR ')})`);
    }

    let researcherSql = `
      SELECT ${this.TUBE_COLUMNS}, ${SearchRankTier.RESEARCHER_NAME} as rank
      FROM tubes
      LEFT JOIN researchers ON tubes.researcher_id = researchers.id
      INNER JOIN persons p ON researchers.person_id = p.id
      WHERE researchers.id IS NOT NULL
        AND tubes.lab_id = $${paramIndex.current}
        AND ${researcherConceptConditions.join(' AND ')}
    `;
    params.push(labId);
    paramIndex.current++;
    researcherSql = this.addLocationFilters(researcherSql, params, criteria, paramIndex);
    researcherSql = this.addSampleFilters(researcherSql, params, criteria, paramIndex);
    researcherSql = this.addResearcherFilters(researcherSql, params, criteria, paramIndex);
    researcherSql = this.addDateRangeFilters(researcherSql, params, criteria, paramIndex);
    researcherSql = await this.addPositionLabelFilter(researcherSql, params, criteria, paramIndex, labId);

    // Layer 4: ILIKE fallback — AND between concepts, OR within variants/columns
    const ilikeSearchColumns = [
      'cell_type', 'species', 'source', 'donor_internal_id', 'donor_source_id',
      'lot_number', 'notes', 'media_type', 'media_supplements', 'media_selection',
      'culture_condition', 'catalog_number', 'passage_number::TEXT',
      'concentration::TEXT', 'date', 'created_by_name',
    ];

    const ilikeConceptConditions: string[] = [];
    for (const conceptVariants of concepts) {
      const variantConditions: string[] = [];
      for (const variant of conceptVariants) {
        const paramNum = paramIndex.current++;
        params.push(`%${variant}%`);
        variantConditions.push(`(${ilikeSearchColumns.map(col => `${col} ILIKE $${paramNum}`).join(' OR ')})`);
      }
      ilikeConceptConditions.push(`(${variantConditions.join(' OR ')})`);
    }

    let ilikeSql = `
      SELECT ${this.TUBE_COLUMNS}, ${SearchRankTier.ILIKE_FALLBACK} as rank
      FROM tubes
      WHERE tubes.lab_id = $${paramIndex.current}
        AND ${ilikeConceptConditions.join(' AND ')}
    `;
    params.push(labId);
    paramIndex.current++;

    ilikeSql = this.addLocationFilters(ilikeSql, params, criteria, paramIndex);
    ilikeSql = this.addSampleFilters(ilikeSql, params, criteria, paramIndex);
    ilikeSql = this.addResearcherFilters(ilikeSql, params, criteria, paramIndex);
    ilikeSql = this.addDateRangeFilters(ilikeSql, params, criteria, paramIndex);
    ilikeSql = await this.addPositionLabelFilter(ilikeSql, params, criteria, paramIndex, labId);

    // Combine all layers with UNION
    const unionParts = [ftsSql, researcherSql, ilikeSql];
    if (fuzzySql) {
      unionParts.splice(1, 0, fuzzySql); // Insert fuzzy after tsvector
    }

    const combinedSql = `
      SELECT DISTINCT ON (id) * FROM (
        ${unionParts.join('\n        UNION ALL\n        ')}
      ) combined_results
    `;

    // Sorting with SQL injection protection
    const sortBy = criteria.sortBy && this.ALLOWED_SORT_COLUMNS.includes(criteria.sortBy as typeof this.ALLOWED_SORT_COLUMNS[number])
      ? criteria.sortBy
      : 'rank';
    const sortOrder = criteria.sortOrder === 'asc' ? 'ASC' : 'DESC';

    let finalSql = combinedSql;
    if (sortBy === 'rank') {
      finalSql += ` ORDER BY id, rank DESC`; // Higher rank = more relevant
    } else {
      finalSql += ` ORDER BY id, ${sortBy} ${sortOrder}`;
    }

    // Wrap with outer query to apply proper sorting after DISTINCT ON
    finalSql = `
      SELECT * FROM (${finalSql}) sorted_results
      ORDER BY ${sortBy === 'rank' ? 'rank DESC' : `${sortBy} ${sortOrder}`}
    `;

    // Pagination
    if (criteria.limit) {
      finalSql += ` LIMIT $${paramIndex.current++}`;
      params.push(criteria.limit);

      if (criteria.offset) {
        finalSql += ` OFFSET $${paramIndex.current++}`;
        params.push(criteria.offset);
      }
    }

    try {
      const rows = await this.context.queryMany<TubeRow>(finalSql, params);
      return TubeMapper.fromRows(rows);
    } catch (error) {
      logger.error('Full-text search error:', { query: tsqueryTerms, normalizedQuery, error });
      return [];
    }
  }

  private async structuredSearch(criteria: TubeSearchCriteria, labId: string): Promise<Tube[]> {
    let sql = `SELECT ${this.TUBE_COLUMNS} FROM tubes WHERE lab_id = $1`;
    const params: unknown[] = [labId];
    const paramIndex = { current: 2 };

    sql = this.addLocationFilters(sql, params, criteria, paramIndex);
    sql = this.addSampleFilters(sql, params, criteria, paramIndex);
    sql = this.addResearcherFilters(sql, params, criteria, paramIndex);
    sql = this.addDateRangeFilters(sql, params, criteria, paramIndex);
    sql = await this.addPositionLabelFilter(sql, params, criteria, paramIndex, labId);

    if (criteria.createdAfter) {
      sql += ` AND created_at >= $${paramIndex.current++}`;
      params.push(criteria.createdAfter.toISOString());
    }
    if (criteria.createdBefore) {
      sql += ` AND created_at <= $${paramIndex.current++}`;
      params.push(criteria.createdBefore.toISOString());
    }

    // Status criteria
    if (criteria.hasConcentration !== undefined) {
      if (criteria.hasConcentration) {
        sql += ' AND concentration IS NOT NULL';
      } else {
        sql += ' AND concentration IS NULL';
      }
    }
    if (criteria.isComplete !== undefined) {
      if (criteria.isComplete) {
        sql += ' AND cell_type IS NOT NULL AND donor_internal_id IS NOT NULL AND researcher_id IS NOT NULL';
      } else {
        sql += ' AND (cell_type IS NULL OR donor_internal_id IS NULL OR researcher_id IS NULL)';
      }
    }

    // Sorting with SQL injection protection
    const allowedStructuredSorts = ['created_at', 'updated_at', 'cell_type', 'date', 'donor_internal_id', 'donor_source_id', 'lot_number'];
    const sortBy = criteria.sortBy && allowedStructuredSorts.includes(criteria.sortBy)
      ? criteria.sortBy
      : 'created_at';
    const sortOrder = criteria.sortOrder === 'asc' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${sortBy} ${sortOrder}`;

    // Pagination
    if (criteria.limit) {
      sql += ` LIMIT $${paramIndex.current++}`;
      params.push(criteria.limit);

      if (criteria.offset) {
        sql += ` OFFSET $${paramIndex.current++}`;
        params.push(criteria.offset);
      }
    }

    const rows = await this.context.queryMany<TubeRow>(sql, params);
    return TubeMapper.fromRows(rows);
  }

  // BULK OPERATIONS

  /** Skips optimistic locking — used for imports where conflicts are pre-validated. */
  async saveMany(tubes: Tube[]): Promise<void> {
    await this.context.transaction(async (client) => {
      for (const tube of tubes) {
        const row = TubeMapper.toRow(tube);
        await client.query(`
          INSERT INTO tubes (
            id, tank_id, rack_id, box_id, position, cell_type, donor_internal_id,
            donor_source_id, concentration, concentration_unit, date, researcher_id, created_by_name,
            media_type, media_supplements, media_selection, culture_condition, lot_number,
            species, source, catalog_number, passage_number,
            notes, created_at, updated_at,
            is_locked, locked_by, lock_note, locked_at, shared_with_user_ids, lab_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)
          ON CONFLICT (id) DO UPDATE SET
            tank_id = EXCLUDED.tank_id,
            rack_id = EXCLUDED.rack_id,
            box_id = EXCLUDED.box_id,
            position = EXCLUDED.position,
            cell_type = EXCLUDED.cell_type,
            donor_internal_id = EXCLUDED.donor_internal_id,
            donor_source_id = EXCLUDED.donor_source_id,
            concentration = EXCLUDED.concentration,
            concentration_unit = EXCLUDED.concentration_unit,
            date = EXCLUDED.date,
            researcher_id = EXCLUDED.researcher_id,
            created_by_name = EXCLUDED.created_by_name,
            media_type = EXCLUDED.media_type,
            media_supplements = EXCLUDED.media_supplements,
            media_selection = EXCLUDED.media_selection,
            culture_condition = EXCLUDED.culture_condition,
            lot_number = EXCLUDED.lot_number,
            species = EXCLUDED.species,
            source = EXCLUDED.source,
            catalog_number = EXCLUDED.catalog_number,
            passage_number = EXCLUDED.passage_number,
            notes = EXCLUDED.notes,
            updated_at = EXCLUDED.updated_at,
            is_locked = EXCLUDED.is_locked,
            locked_by = EXCLUDED.locked_by,
            lock_note = EXCLUDED.lock_note,
            locked_at = EXCLUDED.locked_at,
            shared_with_user_ids = EXCLUDED.shared_with_user_ids,
            lab_id = EXCLUDED.lab_id
        `, [
          row.id, row.tank_id, row.rack_id, row.box_id, row.position,
          row.cell_type, row.donor_internal_id, row.donor_source_id,
          row.concentration, row.concentration_unit, row.date, row.researcher_id, row.created_by_name,
          row.media_type, row.media_supplements, row.media_selection, row.culture_condition, row.lot_number,
          row.species, row.source, row.catalog_number, row.passage_number,
          row.notes,
          row.created_at, row.updated_at,
          row.is_locked, row.locked_by, row.lock_note, row.locked_at, row.shared_with_user_ids,
          row.lab_id
        ]);
      }
    });
  }

  async deleteMany(ids: string[], labId: string): Promise<number> {
    if (ids.length === 0) return 0;

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const result = await this.context.execute(
      `DELETE FROM tubes WHERE id IN (${placeholders}) AND lab_id = $${ids.length + 1}`,
      [...ids, labId]
    );
    return result.rowCount ?? 0;
  }

  async deleteByTankIds(tankIds: string[], labId: string): Promise<number> {
    if (tankIds.length === 0) return 0;

    const placeholders = tankIds.map((_, i) => `$${i + 1}`).join(',');
    const result = await this.context.execute(
      `DELETE FROM tubes WHERE tank_id IN (${placeholders}) AND lab_id = $${tankIds.length + 1}`,
      [...tankIds, labId]
    );
    return result.rowCount ?? 0;
  }

  // MAINTENANCE OPERATIONS

  async isHealthy(): Promise<boolean> {
    try {
      await this.context.queryOne<{ result: number }>('SELECT 1 as result');
      return true;
    } catch (error) {
      logger.error('Repository health check failed', error);
      return false;
    }
  }

  async getStats(tankIds?: string[], labId?: string): Promise<TubeRepositoryStats> {
    const params: unknown[] = [];
    let paramIdx = 1;

    const conditions: string[] = [];
    if (tankIds && tankIds.length > 0) {
      const placeholders = tankIds.map(() => `$${paramIdx++}`).join(',');
      conditions.push(`tank_id IN (${placeholders})`);
      params.push(...tankIds);
    }
    if (labId) {
      conditions.push(`lab_id = $${paramIdx++}`);
      params.push(labId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const andClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    const totalResult = await this.context.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM tubes ${whereClause}`, params
    );
    const totalTubes = totalResult ? parseInt(totalResult.count, 10) : 0;

    const tankRows = await this.context.queryMany<{ tank_id: string; count: string }>(
      `SELECT tank_id, COUNT(*) as count FROM tubes ${whereClause} GROUP BY tank_id ORDER BY tank_id`, params
    );
    const tubesByTank: Record<string, number> = {};
    tankRows.forEach((row: { tank_id: string; count: string }) => {
      tubesByTank[row.tank_id] = parseInt(row.count, 10);
    });

    const researcherRows = await this.context.queryMany<{ researcher_id: string; count: string }>(
      `SELECT researcher_id, COUNT(*) as count FROM tubes WHERE researcher_id IS NOT NULL ${andClause} GROUP BY researcher_id ORDER BY researcher_id`, params
    );
    const tubesByResearcher: Record<string, number> = {};
    researcherRows.forEach((row: { researcher_id: string; count: string }) => {
      tubesByResearcher[row.researcher_id] = parseInt(row.count, 10);
    });

    const boxCount = await this.context.queryOne<{ count: string }>(
      `SELECT COUNT(DISTINCT tank_id || '-' || rack_id || '-' || box_id) as count FROM tubes ${whereClause}`, params
    );
    const boxCountNum = boxCount ? parseInt(boxCount.count, 10) : 0;
    const averageTubesPerBox = boxCountNum > 0 ? totalTubes / boxCountNum : 0;

    const oldestRow = await this.context.queryOne<{ id: string; created_at: Date }>(
      `SELECT id, created_at FROM tubes ${whereClause} ORDER BY created_at ASC LIMIT 1`, params
    );
    const newestRow = await this.context.queryOne<{ id: string; created_at: Date }>(
      `SELECT id, created_at FROM tubes ${whereClause} ORDER BY created_at DESC LIMIT 1`, params
    );

    const completeCount = await this.context.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM tubes WHERE cell_type IS NOT NULL AND donor_internal_id IS NOT NULL AND researcher_id IS NOT NULL ${andClause}`, params
    );
    const completionRate = totalTubes > 0 ? ((parseInt(completeCount?.count || '0', 10)) / totalTubes) * 100 : 0;

    const expiredCount = await this.context.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM tubes WHERE date < (CURRENT_DATE - INTERVAL '30 days')::text ${andClause}`, params
    );
    const expirationRate = totalTubes > 0 ? ((parseInt(expiredCount?.count || '0', 10)) / totalTubes) * 100 : 0;

    return {
      totalTubes,
      tubesByTank,
      tubesByResearcher,
      averageTubesPerBox,
      oldestTube: oldestRow ? {
        id: oldestRow.id,
        createdAt: oldestRow.created_at instanceof Date ? oldestRow.created_at : new Date(oldestRow.created_at)
      } : undefined,
      newestTube: newestRow ? {
        id: newestRow.id,
        createdAt: newestRow.created_at instanceof Date ? newestRow.created_at : new Date(newestRow.created_at)
      } : undefined,
      completionRate,
      expirationRate
    };
  }
}
