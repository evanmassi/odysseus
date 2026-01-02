import { Researcher } from '@domain/entities/Researcher';

/**
 * Database row structure for researchers table
 */
export interface ResearcherRow {
  id: string;
  person_id: string;
  active: boolean;
  created_at: Date | string;
}

/**
 * ResearcherMapper - Conversion between domain entity and database row
 */
export class ResearcherMapper {

  /**
   * Convert domain entity to database row
   */
  static toRow(researcher: Researcher): ResearcherRow {
    return {
      id: researcher.id,
      person_id: researcher.personId,
      active: researcher.active,
      created_at: researcher.createdAt
    };
  }

  /**
   * Convert database row to domain entity
   */
  static fromRow(row: ResearcherRow): Researcher {
    const createdAt = row.created_at instanceof Date
      ? row.created_at.toISOString()
      : row.created_at;

    return Researcher.fromData({
      id: row.id,
      personId: row.person_id,
      active: row.active,
      createdAt
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
