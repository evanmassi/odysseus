/**
 * Donor Management Service
 *
 * Orchestrates donor CRUD with access control and auto-creation from tube entry.
 */

import type { EventBus } from '@application/contracts/EventBus';
import { DonorDto } from '@application/dto/DonorDto';
import type { DonorResponse, DonorWithTubeCountResponse, DonorCollectionHistoryResponse } from '@application/dto/DonorDto';
import { Donor } from '@domain/entities/Donor';
import { DonorCollectionHistory } from '@domain/entities/DonorCollectionHistory';
import type { User } from '@domain/entities/User';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { ValidationError } from '@domain/errors/ValidationError';
import {
  DonorCreatedEvent,
  DonorUpdatedEvent,
  DonorDeletedEvent
} from '@domain/events/DonorEvents';
import type { DonorRepository } from '@domain/repositories/DonorRepository';
import type { AccessControlService } from '@domain/services/AccessControlService';
import type { FieldChange } from '@domain/types/fieldChangeTypes';
import type { CreateDonorRequest, UpdateDonorRequest, CreateCollectionHistoryRequest, UpdateCollectionHistoryRequest } from '@odysseus/shared-schemas';

export class DonorApplicationService {

  constructor(
    private donorRepository: DonorRepository,
    private accessControlService: AccessControlService,
    private eventBus: EventBus
  ) {}

  async listDonors(labId: string): Promise<DonorWithTubeCountResponse[]> {
    const donors = await this.donorRepository.findByLabId(labId);
    const tubeCounts = await this.donorRepository.getTubeCountsForDonors(labId, donors);

    return donors.map(donor =>
      DonorDto.toResponseWithTubeCount(donor, tubeCounts.get(donor.id) ?? 0)
    );
  }

  async getDonor(labId: string, id: string): Promise<DonorWithTubeCountResponse> {
    const donor = await this.getDonorOrThrow(id);
    const tubeCounts = await this.donorRepository.getTubeCountsForDonors(labId, [donor]);
    return DonorDto.toResponseWithTubeCount(donor, tubeCounts.get(donor.id) ?? 0);
  }

  async searchDonors(labId: string, query: string, limit?: number): Promise<DonorResponse[]> {
    const donors = await this.donorRepository.search(labId, query, limit);
    return donors.map(DonorDto.toResponse);
  }

  async createDonor(
    labId: string,
    data: CreateDonorRequest,
    user: User
  ): Promise<DonorWithTubeCountResponse> {
    await this.accessControlService.requireAdminAccess(user);

    const existing = await this.donorRepository.findByDonorIds(
      labId, data.donorSourceId, data.donorInternalId
    );
    if (existing) {
      throw new ValidationError('A donor with this ID already exists', {
        donorSourceId: data.donorSourceId,
        donorInternalId: data.donorInternalId,
        existingDonorId: existing.id,
      });
    }

    const donor = Donor.create({
      labId,
      donorSourceId: data.donorSourceId,
      donorInternalId: data.donorInternalId,
      species: data.species,
      age: data.age,
      sex: data.sex,
      ethnicity: data.ethnicity,
      clinicalStatus: data.clinicalStatus,
      diagnosis: data.diagnosis,
      diseaseStage: data.diseaseStage,
      notes: data.notes,
      isCurated: true,
    });

    await this.donorRepository.save(donor);

    await this.eventBus.publish(new DonorCreatedEvent(
      donor.id, donor.donorSourceId, donor.donorInternalId,
      donor.isCurated, user.id, labId
    ));

    return DonorDto.toResponseWithTubeCount(donor, 0);
  }

  async updateDonor(
    labId: string,
    id: string,
    data: UpdateDonorRequest,
    user: User
  ): Promise<DonorWithTubeCountResponse> {
    await this.accessControlService.requireAdminAccess(user);

    const donor = await this.getDonorOrThrow(id);
    const changes = this.trackChanges(donor, data);

    donor.update({
      donorSourceId: data.donorSourceId,
      donorInternalId: data.donorInternalId,
      species: data.species,
      age: data.age,
      sex: data.sex,
      ethnicity: data.ethnicity,
      clinicalStatus: data.clinicalStatus,
      diagnosis: data.diagnosis,
      diseaseStage: data.diseaseStage,
      notes: data.notes,
    });

    await this.donorRepository.save(donor);

    if (changes.length > 0) {
      await this.eventBus.publish(new DonorUpdatedEvent(
        donor.id, changes, user.id, labId
      ));
    }

    const tubeCounts = await this.donorRepository.getTubeCountsForDonors(labId, [donor]);
    return DonorDto.toResponseWithTubeCount(donor, tubeCounts.get(donor.id) ?? 0);
  }

