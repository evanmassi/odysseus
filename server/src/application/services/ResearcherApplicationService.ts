import { ResearcherRepository } from '@domain/repositories/ResearcherRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { Researcher } from '@domain/entities/Researcher';
import { User } from '@domain/entities/User';
import { AccessControlService } from '@domain/services/AccessControlService';
import { CreateResearcherRequest, ResearcherResponse, ResearcherDto } from '@application/dto/ResearcherDto';
import { ValidationError } from '@domain/errors/ValidationError';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { PermissionError } from '@domain/errors/PermissionError';

/**
 * ResearcherApplicationService - Researcher management use case orchestration
 * 
 * Coordinates researcher operations and business rules.
 * No business logic - pure orchestration.
 */
export class ResearcherApplicationService {
  constructor(
    private researcherRepository: ResearcherRepository,
    private userRepository: UserRepository,
    private accessControlService: AccessControlService
  ) {}

  /**
   * Get all researchers
   */
  async getAllResearchers(userApiKey?: string): Promise<ResearcherResponse[]> {
    // Basic read operation - allow without authentication for now
    // Returns ALL researchers (active and inactive) for management UI
    // Frontend components filter to active-only when needed (e.g., dropdowns)
    const researchers = await this.researcherRepository.findAll();
    return researchers.map(researcher => ResearcherDto.toResponse(researcher));
  }

  /**
   * Get all researchers with admin metadata (tube counts, linked users)
   * Admin-only: includes sensitive relationship data for management purposes
   */
  async getResearchersWithMetadata(userApiKey: string): Promise<Array<{
    id: string;
    firstName: string;
    lastName: string;
    position?: string;
    department?: string;
    email?: string;
    active: boolean;
    createdAt: string | Date;
    tubeCount: number;
    linkedUserId: string | null;
    linkedUsername: string | null;
  }>> {
    const user = await this.getUserByApiKey(userApiKey);
    await this.accessControlService.requireAdminAccess(user);

    const researchers = await this.researcherRepository.findAll();
    const users = await this.userRepository.findAll();

    // Build metadata for each researcher
    const enrichedResearchers = await Promise.all(
      researchers.map(async (researcher) => {
        const tubeCount = await this.researcherRepository.getTubeCountByResearcher(researcher.id);
        const linkedUser = users.find(u => u.researcherId === researcher.id);

        return {
          id: researcher.id,
          firstName: researcher.firstName,
          lastName: researcher.lastName,
          position: researcher.position,
          department: researcher.department,
          email: researcher.email,
          active: researcher.active,
          createdAt: researcher.createdAt,
          tubeCount,
          linkedUserId: linkedUser?.id ?? null,
          linkedUsername: linkedUser?.username ?? null,
        };
      })
    );

    return enrichedResearchers;
  }

  /**
   * Get researchers not linked to any user account
   * Admin-only: used for user-researcher linking interface
   */
  async getUnlinkedResearchers(userApiKey: string): Promise<ResearcherResponse[]> {
    const user = await this.getUserByApiKey(userApiKey);
    await this.accessControlService.requireAdminAccess(user);

    const researchers = await this.researcherRepository.findAll();
    const users = await this.userRepository.findAll();

    // Filter to researchers without user links
    const linkedResearcherIds = new Set(
      users.filter(u => u.researcherId).map(u => u.researcherId!)
    );

    const unlinked = researchers.filter(r => !linkedResearcherIds.has(r.id));
    return unlinked.map(researcher => ResearcherDto.toResponse(researcher));
  }

  /**
   * Get researcher by ID
   */
  async getResearcherById(id: string, userApiKey?: string): Promise<ResearcherResponse> {
    const researcher = await this.researcherRepository.findById(id);

    if (!researcher) {
      throw new NotFoundError(`Researcher not found: ${id}`, { researcherId: id });
    }

    return ResearcherDto.toResponse(researcher);
  }

  /**
   * Create new researcher
   */
  async createResearcher(request: CreateResearcherRequest, userApiKey: string): Promise<ResearcherResponse> {
    const user = await this.getUserByApiKey(userApiKey);
    this.accessControlService.requireCanManageResearchers(user);

    // Validate unique name
    if (await this.researcherRepository.nameExists(request.firstName.trim(), request.lastName.trim())) {
      throw new ValidationError('Researcher name already exists', { firstName: request.firstName, lastName: request.lastName });
    }

    // Create researcher entity
    const researcherData = ResearcherDto.fromCreateRequest(request);

    // Validate email is provided
    if (!researcherData.email) {
      throw new ValidationError('Email is required for creating researcher profile', {});
    }

    const researcher = Researcher.create(
      researcherData.firstName,
      researcherData.lastName,
      researcherData.email,
      researcherData.position,
      researcherData.department
    );

    // Save to repository
    await this.researcherRepository.save(researcher);

    return ResearcherDto.toResponse(researcher);
  }

