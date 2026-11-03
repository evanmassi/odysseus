import { NAMING_PATTERNS, DEFAULT_GRID_CONFIG } from '@odysseus/shared-schemas';

import type { Storage } from '@domain/entities/Storage';
import type { Tank, Rack, Box } from '@domain/value-objects/Equipment';

import type { StorageResponse } from '@odysseus/shared-schemas';

export class StorageDto {
  static toResponse(config: Storage): StorageResponse {
    const configData = config.toData();
    const updatedAtDate = new Date(configData.updatedAt);

    const defaultBoxConfig = {
      id: 'A',
      name: 'Box A',
      gridConfig: DEFAULT_GRID_CONFIG,
      position: 1,
    };

    return {
      configuration: {
        systemConfig: {
          currentLabId: 'default-lab',
          availableLabs: [
            {
              id: 'default-lab',
              name: configData.systemSettings.labName,
              organization: 'Default Organization',
              isActive: true,
              createdAt: updatedAtDate,
              updatedAt: updatedAtDate,
              equipment: {
                tanks: configData.tanks.map(tank => this.transformTank(tank, updatedAtDate)),
                defaultBoxConfig,
                defaultGridConfig: DEFAULT_GRID_CONFIG,
              },
            },
          ],
          globalSettings: {
            theme: 'light' as const,
            language: 'en',
            timezone: 'America/New_York',
            autoBackup: configData.systemSettings.autoSave,
          },
          version: configData.version,
        },
        currentLab: {
          id: 'default-lab',
          name: configData.systemSettings.labName,
          organization: 'Default Organization',
          isActive: true,
          createdAt: updatedAtDate,
          updatedAt: updatedAtDate,
          equipment: {
            tanks: configData.tanks.map(tank => this.transformTank(tank, updatedAtDate)),
            defaultBoxConfig,
            defaultGridConfig: DEFAULT_GRID_CONFIG,
          },
        },
      },
    };
  }

  private static transformTank(tankData: ReturnType<Tank['toData']>, updatedAt: Date) {
    return {
      id: tankData.id,
      name: tankData.name,
      location: tankData.location,
      isActive: tankData.isActive,
      createdAt: updatedAt,
      updatedAt: updatedAt,
      defaultGridConfig: DEFAULT_GRID_CONFIG,
      ...(tankData.isSeeded && { isSeeded: true }),
      racks: tankData.racks.map(rack => this.transformRack(rack)),
    };
  }

  private static transformRack(rackData: ReturnType<Rack['toData']>) {
    return {
      id: rackData.id,
      name: rackData.name,
      capacity: rackData.capacity,
      isActive: rackData.isActive,
      assignedUserId: rackData.assignedUserId,
      customLabel: rackData.customLabel,
      ...(rackData.isSeeded && { isSeeded: true }),
      boxes: rackData.boxes.map((box, index) => this.transformBox(box, index)),
    };
  }

  private static transformBox(boxData: ReturnType<Box['toData']>, index: number) {
    // PITFALL: the display letter comes from the box name, not its index ("B" at 0 is "Box B").
    const letterIndex = boxData.name.toUpperCase().charCodeAt(0) - 65;

    return {
      id: boxData.name,
      name: NAMING_PATTERNS.BOX.DEFAULT_NAME(letterIndex),
      // PITFALL: copy rows/cols explicitly; stored JSON may hold keys the strict schema rejects.
      gridConfig: { rows: boxData.gridConfig.rows, cols: boxData.gridConfig.cols },
      position: index + 1,
      assignedUserId: boxData.assignedUserId,
      customLabel: boxData.customLabel,
      ...(boxData.isSeeded && { isSeeded: true }),
    };
  }
}
