/**
 * Position Validation and Conflict Types
 *
 * Type definitions for tube position validation and conflict detection.
 */

/**
 * Position conflict information
 */
export interface PositionConflict {
  tubeId: string;
  location: {
    tankId: string;
    rackId: string;
    boxId: string;
    position: number;
  };
  message: string;
}
