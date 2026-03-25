/**
 * Tree Lines By User
 *
 * Draws SVG connecting lines for user → rack → box hierarchy
 * in the By User tab of the Storage Manager modal.
 */

import { useCallback } from 'react';

import { calculateTreeLines } from '../../../storage-navigator/calculateTreeLines';
import { TreeLinesDisplay } from '../../../storage-navigator/TreeLinesDisplay';
import { useTreeLines } from '../../../storage-navigator/useTreeLines';

interface TreeLinesByUserProps {
  expandedUsers: Set<string | null>;
}

export function TreeLinesByUser({ expandedUsers }: TreeLinesByUserProps) {
  const calculate = useCallback(
    () =>
      calculateTreeLines({
        containerSelector: '[role="tree"][data-view="by-user"]',
        topLevelAttr: 'user',
        isTopExpanded: id => expandedUsers.has(id === 'unassigned' ? null : id),
      }),
    [expandedUsers]
  );

  const lines = useTreeLines(calculate, { initialDelay: 450 });

  return <TreeLinesDisplay lines={lines} />;
}
