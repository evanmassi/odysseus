/**
 * Configuration Update Types
 *
 * Type definitions for laboratory configuration updates.
 */

import type { TankConfiguration, RackConfiguration, BoxConfiguration } from '@odysseus/shared-schemas';

/**
 * Configuration update data
 */
export interface ConfigurationUpdateData {
  tanks?: TankConfiguration[];
  equipment?: {
    tanks?: TankConfiguration[];
    racks?: RackConfiguration[];
    boxes?: BoxConfiguration[];
  };
}
