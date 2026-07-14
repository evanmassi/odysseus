/**
 * Profile Management Service Tests
 *
 * Covers profile read/update: demo + password gating, name/email validation,
 * email-uniqueness, lazy hash upgrade, and the persisted result.
 */

import { Person } from '@domain/entities/Person';
import type { User } from '@domain/entities/User';
import { InvalidCredentialsError } from '@domain/errors/UserErrors';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { PermissionError } from '@domain/errors/PermissionError';
import { ValidationError } from '@domain/errors/ValidationError';
import type { PasswordService } from '@application/contracts/PasswordService';
import type { PersonRepository } from '@domain/repositories/PersonRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';

import { PersonApplicationService } from './PersonApplicationService';

function makePerson() {
  return Person.fromData({
    id: 'p1',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    position: 'Scientist',
    department: 'Biology',
    createdAt: new Date('2020-01-01T00:00:00Z'),
    updatedAt: new Date('2020-01-01T00:00:00Z'),
  });
}

function makeFullUser(setPasswordHash = jest.fn()): User {
  return {
    hasPassword: () => true,
    passwordHash: 'HASH',
    salt: 'SALT',
    setPasswordHash,
  } as unknown as User;
}

function makeService(opts: {
  person?: Person | null;
  emailOwner?: Person | null;
  fullUser?: User | null;
  verify?: boolean;
  needsUpgrade?: boolean;
} = {}) {
  const findById = jest.fn().mockResolvedValue(opts.person ?? null);
  const findByEmail = jest.fn().mockResolvedValue(opts.emailOwner ?? null);
  const savePerson = jest.fn();
  const personRepository = { findById, findByEmail, save: savePerson } as unknown as PersonRepository;

  const findByIdAnyLab = jest.fn().mockResolvedValue(opts.fullUser ?? makeFullUser());
  const saveUser = jest.fn();
  const userRepository = { findByIdAnyLab, save: saveUser } as unknown as UserRepository;

  const passwordService = {
    verify: jest.fn().mockResolvedValue(opts.verify ?? true),
    needsUpgrade: jest.fn().mockReturnValue(opts.needsUpgrade ?? false),
    hash: jest.fn().mockResolvedValue('NEWHASH'),
  } as unknown as PasswordService;

  const service = new PersonApplicationService({ personRepository, userRepository, passwordService });
  return { service, findById, findByEmail, savePerson, findByIdAnyLab, saveUser, passwordService };
}

const user = { id: 'u1', personId: 'p1', isDemo: false } as unknown as User;

describe('PersonApplicationService.getMyProfile', () => {
  it('throws when the user has no linked person', async () => {
    const { service } = makeService();
    const noProfile = { id: 'u1', personId: undefined } as unknown as User;
    await expect(service.getMyProfile(noProfile)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws when the linked person is missing', async () => {
    const { service } = makeService({ person: null });
    await expect(service.getMyProfile(user)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('returns the person data', async () => {
    const { service } = makeService({ person: makePerson() });
    const profile = await service.getMyProfile(user);
    expect(profile).toMatchObject({ id: 'p1', firstName: 'Jane', email: 'jane@example.com' });
  });
});

describe('PersonApplicationService.getContactEmail', () => {
  it('returns undefined when the user has no linked person', async () => {
    const { service, findById } = makeService();
    const noProfile = { id: 'u1', personId: undefined } as unknown as User;
    expect(await service.getContactEmail(noProfile)).toBeUndefined();
    expect(findById).not.toHaveBeenCalled();
  });

  it('returns the linked person email', async () => {
    const { service } = makeService({ person: makePerson() });
    expect(await service.getContactEmail(user)).toBe('jane@example.com');
  });
});

describe('PersonApplicationService.updateMyProfile', () => {
  it('rejects demo users with a permission error', async () => {
    const { service, findById } = makeService({ person: makePerson() });
    const demoUser = { id: 'u1', personId: 'p1', isDemo: true } as unknown as User;
    await expect(service.updateMyProfile(demoUser, { currentPassword: 'pw' })).rejects.toBeInstanceOf(PermissionError);
    expect(findById).not.toHaveBeenCalled();
  });

  it('requires the current password', async () => {
    const { service } = makeService({ person: makePerson() });
    await expect(service.updateMyProfile(user, { firstName: 'New' })).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects an incorrect current password', async () => {
    const { service, savePerson } = makeService({ person: makePerson(), verify: false });
    await expect(
      service.updateMyProfile(user, { firstName: 'New', currentPassword: 'wrong' })
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(savePerson).not.toHaveBeenCalled();
  });

  it('rejects an email already used by another person', async () => {
    const { service } = makeService({
      person: makePerson(),
      emailOwner: Person.fromData({
        id: 'other', firstName: 'A', lastName: 'B', email: 'taken@example.com',
        createdAt: new Date(), updatedAt: new Date(),
      }),
    });
    await expect(
      service.updateMyProfile(user, { email: 'taken@example.com', currentPassword: 'pw' })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('applies profile + email changes and persists the person', async () => {
    const { service, savePerson } = makeService({ person: makePerson() });

    const result = await service.updateMyProfile(user, {
      firstName: 'Janet',
      email: 'janet@example.com',
      currentPassword: 'pw',
    });

    expect(savePerson).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ firstName: 'Janet', lastName: 'Doe', email: 'janet@example.com' });
  });

  it('clears an optional field sent as an empty string', async () => {
    const { service } = makeService({ person: makePerson() });

    const result = await service.updateMyProfile(user, {
      department: '',
      currentPassword: 'pw',
    });

    expect(result.department).toBeUndefined();
    expect(result.position).toBe('Scientist');
  });

  it('leaves an omitted optional field unchanged', async () => {
    const { service } = makeService({ person: makePerson() });

    const result = await service.updateMyProfile(user, {
      firstName: 'Janet',
      currentPassword: 'pw',
    });

    expect(result.department).toBe('Biology');
    expect(result.position).toBe('Scientist');
  });

  it('lazily upgrades a legacy password hash during update', async () => {
    const setPasswordHash = jest.fn();
    const { service, saveUser } = makeService({
      person: makePerson(),
      fullUser: makeFullUser(setPasswordHash),
      needsUpgrade: true,
    });

    await service.updateMyProfile(user, { firstName: 'Janet', currentPassword: 'pw' });

    expect(setPasswordHash).toHaveBeenCalledWith('NEWHASH');
    expect(saveUser).toHaveBeenCalled();
  });
});
