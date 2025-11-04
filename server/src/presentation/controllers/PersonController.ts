/**
 * Person Controller
 *
 * Handles profile management for the authenticated user.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '@utils/logger';
import { PersonRepository } from '@domain/repositories/PersonRepository';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { PermissionError } from '@domain/errors/PermissionError';
import { ValidationError } from '@domain/errors/ValidationError';

export class PersonController {
  constructor(private personRepository: PersonRepository) {}

  // GET /api/users/me/profile
  async getMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new PermissionError('Authentication required');
      }

      if (!req.user.personId) {
        throw new NotFoundError('User does not have a linked person profile');
      }

      const person = await this.personRepository.findById(req.user.personId);

      if (!person) {
        throw new NotFoundError('Person profile not found');
      }

      logger.info('Profile retrieved', { userId: req.user.id, personId: person.id });

      res.status(200).json({
        success: true,
        data: {
          id: person.id,
          firstName: person.firstName,
          lastName: person.lastName,
          email: person.email,
          position: person.position,
          department: person.department,
          createdAt: person.createdAt.toISOString(),
          updatedAt: person.updatedAt.toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/users/me/profile
  async updateMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new PermissionError('Authentication required');
      }

      if (!req.user.personId) {
        throw new NotFoundError('User does not have a linked person profile');
      }

      const person = await this.personRepository.findById(req.user.personId);

      if (!person) {
        throw new NotFoundError('Person profile not found');
      }

      // Update profile fields if provided
      const { firstName, lastName, position, department, email } = req.body;

      // Validate required fields if provided
      if (firstName !== undefined && !firstName.trim()) {
        throw new ValidationError('First name cannot be empty');
      }

      if (lastName !== undefined && !lastName.trim()) {
        throw new ValidationError('Last name cannot be empty');
      }

      // Update profile (name, position, department)
      if (firstName !== undefined || lastName !== undefined || position !== undefined || department !== undefined) {
        person.updateProfile(
          firstName !== undefined ? firstName : person.firstName,
          lastName !== undefined ? lastName : person.lastName,
          position !== undefined ? position : person.position,
          department !== undefined ? department : person.department
        );
      }

      // Update email separately if provided
      if (email !== undefined) {
        if (!email.trim()) {
          throw new ValidationError('Email cannot be empty');
        }

        // Check if email is already in use by another person
        const existingPerson = await this.personRepository.findByEmail(email);
        if (existingPerson && existingPerson.id !== person.id) {
          throw new ValidationError('Email is already in use');
        }

        person.updateEmail(email);
      }

      // Save updated person
      await this.personRepository.save(person);

      logger.info('Profile updated', {
        userId: req.user.id,
        personId: person.id,
        fields: { firstName, lastName, position, department, email }
      });

      res.status(200).json({
        success: true,
        data: {
          id: person.id,
          firstName: person.firstName,
          lastName: person.lastName,
          email: person.email,
          position: person.position,
          department: person.department,
          createdAt: person.createdAt.toISOString(),
          updatedAt: person.updatedAt.toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
