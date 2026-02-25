/**
 * Researcher Approval Event Handler
 *
 * Syncs researcher approval status with user approval/rejection.
 * Registration-created researchers are auto-approved when user is approved,
 * and auto-deleted (with user) when user is rejected.
 */

import type { EventBus } from '@application/contracts/EventBus';
import type { ResearcherRepository } from '@domain/repositories/ResearcherRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import type { PersonRepository } from '@domain/repositories/PersonRepository';
import { UserApprovedEvent, UserRejectedEvent } from '@domain/events/UserEvents';
import { ResearcherApprovedEvent } from '@domain/events/ResearcherEvents';
import { Researcher } from '@domain/entities/Researcher';
import { Person } from '@domain/entities/Person';
import { logger } from '@utils/logger';

export class ResearcherApprovalEventHandler {
  constructor(
    private eventBus: EventBus,
    private researcherRepository: ResearcherRepository,
    private userRepository: UserRepository,
    private personRepository: PersonRepository
  ) {
    this.subscribeToEvents();
  }

  private subscribeToEvents(): void {
    this.eventBus.subscribe('UserApproved', (e) => this.handleUserApproved(e));
    this.eventBus.subscribe('UserRejected', (e) => this.handleUserRejected(e));
  }

  private async handleUserApproved(event: UserApprovedEvent): Promise<void> {
    try {
      const user = await this.userRepository.findById(event.userId);
      if (!user?.researcherId) {
        return;
      }

      const researcher = await this.researcherRepository.findById(user.researcherId);
      if (!researcher) {
        logger.warn('Linked researcher not found during approval sync', {
          userId: event.userId,
          researcherId: user.researcherId
        });
        return;
      }

      // Only approve registration-created researchers that are pending
      if (researcher.source === 'registration' && researcher.isPending()) {
        researcher.approve();
        await this.researcherRepository.save(researcher);

        const person = await this.personRepository.findById(researcher.personId);

        const approvedEvent = new ResearcherApprovedEvent(
          researcher.id,
          person?.firstName || 'Unknown',
          person?.lastName || 'Unknown',
          event.userId,
          event.approvedBy
        );
        approvedEvent.labId = event.labId;
        await this.eventBus.publish(approvedEvent);

        logger.info('Researcher approved via user approval cascade', {
          researcherId: researcher.id,
          userId: event.userId,
          approvedBy: event.approvedBy
        });
      }
    } catch (error) {
      logger.error('Failed to sync researcher approval status', {
        userId: event.userId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async handleUserRejected(event: UserRejectedEvent): Promise<void> {
    const deletionContext = {
      userId: event.userId,
      username: event.username,
      researcherId: null as string | null,
      personId: null as string | null,
      rejectedBy: event.rejectedBy
    };

    try {
      const user = await this.userRepository.findById(event.userId);
      if (!user) {
        logger.warn('User already deleted or not found during rejection', { userId: event.userId });
        return;
      }

      let researcher: Researcher | null = null;
      let person: Person | null = null;

      if (user.researcherId) {
        researcher = await this.researcherRepository.findById(user.researcherId);

        if (researcher && researcher.source === 'registration') {
          deletionContext.researcherId = researcher.id;
          deletionContext.personId = researcher.personId;
          person = await this.personRepository.findById(researcher.personId);
        }
      }

      logger.info('Starting rejection cleanup', deletionContext);

      // Delete user first (FK to researcher becomes NULL)
      try {
        await this.userRepository.delete(event.userId);
        logger.debug('Deleted rejected user', { userId: event.userId });
      } catch (userDeleteError) {
        logger.error('Failed to delete rejected user', {
          userId: event.userId,
          error: userDeleteError instanceof Error ? userDeleteError.message : String(userDeleteError)
        });
        throw userDeleteError;
      }

      // Delete researcher if exists and was from registration
      if (researcher && researcher.source === 'registration') {
        try {
          await this.researcherRepository.delete(researcher.id);
          logger.debug('Deleted linked researcher', { researcherId: researcher.id });
        } catch (researcherDeleteError) {
          logger.error('Failed to delete linked researcher (user already deleted)', {
            researcherId: researcher.id,
            error: researcherDeleteError instanceof Error ? researcherDeleteError.message : String(researcherDeleteError)
          });
        }

        // Delete person last
        if (person) {
          try {
            await this.personRepository.delete(person.id);
            logger.debug('Deleted linked person', { personId: person.id });
          } catch (personDeleteError) {
            logger.error('Failed to delete linked person (user/researcher already deleted)', {
              personId: person.id,
              error: personDeleteError instanceof Error ? personDeleteError.message : String(personDeleteError)
            });
          }
        }
      }

      logger.info('Rejection cleanup completed', deletionContext);

    } catch (error) {
      logger.error('Rejection cleanup failed', {
        ...deletionContext,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }
}
