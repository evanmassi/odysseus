/**
 * Locations Domain Public API
 *
 * The lab-wide location tree shared by the equipment, supply and reagent catalogs.
 */

export { useLocationsQuery } from './hooks/useLocationQueries';
export {
  useCreateLocationMutation,
  useUpdateLocationMutation,
  useDeleteLocationMutation,
} from './hooks/useLocationMutations';
export { LocationModal } from './ui/components/LocationModal';
