import { Researcher } from '@domain/entities/Researcher';
import { Person } from '@domain/entities/Person';

/**
 * Researcher DTOs - API data transfer objects
 * Clean separation between domain entities and HTTP API
 *
 * Note: Researcher entity only contains research-specific data (personId, active, etc.)
 * Profile data (name, email, position, department) comes from Person entity
 */

export interface CreateResearcherRequest {
  firstName: string;
  lastName: string;
  position?: string;
  department?: string;
  email?: string;
}

export interface UpdateResearcherRequest {
  firstName?: string;
  lastName?: string;
  position?: string;
  department?: string;
  email?: string;
  active?: boolean;
}

export interface ResearcherResponse {
  id: string;
  firstName: string;
  lastName: string;
  position?: string;
  department?: string;
  email?: string;
  active: boolean;
  createdAt: string;
}

export interface ResearcherListResponse {
  researchers: ResearcherResponse[];
  total: number;
}

/**
 * Helper type for Researcher with resolved Person data
 */
export interface ResearcherWithPerson {
  researcher: Researcher;
  person: Person;
}

/**
 * DTO Conversion Utilities
 */
export class ResearcherDto {
  /**
   * Convert domain entities to API response
   * Requires both Researcher and Person since profile data is in Person
   */
  static toResponse(researcher: Researcher, person: Person): ResearcherResponse {
    return {
      id: researcher.id,
      firstName: person.firstName,
      lastName: person.lastName,
      position: person.position,
      department: person.department,
      email: person.email,
      active: researcher.active,
      createdAt: researcher.createdAt.toISOString()
    };
  }

  /**
   * Convert multiple researchers with person data to list response
   */
  static toListResponse(items: ResearcherWithPerson[]): ResearcherListResponse {
    return {
      researchers: items.map(item => this.toResponse(item.researcher, item.person)),
      total: items.length
    };
  }

  /**
   * Convert create request to domain data
   */
  static fromCreateRequest(request: CreateResearcherRequest): {
    firstName: string;
    lastName: string;
    position?: string;
    department?: string;
    email?: string;
  } {
    return {
      firstName: request.firstName.trim(),
      lastName: request.lastName.trim(),
      position: request.position?.trim(),
      department: request.department?.trim(),
      email: request.email?.trim()
    };
  }
}
