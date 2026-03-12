/**
 * Invite Code Controller
 *
 * Endpoints for invite code lifecycle management.
 */

import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';
import type { CreateInviteCodeCommandHandler, DeactivateInviteCodeCommandHandler } from '@application/commands/InviteCodeCommands';
import type { ValidateInviteCodeQueryHandler } from '@application/queries/InviteCodeQueries';
import type { InviteCodeRepository } from '@domain/repositories/InviteCodeRepository';
import { logger } from '@infrastructure/logging/logger';

export interface InviteCodeControllerDeps {
  createInviteCodeHandler: CreateInviteCodeCommandHandler;
  deactivateInviteCodeHandler: DeactivateInviteCodeCommandHandler;
  validateInviteCodeHandler: ValidateInviteCodeQueryHandler;
  inviteCodeRepository: InviteCodeRepository;
}

export class InviteCodeController extends BaseController {
  constructor(private deps: InviteCodeControllerDeps) {
    super();
  }

  /** List invite codes for a specific lab (system admin — any lab via :labId param) */
  async listForLab(req: Request, res: Response): Promise<void> {
    return this.listCodes(req.params.labId, res);
  }

  /** List invite codes for the current user's lab (lab admin) */
  async listForCurrentLab(req: Request, res: Response): Promise<void> {
    return this.listCodes(this.extractLabId(req), res);
  }

  async create(req: Request, res: Response): Promise<void> {
    const labId = req.params.labId ?? req.body.labId;
    return this.createCode(labId, req, res);
  }

  /** Create an invite code scoped to the current user's lab */
  async createForCurrentLab(req: Request, res: Response): Promise<void> {
    return this.createCode(this.extractLabId(req), req, res);
  }

  private async listCodes(labId: string, res: Response): Promise<void> {
    try {
      const codes = await this.deps.inviteCodeRepository.findByLabId(labId);
      res.status(200).json(ResponseBuilder.success({
        inviteCodes: codes.map(c => c.toData()),
      }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to list invite codes');
    }
  }

  private async createCode(labId: string, req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { role, maxUses, expiresAt } = req.body;

      const result = await this.deps.createInviteCodeHandler.handle({
        userId, labId, role, maxUses, expiresAt,
      });

      res.status(201).json(ResponseBuilder.success({ inviteCode: result }));
      logger.info('Invite code created', { codeId: result.id, labId, createdBy: userId });
    } catch (error) {
      handleControllerError(error, res, 'Failed to create invite code');
    }
  }

  async deactivate(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const codeId = req.params.id;

      await this.deps.deactivateInviteCodeHandler.handle({ userId, codeId });

      res.status(200).json(ResponseBuilder.success({ deactivated: true }));

      logger.info('Invite code deactivated', { codeId, deactivatedBy: userId });
    } catch (error) {
      handleControllerError(error, res, 'Failed to deactivate invite code');
    }
  }

  /** Public endpoint — validates an invite code during registration */
  async validate(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.body;

      const result = await this.deps.validateInviteCodeHandler.handle({ code });

      res.status(200).json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to validate invite code');
    }
  }
}
