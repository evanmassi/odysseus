import React, { useMemo, useState, createRef, useCallback } from 'react';

import { StorageNavigatorItem } from './StorageNavigatorItem';
import { TreeLineOverlay } from './TreeLineOverlay';
import { useStorageNavigation } from './useStorageNavigation';
import { useTreeKeyboardNavigation } from './useTreeKeyboardNavigation';

import type { StorageNavigatorProps, VisibleTreeNode } from './types';
import type { OwnershipType } from '@shared/ui/components';

// Helper to compute effective owner (handles inheritance cascade)
function getEffectiveOwner(
  assignedUserId: string | null | undefined,
  parentAssignedUserId?: string | null
): string | null | undefined {
  // Box inherits from rack if undefined (not explicitly set)
  return assignedUserId === undefined ? parentAssignedUserId : assignedUserId;
}

// Helper to compute ownership type for display
function computeOwnershipType(
  effectiveOwner: string | null | undefined,
  currentUserId?: string
): OwnershipType | undefined {
  // null or undefined = unassigned/common
  if (effectiveOwner === null || effectiveOwner === undefined) {
    return 'unassigned';
  }
  // Owned by current user
  if (currentUserId && effectiveOwner === currentUserId) {
    return 'currentUser';
  }
  // Owned by someone else - return undefined to not show badge
  return undefined;
}