  /**
   * Update researcher
   */
  async updateResearcher(id: string, updates: { firstName?: string; lastName?: string; position?: string; department?: string; email?: string; active?: boolean }, userApiKey: string): Promise<ResearcherResponse> {
    const user = await this.getUserByApiKey(userApiKey);
    this.accessControlService.requireCanManageResearchers(user);

    const researcher = await this.researcherRepository.findById(id);
    if (!researcher) {
      throw new NotFoundError(`Researcher not found: ${id}`, { researcherId: id });
    }

    // Validate name uniqueness if changing name
    const firstName = updates.firstName !== undefined ? updates.firstName : researcher.firstName;
    const lastName = updates.lastName !== undefined ? updates.lastName : researcher.lastName;

    if ((updates.firstName || updates.lastName) &&
        (firstName !== researcher.firstName || lastName !== researcher.lastName)) {
      if (await this.researcherRepository.nameExists(firstName, lastName)) {
        throw new ValidationError('Researcher name already exists', { firstName, lastName });
      }
    }

    // Update researcher
    if (updates.firstName !== undefined || updates.lastName !== undefined) {
      researcher.changeName(firstName, lastName);
    }

    if (updates.position !== undefined) {
      researcher.changePosition(updates.position);
    }

    if (updates.department !== undefined) {
      researcher.changeDepartment(updates.department);
    }

    if (updates.email !== undefined) {
      researcher.changeEmail(updates.email);
    }

    if (updates.active !== undefined) {
      if (updates.active) {
        researcher.activate();
      } else {
        researcher.deactivate();
      }
    }

    // Save to repository
    await this.researcherRepository.save(researcher);

    return ResearcherDto.toResponse(researcher);
  }

  /**
   * Delete researcher (safe deletion only)
   * Requires: zero tubes AND no linked user
   * Prevents accidental deletion of researchers with historical data or active accounts
   */
  async deleteResearcher(id: string, userApiKey: string): Promise<void> {
    const user = await this.getUserByApiKey(userApiKey);
    await this.accessControlService.requireAdminAccess(user);

    const researcher = await this.researcherRepository.findById(id);
    if (!researcher) {
      throw new NotFoundError(`Researcher not found: ${id}`, { researcherId: id });
    }

    // Safety check: researcher must have zero tubes
    const tubeCount = await this.researcherRepository.getTubeCountByResearcher(researcher.id);
    if (tubeCount > 0) {
      throw new ValidationError(
        `Cannot delete researcher with ${tubeCount} existing tubes`,
        {
          researcherName: `${researcher.firstName} ${researcher.lastName}`,
          tubeCount
        }
      );
    }

    // Safety check: researcher must not be linked to any user
    const linkedUser = await this.userRepository.findByResearcherId(researcher.id);
    if (linkedUser) {
      throw new ValidationError(
        'Cannot delete researcher linked to user account',
        {
          researcherId: researcher.id,
          researcherName: `${researcher.firstName} ${researcher.lastName}`,
          userId: linkedUser.id,
          username: linkedUser.username
        }
      );
    }

    // Safe to delete - no tubes, no user link
    await this.researcherRepository.delete(id);
  }

  /**
   * Deactivate researcher (soft delete)
   */
  async deactivateResearcher(id: string, userApiKey: string): Promise<ResearcherResponse> {
    return this.updateResearcher(id, { active: false }, userApiKey);
  }

  /**
   * Activate researcher
   */
  async activateResearcher(id: string, userApiKey: string): Promise<ResearcherResponse> {
    return this.updateResearcher(id, { active: true }, userApiKey);
  }

  /**
   * Get researchers with tube counts
   */
  async getResearcherStats(userApiKey: string): Promise<Array<{
    researcher: ResearcherResponse;
    tubeCount: number;
  }>> {
    const user = await this.getUserByApiKey(userApiKey);
    this.accessControlService.requireCanViewTubes(user);

    const activeResearchers = await this.researcherRepository.getMostActiveResearchers(10);
    
    return activeResearchers.map(item => ({
      researcher: ResearcherDto.toResponse(item.researcher),
      tubeCount: item.tubeCount
    }));
  }

  /**
   * Search researchers by name
   */
  async searchResearchers(namePattern: string, userApiKey?: string): Promise<ResearcherResponse[]> {
    const researchers = await this.researcherRepository.searchByName(namePattern);
    return researchers.map(researcher => ResearcherDto.toResponse(researcher));
  }

  /**
   * Get tube count for a specific researcher
   */
  async getResearcherTubeCount(id: string, userApiKey?: string): Promise<{ tubeCount: number }> {
    const researcher = await this.researcherRepository.findById(id);

    if (!researcher) {
      throw new NotFoundError(`Researcher not found: ${id}`, { researcherId: id });
    }

    const tubeCount = await this.researcherRepository.getTubeCountByResearcher(researcher.id);

    return { tubeCount };
  }

  /**
   * Helper: Get authenticated user
   */
  private async getUserByApiKey(apiKey: string): Promise<User> {
    const user = await this.userRepository.findByApiKey(apiKey);
    if (!user) {
      throw new PermissionError('Invalid authentication', { apiKey: '***' });
    }
    return user;
  }
}
