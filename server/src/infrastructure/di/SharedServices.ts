/**
 * Shared Services Interface
 *
 * Cross-cutting infrastructure dependencies passed to all DI modules.
 */

import { InMemoryEventBus } from '@infrastructure/events/InMemoryEventBus';
import { PasswordService } from '@application/contracts/PasswordService';
import { SessionService } from '@application/contracts/SessionService';
import { EmailService } from '@domain/services/EmailService';
import { ConfigurationService } from '@application/contracts/ConfigurationService';
import { AccessControlService } from '@domain/services/AccessControlService';
import { TubePositionService } from '@domain/services/TubePositionService';
import { ValidationService } from '@domain/services/ValidationService';

export interface SharedServices {
  eventBus: InMemoryEventBus;
  passwordService: PasswordService;
  sessionService: SessionService;
  emailService: EmailService;
  configurationService: ConfigurationService;
  accessControlService: AccessControlService;
  tubePositionService: TubePositionService;
  validationService: ValidationService;
}