  async deleteDonor(labId: string, id: string, user: User): Promise<void> {
    await this.accessControlService.requireAdminAccess(user);

    const donor = await this.getDonorOrThrow(id);
    await this.donorRepository.delete(id);

    await this.eventBus.publish(new DonorDeletedEvent(
      donor.id, donor.donorSourceId, donor.donorInternalId, user.id, labId
    ));
  }

  async getCollectionHistory(donorId: string): Promise<DonorCollectionHistoryResponse[]> {
    const history = await this.donorRepository.findCollectionHistory(donorId);
    return history.map(DonorDto.historyToResponse);
  }

  async addCollectionHistory(
    labId: string,
    donorId: string,
    data: CreateCollectionHistoryRequest,
    user: User
  ): Promise<DonorCollectionHistoryResponse> {
    await this.accessControlService.requireAdminAccess(user);
    await this.getDonorOrThrow(donorId);

    const entry = DonorCollectionHistory.create({
      donorId,
      collectionDate: data.collectionDate,
      specimenType: data.specimenType,
      source: data.source,
    });

    await this.donorRepository.saveCollectionHistory(entry);
    return DonorDto.historyToResponse(entry);
  }

  async updateCollectionHistory(
    labId: string,
    historyId: string,
    data: UpdateCollectionHistoryRequest,
    user: User
  ): Promise<DonorCollectionHistoryResponse> {
    await this.accessControlService.requireAdminAccess(user);

    const existing = await this.donorRepository.findCollectionHistoryById(historyId);
    if (!existing) {
      throw new NotFoundError(`Collection history entry not found: ${historyId}`);
    }

    const updated = existing.update({
      collectionDate: data.collectionDate,
      specimenType: data.specimenType,
      source: data.source,
    });

    await this.donorRepository.updateCollectionHistory(updated);
    return DonorDto.historyToResponse(updated);
  }

  async deleteCollectionHistory(labId: string, historyId: string, user: User): Promise<void> {
    await this.accessControlService.requireAdminAccess(user);
    const deleted = await this.donorRepository.deleteCollectionHistory(historyId);
    if (!deleted) {
      throw new NotFoundError(`Collection history entry not found: ${historyId}`);
    }
  }

  /** Creates a stub donor if no donor with matching IDs exists. Called by TubeApplicationService. */
  async ensureDonorExists(
    labId: string,
    sourceId?: string,
    internalId?: string,
    species?: string
  ): Promise<void> {
    if (!sourceId && !internalId) return;

    const donor = Donor.create({
      labId,
      donorSourceId: sourceId,
      donorInternalId: internalId,
      species,
    });

    await this.donorRepository.saveIfNotExists(donor);
  }

  private async getDonorOrThrow(id: string): Promise<Donor> {
    const donor = await this.donorRepository.findById(id);
    if (!donor) {
      throw new NotFoundError(`Donor not found: ${id}`, { donorId: id });
    }
    return donor;
  }

  private trackChanges(donor: Donor, data: UpdateDonorRequest): FieldChange[] {
    const changes: FieldChange[] = [];
    const fields: Array<{ key: keyof UpdateDonorRequest; getter: () => string | undefined }> = [
      { key: 'donorSourceId', getter: () => donor.donorSourceId },
      { key: 'donorInternalId', getter: () => donor.donorInternalId },
      { key: 'species', getter: () => donor.species },
      { key: 'age', getter: () => donor.age },
      { key: 'sex', getter: () => donor.sex },
      { key: 'ethnicity', getter: () => donor.ethnicity },
      { key: 'clinicalStatus', getter: () => donor.clinicalStatus },
      { key: 'diagnosis', getter: () => donor.diagnosis },
      { key: 'diseaseStage', getter: () => donor.diseaseStage },
      { key: 'notes', getter: () => donor.notes },
    ];

    for (const { key, getter } of fields) {
      const newValue = data[key];
      if (newValue !== undefined) {
        const oldValue = getter();
        if (newValue !== oldValue) {
          changes.push({ field: key, oldValue, newValue });
        }
      }
    }

    return changes;
  }
}
