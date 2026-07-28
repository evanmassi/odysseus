/**
 * Attribute Controller
 *
 * HTTP handlers for lab attribute definitions and their options.
 */

import type { AttributeApplicationService } from '@application/services/AttributeApplicationService';
import { BaseController } from '@presentation/controllers/BaseController';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { Request, Response } from 'express';

export interface AttributeControllerDeps {
  attributeService: AttributeApplicationService;
}

export class AttributeController extends BaseController {
  constructor(private deps: AttributeControllerDeps) {
    super();
  }

  async listAttributes(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const result = await this.deps.attributeService.list(labId);
      res.json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to list attributes', req.requestId);
    }
  }

  async createDefinition(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const definition = await this.deps.attributeService.createDefinition(labId, req.body, user);
      res.status(201).json(ResponseBuilder.success({ definition }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to create attribute', req.requestId);
    }
  }

  async updateDefinition(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const definition = await this.deps.attributeService.updateDefinition(
        labId,
        req.params.definitionId,
        req.body,
        user
      );
      res.json(ResponseBuilder.success({ definition }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update attribute', req.requestId);
    }
  }

  async deleteDefinition(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      await this.deps.attributeService.deleteDefinition(labId, req.params.definitionId, user);
      res.status(204).send();
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete attribute', req.requestId);
    }
  }

  async createOption(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const option = await this.deps.attributeService.createOption(
        labId,
        req.params.definitionId,
        req.body,
        user
      );
      res.status(201).json(ResponseBuilder.success({ option }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to create attribute option', req.requestId);
    }
  }

  async updateOption(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const option = await this.deps.attributeService.updateOption(
        labId,
        req.params.optionId,
        req.body,
        user
      );
      res.json(ResponseBuilder.success({ option }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update attribute option', req.requestId);
    }
  }

  async deleteOption(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      await this.deps.attributeService.deleteOption(labId, req.params.optionId, user);
      res.status(204).send();
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete attribute option', req.requestId);
    }
  }
}
