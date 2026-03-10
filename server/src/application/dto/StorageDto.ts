import { Storage } from '@domain/entities/Storage';
import { Tank, Rack, Box } from '@domain/valueObjects/Equipment';
import { NAMING_PATTERNS, EQUIPMENT_DEFAULTS } from '@odysseus/shared-schemas';
import type {
  StorageResponse,
  SystemConfiguration,
} from '@odysseus/shared-schemas';

/**
 * StorageDto - Application Layer DTO
 *
 * Handles bidirectional transformation between Domain Entity and API format.
 * Key responsibility: Box name transformation
 *   - LOAD: server {name: "A"} → client {id: "A", name: "Box A"}
 *   - SAVE: client {id: "A", name: "Box A"} → server {name: "A"}
 */
export class StorageDto {

  /**
   * Convert domain Configuration entity to API response format
   * Matches StorageResponseSchema from shared-schemas
   */
  static toResponse(config: Storage): StorageResponse {
    const configData = config.toData();
    const defaultGridConfig = {
      rows: EQUIPMENT_DEFAULTS.GRID_ROWS,
      cols: EQUIPMENT_DEFAULTS.GRID_COLS,
      template: 'standard' as const
    };

    const defaultBoxConfig = {
      id: 'A',
      name: 'Box A',
      gridConfig: defaultGridConfig,
      position: 1
    };

    return {
      configuration: {
        systemConfig: {
          currentLabId: 'default-lab',
          availableLabs: [{
            id: 'default-lab',
            name: configData.systemSettings.labName,
            organization: 'Default Organization',
            isActive: true,
            createdAt: configData.updatedAt,
            updatedAt: configData.updatedAt,
            equipment: {
              tanks: configData.tanks.map(tank => this.transformTank(tank, configData.updatedAt)),
              defaultBoxConfig,
              defaultGridConfig
            }
          }],
          globalSettings: {
            theme: 'light' as const,
            language: 'en',
            timezone: 'America/New_York',
            autoBackup: configData.systemSettings.autoSave
          },
          version: configData.version
        },
        currentLab: {
          id: 'default-lab',
          name: configData.systemSettings.labName,
          organization: 'Default Organization',
          isActive: true,
          createdAt: configData.updatedAt,
          updatedAt: configData.updatedAt,
          equipment: {
            tanks: configData.tanks.map(tank => this.transformTank(tank, configData.updatedAt)),
            defaultBoxConfig,
            defaultGridConfig
          }
        }
      }
    };
  }

  /**
   * Transform Tank domain data to API format
   */
  private static transformTank(tankData: ReturnType<Tank['toData']>, updatedAt: string) {
    const defaultGridConfig = {
      rows: EQUIPMENT_DEFAULTS.GRID_ROWS,
      cols: EQUIPMENT_DEFAULTS.GRID_COLS,
      template: 'standard' as const
    };

    return {
      id: tankData.id,
      name: tankData.name,
      location: tankData.location,
      isActive: tankData.isActive,
      createdAt: updatedAt,
      updatedAt: updatedAt,
      defaultGridConfig,
      ...(tankData.isSeeded && { isSeeded: true }),
      racks: tankData.racks.map(rack => this.transformRack(rack))
    };
  }

  /**
   * Transform Rack domain data to API format
   */
  private static transformRack(rackData: ReturnType<Rack['toData']>) {
    return {
      id: rackData.id,
      name: rackData.name,
      capacity: rackData.capacity,
      isActive: rackData.isActive,
      assignedUserId: rackData.assignedUserId,
      customLabel: rackData.customLabel,
      ...(rackData.isSeeded && { isSeeded: true }),
      boxes: rackData.boxes.map((box, index) => this.transformBox(box, index))
    };
  }

  /**
   * Transform Box domain data to API format
   *
   * KEY TRANSFORMATION:
   * Server Box has only `name` property (e.g., "A")
   * Client expects both `id` and `name`:
   *   - id: "A" (for internal referencing)
   *   - name: "Box A" (for display)
   */
  private static transformBox(boxData: ReturnType<Box['toData']>, index: number) {
    // Calculate letter index from the box name itself (not array position)
    // This ensures "B" becomes "Box B" even if it's at index 0
    const letterIndex = boxData.name.toUpperCase().charCodeAt(0) - 65;

    return {
      id: boxData.name,  // Server "A" becomes client id "A"
      name: NAMING_PATTERNS.BOX.DEFAULT_NAME(letterIndex),  // Generate "Box A"
      gridConfig: {
        ...boxData.gridConfig,
        template: 'standard' as const
      },
      position: index + 1,
      assignedUserId: boxData.assignedUserId,
      customLabel: boxData.customLabel,
      ...(boxData.isSeeded && { isSeeded: true })
    };
  }
}
