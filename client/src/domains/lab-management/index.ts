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
