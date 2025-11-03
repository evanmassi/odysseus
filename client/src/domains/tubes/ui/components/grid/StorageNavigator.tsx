/**
 * Storage Navigator
 *
 * Collapsible tree for navigating tank → rack → box hierarchy.
 *
 * Key Features:
 * - Click any level to navigate + expand/collapse
 * - Keyboard navigation support
 * - Performance optimized (single visibleItems calculation)
 * - Default state: Tank 1 → Rack 1 → Box A visible
 */

import { useState, useRef, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { TankIcon, RackIcon, BoxIcon } from '@shared/ui/components/icons';
import { useTubeStore } from '@domains/tubes';
import { useStorageStore } from '@domains/storage';
import { useListKeyboardNavigation } from '@shared/hooks/keyboard';
import { gridNavigationService } from '@domains/grid';
import { AnimatedTreeLineOverlay } from './AnimatedTreeLineOverlay';
import { getGridDisplayName } from '@domains/storage';

export function StorageNavigator() {
  const { currentTank, currentRack, currentBox } = useTubeStore();

  // Get configuration methods
  const getCurrentTanks = useStorageStore(state => state.getCurrentTanks);
  const getCurrentRacks = useStorageStore(state => state.getCurrentRacks);
  const getCurrentBoxes = useStorageStore(state => state.getCurrentBoxes);

  const tanks = getCurrentTanks();

  // Initialize with Tank 1 and Rack 1 expanded
  const [expandedTanks, setExpandedTanks] = useState<Set<string>>(() => {
    const firstTank = tanks[0];
    return firstTank ? new Set([firstTank.id]) : new Set();
  });

  const [expandedRacks, setExpandedRacks] = useState<Set<string>>(() => {
    const firstTank = tanks[0];
    if (!firstTank) return new Set();

    const firstRack = getCurrentRacks(firstTank.id)[0];
    if (!firstRack) return new Set();

    return new Set([`${firstTank.id}-${firstRack.id}`]);
  });

  // Ref for the container to enable dynamic tree line calculations
  const containerRef = useRef<HTMLDivElement>(null);

  // Click handlers: Navigate + Toggle expansion
  const handleTankClick = async (tankId: string) => {
    // Toggle expansion
    setExpandedTanks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tankId)) {
        newSet.delete(tankId);
      } else {
        newSet.add(tankId);
      }
      return newSet;
    });

    // Navigate to first rack/box in this tank
    const result = await gridNavigationService.navigateToTank(tankId);
    if (!result.success) {
      console.error('Failed to navigate to tank:', result.error);
    }
  };

  const handleRackClick = async (tankId: string, rackId: string) => {
    const rackKey = `${tankId}-${rackId}`;

    // Toggle expansion
    setExpandedRacks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rackKey)) {
        newSet.delete(rackKey);
      } else {
        newSet.add(rackKey);
      }
      return newSet;
    });

    // Navigate to first box in this rack
    const result = await gridNavigationService.navigateToRack(tankId, rackId);
    if (!result.success) {
      console.error('Failed to navigate to rack:', result.error);
    }
  };

  const handleBoxClick = async (tankId: string, rackId: string, boxId: string) => {
    const result = await gridNavigationService.navigateToLocation({ tankId, rackId, boxId });
    if (!result.success) {
      console.error('Failed to navigate to box:', result.error);
    }
  };

  // Build flat list of all visible items for keyboard navigation
  // Memoized to prevent recalculation on every render
  const visibleItems = useMemo(() => {
    const items: Array<{
      id: string;
      type: 'tank' | 'rack' | 'box';
      tankId: string;
      rackId?: string;
      boxName?: string;
      action: () => void;
    }> = [];

    tanks.forEach(tank => {
      // Tank item
      items.push({
        id: `tank-${tank.id}`,
        type: 'tank',
        tankId: tank.id,
        action: () => handleTankClick(tank.id)
      });

      // If tank is expanded, add rack items
      if (expandedTanks.has(tank.id)) {
        const tankRacks = getCurrentRacks(tank.id);

        tankRacks.forEach(rack => {
          const rackKey = `${tank.id}-${rack.id}`;

          // Rack item
          items.push({
            id: `rack-${tank.id}-${rack.id}`,
            type: 'rack',
            tankId: tank.id,
            rackId: rack.id,
            action: () => handleRackClick(tank.id, rack.id)
          });

          // If rack is expanded, add box items
          if (expandedRacks.has(rackKey)) {
            const rackBoxes = getCurrentBoxes(tank.id, rack.id);

            rackBoxes.forEach(box => {
              items.push({
                id: `box-${tank.id}-${rack.id}-${box.id}`,
                type: 'box',
                tankId: tank.id,
                rackId: rack.id,
                boxName: box.name,
                action: () => handleBoxClick(tank.id, rack.id, box.id)
              });
            });
          }
        });
      }
    });

    return items;
  }, [tanks, expandedTanks, expandedRacks, getCurrentRacks, getCurrentBoxes]);

  // Handle item selection from keyboard
  const handleItemSelect = useCallback((item: typeof visibleItems[number], index: number) => {
    item.action();
  }, []);

  // Keyboard navigation hook
  const {
    focusedIndex,
    getItemProps,
    getContainerProps,
  } = useListKeyboardNavigation(
    visibleItems,
    handleItemSelect,
    false // Single selection only
  );

  // Helper functions for selection state (uses current location from store)
  const isTankInSelectionPath = (tankId: string) => currentTank === tankId;
  const isRackInSelectionPath = (tankId: string, rackId: string) =>
    currentTank === tankId && currentRack === rackId;
  const isBoxSelected = (tankId: string, rackId: string, boxId: string) =>
    currentTank === tankId && currentRack === rackId && currentBox === boxId;

  return (
    <div
      className="storage-navigator"
      {...getContainerProps()}
    >
      <AnimatedTreeLineOverlay
        expandedTanks={expandedTanks}
        expandedRacks={expandedRacks}
      />
      {tanks.map((tank) => {
        const isExpanded = expandedTanks.has(tank.id);
        const isSelected = isTankInSelectionPath(tank.id);
        const tankRacks = getCurrentRacks(tank.id);

        return (
          <div
            key={tank.id}
            className={`selector-level tank-level ${isExpanded ? 'expanded' : ''}`}
            data-tank-id={tank.id}
            style={{'--rack-count': tankRacks.length} as React.CSSProperties}
          >
            <button
              onClick={() => handleTankClick(tank.id)}
              className={`selector-button tank-button ${isSelected ? 'selected' : ''}`}
              title={`${isExpanded ? 'Collapse' : 'Expand'} ${tank.name} - ${tank.location}`}
              data-button-id={`tank-${tank.id}`}
              {...getItemProps(visibleItems.findIndex(item => item.id === `tank-${tank.id}`))}
            >
              <div className="button-content">
                <TankIcon className="selector-icon" size={20} />
                <span className="selector-text">{tank.name}</span>
                <div className="expand-indicator">
                  {isExpanded ? (
                    <ChevronDown className="expand-icon" size={14} />
                  ) : (
                    <ChevronRight className="expand-icon" size={14} />
                  )}
                </div>
              </div>
            </button>

            <div className={`selector-children-wrapper ${isExpanded ? 'expanded' : ''}`}>
              <div className="selector-children-content">
                {tankRacks.map((rack) => {
                  const rackKey = `${tank.id}-${rack.id}`;
                  const isRackExpanded = expandedRacks.has(rackKey);
                  const isRackSelected = isRackInSelectionPath(tank.id, rack.id);
                  const rackBoxes = getCurrentBoxes(tank.id, rack.id);

                  return (
                    <div
                      key={rack.id}
                      className={`selector-level rack-level ${isRackExpanded ? 'expanded' : ''}`}
                      data-rack-id={rack.id}
                      style={{'--box-count': rackBoxes.length} as React.CSSProperties}
                    >
                      <button
                        onClick={() => handleRackClick(tank.id, rack.id)}
                        className={`selector-button rack-button ${isRackSelected ? 'selected' : ''}`}
                        title={rack.location ? `${isRackExpanded ? 'Collapse' : 'Expand'} ${rack.name} - ${rack.location}` : `${isRackExpanded ? 'Collapse' : 'Expand'} ${rack.name}`}
                        data-button-id={`rack-${tank.id}-${rack.id}`}
                        {...getItemProps(visibleItems.findIndex(item => item.id === `rack-${tank.id}-${rack.id}`))}
                      >
                        <div className="button-content">
                          <RackIcon className="selector-icon" size={18} />
                          <span className="selector-text">{rack.name}</span>
                          <div className="expand-indicator">
                            {isRackExpanded ? (
                              <ChevronDown className="expand-icon" size={12} />
                            ) : (
                              <ChevronRight className="expand-icon" size={12} />
                            )}
                          </div>
                        </div>
                      </button>

                      <div className={`selector-children-wrapper ${isRackExpanded ? 'expanded' : ''}`}>
                        <div className="selector-children-content">
                          {rackBoxes.map((box) => {
                            const boxSelected = isBoxSelected(tank.id, rack.id, box.id);

                            return (
                              <div
                                key={box.id}
                                className="selector-level box-level"
                                data-box-id={box.id}
                              >
                                <button
                                  onClick={() => handleBoxClick(tank.id, rack.id, box.id)}
                                  className={`selector-button box-button ${boxSelected ? 'selected' : ''}`}
                                  title={`${box.name} - ${getGridDisplayName(box.gridConfig)}`}
                                  data-button-id={`box-${tank.id}-${rack.id}-${box.id}`}
                                  {...getItemProps(visibleItems.findIndex(item => item.id === `box-${tank.id}-${rack.id}-${box.id}`))}
                                >
                                  <div className="button-content gap-0">
                                    <BoxIcon className="selector-icon" size={16} />
                                    <span className="box-text flex items-center gap-0">
                                      <span className="inline-block w-5 text-center">{box.id}</span>
                                      <span>({box.gridConfig.rows}×{box.gridConfig.cols})</span>
                                    </span>
                                  </div>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