export const StorageNavigator: React.FC<StorageNavigatorProps> = ({
  data,
  selected,
  onSelect,
  className = '',
  currentUser,
}) => {
  const {
    expandedTanks,
    expandedRacks,
    toggleTank,
    toggleRack,
    selectTank,
    selectRack,
    selectBox,
    isTankSelected,
    isRackSelected,
    isBoxSelected,
  } = useStorageNavigation(data, selected, onSelect);

  // Build flat list of visible nodes for keyboard navigation
  const visibleNodes = useMemo((): VisibleTreeNode[] => {
    const nodes: VisibleTreeNode[] = [];

    data.tanks.forEach((tank, tankIndex) => {
      const tankNode: VisibleTreeNode = {
        id: tank.id,
        name: tank.name,
        level: 'tank',
        tankId: tank.id,
        isExpanded: expandedTanks.has(tank.id),
        isSelected: isTankSelected(tank.id),
        hasChildren: tank.racks.length > 0,
        ref: createRef<HTMLButtonElement>(),
        ariaLevel: 1,
        ariaPosinset: tankIndex + 1,
        ariaSetsize: data.tanks.length,
      };
      nodes.push(tankNode);

      // Only include racks if tank is expanded
      if (expandedTanks.has(tank.id)) {
        tank.racks.forEach((rack, rackIndex) => {
          const compositeKey = `${tank.id}-${rack.id}`;
          const rackNode: VisibleTreeNode = {
            id: rack.id,
            name: rack.name,
            level: 'rack',
            tankId: tank.id,
            rackId: rack.id,
            isExpanded: expandedRacks.has(compositeKey),
            isSelected: isRackSelected(tank.id, rack.id),
            hasChildren: rack.boxes.length > 0,
            ref: createRef<HTMLButtonElement>(),
            ariaLevel: 2,
            ariaPosinset: rackIndex + 1,
            ariaSetsize: tank.racks.length,
          };
          nodes.push(rackNode);

          // Only include boxes if rack is expanded
          if (expandedRacks.has(compositeKey)) {
            rack.boxes.forEach((box, boxIndex) => {
              const boxNode: VisibleTreeNode = {
                id: box.id,
                name: box.name,
                level: 'box',
                tankId: tank.id,
                rackId: rack.id,
                boxId: box.id,
                isExpanded: false,
                isSelected: isBoxSelected(tank.id, rack.id, box.id),
                hasChildren: false,
                ref: createRef<HTMLButtonElement>(),
                ariaLevel: 3,
                ariaPosinset: boxIndex + 1,
                ariaSetsize: rack.boxes.length,
              };
              nodes.push(boxNode);
            });
          }
        });
      }
    });

    return nodes;
  }, [data, expandedTanks, expandedRacks, isTankSelected, isRackSelected, isBoxSelected]);

  // Track which node has keyboard focus
  const [focusedIndex, setFocusedIndex] = useState(() => {
    // Initialize to first selected node, or 0 if none selected
    const selectedIndex = visibleNodes.findIndex(node => node.isSelected);
    return selectedIndex >= 0 ? selectedIndex : 0;
  });

  // Handle node selection from keyboard
  const handleSelectNode = useCallback(
    (node: VisibleTreeNode) => {
      if (node.level === 'tank') {
        toggleTank(node.id);
        selectTank(node.id);
      } else if (node.level === 'rack') {
        toggleRack(node.tankId, node.id);
        selectRack(node.tankId, node.rackId!);
      } else if (node.level === 'box') {
        selectBox(node.tankId, node.rackId!, node.boxId!);
      }
    },
    [toggleTank, toggleRack, selectTank, selectRack, selectBox]
  );

  // Keyboard navigation
  const { handleKeyDown } = useTreeKeyboardNavigation({
    visibleNodes,
    focusedIndex,
    setFocusedIndex,
    onToggleTank: toggleTank,
    onToggleRack: toggleRack,
    onSelectNode: handleSelectNode,
  });

  return (
    <nav
      className={`w-full p-3 flex flex-col gap-1 relative ${className}`}
      aria-label="Storage Navigator"
    >
      <div
        role="tree"
        aria-label="Storage hierarchy"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
        className="relative flex flex-col gap-1 outline-none"
      >
        <TreeLineOverlay expandedTanks={expandedTanks} expandedRacks={expandedRacks} />
        {data.tanks.map((tank, _tankIndex) => {
          const tankExpanded = expandedTanks.has(tank.id);
          const tankSelected = isTankSelected(tank.id);
          const nodeIndex = visibleNodes.findIndex(n => n.id === tank.id && n.level === 'tank');
          const node = visibleNodes[nodeIndex];

          return (
            <StorageNavigatorItem
              key={tank.id}
              id={tank.id}
              name={tank.name}
              level="tank"
              isSelected={tankSelected}
              isExpanded={tankExpanded}
              onToggle={() => toggleTank(tank.id)}
              onSelect={() => {
                toggleTank(tank.id);
                selectTank(tank.id);
              }}
              tabIndex={nodeIndex === focusedIndex ? 0 : -1}
              buttonRef={node?.ref}
              onFocus={() => setFocusedIndex(nodeIndex)}
              ariaLevel={node?.ariaLevel}
              ariaPosinset={node?.ariaPosinset}
              ariaSetsize={node?.ariaSetsize}
            >
              {tank.racks.map((rack, _rackIndex) => {
                const compositeKey = `${tank.id}-${rack.id}`;
                const rackExpanded = expandedRacks.has(compositeKey);
                const rackSelected = isRackSelected(tank.id, rack.id);
                const nodeIndex = visibleNodes.findIndex(
                  n => n.id === rack.id && n.level === 'rack'
                );
                const node = visibleNodes[nodeIndex];

                return (
                  <StorageNavigatorItem
                    key={rack.id}
                    id={rack.id}
                    name={rack.name}
                    level="rack"
                    isSelected={rackSelected}
                    isExpanded={rackExpanded}
                    onToggle={() => toggleRack(tank.id, rack.id)}
                    onSelect={() => {
                      toggleRack(tank.id, rack.id);
                      selectRack(tank.id, rack.id);
                    }}
                    tabIndex={nodeIndex === focusedIndex ? 0 : -1}
                    buttonRef={node?.ref}
                    onFocus={() => setFocusedIndex(nodeIndex)}
                    ariaLevel={node?.ariaLevel}
                    ariaPosinset={node?.ariaPosinset}
                    ariaSetsize={node?.ariaSetsize}
                    ownershipType={computeOwnershipType(rack.assignedUserId, currentUser?.id)}
                    ownershipInitials={currentUser?.initials}
                  >
                    {rack.boxes.map((box, _boxIndex) => {
                      const boxSelected = isBoxSelected(tank.id, rack.id, box.id);
                      const nodeIndex = visibleNodes.findIndex(
                        n => n.id === box.id && n.level === 'box'
                      );
                      const node = visibleNodes[nodeIndex];

                      return (
                        <StorageNavigatorItem
                          key={box.id}
                          id={box.id}
                          name={box.name}
                          level="box"
                          isSelected={boxSelected}
                          isExpanded={false}
                          onToggle={() => {}}
                          onSelect={() => selectBox(tank.id, rack.id, box.id)}
                          tabIndex={nodeIndex === focusedIndex ? 0 : -1}
                          buttonRef={node?.ref}
                          onFocus={() => setFocusedIndex(nodeIndex)}
                          ariaLevel={node?.ariaLevel}
                          ariaPosinset={node?.ariaPosinset}
                          ariaSetsize={node?.ariaSetsize}
                          ownershipType={computeOwnershipType(
                            getEffectiveOwner(box.assignedUserId, rack.assignedUserId),
                            currentUser?.id
                          )}
                          ownershipInitials={currentUser?.initials}
                        />
                      );
                    })}
                  </StorageNavigatorItem>
                );
              })}
            </StorageNavigatorItem>
          );
        })}
      </div>
    </nav>
  );
};
