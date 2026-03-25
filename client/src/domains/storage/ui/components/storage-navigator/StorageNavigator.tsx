/**
 * Storage Navigator
 *
 * Tree-based location picker for navigating tank → rack → box hierarchy.
 */

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';

import { StorageNavigatorNode } from './StorageNavigatorNode';
import { TreeLinesByLocation } from './TreeLinesByLocation';
import { useStorageNavigator } from './useStorageNavigator';
import { useTreeKeyboardNavigation } from './useTreeKeyboardNavigation';

import type { StorageNavigatorProps, VisibleTreeNode } from './storageNavigatorTypes';
import type { UserBadgeType } from '@shared/ui/components/badges';

function getNodeKey(
  level: 'tank' | 'rack' | 'box',
  tankId: string,
  rackId?: string,
  boxId?: string
): string {
  if (level === 'tank') return `tank:${tankId}`;
  if (level === 'rack') return `rack:${tankId}:${rackId}`;
  return `box:${tankId}:${rackId}:${boxId}`;
}

function getEffectiveOwner(
  assignedUserId: string | null | undefined,
  parentAssignedUserId?: string | null
): string | null | undefined {
  // Box inherits from rack if undefined (not explicitly set)
  return assignedUserId === undefined ? parentAssignedUserId : assignedUserId;
}

function computeOwnershipType(
  effectiveOwner: string | null | undefined,
  currentUserId?: string,
  isAdmin?: boolean
): UserBadgeType | undefined {
  if (effectiveOwner === null || effectiveOwner === undefined) {
    return 'unassigned';
  }
  if (currentUserId && effectiveOwner === currentUserId) {
    return 'currentUser';
  }
  if (isAdmin) return 'otherUser';
  return undefined;
}

