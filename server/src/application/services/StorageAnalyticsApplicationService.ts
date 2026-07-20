/**
 * Storage Analytics Service
 *
 * Capacity and utilization aggregation for a single lab and across all labs.
 */

import type { Storage } from '@domain/entities/Storage';
import type { LabRepository } from '@domain/repositories/LabRepository';
import type { StorageRepository } from '@domain/repositories/StorageRepository';
import type { TubeRepository } from '@domain/repositories/TubeRepository';

import type {
  CrossLabStorageAnalyticsResponse,
  LabStorageAnalyticsResponse,
} from '@odysseus/shared-schemas';

interface LocationCount {
  tankId: string;
  rackId: string;
  boxId: string;
  count: number;
}

const NEAR_CAPACITY_THRESHOLD = 0.9;

export interface StorageAnalyticsApplicationServiceDeps {
  storageRepository: StorageRepository;
  tubeRepository: TubeRepository;
  labRepository: LabRepository;
}

export class StorageAnalyticsApplicationService {
  constructor(private deps: StorageAnalyticsApplicationServiceDeps) {}

  async getLabAnalytics(labId: string): Promise<LabStorageAnalyticsResponse> {
    const storage = await this.deps.storageRepository.getForLab(labId);
    if (!storage) {
      return {
        totalPositions: 0,
        totalOccupied: 0,
        utilizationPercent: 0,
        tanks: [],
        nearCapacityBoxes: [],
      };
    }

    const locationCounts = await this.deps.tubeRepository.countGroupedByLocation(labId);
    return this.computeLabUtilization(storage, locationCounts);
  }

  async getCrossLabAnalytics(): Promise<CrossLabStorageAnalyticsResponse> {
    const labs = await this.deps.labRepository.findAll();
    const labIds = labs.map(l => l.id);

    const [storageMap, allLocationCounts] = await Promise.all([
      this.deps.storageRepository.getForLabs(labIds),
      this.deps.tubeRepository.countGroupedByLocationAllLabs(),
    ]);

    const countsByLab = new Map<string, LocationCount[]>();
    for (const entry of allLocationCounts) {
      const existing = countsByLab.get(entry.labId) ?? [];
      existing.push({
        tankId: entry.tankId,
        rackId: entry.rackId,
        boxId: entry.boxId,
        count: entry.count,
      });
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

    return {
      totalPositions,
      totalOccupied,
      utilizationPercent:
        totalPositions > 0 ? Math.round((totalOccupied / totalPositions) * 1000) / 10 : 0,
      labs: labSummaries,
    };
  }

  private computeLabUtilization(
    storage: Storage,
    locationCounts: LocationCount[]
  ): LabStorageAnalyticsResponse {
    const countMap = new Map<string, number>();
    for (const lc of locationCounts) {
      countMap.set(`${lc.tankId}|${lc.rackId}|${lc.boxId}`, lc.count);
    }

    let totalPositions = 0;
    let totalOccupied = 0;
    const nearCapacityBoxes: Array<{
      tankName: string;
      rackName: string;
      boxName: string;
      occupied: number;
      maxPositions: number;
      utilizationPercent: number;
    }> = [];

    const tanks = storage.equipment.getActiveTanks().map(tank => {
      let tankPositions = 0;
      let tankOccupied = 0;

      const racks = storage.equipment.getActiveRacksForTank(tank.id).map(rack => {
        let rackPositions = 0;
        let rackOccupied = 0;

        const boxes = storage.equipment.getActiveBoxesForRack(tank.id, rack.id).map(box => {
          const maxPositions = box.maxPositions;
          const occupied = countMap.get(`${tank.id}|${rack.id}|${box.name}`) ?? 0;
          const utilizationPercent =
            maxPositions > 0 ? Math.round((occupied / maxPositions) * 1000) / 10 : 0;

          rackPositions += maxPositions;
          rackOccupied += occupied;

          if (maxPositions > 0 && occupied / maxPositions >= NEAR_CAPACITY_THRESHOLD) {
            nearCapacityBoxes.push({
              tankName: tank.name,
              rackName: rack.name,
              boxName: box.name,
              occupied,
              maxPositions,
              utilizationPercent,
            });
          }

          return { boxName: box.name, maxPositions, occupied, utilizationPercent };
        });

        tankPositions += rackPositions;
        tankOccupied += rackOccupied;

        const rackUtilization =
          rackPositions > 0 ? Math.round((rackOccupied / rackPositions) * 1000) / 10 : 0;
        return {
          rackId: rack.id,
          rackName: rack.name,
          totalPositions: rackPositions,
          occupied: rackOccupied,
          utilizationPercent: rackUtilization,
          boxes,
        };
      });

      totalPositions += tankPositions;
      totalOccupied += tankOccupied;

      const tankUtilization =
        tankPositions > 0 ? Math.round((tankOccupied / tankPositions) * 1000) / 10 : 0;
      return {
        tankId: tank.id,
        tankName: tank.name,
        totalPositions: tankPositions,
        occupied: tankOccupied,
        utilizationPercent: tankUtilization,
        racks,
      };
    });

    const utilizationPercent =
      totalPositions > 0 ? Math.round((totalOccupied / totalPositions) * 1000) / 10 : 0;

    return { totalPositions, totalOccupied, utilizationPercent, tanks, nearCapacityBoxes };
  }
}
