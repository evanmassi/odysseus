import { Configuration } from '@domain/entities/Configuration';
import { Tank, Rack, Box } from '@domain/valueObjects/Equipment';
import { NAMING_PATTERNS, EQUIPMENT_DEFAULTS } from '@odysseus/shared-schemas';
import type {
  ConfigurationResponse,
  SystemConfiguration,
  LabConfiguration
} from '@odysseus/shared-schemas';

/** Return type for fromRequest transformation (LabConfiguration with transformed equipment) */
interface TransformedLabConfiguration extends Omit<LabConfiguration, 'equipment'> {
  equipment: {
    tanks: Array<{
      id: string;
      name: string;
      location?: string;
      isActive: boolean;
      maxRacks: number;
      racks: Array<{
        id: number;
        name: string;
        capacity: number;
        maxBoxes: number;
        isActive: boolean;
        assignedUserId?: string;
        customLabel?: string;
        boxes: Array<{
          name: string;
          gridConfig: { rows: number; cols: number };
          maxPositions: number;
          isActive: boolean;
          // Tri-state: string = assigned, null = explicitly common, undefined = inherit from rack
          assignedUserId?: string | null;
          customLabel?: string;
        }>;
      }>;
    }>;
  };
}

/**
 * ConfigurationDto - Application Layer DTO
 *
 * Handles bidirectional transformation between Domain Entity and API format.
 * Key responsibility: Box name transformation
 *   - LOAD: server {name: "A"} → client {id: "A", name: "Box A"}
 *   - SAVE: client {id: "A", name: "Box A"} → server {name: "A"}
 */
export class ConfigurationDto {

  /**
   * Convert domain Configuration entity to API response format
   * Matches ConfigurationResponseSchema from shared-schemas
   */
  static toResponse(config: Configuration): ConfigurationResponse {
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
      isDemo: tankData.isDemo,
      createdAt: updatedAt,
      updatedAt: updatedAt,
      defaultGridConfig,
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
      customLabel: boxData.customLabel
    };
  }

  /**
   * Transform incoming save request from client format to domain format
   *
   * KEY TRANSFORMATION (SAVE direction):
   * Client sends API schema (with extra fields like location, createdAt, etc.)
   * Server needs only domain fields that Configuration.fromData() expects
   */
  static fromRequest(currentLab: LabConfiguration): TransformedLabConfiguration {
    return {
      ...currentLab,
      equipment: {
        tanks: currentLab.equipment.tanks.map(tank => ({
          id: tank.id,
          name: tank.name,
          location: tank.location,
          isActive: tank.isActive,
          maxRacks: tank.racks.length,
          racks: tank.racks.map(rack => ({
            id: typeof rack.id === 'string' ? parseInt(rack.id) : rack.id,
            name: rack.name,
            capacity: rack.capacity,
            maxBoxes: rack.boxes.length,
            isActive: rack.isActive,
            assignedUserId: rack.assignedUserId,
            customLabel: rack.customLabel,
            boxes: rack.boxes.map(box => ({
              name: box.id,  // Client id:"A" → Server name:"A"
              gridConfig: {
                rows: box.gridConfig.rows,
                cols: box.gridConfig.cols
              },
              maxPositions: box.gridConfig.rows * box.gridConfig.cols,
              isActive: true,
              assignedUserId: box.assignedUserId,
              customLabel: box.customLabel
            }))
          }))
        }))
      }
    };
  }
}
