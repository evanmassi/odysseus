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
      species: tube.sample.species,
      donorInternalId: tube.sample.donorInternalId,
      donorSourceId: tube.sample.donorSourceId,
      concentration: tube.sample.concentration,
      concentrationUnit: tube.sample.concentrationUnit,
      date: parseDate(tube.sample.date),
      mediaType: tube.sample.mediaType,
      mediaSupplements: tube.sample.mediaSupplements,
      mediaSelection: tube.sample.mediaSelection,
      cultureCondition: tube.sample.cultureCondition,
      lotNumber: tube.sample.lotNumber,
      source: tube.sample.source,
      catalogNumber: tube.sample.catalogNumber,
      passageNumber: tube.sample.passageNumber,
      notes: tube.sample.notes
    },
    researcherId: tube.researcherId
  };
}

/**
 * Batch transform multiple tubes for paste operation.
 * Use case: Multi-tube paste with position mapping — preserves relative positioning via positionMap.
 */
export function tubeDataArrayToCreateRequests(
  tubes: TubeData[],
  positionMap: (tube: TubeData, index: number) => TubeLocation
): CreateTubeRequest[] {
  return tubes.map((tube, index) =>
    tubeDataToCreateRequest(tube, positionMap(tube, index))
  );
}
