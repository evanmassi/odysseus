/**
 * Shared Services Interface
 *
 * Cross-cutting infrastructure dependencies passed to all DI modules.
 */

import type { ConfigurationService } from '@application/contracts/ConfigurationService';
import type { PasswordService } from '@application/contracts/PasswordService';
import type { SessionService } from '@application/contracts/SessionService';
import type { AccessControlService } from '@domain/services/AccessControlService';
import type { EmailService } from '@domain/services/EmailService';
import type { TubePositionService } from '@domain/services/TubePositionService';
import type { ValidationService } from '@domain/services/ValidationService';
import type { InMemoryEventBus } from '@infrastructure/events/InMemoryEventBus';

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
