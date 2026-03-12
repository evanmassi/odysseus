/**
 * Person Controller
 *
 * Handles profile management for the authenticated user.
 */

import { Request, Response, NextFunction } from 'express';
import { BaseController } from '@presentation/controllers/BaseController';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';
import { logger } from '@infrastructure/logging/logger';
import { PersonRepository } from '@domain/repositories/PersonRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { ValidationError } from '@domain/errors/ValidationError';
import { InvalidCredentialsError } from '@domain/errors/UserErrors';
import type { Person } from '@domain/entities/Person';

export interface PersonControllerDeps {
  personRepository: PersonRepository;
  userRepository: UserRepository;
}

export class PersonController extends BaseController {
  constructor(private deps: PersonControllerDeps) {
    super();
  }

  /** GET /api/users/me/profile */
  async getMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const person = await this.getPersonForCurrentUser(req);

      logger.debug('Profile retrieved', { userId: req.user!.id, personId: person.id, requestId: req.requestId });

      res.status(200).json(ResponseBuilder.success(this.toPersonResponse(person)));
    } catch (error) {
      next(error);
    }
  }

  /** PUT /api/users/me/profile */
  async updateMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = this.getAuthenticatedUser(req);

      if (user.isDemo) {
        res.status(403).json(ResponseBuilder.forbidden('Profile changes are not available in demo mode'));
        return;
      }

      const person = await this.getPersonForCurrentUser(req);
      const { firstName, lastName, position, department, email, currentPassword } = req.body;

      if (!currentPassword || !currentPassword.trim()) {
        throw new ValidationError('Current password is required to update profile');
      }

      const fullUser = await this.deps.userRepository.findById(user.id);
      if (!fullUser) {
        throw new NotFoundError('User not found');
      }

      if (!fullUser.validatePassword(currentPassword)) {
        throw new InvalidCredentialsError('Current password is incorrect');
      }

      if (firstName !== undefined && !firstName.trim()) {
        throw new ValidationError('First name cannot be empty');
      }

      if (lastName !== undefined && !lastName.trim()) {
        throw new ValidationError('Last name cannot be empty');
      }

      if (firstName !== undefined || lastName !== undefined || position !== undefined || department !== undefined) {
        person.updateProfile(
          firstName !== undefined ? firstName : person.firstName,
          lastName !== undefined ? lastName : person.lastName,
          position !== undefined ? position : person.position,
          department !== undefined ? department : person.department
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

      logger.debug('Profile updated', {
        userId: user.id,
        personId: person.id,
        fields: { firstName, lastName, position, department, email },
        requestId: req.requestId
      });

      res.status(200).json(ResponseBuilder.success(this.toPersonResponse(person)));
    } catch (error) {
      next(error);
    }
  }

  private async getPersonForCurrentUser(req: Request): Promise<Person> {
    const user = this.getAuthenticatedUser(req);

    if (!user.personId) {
      throw new NotFoundError('User does not have a linked person profile');
    }

    const person = await this.deps.personRepository.findById(user.personId);
    if (!person) {
      throw new NotFoundError('Person profile not found');
    }

    return person;
  }

  private toPersonResponse(person: Person) {
    return {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
      position: person.position,
      department: person.department,
      createdAt: person.createdAt.toISOString(),
      updatedAt: person.updatedAt.toISOString()
    };
  }
}
