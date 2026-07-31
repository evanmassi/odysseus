/**
 * Lab Management Domain Public API
 *
 * Lab-wide vocabularies the catalogs share — locations, attributes, custom units — and the
 * barcode resolver that spans them.
 */

export { useBarcodeResolver } from './hooks/useBarcodeResolver';

export { useLocationsQuery } from './hooks/useLocationQueries';
export {
  useCreateLocationMutation,
  useUpdateLocationMutation,
  useDeleteLocationMutation,
} from './hooks/useLocationMutations';
export { LocationModal } from './ui/components/LocationModal';

export { EMPTY_ATTRIBUTES, useAttributesQuery } from './hooks/useAttributeQueries';
export {
  useCreateAttributeDefinitionMutation,
  useUpdateAttributeDefinitionMutation,
  useDeleteAttributeDefinitionMutation,
  useCreateAttributeOptionMutation,
  useUpdateAttributeOptionMutation,
  useDeleteAttributeOptionMutation,
} from './hooks/useAttributeMutations';

export { useCustomUnitsQuery } from './hooks/useCustomUnitQueries';
export {
  useCreateCustomUnitMutation,
  useUpdateCustomUnitMutation,
  useDeleteCustomUnitMutation,
} from './hooks/useCustomUnitMutations';
