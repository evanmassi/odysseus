/**
 * Public Demo Operations
 *
 * The nightly demo reset, authenticated by a shared key rather than a session.
 */

import { API_ERROR_CODES } from '@odysseus/shared-schemas';

import type { ResetDemoDataCommandHandler } from '@application/commands/DemoSeedCommands';
import type { ConfigurationService } from '@application/contracts/ConfigurationService';
import type { SecurityMonitoringApplicationService } from '@application/services/SecurityMonitoringApplicationService';
import type { UserApplicationService } from '@application/services/UserApplicationService';
import { constantTimeEqual } from '@domain/utils/constantTimeEqual';
import { logger } from '@infrastructure/logging/logger';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { Request, Response } from 'express';

/** Short enough to brute-force at any rate limit is not a secret. */
const MIN_RESET_KEY_LENGTH = 32;

const RESET_KEY_HEADER = 'x-demo-reset-key';

export interface DemoControllerDeps {
  resetDemoDataHandler: ResetDemoDataCommandHandler;
  userApplicationService: UserApplicationService;
  securityMonitoring: SecurityMonitoringApplicationService;
  configurationService: ConfigurationService;
}

export class DemoController {
  constructor(private deps: DemoControllerDeps) {}

  async reset(req: Request, res: Response): Promise<void> {
    try {
      const demo = this.deps.configurationService.get('demo');

      if (!demo.resetKey || !demo.username) {
        this.notFound(res);
        return;
      }

      if (demo.resetKey.length < MIN_RESET_KEY_LENGTH) {
        logger.error('DEMO_RESET_KEY is too short — the unattended reset stays disabled', {
          required: MIN_RESET_KEY_LENGTH,
        });
        this.notFound(res);
        return;
      }

      const presented = req.header(RESET_KEY_HEADER);
      if (!presented || !constantTimeEqual(presented, demo.resetKey)) {
        // Same response as an unconfigured endpoint: a wrong key learns nothing.
        this.notFound(res);
        return;
      }

      // `isDemo` reads the lab's own flag through the account lookup's join — the same signal
      // every containment guard keys on, so this cannot disagree with the rest of the system.
      const user = await this.deps.userApplicationService.getUserByUsername(demo.username);
      if (!user?.labId || !user.isDemo) {
        logger.error('Unattended reset refused — the configured account is not in a demo lab', {
          username: demo.username,
        });
        this.notFound(res);
        return;
      }

      const result = await this.deps.resetDemoDataHandler.handleUnattended(user.labId, user.id);

      // Every demo visit leaves a session and a refresh token that nothing else reclaims. Run
      // after the reset, not inside it — failing to tidy up must not undo a good restore.
      const purged = await this.deps.securityMonitoring.purgeExpiredSessions();

      logger.info('Unattended demo reset completed', {
        labId: user.labId,
        restored: result.restored,
        ...purged,
      });

      res.json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to reset the demo lab', req.requestId);
    }
  }

  private notFound(res: Response): void {
    res.status(404).json(ResponseBuilder.error(API_ERROR_CODES.RESOURCE_NOT_FOUND, 'Not found'));
  }
}
