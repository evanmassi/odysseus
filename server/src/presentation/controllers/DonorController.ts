/**
 * Donor Controller
 *
 * HTTP handlers for donor registry CRUD and search.
 */

import type { DonorApplicationService } from '@application/services/DonorApplicationService';
import { BaseController } from '@presentation/controllers/BaseController';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { Request, Response } from 'express';

export interface DonorControllerDeps {
  donorApplicationService: DonorApplicationService;
}

export class DonorController extends BaseController {
  constructor(private deps: DonorControllerDeps) {
    super();
  }

  async listDonors(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const donors = await this.deps.donorApplicationService.listDonors(labId);
      res.json(ResponseBuilder.success({ donors }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to list donors', req.requestId);
    }
  }

  async getDonor(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const donor = await this.deps.donorApplicationService.getDonor(labId, req.params.id);
      res.json(ResponseBuilder.success({ donor }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get donor', req.requestId);
    }
  }

  async searchDonors(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const q = req.query.q as string;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const results = await this.deps.donorApplicationService.searchDonors(labId, q, limit);
      res.json(ResponseBuilder.success({ results }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to search donors', req.requestId);
    }
  }

  async createDonor(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const donor = await this.deps.donorApplicationService.createDonor(labId, req.body, user);
      res.status(201).json(ResponseBuilder.success({ donor }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to create donor', req.requestId);
    }
  }

  async updateDonor(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const donor = await this.deps.donorApplicationService.updateDonor(labId, req.params.id, req.body, user);
      res.json(ResponseBuilder.success({ donor }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update donor', req.requestId);
    }
  }

  async deleteDonor(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      await this.deps.donorApplicationService.deleteDonor(labId, req.params.id, user);
      res.json(ResponseBuilder.success({ message: 'Donor deleted' }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete donor', req.requestId);
    }
  }

  async getCollectionHistory(req: Request, res: Response): Promise<void> {
    try {
      const history = await this.deps.donorApplicationService.getCollectionHistory(req.params.id);
      res.json(ResponseBuilder.success({ history }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get collection history', req.requestId);
    }
  }

  async addCollectionHistory(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      const entry = await this.deps.donorApplicationService.addCollectionHistory(
        labId, req.params.id, req.body, user
      );
      res.status(201).json(ResponseBuilder.success({ entry }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to add collection history', req.requestId);
    }
  }

  async deleteCollectionHistory(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const user = this.getAuthenticatedUser(req);
      await this.deps.donorApplicationService.deleteCollectionHistory(labId, req.params.historyId, user);
      res.json(ResponseBuilder.success({ message: 'Collection history entry deleted' }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete collection history', req.requestId);
    }
  }
}
