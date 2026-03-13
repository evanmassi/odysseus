/**
 * Researcher Mapper
 *
 * Converts between database rows and Researcher domain entities.
 */

import type { ResearcherApprovalStatus, ResearcherSource } from '@domain/entities/Researcher';
import { Researcher } from '@domain/entities/Researcher';

export interface ResearcherRow {
  id: string;
  person_id: string;
  active: boolean;
  created_at: Date | string;
  approval_status: ResearcherApprovalStatus;
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
      approval_status: researcher.approvalStatus,
      source: researcher.source,
      lab_id: researcher.labId
    };
  }

  static fromRow(row: ResearcherRow): Researcher {
    const createdAt = row.created_at instanceof Date
      ? row.created_at.toISOString()
      : row.created_at;

    return Researcher.fromData({
      id: row.id,
      personId: row.person_id,
      active: row.active,
      createdAt,
      approvalStatus: row.approval_status,
      source: row.source,
      labId: row.lab_id
    });
  }

  static fromRows(rows: ResearcherRow[]): Researcher[] {
    return rows.map(row => this.fromRow(row));
  }
}
