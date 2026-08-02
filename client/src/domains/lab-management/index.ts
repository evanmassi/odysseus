/**
 * Lab Management Domain Public API
 *
 * Lab-wide vocabularies the catalogs share — locations, attributes, custom units — and the
 * barcode resolver that spans them.
 */

export { useBarcodeResolver } from './hooks/useBarcodeResolver';

export { useLabLocationsQuery } from './hooks/useLabLocationQueries';
export {
  useCreateLabLocationMutation,
  useUpdateLabLocationMutation,
  useDeleteLabLocationMutation,
} from './hooks/useLabLocationMutations';
export { LabLocationModal } from './ui/components/LabLocationModal';
export { LabLocationTree } from './ui/components/LabLocationTree';

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
