import { useWorkbenchStore } from '../stores/workbenchStore';
import { fluorCatalog, type FluorCatalog } from '../utils/fluors/fluorCatalog';

export function useFluorCatalog(): FluorCatalog {
  const fileFluors = useWorkbenchStore(state => state.protocol.dyes);
  return fluorCatalog(fileFluors);
}
