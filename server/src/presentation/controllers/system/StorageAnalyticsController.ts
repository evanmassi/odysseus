/**
 * Storage Analytics Controller
 *
 * System admin and lab admin endpoints for storage capacity and utilization analytics.
 */

import type { LabRepository } from '@domain/repositories/LabRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { TubeRepository } from '@domain/repositories/TubeRepository';
import { BaseController } from '@presentation/controllers/BaseController';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { Storage } from '@domain/entities/Storage';
import type { Request, Response } from 'express';

export interface StorageAnalyticsControllerDeps {
  storageRepository: StorageRepository;
  tubeRepository: TubeRepository;
  labRepository: LabRepository;
}

interface LocationCount {
  tankId: string;
  rackId: string;
  boxId: string;
  count: number;
}

const NEAR_CAPACITY_THRESHOLD = 0.9;

export class StorageAnalyticsController extends BaseController {
  constructor(private deps: StorageAnalyticsControllerDeps) {
    super();
  }

  async getLabStorageAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const labId = req.params.labId ?? req.user?.labId;
      if (!labId) {
        res.status(400).json(ResponseBuilder.error('MISSING_LAB_ID', 'Lab context required'));
        return;
      }

      const storage = await this.deps.storageRepository.getForLab(labId);
      if (!storage) {
        res.status(200).json(ResponseBuilder.success({
          totalPositions: 0,
          totalOccupied: 0,
          utilizationPercent: 0,
          tanks: [],
          nearCapacityBoxes: [],
        }));
        return;
      }

      const locationCounts = await this.deps.tubeRepository.countGroupedByLocation(labId);
      const result = this.computeLabUtilization(storage, locationCounts);

      res.status(200).json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get storage analytics');
    }
  }

  async getCrossLabStorageAnalytics(_req: Request, res: Response): Promise<void> {
    try {
      const labs = await this.deps.labRepository.findAll();
      const labIds = labs.map(l => l.id);

      const [storageMap, allLocationCounts] = await Promise.all([
        this.deps.storageRepository.getForLabs(labIds),
        this.deps.tubeRepository.countGroupedByLocationAllLabs(),
      ]);

      const countsByLab = new Map<string, LocationCount[]>();
      for (const entry of allLocationCounts) {
        const existing = countsByLab.get(entry.labId) ?? [];
        existing.push({ tankId: entry.tankId, rackId: entry.rackId, boxId: entry.boxId, count: entry.count });
        countsByLab.set(entry.labId, existing);
      }

      let totalPositions = 0;
      let totalOccupied = 0;

      const labSummaries = labs.map(lab => {
        const storage = storageMap.get(lab.id);
        if (!storage) {
          return {
            labId: lab.id,
            labName: lab.name,
            totalPositions: 0,
            totalOccupied: 0,
            utilizationPercent: 0,
          };
        }

        const counts = countsByLab.get(lab.id) ?? [];
        const utilization = this.computeLabUtilization(storage, counts);

        totalPositions += utilization.totalPositions;
        totalOccupied += utilization.totalOccupied;

        return {
          labId: lab.id,
          labName: lab.name,
          totalPositions: utilization.totalPositions,
          totalOccupied: utilization.totalOccupied,
          utilizationPercent: utilization.utilizationPercent,
        };
      });

      res.status(200).json(ResponseBuilder.success({
        totalPositions,
        totalOccupied,
        utilizationPercent: totalPositions > 0 ? Math.round((totalOccupied / totalPositions) * 1000) / 10 : 0,
        labs: labSummaries,
      }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get cross-lab storage analytics');
    }
  }

  private computeLabUtilization(
    storage: Storage,
    locationCounts: LocationCount[]
  ): {
    totalPositions: number;
    totalOccupied: number;
    utilizationPercent: number;
    tanks: Array<{
      tankId: string; tankName: string; totalPositions: number; occupied: number; utilizationPercent: number;
      racks: Array<{
        rackId: string; rackName: string; totalPositions: number; occupied: number; utilizationPercent: number;
        boxes: Array<{ boxName: string; maxPositions: number; occupied: number; utilizationPercent: number }>;
      }>;
    }>;
    nearCapacityBoxes: Array<{ tankName: string; rackName: string; boxName: string; occupied: number; maxPositions: number; utilizationPercent: number }>;
  } {
    const countMap = new Map<string, number>();
    for (const lc of locationCounts) {
      countMap.set(`${lc.tankId}|${lc.rackId}|${lc.boxId}`, lc.count);
    }

    let totalPositions = 0;
    let totalOccupied = 0;
    const nearCapacityBoxes: Array<{ tankName: string; rackName: string; boxName: string; occupied: number; maxPositions: number; utilizationPercent: number }> = [];

    const tanks = storage.equipment.getActiveTanks().map(tank => {
      let tankPositions = 0;
      let tankOccupied = 0;

      const racks = storage.equipment.getActiveRacksForTank(tank.id).map(rack => {
        let rackPositions = 0;
        let rackOccupied = 0;

        const boxes = storage.equipment.getActiveBoxesForRack(tank.id, rack.id).map(box => {
          const maxPositions = box.maxPositions;
          const occupied = countMap.get(`${tank.id}|${rack.id}|${box.name}`) ?? 0;
          const utilizationPercent = maxPositions > 0 ? Math.round((occupied / maxPositions) * 1000) / 10 : 0;

          rackPositions += maxPositions;
          rackOccupied += occupied;

          if (maxPositions > 0 && occupied / maxPositions >= NEAR_CAPACITY_THRESHOLD) {
            nearCapacityBoxes.push({
              tankName: tank.name, rackName: rack.name, boxName: box.name,
              occupied, maxPositions, utilizationPercent,
            });
          }

          return { boxName: box.name, maxPositions, occupied, utilizationPercent };
        });

        tankPositions += rackPositions;
        tankOccupied += rackOccupied;

        const rackUtilization = rackPositions > 0 ? Math.round((rackOccupied / rackPositions) * 1000) / 10 : 0;
        return { rackId: rack.id, rackName: rack.name, totalPositions: rackPositions, occupied: rackOccupied, utilizationPercent: rackUtilization, boxes };
      });

      totalPositions += tankPositions;
      totalOccupied += tankOccupied;

      const tankUtilization = tankPositions > 0 ? Math.round((tankOccupied / tankPositions) * 1000) / 10 : 0;
      return { tankId: tank.id, tankName: tank.name, totalPositions: tankPositions, occupied: tankOccupied, utilizationPercent: tankUtilization, racks };
    });

    const utilizationPercent = totalPositions > 0 ? Math.round((totalOccupied / totalPositions) * 1000) / 10 : 0;

    return { totalPositions, totalOccupied, utilizationPercent, tanks, nearCapacityBoxes };
  }
}
