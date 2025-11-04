import { Database } from 'better-sqlite3';
import { Tube } from '@domain/entities/Tube';
import { TubeRepository, TubeSearchCriteria, TubeRepositoryStats } from '@domain/repositories/TubeRepository';
import { Location } from '@domain/valueObjects/Location';
import { SQLiteContext } from '@infrastructure/database/SQLiteContext';
import { TubeMapper, TubeRow } from '@infrastructure/database/mappers/TubeMapper';
import { logger } from '@utils/logger';
import { ConfigurationRepository } from '@domain/repositories/ConfigurationRepository';

/**
 * SQLite implementation of TubeRepository
 * Pure data access layer - no business logic
 */
export class SQLiteTubeRepository implements TubeRepository {
  constructor(
    private context: SQLiteContext,
    private configurationRepository: ConfigurationRepository
  ) {}

  async findById(id: string): Promise<Tube | null> {
    const row = await this.context.queryOne<TubeRow>(
      'SELECT * FROM tubes WHERE id = ?',
      [id]
    );
    return row ? TubeMapper.fromRow(row) : null;
  }

  async findAll(): Promise<Tube[]> {
    const rows = await this.context.queryMany<TubeRow>('SELECT * FROM tubes ORDER BY createdAt DESC');
    return TubeMapper.fromRows(rows);
  }

