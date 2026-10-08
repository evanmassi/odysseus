import type { LabLocation } from '@odysseus/shared-schemas';

export function buildLocationPathMap(locations: LabLocation[]): Map<string, string> {
  const byId = new Map(locations.map(location => [location.id, location]));
  return new Map(
    locations.map(location => {
      const path = [location.name];
      let current = location.parentId ? byId.get(location.parentId) : undefined;
      while (current) {
        path.unshift(current.name);
        current = current.parentId ? byId.get(current.parentId) : undefined;
      }
      return [location.id, path.join(' › ')];
    })
  );
}
