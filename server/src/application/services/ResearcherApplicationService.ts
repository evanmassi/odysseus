/**
 * Researcher Management Service
 *
 * Researcher entity stores research linkage (personId, active status);
 * profile data (name, email, position, department) lives in the Person entity.
 */

import type { EventBus } from '@application/contracts/EventBus';
import { ResearcherDto } from '@application/dto/ResearcherDto';
import type { CreateResearcherRequest, ResearcherResponse } from '@application/dto/ResearcherDto';
import type { AuditChange } from '@application/types/auditTypes';
import { Person } from '@domain/entities/Person';
import { Researcher } from '@domain/entities/Researcher';
import type { User } from '@domain/entities/User';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { PermissionError } from '@domain/errors/PermissionError';
import { ValidationError } from '@domain/errors/ValidationError';
import {
  ResearcherCreatedEvent,
  ResearcherUpdatedEvent,
  ResearcherDeactivatedEvent,
  ResearcherReactivatedEvent,
  ResearcherDeletedEvent
} from '@domain/events/ResearcherEvents';
import type { PersonRepository } from '@domain/repositories/PersonRepository';
import type { ResearcherRepository } from '@domain/repositories/ResearcherRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import type { AccessControlService } from '@domain/services/AccessControlService';

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
    return this.resolveWithPersons(researchers);
  }

  /** Used for dropdowns where only vetted, working researchers should appear. */
  async getVisibleResearchers(labId: string): Promise<ResearcherResponse[]> {
    const researchers = await this.researcherRepository.findActiveByLabId(labId);
    return this.resolveWithPersons(researchers);
  }

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
    const personMap = await this.buildPersonMap(researchers);
    const tubeCounts = await this.researcherRepository.getTubeCountsByResearcherIds(
      researchers.map(r => r.id)
    );

    return researchers.map(researcher => {
      const person = personMap.get(researcher.personId)!;
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
        tubeCount: tubeCounts.get(researcher.id) ?? 0,
        linkedUserId: linkedUser?.id ?? null,
        linkedUsername: linkedUser?.username ?? null,
      };
    });
  }

  async getUnlinkedResearchers(labId: string, userApiKey: string): Promise<ResearcherResponse[]> {
    const user = await this.getUserByApiKey(userApiKey);
    await this.accessControlService.requireAdminAccess(user);

    const researchers = await this.researcherRepository.findByLabId(labId);
    const users = await this.userRepository.findByLabId(labId);

    const linkedResearcherIds = new Set(
      users.filter(u => u.researcherId).map(u => u.researcherId!)
    );

    const unlinked = researchers.filter(r => !linkedResearcherIds.has(r.id));
    return this.resolveWithPersons(unlinked);
  }

  async getResearcherById(id: string): Promise<ResearcherResponse> {
    const researcher = await this.getResearcherOrThrow(id);
    const person = await this.getPersonForResearcher(researcher);
    return ResearcherDto.toResponse(researcher, person);
  }

  /**
   * Person resolution strategy:
   * 1. If User exists with this email → link Researcher to User's Person
   * 2. If orphaned Person exists → reuse it (safety net)
   * 3. Otherwise → create fresh Person + Researcher
   */
  async createResearcher(labId: string, request: CreateResearcherRequest, userApiKey: string): Promise<ResearcherResponse> {
    const user = await this.getUserByApiKey(userApiKey);
    await this.accessControlService.requireCanManageResearchers(user);
    this.rejectIfDemoLab(user);

    if (!request.email?.trim()) {
      throw new ValidationError('Email is required for creating researcher profile', {});
    }

    const normalizedEmail = request.email.trim().toLowerCase();

    const existingUser = await this.userRepository.findByEmail(normalizedEmail);
    if (existingUser?.personId) {
      const existingPerson = await this.personRepository.findById(existingUser.personId);
      if (existingPerson) {
        await this.ensureNoExistingResearcher(existingPerson.id, normalizedEmail);

        const researcher = Researcher.create(existingPerson.id, { labId });
        await this.researcherRepository.save(researcher);

        await this.publishCreatedEvent(researcher, existingPerson, user.id, labId);
        return ResearcherDto.toResponse(researcher, existingPerson);
      }
    }

    // Check for orphaned Person (safety net — shouldn't happen with cleanup)
    const orphanedPerson = await this.personRepository.findByEmail(normalizedEmail);
    if (orphanedPerson) {
      await this.ensureNoExistingResearcher(orphanedPerson.id, normalizedEmail);

      orphanedPerson.updateProfile(
        request.firstName.trim(),
        request.lastName.trim(),
        request.position?.trim(),
        request.department?.trim()
      );
      await this.personRepository.save(orphanedPerson);

      const researcher = Researcher.create(orphanedPerson.id, { labId });
      await this.researcherRepository.save(researcher);

      await this.publishCreatedEvent(researcher, orphanedPerson, user.id, labId);
      return ResearcherDto.toResponse(researcher, orphanedPerson);
    }

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

    await this.publishCreatedEvent(researcher, person, user.id, labId);
    return ResearcherDto.toResponse(researcher, person);
  }

  async updateResearcher(id: string, updates: { firstName?: string; lastName?: string; position?: string; department?: string; email?: string; active?: boolean }, userApiKey: string): Promise<ResearcherResponse> {
    const user = await this.getUserByApiKey(userApiKey);
    await this.accessControlService.requireCanManageResearchers(user);
    this.rejectIfDemoLab(user);

    const researcher = await this.getResearcherOrThrow(id);
    this.requireSameLabAsResearcher(user, researcher);
    const person = await this.getPersonForResearcher(researcher);

    const changes: AuditChange[] = [];

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
        updates.position ?? person.position,
        updates.department ?? person.department
      );
      await this.personRepository.save(person);
    }

    if (updates.email !== undefined && updates.email !== person.email) {
      changes.push({ field: 'email', oldValue: person.email, newValue: updates.email });
      person.updateEmail(updates.email);
      await this.personRepository.save(person);
    }

    if (updates.active !== undefined) {
      this.rejectIfPending(researcher);

      if (updates.active) {
        researcher.activate();
      } else {
        researcher.deactivate();
      }
      await this.researcherRepository.save(researcher);
    }

    if (changes.length > 0) {
      const updatedEvent = new ResearcherUpdatedEvent(
        researcher.id,
        person.firstName,
        person.lastName,
        changes,
        user.id,
        researcher.labId!
      );
      await this.eventBus.publish(updatedEvent);
    }

    return ResearcherDto.toResponse(researcher, person);
  }

  /**
   * Requires zero tubes AND no linked user.
   * Cleans up orphaned Person if no other entity references it.
   */
  async deleteResearcher(id: string, userApiKey: string): Promise<void> {
    const user = await this.getUserByApiKey(userApiKey);
    await this.accessControlService.requireAdminAccess(user);
    this.rejectIfDemoLab(user);

    const researcher = await this.getResearcherOrThrow(id);
    this.requireSameLabAsResearcher(user, researcher);
    const person = await this.getPersonForResearcher(researcher);
    const personId = researcher.personId;

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

    await this.researcherRepository.delete(id);

    const userWithPerson = await this.userRepository.findByPersonId(personId);
    if (!userWithPerson) {
      await this.personRepository.delete(personId);
    }

    const deletedEvent = new ResearcherDeletedEvent(
      researcher.id,
      person.firstName,
      person.lastName,
      user.username,
      researcher.labId!
    );
    await this.eventBus.publish(deletedEvent);
  }

  async deactivateResearcher(id: string, userApiKey: string): Promise<ResearcherResponse> {
    const user = await this.getUserByApiKey(userApiKey);
    await this.accessControlService.requireCanManageResearchers(user);
    this.rejectIfDemoLab(user);

    const researcher = await this.getResearcherOrThrow(id);
    this.requireSameLabAsResearcher(user, researcher);

    if (user.researcherId === id) {
      throw new PermissionError('Cannot deactivate your own researcher profile');
    }

    this.rejectIfPending(researcher);

    const person = await this.getPersonForResearcher(researcher);
    const tubeCount = await this.researcherRepository.getTubeCountByResearcher(researcher.id);

    researcher.deactivate();
    await this.researcherRepository.save(researcher);

    const deactivatedEvent = new ResearcherDeactivatedEvent(
      researcher.id,
      person.firstName,
      person.lastName,
      tubeCount,
      user.id,
      researcher.labId!
    );
    await this.eventBus.publish(deactivatedEvent);

    return ResearcherDto.toResponse(researcher, person);
  }

  async activateResearcher(id: string, userApiKey: string): Promise<ResearcherResponse> {
    const user = await this.getUserByApiKey(userApiKey);
    await this.accessControlService.requireCanManageResearchers(user);
    this.rejectIfDemoLab(user);

    const researcher = await this.getResearcherOrThrow(id);
    this.requireSameLabAsResearcher(user, researcher);
    this.rejectIfPending(researcher);

    const person = await this.getPersonForResearcher(researcher);

    researcher.activate();
    await this.researcherRepository.save(researcher);

    const reactivatedEvent = new ResearcherReactivatedEvent(
      researcher.id,
      person.firstName,
      person.lastName,
      user.id,
      researcher.labId!
    );
    await this.eventBus.publish(reactivatedEvent);

    return ResearcherDto.toResponse(researcher, person);
  }

  async getResearcherStats(labId: string, userApiKey: string): Promise<Array<{
    researcher: ResearcherResponse;
    tubeCount: number;
  }>> {
    const user = await this.getUserByApiKey(userApiKey);
    await this.accessControlService.requireCanViewTubes(user);

    const activeResearchers = await this.researcherRepository.getMostActiveResearchers(10, labId);
    const personMap = await this.buildPersonMap(activeResearchers.map(item => item.researcher));

    return activeResearchers.map(item => ({
      researcher: ResearcherDto.toResponse(item.researcher, personMap.get(item.researcher.personId)!),
      tubeCount: item.tubeCount
    }));
  }

  async searchResearchers(labId: string, namePattern: string): Promise<ResearcherResponse[]> {
    const researchers = await this.researcherRepository.searchByName(namePattern, labId);
    return this.resolveWithPersons(researchers);
  }

  async getResearcherTubeCount(id: string): Promise<{ tubeCount: number }> {
    const researcher = await this.getResearcherOrThrow(id);
    const tubeCount = await this.researcherRepository.getTubeCountByResearcher(researcher.id);
    return { tubeCount };
  }

  // --- Private helpers ---

  private async getResearcherOrThrow(id: string): Promise<Researcher> {
    const researcher = await this.researcherRepository.findById(id);
    if (!researcher) {
      throw new NotFoundError(`Researcher not found: ${id}`, { researcherId: id });
    }
    return researcher;
  }

  private async getPersonForResearcher(researcher: Researcher): Promise<Person> {
    const person = await this.personRepository.findById(researcher.personId);
    if (!person) {
      throw new NotFoundError(`Person not found for researcher: ${researcher.personId}`, { personId: researcher.personId });
    }
    return person;
  }

  private async resolveWithPersons(researchers: Researcher[]): Promise<ResearcherResponse[]> {
    const personMap = await this.buildPersonMap(researchers);
    return researchers.map(r => ResearcherDto.toResponse(r, personMap.get(r.personId)!));
  }

  private async buildPersonMap(researchers: Researcher[]): Promise<Map<string, Person>> {
    const personIds = researchers.map(r => r.personId);
    const persons = await this.personRepository.findByIds(personIds);
    const personMap = new Map(persons.map(p => [p.id, p]));

    for (const researcher of researchers) {
      if (!personMap.has(researcher.personId)) {
        throw new NotFoundError(`Person not found for researcher: ${researcher.personId}`, { personId: researcher.personId });
      }
    }

    return personMap;
  }

  private async ensureNoExistingResearcher(personId: string, email: string): Promise<void> {
    const existing = await this.researcherRepository.findByPersonId(personId);
    if (existing) {
      throw new ValidationError('A researcher already exists with this email', {
        email,
        researcherId: existing.id
      });
    }
  }

  private requireSameLabAsResearcher(user: User, researcher: Researcher): void {
    if (user.isLabAdmin() && !user.isSystemAdmin() && researcher.labId !== user.labId) {
      throw new PermissionError('Cannot manage researchers outside your lab');
    }
  }

  private rejectIfPending(researcher: Researcher): void {
    if (researcher.isPending()) {
      throw new ValidationError('Cannot change active status of pending researcher', {
        researcherId: researcher.id,
        approvalStatus: researcher.approvalStatus
      });
    }
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

  private async publishCreatedEvent(researcher: Researcher, person: Person, userId: string, labId: string): Promise<void> {
    const event = new ResearcherCreatedEvent(
      researcher.id,
      person.firstName,
      person.lastName,
      person.email,
      person.position,
      userId,
      labId
    );
    await this.eventBus.publish(event);
  }
}
