/**
 * Researcher Mapper
 *
 * Converts between database rows and Researcher domain entities.
 */

import type { ResearcherSource } from '@domain/entities/Researcher';
import { Researcher } from '@domain/entities/Researcher';
import { toISOString } from '@infrastructure/database/PostgresContext';

export interface ResearcherRow {
  id: string;
  person_id: string;
  active: boolean;
  created_at: Date | string;
  source: ResearcherSource;
  lab_id?: string;
}

export class ResearcherMapper {

  static toRow(researcher: Researcher): ResearcherRow {
    return {
      id: researcher.id,
      person_id: researcher.personId,
      active: researcher.active,
      created_at: researcher.createdAt,
      source: researcher.source,
      lab_id: researcher.labId
    };
  }

  static fromRow(row: ResearcherRow): Researcher {
    const createdAt = toISOString(row.created_at);

    return Researcher.fromData({
      id: row.id,
      personId: row.person_id,
      active: row.active,
      createdAt,
      source: row.source,
      labId: row.lab_id
    });
  }

  static fromRows(rows: ResearcherRow[]): Researcher[] {
    return rows.map(row => this.fromRow(row));
  }
}
