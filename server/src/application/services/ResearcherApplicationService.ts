import { ResearcherRepository } from '@domain/repositories/ResearcherRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { PersonRepository } from '@domain/repositories/PersonRepository';
import { Researcher } from '@domain/entities/Researcher';
import { User } from '@domain/entities/User';
import { Person } from '@domain/entities/Person';
import { AccessControlService } from '@domain/services/AccessControlService';
import { CreateResearcherRequest, ResearcherResponse, ResearcherDto } from '@application/dto/ResearcherDto';
import { ValidationError } from '@domain/errors/ValidationError';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { PermissionError } from '@domain/errors/PermissionError';
import type { AuditChange } from '@application/types/Audit';
import type { EventBus } from '@application/contracts/EventBus';
import {
  ResearcherCreatedEvent,
  ResearcherUpdatedEvent,
  ResearcherDeactivatedEvent,
  ResearcherReactivatedEvent,
  ResearcherDeletedEvent
} from '@domain/events/ResearcherEvents';

/**
 * ResearcherApplicationService - Researcher management use case orchestration
 *
 * Coordinates researcher operations and business rules.
 * No business logic - pure orchestration.
 *
 * Note: Researcher entity only stores research linkage (personId, active, etc.)
 * Profile data (name, email, position, department) lives in Person entity
 */
export class ResearcherApplicationService {
  constructor(
    private researcherRepository: ResearcherRepository,
    private userRepository: UserRepository,
    private personRepository: PersonRepository,
    private accessControlService: AccessControlService,
    private eventBus: EventBus
  ) {}

  async getAllResearchers(labId: string): Promise<ResearcherResponse[]> {
    const researchers = await this.researcherRepository.findByLabId(labId);

    const researchersWithPersons = await Promise.all(
      researchers.map(async (researcher) => ({
        researcher,
        person: await this.getPersonForResearcher(researcher)
      }))
    );
    return researchersWithPersons.map(item => ResearcherDto.toResponse(item.researcher, item.person));
  }

  /**
   * Get only visible researchers (approved AND active).
   * Used for dropdowns where only vetted, working researchers should appear.
   */
  async getVisibleResearchers(labId: string): Promise<ResearcherResponse[]> {
    const researchers = await this.researcherRepository.findActiveByLabId(labId);

    const researchersWithPersons = await Promise.all(
      researchers.map(async (researcher) => ({
        researcher,
        person: await this.getPersonForResearcher(researcher)
      }))
    );
    return researchersWithPersons.map(item => ResearcherDto.toResponse(item.researcher, item.person));
  }

