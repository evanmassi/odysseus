/**
 * Email Verification Commands
 *
 * Commands for email verification operations.
 */

import { User } from '@domain/entities/User';
import { UserRepository } from '@domain/repositories/UserRepository';
import { PersonRepository } from '@domain/repositories/PersonRepository';
import { EmailService } from '@domain/services/EmailService';
import { EventBus } from '@application/contracts/EventBus';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { EmailVerificationError } from '@domain/errors/EmailVerificationError';
import {
  VerificationEmailSentEvent,
  EmailVerifiedEvent,
  VerificationEmailResentEvent
} from '@domain/events/EmailVerificationEvents';

// COMMAND INTERFACES

export interface SendVerificationEmailCommand {
  userId: string;
}

export interface VerifyEmailCommand {
  token: string;
}

export interface ResendVerificationEmailCommand {
  userId: string;
}

// COMMAND HANDLERS

export class SendVerificationEmailCommandHandler {
  constructor(
    private userRepository: UserRepository,
    private personRepository: PersonRepository,
    private emailService: EmailService,
    private eventBus: EventBus
  ) {}

  async handle(command: SendVerificationEmailCommand): Promise<void> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.personId) {
      throw new EmailVerificationError('User does not have a linked person profile');
    }

    const person = await this.personRepository.findById(user.personId);
    if (!person) {
      throw new NotFoundError('Person profile not found for user');
    }

    const token = user.generateVerificationToken();
    await this.userRepository.save(user);

    await this.emailService.sendVerificationEmail(
      person.email,
      token,
      user.username
    );

    const event = new VerificationEmailSentEvent(user.id, person.email);
    await this.eventBus.publish(event);
  }
}

export class VerifyEmailCommandHandler {
  constructor(
    private userRepository: UserRepository,
    private personRepository: PersonRepository,
    private eventBus: EventBus
  ) {}

  async handle(command: VerifyEmailCommand): Promise<User> {
    const user = await this.userRepository.findByVerificationToken(command.token);
    if (!user) {
      throw EmailVerificationError.invalid();
    }

    user.verifyEmail(command.token);
    await this.userRepository.save(user);

    const person = user.personId ? await this.personRepository.findById(user.personId) : null;
    const email = person?.email || 'unknown';

    const event = new EmailVerifiedEvent(user.id, email);
    await this.eventBus.publish(event);

    return user;
  }
}

export class ResendVerificationEmailCommandHandler {
  constructor(
    private userRepository: UserRepository,
    private personRepository: PersonRepository,
    private emailService: EmailService,
    private eventBus: EventBus
  ) {}

  async handle(command: ResendVerificationEmailCommand): Promise<void> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.personId) {
      throw new EmailVerificationError('User does not have a linked person profile');
    }

    const person = await this.personRepository.findById(user.personId);
    if (!person) {
      throw new NotFoundError('Person profile not found for user');
    }

    if (user.isEmailVerified()) {
      throw new EmailVerificationError('Email is already verified');
    }

    if (!user.canResendVerification()) {
      throw EmailVerificationError.rateLimited(5);
    }

    const token = user.generateVerificationToken();
    await this.userRepository.save(user);

    await this.emailService.sendVerificationEmail(
      person.email,
      token,
      user.username
    );

    const event = new VerificationEmailResentEvent(user.id, person.email);
    await this.eventBus.publish(event);
  }
}
