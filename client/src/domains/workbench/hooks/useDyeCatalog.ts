import { useWorkbenchStore } from '../stores/workbenchStore';
import { dyeCatalog, type DyeCatalog } from '../utils/dyes/dyeCatalog';

export function useDyeCatalog(): DyeCatalog {
  const fileDyes = useWorkbenchStore(state => state.protocol.dyes);
  return dyeCatalog(fileDyes);
}
