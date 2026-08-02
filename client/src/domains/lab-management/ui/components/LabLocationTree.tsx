/**
 * Lab Location Tree
 *
 * The location hierarchy with its connectors, read-only unless the caller supplies row actions.
 */

import { useMemo, type ReactNode } from 'react';

import { CornerDownRight, FolderOpen } from 'lucide-react';

import { SelectTreeLines } from '@shared/ui/components/tree-lines';
import { compareByOrderThenName } from '@shared/utils/compareByOrderThenName';

import type { LabLocation } from '@odysseus/shared-schemas';

const TIER_LEVELS = ['l1', 'l2', 'l3'] as const;

interface LabLocationTreeProps {
  locations: LabLocation[];
  /** Distinguishes this tree's connectors from another mounted alongside it. */
  treeId: string;
  emptyMessage: string;
  highlightId?: string;
  renderActions?: (location: LabLocation) => ReactNode;
}

export function LabLocationTree({
  locations,
  treeId,
  emptyMessage,
  highlightId,
  renderActions,
}: LabLocationTreeProps) {
  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, LabLocation[]>();
    for (const location of locations) {
      const key = location.parentId ?? null;
      map.set(key, [...(map.get(key) ?? []), location]);
    }
    for (const siblings of map.values()) siblings.sort(compareByOrderThenName);
    return map;
  }, [locations]);

  const renderTier = (parent: string | null, depth: number): ReactNode => {
    const tier = childrenByParent.get(parent) ?? [];
    if (tier.length === 0) return null;

    return tier.map(location => {
      const hasChildren = (childrenByParent.get(location.id) ?? []).length > 0;
      const actions = renderActions?.(location);

      return (
        <div key={location.id} data-level={TIER_LEVELS[depth]} data-id={location.id}>
          <div
            className={`select-tree-row group flex items-center gap-2 py-1 pl-3 pr-1 ${
              highlightId === location.id ? 'bg-foreground/[0.06]' : ''
            }`}
          >
            {depth === 0 ? (
              <FolderOpen size={14} className="flex-shrink-0 text-muted-foreground" />
            ) : (
              <CornerDownRight size={13} className="flex-shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1">
              <span className="block truncate text-body-sm font-medium text-card-foreground">
                {location.name}
              </span>
              {location.description && (
                <span className="block truncate text-caption text-muted-foreground">
                  {location.description}
                </span>
              )}
            </div>
            {actions && (
              <div className="flex flex-shrink-0 gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                {actions}
              </div>
            )}
          </div>

          {hasChildren && depth < TIER_LEVELS.length - 1 && (
            <div className="ml-3">{renderTier(location.id, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  if (locations.length === 0) {
    return <p className="py-4 text-center text-body-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div data-tree-id={treeId} className="nav-tree-select relative space-y-2 pr-2">
      <SelectTreeLines treeId={treeId} />
      {renderTier(null, 0)}
    </div>
  );
}
