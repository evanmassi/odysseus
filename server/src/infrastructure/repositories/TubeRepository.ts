import { Tube } from '@domain/entities/Tube';
import { TubeRepository as ITubeRepository } from '@domain/repositories/TubeRepository';
import type { TubeSearchCriteria, TubeSearchResult, TubeRepositoryStats } from '@domain/types/repository';
import { Location } from '@domain/valueObjects/Location';
import { PostgresContext } from '@infrastructure/database/PostgresContext';
import { TubeMapper, TubeRow } from '@infrastructure/database/mappers/TubeMapper';
import {
  normalizeSearchQuery,
  expandWithSynonyms,
  parseQueryIntoConcepts,
  buildTsQueryFromConcepts,
  calculateQueryFuzzyThreshold,
  shouldSkipFuzzyMatching,
  SearchRankTier,
} from '@infrastructure/database/searchUtils';
import { logger } from '@utils/logger';
import { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';

/**
 * TubeRepository implementation
 * Pure data access layer - no business logic
 */
export class TubeRepository implements ITubeRepository {
  constructor(
    private context: PostgresContext,
    private configurationRepository: ConfigurationRepository
  ) {}

  async findById(id: string): Promise<Tube | null> {
    const row = await this.context.queryOne<TubeRow>(
      'SELECT * FROM tubes WHERE id = $1',
      [id]
    );
    return row ? TubeMapper.fromRow(row) : null;
  }

  async findAll(): Promise<Tube[]> {
    const rows = await this.context.queryMany<TubeRow>('SELECT * FROM tubes ORDER BY created_at DESC');
    return TubeMapper.fromRows(rows);
  }

  async save(tube: Tube): Promise<void> {
    const row = TubeMapper.toRow(tube);
    await this.context.execute(`
      INSERT INTO tubes (
        id, tank_id, rack_id, box_id, position, cell_type, donor_internal_id,
        donor_source_id, concentration, concentration_unit, date, researcher_id, created_by_name,
        media, culture_condition, lot_number, notes, created_at, updated_at,
        is_locked, locked_by, lock_note, locked_at, shared_with_user_ids
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
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
        media = EXCLUDED.media,
        culture_condition = EXCLUDED.culture_condition,
        lot_number = EXCLUDED.lot_number,
        notes = EXCLUDED.notes,
        updated_at = EXCLUDED.updated_at,
        is_locked = EXCLUDED.is_locked,
        locked_by = EXCLUDED.locked_by,
        lock_note = EXCLUDED.lock_note,
        locked_at = EXCLUDED.locked_at,
        shared_with_user_ids = EXCLUDED.shared_with_user_ids
    `, [
      row.id, row.tank_id, row.rack_id, row.box_id, row.position,
      row.cell_type, row.donor_internal_id, row.donor_source_id,
      row.concentration, row.concentration_unit, row.date, row.researcher_id, row.created_by_name,
      row.media, row.culture_condition, row.lot_number, row.notes,
      row.created_at, row.updated_at,
      row.is_locked, row.locked_by, row.lock_note, row.locked_at, row.shared_with_user_ids
    ]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.context.execute('DELETE FROM tubes WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // LOCATION-BASED QUERIES

  async findByLocation(location: Location): Promise<Tube | null> {
    const row = await this.context.queryOne<TubeRow>(
      'SELECT * FROM tubes WHERE tank_id = $1 AND rack_id = $2 AND box_id = $3 AND position = $4',
      [location.tankId, location.rackId, location.boxId, location.position]
    );
    return row ? TubeMapper.fromRow(row) : null;
  }

  async findByCompleteLocation(tankId: string, rackId: string, boxId: string): Promise<Tube[]> {
    const rows = await this.context.queryMany<TubeRow>(
      'SELECT * FROM tubes WHERE tank_id = $1 AND rack_id = $2 AND box_id = $3 ORDER BY position',
      [tankId, rackId, boxId]
    );
    return TubeMapper.fromRows(rows);
  }

  async findByRackAndBox(rackId: string, boxId: string): Promise<Tube[]> {
    const rows = await this.context.queryMany<TubeRow>(
      'SELECT * FROM tubes WHERE rack_id = $1 AND box_id = $2 ORDER BY tank_id, position',
      [rackId, boxId]
    );
    return TubeMapper.fromRows(rows);
  }

  async findByTank(tankId: string): Promise<Tube[]> {
    const rows = await this.context.queryMany<TubeRow>(
      'SELECT * FROM tubes WHERE tank_id = $1 ORDER BY rack_id, box_id, position',
      [tankId]
    );
    return TubeMapper.fromRows(rows);
  }

  async findByTankAndRack(tankId: string, rackId: string): Promise<Tube[]> {
    const rows = await this.context.queryMany<TubeRow>(
      'SELECT * FROM tubes WHERE tank_id = $1 AND rack_id = $2 ORDER BY box_id, position',
      [tankId, rackId]
    );
    return TubeMapper.fromRows(rows);
  }

  async isPositionAvailable(location: Location): Promise<boolean> {
    const tube = await this.findByLocation(location);
    return tube === null;
  }

  async getOccupiedPositions(tankId: string, rackId: string, boxId: string): Promise<number[]> {
    const rows = await this.context.queryMany<{ position: number }>(
      'SELECT position FROM tubes WHERE tank_id = $1 AND rack_id = $2 AND box_id = $3 ORDER BY position',
      [tankId, rackId, boxId]
    );
    return rows.map((row: { position: number }) => row.position);
  }

  // RESEARCHER-BASED QUERIES

  async findByResearcher(researcher: string): Promise<Tube[]> {
    const rows = await this.context.queryMany<TubeRow>(
      'SELECT * FROM tubes WHERE researcher_id ILIKE $1 ORDER BY created_at DESC',
      [`%${researcher}%`]
    );
    return TubeMapper.fromRows(rows);
  }

  async getActiveResearchers(): Promise<string[]> {
    const rows = await this.context.queryMany<{ researcher_id: string }>(
      'SELECT DISTINCT researcher_id FROM tubes WHERE researcher_id IS NOT NULL ORDER BY researcher_id'
    );
    return rows.map((row: { researcher_id: string }) => row.researcher_id);
  }

  // BUSINESS QUERIES

  async findExpired(): Promise<Tube[]> {
    const rows = await this.context.queryMany<TubeRow>(
      "SELECT * FROM tubes WHERE date < (CURRENT_DATE - INTERVAL '30 days')::text ORDER BY date"
    );
    return TubeMapper.fromRows(rows);
  }

  async findIncomplete(): Promise<Tube[]> {
    const rows = await this.context.queryMany<TubeRow>(
      'SELECT * FROM tubes WHERE cell_type IS NULL OR donor_internal_id IS NULL OR researcher_id IS NULL'
    );
    return TubeMapper.fromRows(rows);
  }

  async count(): Promise<number> {
    const result = await this.context.queryOne<{ count: string }>('SELECT COUNT(*) as count FROM tubes');
    return result ? parseInt(result.count, 10) : 0;
  }

  async countByResearcher(researcher: string): Promise<number> {
    const result = await this.context.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM tubes WHERE researcher_id = $1',
      [researcher]
    );
    return result ? parseInt(result.count, 10) : 0;
  }

  async countByTank(tankId: string): Promise<number> {
    const result = await this.context.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM tubes WHERE tank_id = $1',
      [tankId]
    );
    return result ? parseInt(result.count, 10) : 0;
  }

  async countByRack(tankId: string, rackId: string): Promise<number> {
    const result = await this.context.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM tubes WHERE tank_id = $1 AND rack_id = $2',
      [tankId, rackId]
    );
    return result ? parseInt(result.count, 10) : 0;
  }

  async countByBox(tankId: string, rackId: string, boxId: string): Promise<number> {
    const result = await this.context.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM tubes WHERE tank_id = $1 AND rack_id = $2 AND box_id = $3',
      [tankId, rackId, boxId]
    );
    return result ? parseInt(result.count, 10) : 0;
  }

  // SEARCH AND FILTERING

  /**
   * Allowed columns for sorting (SQL injection protection)
   */
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

  /**
   * Explicit column list for SELECT queries (avoids SELECT * anti-pattern)
   */
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
    tubes.media,
    tubes.culture_condition,
    tubes.lot_number,
    tubes.notes,
    tubes.created_at,
    tubes.updated_at,
    tubes.is_locked,
    tubes.locked_by,
    tubes.lock_note,
    tubes.locked_at,
    tubes.shared_with_user_ids
  `.trim();

  /**
   * Helper: Add location filters to SQL query
   * Supports both array-based (tankIds, rackIds, boxIds) and legacy single-value filters
   */
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

  /**
   * Helper: Add sample-related filters to SQL query
   * Supports array-based filters for cellTypes, lotNumbers, donorIds, cultureConditions
   */
  private addSampleFilters(
    baseSql: string,
    params: unknown[],
    criteria: TubeSearchCriteria,
    paramIndex: { current: number }
  ): string {
    let sql = baseSql;

    // Array-based sample filters (multiple selection support)
    if (criteria.cellTypes && criteria.cellTypes.length > 0) {
      const placeholders = criteria.cellTypes.map(() => `$${paramIndex.current++}`).join(',');
      sql += ` AND tubes.cell_type IN (${placeholders})`;
      params.push(...criteria.cellTypes);
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

  /**
   * Helper: Add researcher filters to SQL query
   * Supports array-based researcherIds filter
   */
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

  /**
   * Helper: Add date range filters to SQL query
   * Filters by date (YYYY-MM-DD format to prevent timezone bugs)
   */
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
   * Helper: Add position label filter to SQL query
   *
   * Parses alphanumeric position labels (e.g., "C5") using box position display config.
   * Falls back to numeric parsing if label is numeric.
   *
   * NOTE: Position label is box-specific. This method works best when a single box is filtered.
   * If multiple boxes are filtered, the label is parsed using the first box's config.
   */
  private async addPositionLabelFilter(
    baseSql: string,
    params: unknown[],
    criteria: TubeSearchCriteria,
    paramIndex: { current: number }
  ): Promise<string> {
    let sql = baseSql;

    if (!criteria.positionLabel) {
      return sql;
    }

    try {
      // Determine which box to use for position label parsing
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

      // Get configuration to access box position display config
      const configuration = await this.configurationRepository.getCurrent();
      if (!configuration) {
        logger.warn('[TubeRepository] No configuration found for position label parsing');
        return sql;
      }

      // Find the box to get its position display configuration
      const box = configuration.equipment.findBox(tankId, String(rackId), boxId);
      if (!box) {
        logger.warn(`[TubeRepository] Box not found: ${tankId}/${rackId}/${boxId}`);
        return sql;
      }

      // Parse position label using box's parsePositionLabel method
      // This respects the box's position display configuration
      const numericPosition = box.parsePositionLabel(criteria.positionLabel);

      // Add position filter to SQL
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

  /**
   * Enhanced search with comprehensive query support
   * - Supports generic query string that searches ALL fields
   * - Includes researcher name search via JOIN
   * - Supports structured criteria for specific field filtering
   */
  async search(criteria: TubeSearchCriteria): Promise<Tube[]> {
    // If a generic query is provided, search across ALL fields
    if (criteria.query && criteria.query.trim()) {
      return this.comprehensiveSearch(criteria);
    }

    // Otherwise, use structured field-specific search
    return this.structuredSearch(criteria);
  }

  async searchWithHighlighting(criteria: TubeSearchCriteria): Promise<TubeSearchResult> {
    const tubes = await this.search(criteria);

    // Gather all matched terms for highlighting
    const matchedTerms: string[] = [];

    if (criteria.query && criteria.query.trim()) {
      const rawQuery = criteria.query.trim();
      const normalizedQuery = normalizeSearchQuery(rawQuery);
      const expandedTerms = expandWithSynonyms(normalizedQuery);

      // Include original query
      matchedTerms.push(rawQuery.toLowerCase());

      // Include normalized form if different
      if (normalizedQuery !== rawQuery.toLowerCase()) {
        matchedTerms.push(normalizedQuery);
      }

      // Include all expanded synonyms
      for (const term of expandedTerms) {
        if (!matchedTerms.includes(term)) {
          matchedTerms.push(term);
        }
      }

      // Include individual words from normalized query
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
   * Comprehensive full-text search across ALL tube fields
   *
   * Enhanced search with professional-grade features:
   * - Query normalization (hyphen splitting, punctuation handling)
   * - Lab-specific synonym expansion (t-cells = t cells = t lymphocytes)
   * - Fuzzy matching with pg_trgm (catches typos)
   * - Multi-tier ranking (exact > tsvector > synonym > fuzzy > partial)
   *
   * Search layers (in order of relevance):
   * 1. tsvector full-text with synonym expansion
   * 2. Fuzzy matching with pg_trgm similarity
   * 3. Researcher name ILIKE
   * 4. ILIKE fallback for edge cases
   */
  private async comprehensiveSearch(criteria: TubeSearchCriteria): Promise<Tube[]> {
    const rawQuery = criteria.query!.trim();

    // Step 1: Normalize query (split hyphens, clean punctuation)
    const normalizedQuery = normalizeSearchQuery(rawQuery);

    // Step 2: Parse into concept groups with synonyms and alphanumeric variants
    // "Human T-cells" → [["human", "homo sapiens"], ["t cell", "t-cell", "t lymphocyte"]]
    const concepts = parseQueryIntoConcepts(rawQuery);

    // Step 3: Build tsquery with AND between concepts, OR within synonyms
    // Result: (human:* | homo:* & sapiens:*) & (t:* & cell:* | t:* & lymphocyte:*)
    const tsqueryTerms = buildTsQueryFromConcepts(concepts);

    // Flat list for highlighting (used by searchWithHighlighting)
    const expandedTerms = expandWithSynonyms(normalizedQuery);

    // Step 4: Calculate fuzzy threshold based on query length
    const fuzzyThreshold = calculateQueryFuzzyThreshold(normalizedQuery);

    // Individual terms for ILIKE and fuzzy matching
    const searchTerms = normalizedQuery.split(/\s+/).filter(t => t.length > 0);

    const params: unknown[] = [];
    const paramIndex = { current: 1 };

    // ==========================================
    // Layer 1: tsvector full-text search (highest rank)
    // Uses synonym-expanded tsquery for broad matching
    // ==========================================
    let ftsSql = `
      SELECT ${this.TUBE_COLUMNS},
             ts_rank(tubes.search_vector, to_tsquery('english', $${paramIndex.current})) * ${SearchRankTier.TSVECTOR_HIGH} as rank
      FROM tubes
      WHERE tubes.search_vector @@ to_tsquery('english', $${paramIndex.current++})
    `;
    params.push(tsqueryTerms);

    ftsSql = this.addLocationFilters(ftsSql, params, criteria, paramIndex);
    ftsSql = this.addSampleFilters(ftsSql, params, criteria, paramIndex);
    ftsSql = this.addResearcherFilters(ftsSql, params, criteria, paramIndex);
    ftsSql = this.addDateRangeFilters(ftsSql, params, criteria, paramIndex);
    ftsSql = await this.addPositionLabelFilter(ftsSql, params, criteria, paramIndex);

    // ==========================================
    // Layer 2: Fuzzy matching with pg_trgm (catches typos)
    // Only applies to terms that should have fuzzy matching
    // ==========================================
    const fuzzyColumns = ['cell_type', 'donor_internal_id', 'donor_source_id', 'lot_number', 'notes', 'media', 'culture_condition'];
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
      `;
      params.push(fuzzySearchTerm);
      paramIndex.current++;

      fuzzySql = this.addLocationFilters(fuzzySql, params, criteria, paramIndex);
      fuzzySql = this.addSampleFilters(fuzzySql, params, criteria, paramIndex);
      fuzzySql = this.addResearcherFilters(fuzzySql, params, criteria, paramIndex);
      fuzzySql = this.addDateRangeFilters(fuzzySql, params, criteria, paramIndex);
      fuzzySql = await this.addPositionLabelFilter(fuzzySql, params, criteria, paramIndex);
    }

    // ==========================================
    // Layer 3: Researcher name search
    // ==========================================
    let researcherSql = `
      SELECT ${this.TUBE_COLUMNS}, ${SearchRankTier.RESEARCHER_NAME} as rank
      FROM tubes
      LEFT JOIN researchers ON tubes.researcher_id = researchers.id
      INNER JOIN persons p ON researchers.person_id = p.id
      WHERE researchers.id IS NOT NULL
        AND (
    `;

    const researcherConditions: string[] = [];
    for (const term of searchTerms) {
      researcherConditions.push(`(p.first_name ILIKE $${paramIndex.current++} OR p.last_name ILIKE $${paramIndex.current++})`);
      params.push(`%${term}%`, `%${term}%`);
    }

    researcherSql += researcherConditions.join(' OR ') + ')';
    researcherSql = this.addLocationFilters(researcherSql, params, criteria, paramIndex);
    researcherSql = this.addSampleFilters(researcherSql, params, criteria, paramIndex);
    researcherSql = this.addResearcherFilters(researcherSql, params, criteria, paramIndex);
    researcherSql = this.addDateRangeFilters(researcherSql, params, criteria, paramIndex);
    researcherSql = await this.addPositionLabelFilter(researcherSql, params, criteria, paramIndex);

    // ==========================================
    // Layer 4: ILIKE fallback (catches edge cases)
    // Uses both original and normalized patterns
    // ==========================================
    const ilikePatterns = [
      `%${rawQuery}%`,      // Original query
      `%${normalizedQuery}%` // Normalized (hyphen-split)
    ];

    // Also add individual word patterns for partial matching
    for (const term of searchTerms) {
      if (term.length >= 2) {
        ilikePatterns.push(`%${term}%`);
      }
    }

    // Deduplicate patterns
    const uniquePatterns = [...new Set(ilikePatterns)];

    let ilikeSql = `
      SELECT ${this.TUBE_COLUMNS}, ${SearchRankTier.ILIKE_FALLBACK} as rank
      FROM tubes
      WHERE (
    `;

    const ilikeConditions: string[] = [];
    for (const pattern of uniquePatterns) {
      const patternParam = `$${paramIndex.current++}`;
      params.push(pattern);
      ilikeConditions.push(`
        cell_type ILIKE ${patternParam}
        OR donor_internal_id ILIKE ${patternParam}
        OR donor_source_id ILIKE ${patternParam}
        OR lot_number ILIKE ${patternParam}
        OR notes ILIKE ${patternParam}
        OR media ILIKE ${patternParam}
        OR culture_condition ILIKE ${patternParam}
        OR concentration::TEXT ILIKE ${patternParam}
        OR date ILIKE ${patternParam}
        OR created_by_name ILIKE ${patternParam}
      `);
    }

    ilikeSql += ilikeConditions.join(' OR ') + ')';

    ilikeSql = this.addLocationFilters(ilikeSql, params, criteria, paramIndex);
    ilikeSql = this.addSampleFilters(ilikeSql, params, criteria, paramIndex);
    ilikeSql = this.addResearcherFilters(ilikeSql, params, criteria, paramIndex);
    ilikeSql = this.addDateRangeFilters(ilikeSql, params, criteria, paramIndex);
    ilikeSql = await this.addPositionLabelFilter(ilikeSql, params, criteria, paramIndex);

    // ==========================================
    // Combine all layers with UNION
    // ==========================================
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
      const tubes = TubeMapper.fromRows(rows);

      // Post-filter: ensure ALL concepts are present
      // Even single concepts need filtering because ILIKE fallback matches individual words
      if (concepts.length > 0) {
        return this.filterByAllConcepts(tubes, concepts);
      }

      return tubes;
    } catch (error) {
      logger.error('Full-text search error:', { query: tsqueryTerms, normalizedQuery, error });
      return [];
    }
  }

  /**
   * Filter tubes to ensure ALL search concepts are present.
   * Must check same fields as ILIKE fallback to avoid false negatives.
   */
  private filterByAllConcepts(tubes: Tube[], concepts: string[][]): Tube[] {
    return tubes.filter(tube => {
      // Build searchable text from all fields that ILIKE searches
      const searchableText = [
        tube.sample.cellType,
        tube.sample.donorInternalId,
        tube.sample.donorSourceId,
        tube.sample.lotNumber,
        tube.sample.notes,
        tube.sample.cultureCondition,
        tube.sample.media?.type,
        tube.sample.media?.supplements,
        tube.sample.media?.selection,
        tube.sample.concentration?.toString(),
        tube.sample.date,
        tube.createdByName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      // Every concept must have at least one variant present
      return concepts.every(conceptVariants =>
        conceptVariants.some(variant => searchableText.includes(variant.toLowerCase()))
      );
    });
  }

  /**
   * Structured search using specific field criteria
   * Used when no generic query is provided
   */
  private async structuredSearch(criteria: TubeSearchCriteria): Promise<Tube[]> {
    let sql = 'SELECT * FROM tubes WHERE 1=1';
    const params: unknown[] = [];
    const paramIndex = { current: 1 };

    // Apply all filters using helper methods
    sql = this.addLocationFilters(sql, params, criteria, paramIndex);
    sql = this.addSampleFilters(sql, params, criteria, paramIndex);
    sql = this.addResearcherFilters(sql, params, criteria, paramIndex);
    sql = this.addDateRangeFilters(sql, params, criteria, paramIndex);
    sql = await this.addPositionLabelFilter(sql, params, criteria, paramIndex);

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

  async findByCellType(cellType: string): Promise<Tube[]> {
    const rows = await this.context.queryMany<TubeRow>(
      'SELECT * FROM tubes WHERE cell_type ILIKE $1 ORDER BY created_at DESC',
      [`%${cellType}%`]
    );
    return TubeMapper.fromRows(rows);
  }

  async findByDateRange(startDate: string, endDate: string): Promise<Tube[]> {
    const rows = await this.context.queryMany<TubeRow>(
      'SELECT * FROM tubes WHERE date BETWEEN $1 AND $2 ORDER BY date',
      [startDate, endDate]
    );
    return TubeMapper.fromRows(rows);
  }

  async findWithConcentration(): Promise<Tube[]> {
    const rows = await this.context.queryMany<TubeRow>(
      'SELECT * FROM tubes WHERE concentration IS NOT NULL ORDER BY concentration DESC'
    );
    return TubeMapper.fromRows(rows);
  }

  // BULK OPERATIONS

  async saveMany(tubes: Tube[]): Promise<void> {
    await this.context.transaction(async (client) => {
      for (const tube of tubes) {
        const row = TubeMapper.toRow(tube);
        await client.query(`
          INSERT INTO tubes (
            id, tank_id, rack_id, box_id, position, cell_type, donor_internal_id,
            donor_source_id, concentration, concentration_unit, date, researcher_id, created_by_name,
            media, culture_condition, lot_number, notes, created_at, updated_at,
            is_locked, locked_by, lock_note, locked_at, shared_with_user_ids
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
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
            media = EXCLUDED.media,
            culture_condition = EXCLUDED.culture_condition,
            lot_number = EXCLUDED.lot_number,
            notes = EXCLUDED.notes,
            updated_at = EXCLUDED.updated_at,
            is_locked = EXCLUDED.is_locked,
            locked_by = EXCLUDED.locked_by,
            lock_note = EXCLUDED.lock_note,
            locked_at = EXCLUDED.locked_at,
            shared_with_user_ids = EXCLUDED.shared_with_user_ids
        `, [
          row.id, row.tank_id, row.rack_id, row.box_id, row.position,
          row.cell_type, row.donor_internal_id, row.donor_source_id,
          row.concentration, row.concentration_unit, row.date, row.researcher_id, row.created_by_name,
          row.media, row.culture_condition, row.lot_number, row.notes,
          row.created_at, row.updated_at,
          row.is_locked, row.locked_by, row.lock_note, row.locked_at, row.shared_with_user_ids
        ]);
      }
    });
  }

  async deleteMany(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const result = await this.context.execute(
      `DELETE FROM tubes WHERE id IN (${placeholders})`,
      ids
    );
    return result.rowCount ?? 0;
  }

  async updateResearcherForMany(tubeIds: string[], newResearcher: string): Promise<number> {
    if (tubeIds.length === 0) return 0;

    const placeholders = tubeIds.map((_, i) => `$${i + 3}`).join(',');
    const result = await this.context.execute(
      `UPDATE tubes SET researcher_id = $1, updated_at = $2 WHERE id IN (${placeholders})`,
      [newResearcher, new Date(), ...tubeIds]
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

  async getStats(): Promise<TubeRepositoryStats> {
    const totalTubes = await this.count();

    const tankRows = await this.context.queryMany<{ tank_id: string; count: string }>(
      'SELECT tank_id, COUNT(*) as count FROM tubes GROUP BY tank_id ORDER BY tank_id'
    );
    const tubesByTank: Record<string, number> = {};
    tankRows.forEach((row: { tank_id: string; count: string }) => {
      tubesByTank[row.tank_id] = parseInt(row.count, 10);
    });

    const researcherRows = await this.context.queryMany<{ researcher_id: string; count: string }>(
      'SELECT researcher_id, COUNT(*) as count FROM tubes WHERE researcher_id IS NOT NULL GROUP BY researcher_id ORDER BY researcher_id'
    );
    const tubesByResearcher: Record<string, number> = {};
    researcherRows.forEach((row: { researcher_id: string; count: string }) => {
      tubesByResearcher[row.researcher_id] = parseInt(row.count, 10);
    });

    const boxCount = await this.context.queryOne<{ count: string }>(
      "SELECT COUNT(DISTINCT tank_id || '-' || rack_id || '-' || box_id) as count FROM tubes"
    );
    const boxCountNum = boxCount ? parseInt(boxCount.count, 10) : 0;
    const averageTubesPerBox = boxCountNum > 0 ? totalTubes / boxCountNum : 0;

    const oldestRow = await this.context.queryOne<{ id: string; created_at: Date }>(
      'SELECT id, created_at FROM tubes ORDER BY created_at ASC LIMIT 1'
    );
    const newestRow = await this.context.queryOne<{ id: string; created_at: Date }>(
      'SELECT id, created_at FROM tubes ORDER BY created_at DESC LIMIT 1'
    );

    const completeCount = await this.context.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM tubes WHERE cell_type IS NOT NULL AND donor_internal_id IS NOT NULL AND researcher_id IS NOT NULL'
    );
    const completionRate = totalTubes > 0 ? ((parseInt(completeCount?.count || '0', 10)) / totalTubes) * 100 : 0;

    const expiredCount = await this.context.queryOne<{ count: string }>(
      "SELECT COUNT(*) as count FROM tubes WHERE date < (CURRENT_DATE - INTERVAL '30 days')::text"
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
