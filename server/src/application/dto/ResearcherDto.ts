/**
 * Researcher Data Transfer Objects
 *
 * Researcher holds research-specific data; profile data (name, email) comes from Person entity.
 */

import { Researcher, ResearcherApprovalStatus, ResearcherSource } from '@domain/entities/Researcher';
import { Person } from '@domain/entities/Person';

export interface CreateResearcherRequest {
  firstName: string;
  lastName: string;
  position?: string;
  department?: string;
  email?: string;
}

export interface ResearcherResponse {
  id: string;
  personId: string;
  active: boolean;
  createdAt: string;
  approvalStatus: ResearcherApprovalStatus;
  source: ResearcherSource;
  firstName: string;
  lastName: string;
  email: string;
  position?: string;
  department?: string;
}

export class ResearcherDto {
  /** Requires both Researcher and Person since profile data lives in Person. */
  static toResponse(researcher: Researcher, person: Person): ResearcherResponse {
    return {
      id: researcher.id,
      personId: researcher.personId,
      active: researcher.active,
      createdAt: researcher.createdAt.toISOString(),
      approvalStatus: researcher.approvalStatus,
      source: researcher.source,
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
      position: person.position,
      department: person.department
    };
  }
}
