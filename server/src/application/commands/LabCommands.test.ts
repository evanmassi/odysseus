/**
 * Lab Command Tests
 *
 * Characterizes create/update: validation, slug-uniqueness, the no-op update
 * short-circuit, and the Lab entity returned for the controller response.
 */

import { Lab } from '@domain/entities/Lab';
import type { User } from '@domain/entities/User';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { ValidationError } from '@domain/errors/ValidationError';
import type { EventBus } from '@application/contracts/EventBus';
import type { LabRepository } from '@domain/repositories/LabRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';

import { CreateLabCommandHandler, UpdateLabCommandHandler } from './LabCommands';

const systemAdmin = { isSystemAdmin: () => true } as unknown as User;

function makeCreateHandler(opts: { existingSlug?: unknown } = {}) {
  const userRepository = { findByIdAnyLab: jest.fn().mockResolvedValue(systemAdmin) } as unknown as UserRepository;
  const save = jest.fn();
  const findBySlug = jest.fn().mockResolvedValue(opts.existingSlug ?? null);
  const labRepository = { save, findBySlug } as unknown as LabRepository;
  const ensureDefaultForLab = jest.fn();
  const storageRepository = { ensureDefaultForLab } as unknown as StorageRepository;
  const publish = jest.fn();
  const eventBus = { publish } as unknown as EventBus;

  const handler = new CreateLabCommandHandler(labRepository, storageRepository, userRepository, eventBus);
  return { handler, save, ensureDefaultForLab, publish };
}

describe('CreateLabCommandHandler', () => {
  const command = { userId: 'admin', name: 'New Lab' };

  it('rejects an empty name', async () => {
    const { handler, save } = makeCreateHandler();
    await expect(handler.handle({ userId: 'admin', name: '  ' })).rejects.toBeInstanceOf(ValidationError);
    expect(save).not.toHaveBeenCalled();
  });

  it('rejects a duplicate slug', async () => {
    const { handler, save } = makeCreateHandler({ existingSlug: { name: 'New Lab' } });
    await expect(handler.handle(command)).rejects.toBeInstanceOf(ValidationError);
    expect(save).not.toHaveBeenCalled();
  });

  it('creates the lab, seeds default storage, publishes, and returns the lab', async () => {
    const { handler, save, ensureDefaultForLab, publish } = makeCreateHandler();
    const lab = await handler.handle(command);
    expect(lab.name).toBe('New Lab');
    expect(save).toHaveBeenCalledWith(lab);
    expect(ensureDefaultForLab).toHaveBeenCalledWith(lab.id);
    expect(publish).toHaveBeenCalled();
  });
});

function makeUpdateHandler(opts: { lab?: unknown; existingSlug?: unknown } = {}) {
  const userRepository = { findByIdAnyLab: jest.fn().mockResolvedValue(systemAdmin) } as unknown as UserRepository;
  const save = jest.fn();
  const findById = jest.fn().mockResolvedValue(opts.lab ?? null);
  const findBySlug = jest.fn().mockResolvedValue(opts.existingSlug ?? null);
  const labRepository = { save, findById, findBySlug } as unknown as LabRepository;
  const publish = jest.fn();
  const eventBus = { publish } as unknown as EventBus;

  const handler = new UpdateLabCommandHandler(labRepository, userRepository, eventBus);
  return { handler, save, publish };
}

describe('UpdateLabCommandHandler', () => {
  it('throws when the lab is not found', async () => {
    const { handler } = makeUpdateHandler({ lab: null });
    await expect(handler.handle({ userId: 'admin', labId: 'l1', name: 'X' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('returns the lab without saving when the name is unchanged', async () => {
    const lab = Lab.create('Same Name');
    const { handler, save, publish } = makeUpdateHandler({ lab });

    const result = await handler.handle({ userId: 'admin', labId: lab.id, name: 'Same Name' });

    expect(result).toBe(lab);
    expect(save).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it('renames, saves, publishes, and returns the updated lab', async () => {
    const lab = Lab.create('Old Name');
    const { handler, save, publish } = makeUpdateHandler({ lab });

    const result = await handler.handle({ userId: 'admin', labId: lab.id, name: 'New Name' });

    expect(result).toBe(lab);
    expect(result.name).toBe('New Name');
    expect(save).toHaveBeenCalledWith(lab);
    expect(publish).toHaveBeenCalled();
  });
});
