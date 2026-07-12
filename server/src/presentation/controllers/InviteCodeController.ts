/**
 * Invite Code Controller
 *
 * Endpoints for invite code lifecycle management.
 */


import type { CreateInviteCodeCommandHandler, DeactivateInviteCodeCommandHandler } from '@application/commands/InviteCodeCommands';
import type { ValidateInviteCodeQueryHandler, ListInviteCodesQueryHandler } from '@application/queries/InviteCodeQueries';
import { logger } from '@infrastructure/logging/logger';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import { BaseController } from './BaseController';

import type { Request, Response } from 'express';

export interface InviteCodeControllerDeps {
  createInviteCodeHandler: CreateInviteCodeCommandHandler;
  deactivateInviteCodeHandler: DeactivateInviteCodeCommandHandler;
  validateInviteCodeHandler: ValidateInviteCodeQueryHandler;
  listInviteCodesHandler: ListInviteCodesQueryHandler;
}

export class InviteCodeController extends BaseController {
  constructor(private deps: InviteCodeControllerDeps) {
    super();
  }

  /** List invite codes for the current user's lab (lab admin) */
  async listForCurrentLab(req: Request, res: Response): Promise<void> {
    return this.listCodes(this.extractLabId(req), req, res);
  }

  async create(req: Request, res: Response): Promise<void> {
    const labId = req.params.labId;
    return this.createCode(labId, req, res);
  }

  /** Create an invite code scoped to the current user's lab */
  async createForCurrentLab(req: Request, res: Response): Promise<void> {
    return this.createCode(this.extractLabId(req), req, res);
  }

  private async listCodes(labId: string, req: Request, res: Response): Promise<void> {
    try {
      const inviteCodes = await this.deps.listInviteCodesHandler.handle({ labId });
      res.status(200).json(ResponseBuilder.success({ inviteCodes }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to list invite codes', req.requestId);
    }
  }

  private async createCode(labId: string, req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const { role, createResearcher, maxUses, expiresAt } = req.body;

      const result = await this.deps.createInviteCodeHandler.handle({
        userId, labId, role, createResearcher, maxUses, expiresAt,
      });

      res.status(201).json(ResponseBuilder.success({ inviteCode: result }));
      logger.info('Invite code created', { codeId: result.id, labId, createdBy: userId });
    } catch (error) {
      handleControllerError(error, res, 'Failed to create invite code', req.requestId);
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
      handleControllerError(error, res, 'Failed to deactivate invite code', req.requestId);
    }
  }

  /** Public endpoint — validates an invite code during registration */
  async validate(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.body;

      const result = await this.deps.validateInviteCodeHandler.handle({ code });

      res.status(200).json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to validate invite code', req.requestId);
    }
  }
}