export function StorageNavigator({
  data,
  selected,
  onSelect,
  className = '',
  currentUser,
  getUserInitials: getUserInitialsFn,
}: StorageNavigatorProps) {
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
  } = useStorageNavigator(data, selected, onSelect);

  const nodeRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());

  const visibleNodes = useMemo((): VisibleTreeNode[] => {
    const nodes: VisibleTreeNode[] = [];

    data.tanks.forEach((tank, tankIndex) => {
      const tankKey = getNodeKey('tank', tank.id);
      const tankNode: VisibleTreeNode = {
        id: tank.id,
        name: tank.name,
        level: 'tank',
        tankId: tank.id,
        isExpanded: expandedTanks.has(tank.id),
        isSelected: isTankSelected(tank.id),
        hasChildren: tank.racks.length > 0,
        nodeKey: tankKey,
        ariaLevel: 1,
        ariaPosinset: tankIndex + 1,
        ariaSetsize: data.tanks.length,
      };
      nodes.push(tankNode);

      if (expandedTanks.has(tank.id)) {
        tank.racks.forEach((rack, rackIndex) => {
          const compositeKey = `${tank.id}-${rack.id}`;
          const rackKey = getNodeKey('rack', tank.id, rack.id);
          const rackNode: VisibleTreeNode = {
            id: rack.id,
            name: rack.name,
            level: 'rack',
            tankId: tank.id,
            rackId: rack.id,
            isExpanded: expandedRacks.has(compositeKey),
            isSelected: isRackSelected(tank.id, rack.id),
            hasChildren: rack.boxes.length > 0,
            nodeKey: rackKey,
            ariaLevel: 2,
            ariaPosinset: rackIndex + 1,
            ariaSetsize: tank.racks.length,
          };
          nodes.push(rackNode);

          if (expandedRacks.has(compositeKey)) {
            rack.boxes.forEach((box, boxIndex) => {
              const boxKey = getNodeKey('box', tank.id, rack.id, box.id);
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
                nodeKey: boxKey,
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

  const nodeKeyToIndex = useMemo(() => {
    const map = new Map<string, number>();
    visibleNodes.forEach((node, index) => {
      map.set(node.nodeKey, index);
    });
    return map;
  }, [visibleNodes]);

  // Stable across tree changes — uses node key instead of index
  const [focusedKey, setFocusedKey] = useState<string | null>(() => {
    const selectedNode = visibleNodes.find(node => node.isSelected);
    return selectedNode?.nodeKey ?? visibleNodes[0]?.nodeKey ?? null;
  });

  const focusedIndex = focusedKey ? (nodeKeyToIndex.get(focusedKey) ?? 0) : 0;

  // When tree changes, ensure focusedKey still exists; if not, find closest valid node
  useEffect(() => {
    if (!focusedKey || !nodeKeyToIndex.has(focusedKey)) {
      const firstKey = visibleNodes[0]?.nodeKey ?? null;
      setFocusedKey(firstKey);
    }
  }, [focusedKey, nodeKeyToIndex, visibleNodes]);

  const setFocusedIndex = useCallback(
    (index: number) => {
      const node = visibleNodes[index];
      if (node) {
        setFocusedKey(node.nodeKey);
      }
    },
    [visibleNodes]
  );

  const getNodeRef = useCallback((nodeKey: string) => nodeRefs.current.get(nodeKey) ?? null, []);

  const setNodeRef = useCallback((nodeKey: string, element: HTMLButtonElement | null) => {
    if (element) {
      nodeRefs.current.set(nodeKey, element);
    } else {
      nodeRefs.current.delete(nodeKey);
    }
  }, []);

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

  const resolveInitials = useCallback(
    (ownerId: string | null | undefined): string | undefined => {
      if (!ownerId) return undefined;
      if (ownerId === currentUser?.id) return currentUser.initials;
      return getUserInitialsFn?.(ownerId);
    },
    [currentUser, getUserInitialsFn]
  );

  const { handleKeyDown } = useTreeKeyboardNavigation({
    visibleNodes,
    focusedIndex,
    setFocusedIndex,
    onToggleTank: toggleTank,
    onToggleRack: toggleRack,
    onSelectNode: handleSelectNode,
    getNodeRef,
  });

  return (
    <nav
      className={`w-full p-3 flex flex-col gap-1 relative ${className}`}
      aria-label="Storage Navigator"
    >
      <div
        role="tree"
        data-tree-id="navigator"
        aria-label="Storage hierarchy"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
        className="relative flex flex-col gap-1 outline-none"
      >
        <TreeLinesByLocation
          expandedTanks={expandedTanks}
          expandedRacks={expandedRacks}
          treeId="navigator"
        />
        {data.tanks.map((tank, _tankIndex) => {
          const tankExpanded = expandedTanks.has(tank.id);
          const tankSelected = isTankSelected(tank.id);
          const tankKey = getNodeKey('tank', tank.id);
          const tankNodeIndex = nodeKeyToIndex.get(tankKey) ?? -1;
          const tankNode = visibleNodes[tankNodeIndex];

          return (
            <StorageNavigatorNode
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
              tabIndex={tankNodeIndex === focusedIndex ? 0 : -1}
              buttonRef={el => setNodeRef(tankKey, el)}
              onFocus={() => setFocusedKey(tankKey)}
              ariaLevel={tankNode?.ariaLevel}
              ariaPosinset={tankNode?.ariaPosinset}
              ariaSetsize={tankNode?.ariaSetsize}
            >
              {tank.racks.map((rack, _rackIndex) => {
                const compositeKey = `${tank.id}-${rack.id}`;
                const rackExpanded = expandedRacks.has(compositeKey);
                const rackSelected = isRackSelected(tank.id, rack.id);
                const rackKey = getNodeKey('rack', tank.id, rack.id);
                const rackNodeIndex = nodeKeyToIndex.get(rackKey) ?? -1;
                const rackNode = visibleNodes[rackNodeIndex];

                return (
                  <StorageNavigatorNode
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
                    tabIndex={rackNodeIndex === focusedIndex ? 0 : -1}
                    buttonRef={el => setNodeRef(rackKey, el)}
                    onFocus={() => setFocusedKey(rackKey)}
                    ariaLevel={rackNode?.ariaLevel}
                    ariaPosinset={rackNode?.ariaPosinset}
                    ariaSetsize={rackNode?.ariaSetsize}
                    ownershipType={computeOwnershipType(
                      rack.assignedUserId,
                      currentUser?.id,
                      currentUser?.isAdmin
                    )}
                    ownershipInitials={resolveInitials(rack.assignedUserId)}
                  >
                    {rack.boxes.map((box, _boxIndex) => {
                      const boxSelected = isBoxSelected(tank.id, rack.id, box.id);
                      const boxKey = getNodeKey('box', tank.id, rack.id, box.id);
                      const boxNodeIndex = nodeKeyToIndex.get(boxKey) ?? -1;
                      const boxNode = visibleNodes[boxNodeIndex];
                      const effectiveBoxOwner = getEffectiveOwner(
                        box.assignedUserId,
                        rack.assignedUserId
                      );

                      return (
                        <StorageNavigatorNode
                          key={box.id}
                          id={box.id}
                          name={box.name}
                          level="box"
                          isSelected={boxSelected}
                          isExpanded={false}
                          onToggle={() => {}}
                          onSelect={() => selectBox(tank.id, rack.id, box.id)}
                          tabIndex={boxNodeIndex === focusedIndex ? 0 : -1}
                          buttonRef={el => setNodeRef(boxKey, el)}
                          onFocus={() => setFocusedKey(boxKey)}
                          ariaLevel={boxNode?.ariaLevel}
                          ariaPosinset={boxNode?.ariaPosinset}
                          ariaSetsize={boxNode?.ariaSetsize}
                          ownershipType={computeOwnershipType(
                            effectiveBoxOwner,
                            currentUser?.id,
                            currentUser?.isAdmin
                          )}
                          ownershipInitials={resolveInitials(effectiveBoxOwner)}
                        />
                      );
                    })}
                  </StorageNavigatorNode>
                );
              })}
            </StorageNavigatorNode>
          );
        })}
      </div>
    </nav>
  );
}