  /**
   * Get all researchers with admin metadata (tube counts, linked users)
   * Admin-only: includes sensitive relationship data for management purposes.
   */
  async getResearchersWithMetadata(labId: string, userApiKey: string): Promise<Array<{
    id: string;
    firstName: string;
    lastName: string;
    position?: string;
    department?: string;
    email?: string;
    active: boolean;
    createdAt: string | Date;
    approvalStatus: 'pending' | 'approved';
    source: 'registration' | 'admin';
    tubeCount: number;
    linkedUserId: string | null;
    linkedUsername: string | null;
  }>> {
    const user = await this.getUserByApiKey(userApiKey);
    await this.accessControlService.requireAdminAccess(user);

    const researchers = await this.researcherRepository.findByLabId(labId);
    const users = await this.userRepository.findByLabId(labId);

    const enrichedResearchers = await Promise.all(
      researchers.map(async (researcher) => {
        const person = await this.getPersonForResearcher(researcher);
        const tubeCount = await this.researcherRepository.getTubeCountByResearcher(researcher.id);
        const linkedUser = users.find(u => u.researcherId === researcher.id);

        return {
          id: researcher.id,
          firstName: person.firstName,
          lastName: person.lastName,
          position: person.position,
          department: person.department,
          email: person.email,
          active: researcher.active,
          createdAt: researcher.createdAt,
          approvalStatus: researcher.approvalStatus,
          source: researcher.source,
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
   *
   * Admin-only: used for user-researcher linking interface.
   * Returns all unlinked researchers - they have no demo status until linked.
   */
  async getUnlinkedResearchers(labId: string, userApiKey: string): Promise<ResearcherResponse[]> {
    const user = await this.getUserByApiKey(userApiKey);
    await this.accessControlService.requireAdminAccess(user);

    const researchers = await this.researcherRepository.findByLabId(labId);
    const users = await this.userRepository.findByLabId(labId);

    // Filter to researchers without user links
    const linkedResearcherIds = new Set(
      users.filter(u => u.researcherId).map(u => u.researcherId!)
    );

    const unlinked = researchers.filter(r => !linkedResearcherIds.has(r.id));
    const unlinkedWithPersons = await Promise.all(
      unlinked.map(async (researcher) => ({
        researcher,
        person: await this.getPersonForResearcher(researcher)
      }))
    );
    return unlinkedWithPersons.map(item => ResearcherDto.toResponse(item.researcher, item.person));
  }

  async getResearcherById(id: string): Promise<ResearcherResponse> {
    const researcher = await this.getResearcherOrThrow(id);
    const person = await this.getPersonForResearcher(researcher);
    return ResearcherDto.toResponse(researcher, person);
  }

  /**
   * Create new researcher
   *
   * Smart creation logic:
   * 1. If User exists with this email → link Researcher to User's Person
   * 2. If orphaned Person exists → reuse it (safety net, shouldn't happen with cleanup)
   * 3. Otherwise → create fresh Person + Researcher
   */
  async createResearcher(labId: string, request: CreateResearcherRequest, userApiKey: string): Promise<ResearcherResponse> {
    const user = await this.getUserByApiKey(userApiKey);
    this.accessControlService.requireCanManageResearchers(user);
    this.rejectIfDemoLab(user);

    // Validate email is provided
    if (!request.email?.trim()) {
      throw new ValidationError('Email is required for creating researcher profile', {});
    }

    const normalizedEmail = request.email.trim().toLowerCase();

    // Check if User exists with this email - link to their Person
    const existingUser = await this.userRepository.findByEmail(normalizedEmail);
    if (existingUser?.personId) {
      const existingPerson = await this.personRepository.findById(existingUser.personId);
      if (existingPerson) {
        // Check if this Person already has a Researcher
        const existingResearcher = await this.researcherRepository.findByPersonId(existingPerson.id);
        if (existingResearcher) {
          throw new ValidationError('A researcher already exists for this user', {
            email: normalizedEmail,
            researcherId: existingResearcher.id
          });
        }

        const researcher = Researcher.create(existingPerson.id, { labId });
        await this.researcherRepository.save(researcher);

        const createdEvent = new ResearcherCreatedEvent(
          researcher.id,
          existingPerson.firstName,
          existingPerson.lastName,
          existingPerson.email,
          existingPerson.position,
          user.id
        );
        createdEvent.labId = labId;
        await this.eventBus.publish(createdEvent);

        return ResearcherDto.toResponse(researcher, existingPerson);
      }
    }

    // Check for orphaned Person (safety net - shouldn't happen with cleanup)
    const orphanedPerson = await this.personRepository.findByEmail(normalizedEmail);
    if (orphanedPerson) {
      // Check if this Person already has a Researcher
      const existingResearcher = await this.researcherRepository.findByPersonId(orphanedPerson.id);
      if (existingResearcher) {
        throw new ValidationError('A researcher already exists with this email', {
          email: normalizedEmail,
          researcherId: existingResearcher.id
        });
      }

      // Update orphaned Person with new profile data and reuse
      orphanedPerson.updateProfile(
        request.firstName.trim(),
        request.lastName.trim(),
        request.position?.trim(),
        request.department?.trim()
      );
      await this.personRepository.save(orphanedPerson);

      const researcher = Researcher.create(orphanedPerson.id, { labId });
      await this.researcherRepository.save(researcher);

      const createdEvent = new ResearcherCreatedEvent(
        researcher.id,
        orphanedPerson.firstName,
        orphanedPerson.lastName,
        orphanedPerson.email,
        orphanedPerson.position,
        user.id
      );
      createdEvent.labId = labId;
      await this.eventBus.publish(createdEvent);

      return ResearcherDto.toResponse(researcher, orphanedPerson);
    }

    // Fresh creation - no existing Person with this email
    const person = Person.create(
      request.firstName.trim(),
      request.lastName.trim(),
      normalizedEmail,
      request.position?.trim(),
      request.department?.trim()
    );

    const researcher = Researcher.create(person.id, { labId });

    await this.personRepository.save(person);
    await this.researcherRepository.save(researcher);

    const createdEvent = new ResearcherCreatedEvent(
      researcher.id,
      person.firstName,
      person.lastName,
      person.email,
      person.position,
      user.id
    );
    createdEvent.labId = labId;
    await this.eventBus.publish(createdEvent);

    return ResearcherDto.toResponse(researcher, person);
  }

  /**
   * Update researcher
   * Updates Person entity for profile data, Researcher for research-specific data
   */
  async updateResearcher(id: string, updates: { firstName?: string; lastName?: string; position?: string; department?: string; email?: string; active?: boolean }, userApiKey: string): Promise<ResearcherResponse> {
    const user = await this.getUserByApiKey(userApiKey);
    this.accessControlService.requireCanManageResearchers(user);
    this.rejectIfDemoLab(user);

    const researcher = await this.getResearcherOrThrow(id);
    const person = await this.getPersonForResearcher(researcher);

    // Track changes for audit
    const changes: AuditChange[] = [];

    // Update Person entity for profile changes
    if (updates.firstName !== undefined || updates.lastName !== undefined ||
        updates.position !== undefined || updates.department !== undefined) {
      if (updates.firstName !== undefined && updates.firstName !== person.firstName) {
        changes.push({ field: 'firstName', oldValue: person.firstName, newValue: updates.firstName });
      }
      if (updates.lastName !== undefined && updates.lastName !== person.lastName) {
        changes.push({ field: 'lastName', oldValue: person.lastName, newValue: updates.lastName });
      }
      if (updates.position !== undefined && updates.position !== person.position) {
        changes.push({ field: 'position', oldValue: person.position, newValue: updates.position });
      }
      if (updates.department !== undefined && updates.department !== person.department) {
        changes.push({ field: 'department', oldValue: person.department, newValue: updates.department });
      }

      person.updateProfile(
        updates.firstName ?? person.firstName,
        updates.lastName ?? person.lastName,
        updates.position !== undefined ? updates.position : person.position,
        updates.department !== undefined ? updates.department : person.department
      );
      await this.personRepository.save(person);
    }

    // Update email separately
    if (updates.email !== undefined && updates.email !== person.email) {
      changes.push({ field: 'email', oldValue: person.email, newValue: updates.email });
      person.updateEmail(updates.email);
      await this.personRepository.save(person);
    }

    // Update Researcher entity for active status
    if (updates.active !== undefined) {
      // Can only toggle active status on approved researchers
      if (researcher.isPending()) {
        throw new ValidationError('Cannot change active status of pending researcher', {
          researcherId: id,
          approvalStatus: researcher.approvalStatus
        });
      }

      if (updates.active) {
        researcher.activate();
      } else {
        researcher.deactivate();
      }
      await this.researcherRepository.save(researcher);
    }

    // Publish event if there were changes
    if (changes.length > 0) {
      const updatedEvent = new ResearcherUpdatedEvent(
        researcher.id,
        person.firstName,
        person.lastName,
        changes,
        user.id
      );
      updatedEvent.labId = researcher.labId;
      await this.eventBus.publish(updatedEvent);
    }

    return ResearcherDto.toResponse(researcher, person);
  }

  /**
   * Delete researcher (safe deletion only)
   *
   * Requires: zero tubes AND no linked user
   * Prevents accidental deletion of researchers with historical data or active accounts.
   * Cleans up orphaned Person if no other entity references it.
   */
  async deleteResearcher(id: string, userApiKey: string): Promise<void> {
    const user = await this.getUserByApiKey(userApiKey);
    await this.accessControlService.requireAdminAccess(user);
    this.rejectIfDemoLab(user);

    const researcher = await this.getResearcherOrThrow(id);

    // Get Person data for error messages and cleanup
    const person = await this.getPersonForResearcher(researcher);
    const personId = researcher.personId;

    // Safety check: researcher must have zero tubes
    const tubeCount = await this.researcherRepository.getTubeCountByResearcher(researcher.id);
    if (tubeCount > 0) {
      throw new ValidationError(
        `Cannot delete researcher with ${tubeCount} existing tubes`,
        {
          researcherName: person.fullName,
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
          researcherName: person.fullName,
          userId: linkedUser.id,
          username: linkedUser.username
        }
      );
    }

    // Delete researcher
    await this.researcherRepository.delete(id);

    // Clean up orphaned Person if no User references it
    const userWithPerson = await this.userRepository.findByPersonId(personId);
    if (!userWithPerson) {
      await this.personRepository.delete(personId);
    }

    const deletedEvent = new ResearcherDeletedEvent(
      researcher.id,
      person.firstName,
      person.lastName,
      user.username
    );
    deletedEvent.labId = researcher.labId;
    await this.eventBus.publish(deletedEvent);
  }

  /**
   * Deactivate researcher (soft delete)
   */
  async deactivateResearcher(id: string, userApiKey: string): Promise<ResearcherResponse> {
    const user = await this.getUserByApiKey(userApiKey);
    this.accessControlService.requireCanManageResearchers(user);
    this.rejectIfDemoLab(user);

    const researcher = await this.getResearcherOrThrow(id);

    if (user.researcherId === id) {
      throw new PermissionError('Cannot deactivate your own researcher profile');
    }

    // Can only toggle active status on approved researchers
    if (researcher.isPending()) {
      throw new ValidationError('Cannot change active status of pending researcher', {
        researcherId: id,
        approvalStatus: researcher.approvalStatus
      });
    }

    const person = await this.getPersonForResearcher(researcher);

    // Count tubes before deactivation for audit
    const tubeCount = await this.researcherRepository.getTubeCountByResearcher(researcher.id);

    // Deactivate researcher
    researcher.deactivate();
    await this.researcherRepository.save(researcher);

    const deactivatedEvent = new ResearcherDeactivatedEvent(
      researcher.id,
      person.firstName,
      person.lastName,
      tubeCount,
      user.id
    );
    deactivatedEvent.labId = researcher.labId;
    await this.eventBus.publish(deactivatedEvent);

    return ResearcherDto.toResponse(researcher, person);
  }

  /**
   * Activate researcher
   */
  async activateResearcher(id: string, userApiKey: string): Promise<ResearcherResponse> {
    const user = await this.getUserByApiKey(userApiKey);
    this.accessControlService.requireCanManageResearchers(user);
    this.rejectIfDemoLab(user);

    const researcher = await this.getResearcherOrThrow(id);

    // Can only toggle active status on approved researchers
    if (researcher.isPending()) {
      throw new ValidationError('Cannot change active status of pending researcher', {
        researcherId: id,
        approvalStatus: researcher.approvalStatus
      });
    }

    const person = await this.getPersonForResearcher(researcher);

    // Reactivate researcher
    researcher.activate();
    await this.researcherRepository.save(researcher);

    const reactivatedEvent = new ResearcherReactivatedEvent(
      researcher.id,
      person.firstName,
      person.lastName,
      user.id
    );
    reactivatedEvent.labId = researcher.labId;
    await this.eventBus.publish(reactivatedEvent);

    return ResearcherDto.toResponse(researcher, person);
  }

  async getResearcherStats(userApiKey: string): Promise<Array<{
    researcher: ResearcherResponse;
    tubeCount: number;
  }>> {
    const user = await this.getUserByApiKey(userApiKey);
    this.accessControlService.requireCanViewTubes(user);

    const activeResearchers = await this.researcherRepository.getMostActiveResearchers(10);

    return await Promise.all(
      activeResearchers.map(async item => ({
        researcher: ResearcherDto.toResponse(item.researcher, await this.getPersonForResearcher(item.researcher)),
        tubeCount: item.tubeCount
      }))
    );
  }

  async searchResearchers(namePattern: string): Promise<ResearcherResponse[]> {
    const researchers = await this.researcherRepository.searchByName(namePattern);

    const researchersWithPersons = await Promise.all(
      researchers.map(async (researcher) => ({
        researcher,
        person: await this.getPersonForResearcher(researcher)
      }))
    );
    return researchersWithPersons.map(item => ResearcherDto.toResponse(item.researcher, item.person));
  }

  async getResearcherTubeCount(id: string): Promise<{ tubeCount: number }> {
    const researcher = await this.getResearcherOrThrow(id);
    const tubeCount = await this.researcherRepository.getTubeCountByResearcher(researcher.id);
    return { tubeCount };
  }

  /**
   * Helper: Get authenticated user
   */
  private async getResearcherOrThrow(id: string): Promise<Researcher> {
    const researcher = await this.researcherRepository.findById(id);
    if (!researcher) {
      throw new NotFoundError(`Researcher not found: ${id}`, { researcherId: id });
    }
    return researcher;
  }

  private rejectIfDemoLab(user: User): void {
    if (user.isDemo) {
      throw new PermissionError('Researcher management is restricted in the demo environment');
    }
  }

  private async getUserByApiKey(apiKey: string): Promise<User> {
    const user = await this.userRepository.findByApiKey(apiKey);
    if (!user) {
      throw new PermissionError('Invalid authentication', { apiKey: '***' });
    }
    return user;
  }

  /**
   * Helper: Resolve Person entity from Researcher
   */
  private async getPersonForResearcher(researcher: Researcher): Promise<Person> {
    const person = await this.personRepository.findById(researcher.personId);
    if (!person) {
      throw new NotFoundError(`Person not found for researcher: ${researcher.personId}`, { personId: researcher.personId });
    }
    return person;
  }
}
