/**
 * Custom Unit Management Service
 *
 * CRUD for the lab's supplement to the fixed unit registry. A rename cascades to every
 * item that holds the label; a delete is refused while any of them do, since the label
 * would survive in those rows with no dropdown offering it.
 */

import { UNIT_REGISTRY } from '@odysseus/shared-schemas';

import {
  CustomUnitDto,
  type CustomUnitResponse,
  type CustomUnitWithUsageResponse,
} from '@application/dto/CustomUnitDto';
import type { User } from '@domain/entities/User';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { ValidationError } from '@domain/errors/ValidationError';
import type {
  CustomUnitRepository,
  CustomUnitRow,
} from '@domain/repositories/CustomUnitRepository';
import type { AccessControlService } from '@domain/services/AccessControlService';
import { generateId } from '@domain/utils/generateId';

import type { CreateCustomUnitRequest, RenameCustomUnitRequest } from '@odysseus/shared-schemas';

export class CustomUnitApplicationService {
  constructor(
    private customUnitRepository: CustomUnitRepository,
    private accessControlService: AccessControlService
  ) {}

  async list(labId: string): Promise<CustomUnitWithUsageResponse[]> {
    const units = await this.customUnitRepository.findByLabId(labId);
    return units.map(CustomUnitDto.toUsageResponse);
  }

  async create(
    labId: string,
    data: CreateCustomUnitRequest,
    user: User
  ): Promise<CustomUnitResponse> {
    await this.accessControlService.requireAdminAccess(user);
    const label = data.label.trim();
    await this.requireLabelAvailable(label, labId);

    const now = new Date();
    const unit: CustomUnitRow = {
      id: generateId('rcun'),
      labId,
      label,
      kind: data.kind,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    };
    await this.customUnitRepository.create(unit);
    return CustomUnitDto.toResponse(unit);
  }

  async rename(
    labId: string,
    id: string,
    data: RenameCustomUnitRequest,
    user: User
  ): Promise<CustomUnitResponse> {
    await this.accessControlService.requireAdminAccess(user);
    const unit = await this.getOrThrow(id, labId);
    const label = data.label.trim();

    if (label === unit.label) return CustomUnitDto.toResponse(unit);
    await this.requireLabelAvailable(label, labId);

    const renamed = await this.customUnitRepository.rename(unit, label);
    return CustomUnitDto.toResponse(renamed);
  }

  async delete(labId: string, id: string, user: User): Promise<void> {
    await this.accessControlService.requireAdminAccess(user);
    const unit = await this.getOrThrow(id, labId);

    const usageCount = await this.customUnitRepository.countUsage(unit.label, labId);
    if (usageCount > 0) {
      throw new ValidationError(
        usageCount === 1
          ? `Cannot delete "${unit.label}" — 1 item still uses it. Rename it instead.`
          : `Cannot delete "${unit.label}" — ${usageCount} items still use it. Rename it instead.`
      );
    }

    await this.customUnitRepository.delete(id, labId);
  }

  private async requireLabelAvailable(label: string, labId: string): Promise<void> {
    const registryMatch = UNIT_REGISTRY.find(
      unit => unit.label.toLowerCase() === label.toLowerCase()
    );
    if (registryMatch) {
      throw new ValidationError(
        `"${registryMatch.label}" is already a standard unit — it is offered on every field of its dimension`
      );
    }

    const existing = await this.customUnitRepository.findByLabel(label, labId);
    if (existing) {
      throw new ValidationError(`Your lab already has a unit called "${existing.label}"`);
    }
  }

  private async getOrThrow(id: string, labId: string): Promise<CustomUnitRow> {
    const unit = await this.customUnitRepository.findById(id, labId);
    if (!unit) throw new NotFoundError('This unit could not be found.', { customUnitId: id });
    return unit;
  }
}
