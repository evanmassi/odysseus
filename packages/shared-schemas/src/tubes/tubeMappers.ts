/**
 * Tube Data Mappers
 *
 * Transforms tube API responses into create requests for client-side paste operations.
 */

import type { TubeData, CreateTubeRequest, TubeLocation } from './tubeSchemas';
import { parseDate } from './tubeValidation';

/** Transforms a tube response into a create request for client-side paste operations. */
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
