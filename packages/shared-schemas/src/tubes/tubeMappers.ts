/**
 * Tube Data Mappers
 *
 * Transforms between tube data formats. Used by client paste operations.
 * Server TubeDto handles: CreateRequest → Domain, Domain → Response
 * This mapper handles: Response → CreateRequest (client paste operation)
 */

import type { TubeData, CreateTubeRequest, TubeLocation } from './tubeSchemas';
import { parseDate } from './tubeValidation';

/**
 * Transform TubeData (API response) to CreateTubeRequest (API input)
 *
 * Use case: Client-side paste operation
 * - Strips read-only fields (id, createdAt, updatedAt)
 * - Preserves only fields allowed in CreateTubeRequest
 * - Allows overriding location for paste to new position
 */
export function tubeDataToCreateRequest(
  tube: TubeData,
  newLocation: TubeLocation
): CreateTubeRequest {
  return {
    location: newLocation,
    sample: {
      cellType: tube.sample.cellType || '', // Provide empty string if undefined (will fail validation)
      donorInternalId: tube.sample.donorInternalId,
      donorSourceId: tube.sample.donorSourceId,
      concentration: tube.sample.concentration,
      concentrationUnit: tube.sample.concentrationUnit,
      date: parseDate(tube.sample.date), // Convert Date objects to YYYY-MM-DD strings
      media: tube.sample.media,
      cultureCondition: tube.sample.cultureCondition,
      lotNumber: tube.sample.lotNumber,
      notes: tube.sample.notes
    },
    researcherId: tube.researcherId
  };
}

/**
 * Batch transform multiple tubes for paste operation
 *
 * Use case: Multi-tube paste with position mapping
 * - Maps each tube to new location
 * - Preserves relative positioning via positionMap
 *
 * @param tubes - Source tubes to transform
 * @param positionMap - Function that maps source tube to new location
 */
export function tubeDataArrayToCreateRequests(
  tubes: TubeData[],
  positionMap: (tube: TubeData, index: number) => TubeLocation
): CreateTubeRequest[] {
  return tubes.map((tube, index) =>
    tubeDataToCreateRequest(tube, positionMap(tube, index))
  );
}
