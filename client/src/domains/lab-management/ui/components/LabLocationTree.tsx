import { useMemo, type ReactNode } from 'react';

import { CornerDownRight, FolderOpen } from 'lucide-react';

import { NavTreeLines } from '@shared/ui/components/tree-lines';
import { compareByOrderThenName } from '@shared/utils/compareByOrderThenName';

import type { LabLocation } from '@odysseus/shared-schemas';

const TIER_LEVELS = ['l1', 'l2', 'l3'] as const;

interface LabLocationTreeProps {
  locations: LabLocation[];
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

      const isTopLevel = depth === 0;
      const rowClasses = [
        'nav-tree-row row-glow',
        isTopLevel ? 'nav-tree-row--category' : 'nav-tree-row--subcategory',
        actions ? 'row-tools-host' : 'nav-tree-row--static',
        highlightId === location.id ? 'is-open' : '',
      ].join(' ');

      return (
        <div key={location.id} data-level={TIER_LEVELS[depth]} data-id={location.id}>
          <div className={rowClasses}>
            {isTopLevel ? (
              <FolderOpen size={16} className="flex-shrink-0 text-muted-foreground" />
            ) : (
              <CornerDownRight size={14} className="flex-shrink-0 text-muted-foreground" />
            )}
            <span
              className={`nav-tree-row__label font-display ${
                isTopLevel
                  ? 'text-body-lg font-semibold text-secondary-foreground'
                  : 'text-body font-medium'
              }`}
            >
              {location.name}
            </span>
            {location.description && (
              <span className="min-w-0 truncate text-caption text-muted-foreground">
                <span aria-hidden className="mr-1.5 text-foreground/25">
                  ·
                </span>
                {location.description}
              </span>
            )}
            {actions && (
              <span className="row-tools ml-auto">
                <span className="flex items-center gap-1 pl-2.5">{actions}</span>
              </span>
            )}
          </div>

          {hasChildren && depth < TIER_LEVELS.length - 1 && (
            <div className="nav-tree-children">{renderTier(location.id, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  if (locations.length === 0) {
    return <p className="py-4 text-center text-body-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div data-tree-id={treeId} className="nav-tree relative flex flex-col gap-2 pr-2">
      <NavTreeLines treeId={treeId} />
      {renderTier(null, 0)}
    </div>
  );
}