  async save(tube: Tube): Promise<void> {
    const row = TubeMapper.toRow(tube);
    await this.context.execute(`
      INSERT OR REPLACE INTO tubes (
        id, tankId, rackId, boxId, position, cellType, donorInternalId,
        donorSourceId, concentration, concentrationUnit, date, researcherId, createdByName,
        media, cultureCondition, lotNumber, notes, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      row.id, row.tankId, row.rackId, row.boxId, row.position,
      row.cellType, row.donorInternalId, row.donorSourceId,
      row.concentration, row.concentrationUnit, row.date, row.researcherId, row.createdByName,
      row.media, row.cultureCondition, row.lotNumber, row.notes,
      row.createdAt, row.updatedAt
    ]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.context.execute('DELETE FROM tubes WHERE id = ?', [id]);
    return result.changes > 0;
  }

  // LOCATION-BASED QUERIES

  async findByLocation(location: Location): Promise<Tube | null> {
    const row = await this.context.queryOne<TubeRow>(
      'SELECT * FROM tubes WHERE tankId = ? AND rackId = ? AND boxId = ? AND position = ?',
      [location.tankId, location.rackId, location.boxId, location.position]
    );
    return row ? TubeMapper.fromRow(row) : null;
  }

  async findByCompleteLocation(tankId: string, rackId: string, boxId: string): Promise<Tube[]> {
    const rows = await this.context.queryMany<TubeRow>(
      'SELECT * FROM tubes WHERE tankId = ? AND rackId = ? AND boxId = ? ORDER BY position',
      [tankId, rackId, boxId]
    );
    return TubeMapper.fromRows(rows);
  }

  async findByRackAndBox(rackId: string, boxId: string): Promise<Tube[]> {
    const rows = await this.context.queryMany<TubeRow>(
      'SELECT * FROM tubes WHERE rackId = ? AND boxId = ? ORDER BY tankId, position',
      [rackId, boxId]
    );
    return TubeMapper.fromRows(rows);
  }

  async findByTank(tankId: string): Promise<Tube[]> {
    const rows = await this.context.queryMany<TubeRow>(
      'SELECT * FROM tubes WHERE tankId = ? ORDER BY rackId, boxId, position',
      [tankId]
    );
    return TubeMapper.fromRows(rows);
  }

  async findByTankAndRack(tankId: string, rackId: string): Promise<Tube[]> {
    const rows = await this.context.queryMany<TubeRow>(
      'SELECT * FROM tubes WHERE tankId = ? AND rackId = ? ORDER BY boxId, position',
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
      'SELECT position FROM tubes WHERE tankId = ? AND rackId = ? AND boxId = ? ORDER BY position',
      [tankId, rackId, boxId]
    );
    return rows.map((row: { position: number }) => row.position);
  }

  // RESEARCHER-BASED QUERIES

  async findByResearcher(researcher: string): Promise<Tube[]> {
    const rows = await this.context.queryMany<TubeRow>(
      'SELECT * FROM tubes WHERE researcherId LIKE ? ORDER BY createdAt DESC',
      [`%${researcher}%`]
    );
    return TubeMapper.fromRows(rows);
  }

  async getActiveResearchers(): Promise<string[]> {
    const rows = await this.context.queryMany<{ researcherId: string }>(
      'SELECT DISTINCT researcherId FROM tubes WHERE researcherId IS NOT NULL ORDER BY researcherId'
    );
    return rows.map((row: { researcherId: string }) => row.researcherId);
  }

  // BUSINESS QUERIES

  async findExpired(): Promise<Tube[]> {
    const rows = await this.context.queryMany<TubeRow>(
      'SELECT * FROM tubes WHERE date < date("now", "-30 days") ORDER BY date'
    );
    return TubeMapper.fromRows(rows);
  }

  async findIncomplete(): Promise<Tube[]> {
    const rows = await this.context.queryMany<TubeRow>(
      'SELECT * FROM tubes WHERE cellType IS NULL OR donorInternalId IS NULL OR researcherId IS NULL'
    );
    return TubeMapper.fromRows(rows);
  }

  async count(): Promise<number> {
    const result = await this.context.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM tubes');
    return result?.count || 0;
  }

  async countByResearcher(researcher: string): Promise<number> {
    const result = await this.context.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM tubes WHERE researcherId = ?',
      [researcher]
    );
    return result?.count || 0;
  }

  async countByTank(tankId: string): Promise<number> {
    const result = await this.context.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM tubes WHERE tankId = ?',
      [tankId]
    );
    return result?.count || 0;
  }

  async countByRack(tankId: string, rackId: string): Promise<number> {
    const result = await this.context.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM tubes WHERE tankId = ? AND rackId = ?',
      [tankId, rackId]
    );
    return result?.count || 0;
  }

  async countByBox(tankId: string, rackId: string, boxId: string): Promise<number> {
    const result = await this.context.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM tubes WHERE tankId = ? AND rackId = ? AND boxId = ?',
      [tankId, rackId, boxId]
    );
    return result?.count || 0;
  }

  // SEARCH AND FILTERING

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

  /**
   * Comprehensive FTS5-powered search across ALL tube fields
   *
   * Uses SQLite FTS5 for optimized performance:
   * - Searches: cellType, donorInternalId, donorSourceId, lotNumber, notes,
   *             media, cultureCondition, concentration, date, researcher name
   * - BM25 relevance ranking built-in
   * - Optimized for substring matching (no index penalty for LIKE %query%)
   * - Scales to millions of records
   */
  /**
   * Allowed columns for sorting (SQL injection protection)
   */
  private readonly ALLOWED_SORT_COLUMNS = [
    'rank',
    'createdAt',
    'updatedAt',
    'cellType',
    'date',
    'donorInternalId',
    'donorSourceId',
    'lotNumber'
  ] as const;

  /**
   * Explicit column list for SELECT queries (avoids SELECT * anti-pattern)
   */
  private readonly TUBE_COLUMNS = `
    tubes.id,
    tubes.tankId,
    tubes.rackId,
    tubes.boxId,
    tubes.position,
    tubes.cellType,
    tubes.donorInternalId,
    tubes.donorSourceId,
    tubes.concentration,
    tubes.concentrationUnit,
    tubes.date,
    tubes.researcherId,
    tubes.media,
    tubes.cultureCondition,
    tubes.lotNumber,
    tubes.notes,
    tubes.createdAt,
    tubes.updatedAt
  `.trim();

  /**
   * Helper: Add location filters to SQL query
   * Supports both array-based (tankIds, rackIds, boxIds) and legacy single-value filters
   */
  private addLocationFilters(baseSql: string, params: any[], criteria: TubeSearchCriteria): string {
    let sql = baseSql;

    // Array-based filters (multiple selection support)
    if (criteria.tankIds && criteria.tankIds.length > 0) {
      const placeholders = criteria.tankIds.map(() => '?').join(',');
      sql += ` AND tubes.tankId IN (${placeholders})`;
      params.push(...criteria.tankIds);
    }
    if (criteria.rackIds && criteria.rackIds.length > 0) {
      const placeholders = criteria.rackIds.map(() => '?').join(',');
      sql += ` AND tubes.rackId IN (${placeholders})`;
      params.push(...criteria.rackIds);
    }
    if (criteria.boxIds && criteria.boxIds.length > 0) {
      const placeholders = criteria.boxIds.map(() => '?').join(',');
      sql += ` AND tubes.boxId IN (${placeholders})`;
      params.push(...criteria.boxIds);
    }

    // Legacy single-value filters (backwards compatibility)
    if (criteria.tankId) {
      sql += ' AND tubes.tankId = ?';
      params.push(criteria.tankId);
    }
    if (criteria.rackId !== undefined) {
      sql += ' AND tubes.rackId = ?';
      params.push(criteria.rackId);
    }
    if (criteria.boxId) {
      sql += ' AND tubes.boxId = ?';
      params.push(criteria.boxId);
    }

    return sql;
  }

  /**
   * Helper: Add sample-related filters to SQL query
   * Supports array-based filters for cellTypes, lotNumbers, donorIds, cultureConditions
   */
  private addSampleFilters(baseSql: string, params: any[], criteria: TubeSearchCriteria): string {
    let sql = baseSql;

    // Array-based sample filters (multiple selection support)
    if (criteria.cellTypes && criteria.cellTypes.length > 0) {
      const placeholders = criteria.cellTypes.map(() => '?').join(',');
      sql += ` AND tubes.cellType IN (${placeholders})`;
      params.push(...criteria.cellTypes);
    }
    if (criteria.lotNumbers && criteria.lotNumbers.length > 0) {
      const placeholders = criteria.lotNumbers.map(() => '?').join(',');
      sql += ` AND tubes.lotNumber IN (${placeholders})`;
      params.push(...criteria.lotNumbers);
    }
    if (criteria.donorInternalIds && criteria.donorInternalIds.length > 0) {
      const placeholders = criteria.donorInternalIds.map(() => '?').join(',');
      sql += ` AND tubes.donorInternalId IN (${placeholders})`;
      params.push(...criteria.donorInternalIds);
    }
    if (criteria.donorSourceIds && criteria.donorSourceIds.length > 0) {
      const placeholders = criteria.donorSourceIds.map(() => '?').join(',');
      sql += ` AND tubes.donorSourceId IN (${placeholders})`;
      params.push(...criteria.donorSourceIds);
    }
    if (criteria.cultureConditions && criteria.cultureConditions.length > 0) {
      const placeholders = criteria.cultureConditions.map(() => '?').join(',');
      sql += ` AND tubes.cultureCondition IN (${placeholders})`;
      params.push(...criteria.cultureConditions);
    }

    // Legacy single-value filters (backwards compatibility)
    if (criteria.cellType) {
      sql += ' AND tubes.cellType = ?';
      params.push(criteria.cellType);
    }
    if (criteria.donorInternalId) {
      sql += ' AND tubes.donorInternalId = ?';
      params.push(criteria.donorInternalId);
    }
    if (criteria.donorSourceId) {
      sql += ' AND tubes.donorSourceId = ?';
      params.push(criteria.donorSourceId);
    }

    return sql;
  }

  /**
   * Helper: Add researcher filters to SQL query
   * Supports array-based researcherIds filter
   */
  private addResearcherFilters(baseSql: string, params: any[], criteria: TubeSearchCriteria): string {
    let sql = baseSql;

    // Array-based researcher filter (multiple selection support)
    if (criteria.researcherIds && criteria.researcherIds.length > 0) {
      const placeholders = criteria.researcherIds.map(() => '?').join(',');
      sql += ` AND tubes.researcherId IN (${placeholders})`;
      params.push(...criteria.researcherIds);
    }

    // Legacy single-value filter (backwards compatibility)
    if (criteria.researcher) {
      sql += ' AND tubes.researcherId = ?';
      params.push(criteria.researcher);
    }

    return sql;
  }

  /**
   * Helper: Add date range filters to SQL query
   * Filters by date (YYYY-MM-DD format to prevent timezone bugs)
   */
  private addDateRangeFilters(baseSql: string, params: any[], criteria: TubeSearchCriteria): string {
    let sql = baseSql;

    if (criteria.dateFrom) {
      sql += ' AND tubes.date >= ?';
      params.push(criteria.dateFrom);
    }
    if (criteria.dateTo) {
      sql += ' AND tubes.date <= ?';
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
    params: any[],
    criteria: TubeSearchCriteria
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
          sql += ' AND tubes.position = ?';
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
      sql += ' AND tubes.position = ?';
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
   * Production-quality comprehensive search with FTS5 + researcher name matching
   */
  private async comprehensiveSearch(criteria: TubeSearchCriteria): Promise<Tube[]> {
    const query = criteria.query!.trim();
    const terms = query.split(/\s+/).filter(t => t.length > 0);

    // Build FTS5 query with AND logic (all terms must match)
    const ftsQuery = terms.map(term => {
      const escaped = term.replace(/"/g, '""');
      return `"${escaped}"*`;
    }).join(' AND ');

    const params: any[] = [];

    // Build FTS5 search query
    let ftsSearchSql = `
      SELECT ${this.TUBE_COLUMNS}, bm25(tubes_fts) as rank
      FROM tubes_fts
      INNER JOIN tubes ON tubes.id = tubes_fts.tubeId
      WHERE tubes_fts MATCH ?
    `;
    params.push(ftsQuery);
    ftsSearchSql = this.addLocationFilters(ftsSearchSql, params, criteria);
    ftsSearchSql = this.addSampleFilters(ftsSearchSql, params, criteria);
    ftsSearchSql = this.addResearcherFilters(ftsSearchSql, params, criteria);
    ftsSearchSql = this.addDateRangeFilters(ftsSearchSql, params, criteria);
    ftsSearchSql = await this.addPositionLabelFilter(ftsSearchSql, params, criteria);

    // Build researcher name search query (with NULL safety)
    let researcherSearchSql = `
      SELECT ${this.TUBE_COLUMNS}, 100 as rank
      FROM tubes
      LEFT JOIN researchers ON tubes.researcherId = researchers.id
      INNER JOIN persons p ON researchers.personId = p.id
      WHERE researchers.id IS NOT NULL
        AND (
    `;

    const researcherConditions: string[] = [];
    for (const term of terms) {
      researcherConditions.push(`(p.firstName LIKE ? OR p.lastName LIKE ?)`);
      params.push(`%${term}%`, `%${term}%`);
    }

    researcherSearchSql += researcherConditions.join(' OR ') + ')';
    researcherSearchSql = this.addLocationFilters(researcherSearchSql, params, criteria);
    researcherSearchSql = this.addSampleFilters(researcherSearchSql, params, criteria);
    researcherSearchSql = this.addResearcherFilters(researcherSearchSql, params, criteria);
    researcherSearchSql = this.addDateRangeFilters(researcherSearchSql, params, criteria);
    researcherSearchSql = await this.addPositionLabelFilter(researcherSearchSql, params, criteria);

    // Combine both queries with UNION
    const combinedSql = `
      SELECT DISTINCT * FROM (
        ${ftsSearchSql}
        UNION
        ${researcherSearchSql}
      ) combined_results
    `;

    // Sorting with SQL injection protection
    const sortBy = criteria.sortBy && this.ALLOWED_SORT_COLUMNS.includes(criteria.sortBy as any)
      ? criteria.sortBy
      : 'rank';
    const sortOrder = criteria.sortOrder === 'desc' ? 'DESC' : 'ASC';

    let finalSql = combinedSql;
    if (sortBy === 'rank') {
      finalSql += ` ORDER BY rank ASC`; // BM25: lower is more relevant
    } else {
      finalSql += ` ORDER BY ${sortBy} ${sortOrder}`;
    }

    // Pagination
    if (criteria.limit) {
      finalSql += ' LIMIT ?';
      params.push(criteria.limit);

      if (criteria.offset) {
        finalSql += ' OFFSET ?';
        params.push(criteria.offset);
      }
    }

    try {
      const rows = await this.context.queryMany<TubeRow>(finalSql, params);
      return TubeMapper.fromRows(rows);
    } catch (error) {
      logger.error('FTS5 search error:', { query: ftsQuery, error });
      return [];
    }
  }

  /**
   * Structured search using specific field criteria
   * Used when no generic query is provided
   */
  private async structuredSearch(criteria: TubeSearchCriteria): Promise<Tube[]> {
    let sql = 'SELECT * FROM tubes WHERE 1=1';
    const params: any[] = [];

    // Apply all filters using helper methods
    sql = this.addLocationFilters(sql, params, criteria);
    sql = this.addSampleFilters(sql, params, criteria);
    sql = this.addResearcherFilters(sql, params, criteria);
    sql = this.addDateRangeFilters(sql, params, criteria);
    sql = await this.addPositionLabelFilter(sql, params, criteria);
    if (criteria.createdAfter) {
      sql += ' AND createdAt >= ?';
      params.push(criteria.createdAfter.toISOString());
    }
    if (criteria.createdBefore) {
      sql += ' AND createdAt <= ?';
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
        sql += ' AND cellType IS NOT NULL AND donorInternalId IS NOT NULL AND researcherId IS NOT NULL';
      } else {
        sql += ' AND (cellType IS NULL OR donorInternalId IS NULL OR researcherId IS NULL)';
      }
    }

    // Sorting
    const sortBy = criteria.sortBy || 'createdAt';
    const sortOrder = criteria.sortOrder || 'desc';
    sql += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

    // Pagination
    if (criteria.limit) {
      sql += ' LIMIT ?';
      params.push(criteria.limit);

      if (criteria.offset) {
        sql += ' OFFSET ?';
        params.push(criteria.offset);
      }
    }

    const rows = await this.context.queryMany<TubeRow>(sql, params);
    return TubeMapper.fromRows(rows);
  }

  async findByCellType(cellType: string): Promise<Tube[]> {
    const rows = await this.context.queryMany<TubeRow>(
      'SELECT * FROM tubes WHERE cellType LIKE ? ORDER BY createdAt DESC',
      [`%${cellType}%`]
    );
    return TubeMapper.fromRows(rows);
  }

  async findByDateRange(startDate: string, endDate: string): Promise<Tube[]> {
    const rows = await this.context.queryMany<TubeRow>(
      'SELECT * FROM tubes WHERE date BETWEEN ? AND ? ORDER BY date',
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
    await this.context.transaction(() => {
      for (const tube of tubes) {
        const row = TubeMapper.toRow(tube);
        this.context.execute(`
          INSERT OR REPLACE INTO tubes (
            id, tankId, rackId, boxId, position, cellType, donorInternalId,
            donorSourceId, concentration, concentrationUnit, date, researcherId,
            media, cultureCondition, lotNumber, notes, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          row.id, row.tankId, row.rackId, row.boxId, row.position,
          row.cellType, row.donorInternalId, row.donorSourceId,
          row.concentration, row.concentrationUnit, row.date, row.researcherId,
          row.media, row.cultureCondition, row.lotNumber, row.notes,
          row.createdAt, row.updatedAt
        ]);
      }
    });
  }

  async deleteMany(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;

    const result = await this.context.execute(
      `DELETE FROM tubes WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
    return result.changes;
  }

  async updateResearcherForMany(tubeIds: string[], newResearcher: string): Promise<number> {
    if (tubeIds.length === 0) return 0;

    const result = await this.context.execute(
      `UPDATE tubes SET researcherId = ?, updatedAt = ? WHERE id IN (${tubeIds.map(() => '?').join(',')})`,
      [newResearcher, new Date().toISOString(), ...tubeIds]
    );
    return result.changes;
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

    const tankRows = await this.context.queryMany<{ tankId: string; count: number }>(
      'SELECT tankId, COUNT(*) as count FROM tubes GROUP BY tankId ORDER BY tankId'
    );
    const tubesByTank: Record<string, number> = {};
    tankRows.forEach((row: { tankId: string; count: number }) => {
      tubesByTank[row.tankId] = row.count;
    });

    const researcherRows = await this.context.queryMany<{ researcherId: string; count: number }>(
      'SELECT researcherId, COUNT(*) as count FROM tubes WHERE researcherId IS NOT NULL GROUP BY researcherId ORDER BY researcherId'
    );
    const tubesByResearcher: Record<string, number> = {};
    researcherRows.forEach((row: { researcherId: string; count: number }) => {
      tubesByResearcher[row.researcherId] = row.count;
    });

    const boxCount = await this.context.queryOne<{ count: number }>(
      'SELECT COUNT(DISTINCT tankId || "-" || rackId || "-" || boxId) as count FROM tubes'
    );
    const averageTubesPerBox = boxCount && boxCount.count > 0 ? totalTubes / boxCount.count : 0;

    const oldestRow = await this.context.queryOne<{ id: string; createdAt: string }>(
      'SELECT id, createdAt FROM tubes ORDER BY createdAt ASC LIMIT 1'
    );
    const newestRow = await this.context.queryOne<{ id: string; createdAt: string }>(
      'SELECT id, createdAt FROM tubes ORDER BY createdAt DESC LIMIT 1'
    );

    const completeCount = await this.context.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM tubes WHERE cellType IS NOT NULL AND donorInternalId IS NOT NULL AND researcherId IS NOT NULL'
    );
    const completionRate = totalTubes > 0 ? ((completeCount?.count || 0) / totalTubes) * 100 : 0;

    const expiredCount = await this.context.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM tubes WHERE date < date("now", "-30 days")'
    );
    const expirationRate = totalTubes > 0 ? ((expiredCount?.count || 0) / totalTubes) * 100 : 0;

    return {
      totalTubes,
      tubesByTank,
      tubesByResearcher,
      averageTubesPerBox,
      oldestTube: oldestRow ? {
        id: oldestRow.id,
        createdAt: new Date(oldestRow.createdAt)
      } : undefined,
      newestTube: newestRow ? {
        id: newestRow.id,
        createdAt: new Date(newestRow.createdAt)
      } : undefined,
      completionRate,
      expirationRate
    };
  }
}

