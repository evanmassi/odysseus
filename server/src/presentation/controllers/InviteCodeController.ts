/**
 * Invite Code Controller
 *
 * Endpoints for invite code lifecycle management.
 */

import { Request, Response, NextFunction } from 'express';
import { BaseController } from './BaseController';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';
import type { CreateInviteCodeCommandHandler, DeactivateInviteCodeCommandHandler } from '@application/commands/InviteCodeCommands';
import type { ValidateInviteCodeQueryHandler } from '@application/queries/InviteCodeQueries';
import type { InviteCodeRepository } from '@domain/repositories/InviteCodeRepository';
import { logger } from '@infrastructure/logging/logger';

export class InviteCodeController extends BaseController {
  constructor(
    private createInviteCodeHandler: CreateInviteCodeCommandHandler,
    private deactivateInviteCodeHandler: DeactivateInviteCodeCommandHandler,
    private validateInviteCodeHandler: ValidateInviteCodeQueryHandler,
    private inviteCodeRepository: InviteCodeRepository
  ) {
    super();
  }

  /** List invite codes for a specific lab (system admin — any lab via :labId param) */
  async listForLab(req: Request, res: Response, next: NextFunction): Promise<void> {
    return this.listCodes(req.params.labId, res, next);
  }

  /** List invite codes for the current user's lab (lab admin) */
  async listForCurrentLab(req: Request, res: Response, next: NextFunction): Promise<void> {
    return this.listCodes(this.extractLabId(req), res, next);
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    const labId = req.params.labId ?? req.body.labId;
    return this.createCode(labId, req, res, next);
  }

  /** Create an invite code scoped to the current user's lab */
  async createForCurrentLab(req: Request, res: Response, next: NextFunction): Promise<void> {
    return this.createCode(this.extractLabId(req), req, res, next);
  }

  private async listCodes(labId: string, res: Response, next: NextFunction): Promise<void> {
    try {
      const codes = await this.inviteCodeRepository.findByLabId(labId);
      res.status(200).json(ResponseBuilder.success({
        inviteCodes: codes.map(c => c.toData()),
      }));
    } catch (error) {
      next(error);
    }
  }

  private async createCode(labId: string, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { role, maxUses, expiresAt } = req.body;

      const result = await this.createInviteCodeHandler.handle({
        userId, labId, role, maxUses, expiresAt,
      });

      res.status(201).json(ResponseBuilder.success({ inviteCode: result }));
      logger.info('Invite code created', { codeId: result.id, labId, createdBy: userId });
    } catch (error) {
      next(error);
    }
  }

  async deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const codeId = req.params.id;

      await this.deactivateInviteCodeHandler.handle({ userId, codeId });

      res.status(200).json(ResponseBuilder.success({ deactivated: true }));

      logger.info('Invite code deactivated', { codeId, deactivatedBy: userId });
    } catch (error) {
      next(error);
    }
  }

  /** Public endpoint — validates an invite code during registration */
  async validate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code } = req.body;

      const result = await this.validateInviteCodeHandler.handle({ code });

      res.status(200).json(ResponseBuilder.success(result));
    } catch (error) {
      next(error);
    }
  }
}
