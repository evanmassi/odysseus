import { Researcher } from '@domain/entities/Researcher';
import { SqliteDateMapper } from '@infrastructure/database/SqliteDateMapper';

/**
 * Database row structure for researchers table
 */
export interface ResearcherRow {
  id: string;
  personId: string;
  active: number; // SQLite stores boolean as 0/1
  createdAt: string;
}

/**
 * ResearcherMapper - Clean conversion between Domain Entity and Database Row
 *
 * Handles all mapping logic without business rules.
 * Pure transformation functions.
 */
export class ResearcherMapper {

  /**
   * Convert Domain Entity to Database Row
   */
  static toRow(researcher: Researcher): ResearcherRow {
    return {
      id: researcher.id,
      personId: researcher.personId,
      active: researcher.active ? 1 : 0,
      createdAt: SqliteDateMapper.toDbDateTime(researcher.createdAt)
    };
  }

  /**
   * Convert Database Row to Domain Entity
   */
  static fromRow(row: ResearcherRow): Researcher {
    return Researcher.fromData({
      id: row.id,
      personId: row.personId,
      active: Boolean(row.active),
      createdAt: SqliteDateMapper.fromDbDateTime(row.createdAt)!.toISOString()
    });
  }

  /**
   * Convert multiple rows to entities
   */
  static fromRows(rows: ResearcherRow[]): Researcher[] {
    return rows.map(row => this.fromRow(row));
  }

  /**
   * Convert multiple entities to rows
   */
  static toRows(researchers: Researcher[]): ResearcherRow[] {
    return researchers.map(researcher => this.toRow(researcher));
  }
}
