/**
 * Researcher Data Transfer Objects
 *
 * Researcher holds research-specific data; profile data (name, email) comes from Person entity.
 */


import type { Person } from '@domain/entities/Person';
import type { Researcher } from '@domain/entities/Researcher';

import type { Researcher as ResearcherData } from '@odysseus/shared-schemas';

export type { CreateResearcherProfile as CreateResearcherRequest } from '@odysseus/shared-schemas';

export type ResearcherResponse = ResearcherData;

export class ResearcherDto {
  /** Requires both Researcher and Person since profile data lives in Person. */
  static toResponse(researcher: Researcher, person: Person): ResearcherResponse {
    return {
      id: researcher.id,
      personId: researcher.personId,
      active: researcher.active,
      createdAt: researcher.createdAt,
      source: researcher.source,
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
      position: person.position,
      department: person.department,
      labId: researcher.labId
    };
  }
}
