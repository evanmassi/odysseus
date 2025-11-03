import { Researcher } from '@domain/entities/Researcher';

/**
 * Researcher DTOs - API data transfer objects
 * Clean separation between domain entities and HTTP API
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
 * DTO Conversion Utilities
 */
export class ResearcherDto {
  /**
   * Convert domain entity to API response
   */
  static toResponse(researcher: Researcher): ResearcherResponse {
    return {
      id: researcher.id,
      firstName: researcher.firstName,
      lastName: researcher.lastName,
      position: researcher.position,
      department: researcher.department,
      email: researcher.email,
      active: researcher.active,
      createdAt: researcher.createdAt.toISOString()
    };
  }

  /**
   * Convert multiple researchers to list response
   */
  static toListResponse(researchers: Researcher[]): ResearcherListResponse {
    return {
      researchers: researchers.map(researcher => this.toResponse(researcher)),
      total: researchers.length
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
