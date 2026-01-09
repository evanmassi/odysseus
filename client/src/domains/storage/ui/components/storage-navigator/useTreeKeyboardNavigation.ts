import { useCallback, useState, useRef } from 'react';

import type { VisibleTreeNode } from './types';

interface UseTreeKeyboardNavigationProps {
  visibleNodes: VisibleTreeNode[];
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  onToggleTank: (id: string) => void;
  onToggleRack: (tankId: string, rackId: string) => void;
  onSelectNode: (node: VisibleTreeNode) => void;
}

function findParentIndex(nodes: VisibleTreeNode[], currentIndex: number): number {
  const current = nodes[currentIndex];

  // Search backwards for parent based on level hierarchy
  for (let i = currentIndex - 1; i >= 0; i--) {
    const candidate = nodes[i];

    if (current.level === 'rack' && candidate.level === 'tank' && candidate.id === current.tankId) {
      return i;
    }

    if (current.level === 'box' && candidate.level === 'rack' && candidate.id === current.rackId) {
      return i;
    }
  }

  return -1;
}

function findNextMatch(nodes: VisibleTreeNode[], startIndex: number, search: string): number {
  const searchLower = search.toLowerCase();

  // Search from startIndex + 1 to end
  for (let i = startIndex + 1; i < nodes.length; i++) {
    if (nodes[i].name.toLowerCase().startsWith(searchLower)) {
      return i;
    }
  }

  // Wrap around: search from 0 to startIndex
  for (let i = 0; i <= startIndex; i++) {
    if (nodes[i].name.toLowerCase().startsWith(searchLower)) {
      return i;
    }
  }

  return -1;
}

export function useTreeKeyboardNavigation({
  visibleNodes,
  focusedIndex,
  setFocusedIndex,
  onToggleTank,
  onToggleRack,
  onSelectNode,
}: UseTreeKeyboardNavigationProps) {
  const [searchString, setSearchString] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const focusNode = useCallback(
    (index: number) => {
      if (index >= 0 && index < visibleNodes.length) {
        setFocusedIndex(index);
        visibleNodes[index].ref.current?.focus();
      }
    },
    [visibleNodes, setFocusedIndex]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const node = visibleNodes[focusedIndex];
      if (!node) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          focusNode(Math.min(focusedIndex + 1, visibleNodes.length - 1));
          break;

        case 'ArrowUp':
          event.preventDefault();
          focusNode(Math.max(focusedIndex - 1, 0));
          break;

        case 'Home':
          event.preventDefault();
          focusNode(0);
          break;

        case 'End':
          event.preventDefault();
          focusNode(visibleNodes.length - 1);
          break;

        case 'ArrowRight':
          event.preventDefault();
          if (node.hasChildren && !node.isExpanded) {
            // Closed node with children: open it
            if (node.level === 'tank') {
              onToggleTank(node.id);
            } else if (node.level === 'rack') {
              onToggleRack(node.tankId, node.id);
            }
          } else if (node.hasChildren && node.isExpanded) {
            // Open node with children: move to first child
            const nextIndex = focusedIndex + 1;
            if (nextIndex < visibleNodes.length) {
              focusNode(nextIndex);
            }
          }
          // End node: do nothing
          break;

        case 'ArrowLeft':
          event.preventDefault();
          if (node.hasChildren && node.isExpanded) {
            // Open node: close it
            if (node.level === 'tank') {
              onToggleTank(node.id);
            } else if (node.level === 'rack') {
              onToggleRack(node.tankId, node.id);
            }
          } else if (node.level !== 'tank') {
            // Child node (closed or end): move to parent
            const parentIndex = findParentIndex(visibleNodes, focusedIndex);
            if (parentIndex !== -1) {
              focusNode(parentIndex);
            }
          }
          // Root node (tank): do nothing
          break;

        case 'Enter':
        case ' ':
          event.preventDefault();
          onSelectNode(node);
          break;

        default:
          // Type-ahead search: any printable character
          if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
            event.preventDefault();

            // Clear previous timeout
            if (searchTimeoutRef.current) {
              clearTimeout(searchTimeoutRef.current);
            }

            // Append character to search string
            const newSearch = searchString + event.key.toLowerCase();
            setSearchString(newSearch);

            // Find next matching node (starting from current + 1, wrap around)
            const matchIndex = findNextMatch(visibleNodes, focusedIndex, newSearch);
            if (matchIndex !== -1) {
              focusNode(matchIndex);
            }

            // Clear search string after 500ms
            searchTimeoutRef.current = setTimeout(() => {
              setSearchString('');
            }, 500);
          }
          break;
      }
    },
    [visibleNodes, focusedIndex, focusNode, onSelectNode, onToggleTank, onToggleRack, searchString]
  );

  return { handleKeyDown };
}
