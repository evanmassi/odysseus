/**
 * Profile Management Service
 *
 * Self-service read/update of the authenticated user's Person profile, gated
 * by current-password verification.
 */

import { verifyCurrentPassword, upgradePasswordHashIfNeeded } from '@application/authentication/passwordCredentials';
import type { PasswordService } from '@application/contracts/PasswordService';
import type { Person } from '@domain/entities/Person';
import type { User } from '@domain/entities/User';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { PermissionError } from '@domain/errors/PermissionError';
import { ValidationError } from '@domain/errors/ValidationError';
import type { PersonRepository } from '@domain/repositories/PersonRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';

import type { UpdatePersonProfile } from '@odysseus/shared-schemas';

type UpdateMyProfileRequest = UpdatePersonProfile & { currentPassword?: string };

type PersonProfile = ReturnType<Person['toData']>;

export interface PersonApplicationServiceDeps {
  personRepository: PersonRepository;
  userRepository: UserRepository;
  passwordService: PasswordService;
}

export class PersonApplicationService {
  constructor(private deps: PersonApplicationServiceDeps) {}

  async getMyProfile(user: User): Promise<PersonProfile> {
    const person = await this.getPersonOrThrow(user);
    return person.toData();
  }

  async updateMyProfile(user: User, request: UpdateMyProfileRequest): Promise<PersonProfile> {
    if (user.isDemo) {
      throw new PermissionError('Profile changes are not available in demo mode');
    }

    const person = await this.getPersonOrThrow(user);
    const { firstName, lastName, position, department, email, currentPassword } = request;

    if (!currentPassword?.trim()) {
      throw new ValidationError('Current password is required to update profile');
    }

    const fullUser = await this.deps.userRepository.findByIdAnyLab(user.id);
    if (!fullUser) {
      throw new NotFoundError('User not found');
    }

    await verifyCurrentPassword(fullUser, currentPassword, this.deps.passwordService);
    await upgradePasswordHashIfNeeded(fullUser, currentPassword, this.deps.passwordService, this.deps.userRepository);

    if (firstName !== undefined && !firstName.trim()) {
      throw new ValidationError('First name cannot be empty');
    }
    if (lastName !== undefined && !lastName.trim()) {
      throw new ValidationError('Last name cannot be empty');
    }

    if (firstName !== undefined || lastName !== undefined || position !== undefined || department !== undefined) {
      person.updateProfile(
        firstName ?? person.firstName,
        lastName ?? person.lastName,
        position ?? person.position,
        department ?? person.department
      );
    }

    if (email !== undefined) {
      if (!email.trim()) {
        throw new ValidationError('Email cannot be empty');
      }
      const existingPerson = await this.deps.personRepository.findByEmail(email);
      if (existingPerson && existingPerson.id !== person.id) {
        throw new ValidationError('Email is already in use');
      }
      person.updateEmail(email);
    }

    await this.deps.personRepository.save(person);
    return person.toData();
  }

  /** Resolves the authenticated user's contact email, if any. Null-tolerant for users without a linked person. */
  async getContactEmail(user: User): Promise<string | undefined> {
    if (!user.personId) {
      return undefined;
    }
    const person = await this.deps.personRepository.findById(user.personId);
    return person?.email;
  }

  private async getPersonOrThrow(user: User): Promise<Person> {
    if (!user.personId) {
      throw new NotFoundError('User does not have a linked person profile');
    }
    const person = await this.deps.personRepository.findById(user.personId);
    if (!person) {
      throw new NotFoundError('Person profile not found');
    }
    return person;
  }
}
