import { useWorkbenchStore } from '../stores/workbenchStore';
import { fluorCatalog, type FluorCatalog } from '../utils/fluors/fluorCatalog';

export function useFluorCatalog(): FluorCatalog {
  const fileFluors = useWorkbenchStore(state => state.protocol.fluors);
  return fluorCatalog(fileFluors);
}
