/**
 * Lab Management Domain Public API
 *
 * Lab-wide vocabularies the catalogs share — locations today, attributes and custom units next.
 */

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
