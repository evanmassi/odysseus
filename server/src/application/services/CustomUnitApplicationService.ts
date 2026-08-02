/**
 * Custom Unit Management Service
 *
 * CRUD for the lab's supplement to the fixed unit registry. A rename cascades to every item
 * that holds the label, so it is always safe. A delete or a change of dimension is refused
 * while any item holds it: the first would strand the label with no dropdown offering it, the
 * second would move the unit to fields those items don't use.
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

import { countPhrase } from './countPhrase';

import type { CreateCustomUnitRequest, UpdateCustomUnitRequest } from '@odysseus/shared-schemas';

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
      id: generateId('cunit'),
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

  async update(
    labId: string,
    id: string,
    data: UpdateCustomUnitRequest,
    user: User
  ): Promise<CustomUnitResponse> {
    await this.accessControlService.requireAdminAccess(user);
    let unit = await this.getOrThrow(id, labId);

    if (data.kind && data.kind !== unit.kind) {
      const usageCount = await this.customUnitRepository.countUsage(unit.label, labId);
      if (usageCount > 0) {
        const verb = usageCount === 1 ? 'uses' : 'use';
        throw new ValidationError(
          `Cannot change what "${unit.label}" measures — ${countPhrase(usageCount, 'item', 'items')} ${verb} it, and the change would move it to different fields. Rename it and add a new unit instead.`
        );
      }
      unit = await this.customUnitRepository.changeKind(unit, data.kind);
    }

    const label = data.label?.trim();
    if (label && label !== unit.label) {
      await this.requireLabelAvailable(label, labId);
      unit = await this.customUnitRepository.rename(unit, label);
    }

    return CustomUnitDto.toResponse(unit);
  }

  async delete(labId: string, id: string, user: User): Promise<void> {
    await this.accessControlService.requireAdminAccess(user);
    const unit = await this.getOrThrow(id, labId);

    const usageCount = await this.customUnitRepository.countUsage(unit.label, labId);
    if (usageCount > 0) {
      const verb = usageCount === 1 ? 'uses' : 'use';
      throw new ValidationError(
        `Cannot delete "${unit.label}" — ${countPhrase(usageCount, 'item', 'items')} still ${verb} it. Rename it instead.`
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
