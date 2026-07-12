/**
 * Lab-Scoped By-Id Read
 *
 * Single source of the "read a by-id entity with the requester's lab authority" rule: a lab-bound
 * requester reads only within their lab; a system admin reads across labs. Repositories whose by-id
 * reads are lab-scoped expose findById(id, labId) + findByIdAnyLab(id) and satisfy ScopedByIdReader.
 */

interface ScopedByIdReader<T> {
  findById(id: string, labId: string): Promise<T | null>;
  findByIdAnyLab(id: string): Promise<T | null>;
}

interface RequesterScope {
  labId?: string;
  isSystemAdmin: boolean;
}

export async function findByIdForRequester<T>(
  repo: ScopedByIdReader<T>,
  id: string,
  requester: RequesterScope
): Promise<T | null> {
  if (requester.isSystemAdmin) {
    return repo.findByIdAnyLab(id);
  }
  if (!requester.labId) {
    return null; // a non-system-admin without a lab matches nothing
  }
  return repo.findById(id, requester.labId);
}
