/**
 * Keyboard Navigation Hook
 *
 * Industry-standard keyboard navigation for grid components
 * Supports arrow key navigation, multi-selection, and accessibility
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type PositionKey } from '@shared/types/GridSelection';

// Grid position interface
export interface GridPosition {
  row: number;
  column: number;
}

// Selection range interface
export interface SelectionRange {
  start: GridPosition;
  end: GridPosition;
}

// Keyboard navigation configuration
export interface KeyboardNavigationConfig {
  // Grid dimensions
  rows: number;
  columns: number;

  // Behavior
  enableMultiSelect?: boolean;
  enableRangeSelect?: boolean;
  enableSelectAll?: boolean;
  wrapNavigation?: boolean; // Wrap to next/previous row

  // Callbacks
  onPositionChange?: (position: GridPosition) => void;
  onSelect?: (position: GridPosition, isSelected: boolean) => void;
  onMultiSelect?: (positions: GridPosition[]) => void;
  onRangeSelect?: (range: SelectionRange) => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;

  // Focus management
  autoFocus?: boolean;
  focusOnMount?: boolean;

  // Custom key bindings
  customKeys?: Record<string, (position: GridPosition, event: KeyboardEvent) => void>;
}

// Default configuration
const defaultConfig: Partial<KeyboardNavigationConfig> = {
  enableMultiSelect: true,
  enableRangeSelect: true,
  enableSelectAll: true,
  wrapNavigation: false,
  autoFocus: true,
  focusOnMount: false,
};

// Utility functions
const isValidPosition = (position: GridPosition, rows: number, columns: number): boolean => {
  return (
    position.row >= 0 && position.row < rows && position.column >= 0 && position.column < columns
  );
};

const getPositionsInRange = (start: GridPosition, end: GridPosition): GridPosition[] => {
  const positions: GridPosition[] = [];

  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);
  const minCol = Math.min(start.column, end.column);
  const maxCol = Math.max(start.column, end.column);

  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      positions.push({ row, column: col });
    }
  }

  return positions;
};

// Main keyboard navigation hook
export const useKeyboardNavigation = (config: KeyboardNavigationConfig) => {
  // Memoize finalConfig to prevent infinite loops in hook dependencies
  const finalConfig = useMemo(() => ({ ...defaultConfig, ...config }), [config]);
  const containerRef = useRef<HTMLElement>(null);

  // Current focused position
  const [focusedPosition, setFocusedPosition] = useState<GridPosition>({ row: 0, column: 0 });

  // Range selection anchor (for shift+click selections)
  const [rangeAnchor, setRangeAnchor] = useState<GridPosition | null>(null);

  // Track modifier keys
  const [modifierKeys, setModifierKeys] = useState({
    shift: false,
    ctrl: false,
    alt: false,
  });

  // Update focused position with bounds checking
  const updateFocusedPosition = useCallback(
    (newPosition: GridPosition) => {
      if (isValidPosition(newPosition, finalConfig.rows, finalConfig.columns)) {
        setFocusedPosition(newPosition);
        finalConfig.onPositionChange?.(newPosition);
        return true;
      }
      return false;
    },
    [finalConfig]
  );

  // Navigate in a direction
  const navigate = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      const { row, column } = focusedPosition;
      let newPosition: GridPosition;

      switch (direction) {
        case 'up':
          newPosition = { row: row - 1, column };
          break;
        case 'down':
          newPosition = { row: row + 1, column };
          break;
        case 'left':
          newPosition = { row, column: column - 1 };
          break;
        case 'right':
          newPosition = { row, column: column + 1 };
          break;
      }

      // Handle wrapping navigation
      if (
        finalConfig.wrapNavigation &&
        !isValidPosition(newPosition, finalConfig.rows, finalConfig.columns)
      ) {
        switch (direction) {
          case 'up':
            if (row === 0) {
              newPosition = { row: finalConfig.rows - 1, column };
            }
            break;
          case 'down':
            if (row === finalConfig.rows - 1) {
              newPosition = { row: 0, column };
            }
            break;
          case 'left':
            if (column === 0) {
              newPosition = { row, column: finalConfig.columns - 1 };
            }
            break;
          case 'right':
            if (column === finalConfig.columns - 1) {
              newPosition = { row, column: 0 };
            }
            break;
        }
      }

      return updateFocusedPosition(newPosition);
    },
    [focusedPosition, finalConfig, updateFocusedPosition]
  );

  // Handle selection
  const handleSelect = useCallback(
    (position: GridPosition, extend = false) => {
      if (extend && finalConfig.enableRangeSelect && rangeAnchor) {
        // Range selection - keep anchor, extend to new position
        const range: SelectionRange = {
          start: rangeAnchor,
          end: position,
        };

        const positions = getPositionsInRange(range.start, range.end);
        finalConfig.onMultiSelect?.(positions);
        finalConfig.onRangeSelect?.(range);
        // Don't update anchor during range selection
      } else {
        // Single selection - set new anchor
        finalConfig.onSelect?.(position, true);

        // Only set anchor when NOT extending (starting new selection)
        if (finalConfig.enableRangeSelect && !extend) {
          setRangeAnchor(position);
        }
      }
    },
    [finalConfig, rangeAnchor]
  );

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Update modifier key state
      setModifierKeys({
        shift: event.shiftKey,
        ctrl: event.ctrlKey || event.metaKey,
        alt: event.altKey,
      });

      // Handle navigation keys
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          if (navigate('up') && event.shiftKey && finalConfig.enableRangeSelect) {
            handleSelect(focusedPosition, true);
          }
          break;

        case 'ArrowDown':
          event.preventDefault();
          if (navigate('down') && event.shiftKey && finalConfig.enableRangeSelect) {
            handleSelect(focusedPosition, true);
          }
          break;

        case 'ArrowLeft':
          event.preventDefault();
          if (navigate('left') && event.shiftKey && finalConfig.enableRangeSelect) {
            handleSelect(focusedPosition, true);
          }
          break;

        case 'ArrowRight':
          event.preventDefault();
          if (navigate('right') && event.shiftKey && finalConfig.enableRangeSelect) {
            handleSelect(focusedPosition, true);
          }
          break;

        case 'Enter':
        case ' ':
          event.preventDefault();
          handleSelect(focusedPosition, event.shiftKey);
          break;

        case 'Home':
          event.preventDefault();
          updateFocusedPosition({ row: 0, column: 0 });
          break;

        case 'End':
          event.preventDefault();
          updateFocusedPosition({
            row: finalConfig.rows - 1,
            column: finalConfig.columns - 1,
          });
          break;

        case 'PageUp': {
          event.preventDefault();
          const pageUpRow = Math.max(0, focusedPosition.row - Math.floor(finalConfig.rows / 3));
          updateFocusedPosition({ ...focusedPosition, row: pageUpRow });
          break;
        }

        case 'PageDown': {
          event.preventDefault();
          const pageDownRow = Math.min(
            finalConfig.rows - 1,
            focusedPosition.row + Math.floor(finalConfig.rows / 3)
          );
          updateFocusedPosition({ ...focusedPosition, row: pageDownRow });
          break;
        }

        case 'a':
        case 'A':
          if ((event.ctrlKey || event.metaKey) && finalConfig.enableSelectAll) {
            event.preventDefault();
            finalConfig.onSelectAll?.();
          }
          break;

        case 'Escape':
          event.preventDefault();
          finalConfig.onClearSelection?.();
          setRangeAnchor(null);
          break;

        default:
          // Handle custom key bindings
          if (finalConfig.customKeys?.[event.key]) {
            event.preventDefault();
            finalConfig.customKeys[event.key](focusedPosition, event);
          }
          break;
      }
    },
    [navigate, handleSelect, focusedPosition, finalConfig, updateFocusedPosition]
  );

  // Handle keyboard events on key up to reset modifier state
  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    setModifierKeys({
      shift: event.shiftKey,
      ctrl: event.ctrlKey || event.metaKey,
      alt: event.altKey,
    });
  }, []);

  // Attach event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);
    container.addEventListener('keyup', handleKeyUp);

    // Make container focusable
    if (!container.hasAttribute('tabindex')) {
      container.setAttribute('tabindex', '0');
    }

    // Focus on mount if configured
    if (finalConfig.focusOnMount) {
      container.focus();
    }

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp, finalConfig.focusOnMount]);

  // Focus cell programmatically
  const focusPosition = useCallback(
    (position: GridPosition) => {
      updateFocusedPosition(position);

      // Focus the actual cell element if it exists
      const container = containerRef.current;
      if (container) {
        const cellSelector = `[data-grid-position="${position.row}-${position.column}"]`;
        const cellElement = container.querySelector(cellSelector) as HTMLElement;
        if (cellElement) {
          cellElement.focus();
        }
      }
    },
    [updateFocusedPosition]
  );

  // Get position properties for a cell
  const getCellProps = useCallback(
    (row: number, column: number) => {
      const position = { row, column };
      const isFocused = focusedPosition.row === row && focusedPosition.column === column;

      return {
        'data-grid-position': `${row}-${column}`,
        tabIndex: isFocused ? 0 : -1,
        role: 'gridcell',
        'aria-rowindex': row + 1, // 1-based for ARIA
        'aria-colindex': column + 1, // 1-based for ARIA
        onFocus: () => updateFocusedPosition(position),
        onClick: (e: React.MouseEvent) => {
          updateFocusedPosition(position);

          if (e.shiftKey && finalConfig.enableRangeSelect && rangeAnchor) {
            handleSelect(position, true);
          } else {
            handleSelect(position, e.ctrlKey || e.metaKey);
          }
        },
      };
    },
    [
      focusedPosition,
      updateFocusedPosition,
      handleSelect,
      finalConfig.enableRangeSelect,
      rangeAnchor,
    ]
  );

  // Get container props
  const getContainerProps = useCallback(
    () => ({
      ref: containerRef,
      role: 'grid',
      'aria-rowcount': finalConfig.rows,
      'aria-colcount': finalConfig.columns,
      'aria-multiselectable': finalConfig.enableMultiSelect,
      tabIndex: 0,
      onFocus: () => {
        // Auto-focus first cell if no cell is focused
        if (finalConfig.autoFocus) {
          focusPosition(focusedPosition);
        }
      },
    }),
    [finalConfig, focusedPosition, focusPosition]
  );

  return {
    // State
    focusedPosition,
    modifierKeys,
    rangeAnchor,

    // Actions
    navigate,
    focusPosition,
    updateFocusedPosition,

    // Props helpers
    getCellProps,
    getContainerProps,

    // Ref
    containerRef,
  };
};

// Specialized hook for tube grid navigation
export const useTubeGridKeyboardNavigation = (
  rows: number = 9,
  columns: number = 9,
  selectedPositions: Set<PositionKey>,
  onSelectionChange: (positions: Set<PositionKey>) => void,
  positionIdGenerator: (row: number, column: number) => PositionKey
) => {
  // Convert grid positions to position IDs
  const handleSelect = useCallback(
    (position: GridPosition, isSelected: boolean) => {
      const positionId = positionIdGenerator(position.row, position.column);
      const newSelection = new Set(selectedPositions);

      if (isSelected) {
        newSelection.add(positionId);
      } else {
        newSelection.delete(positionId);
      }

      onSelectionChange(newSelection);
    },
    [selectedPositions, onSelectionChange, positionIdGenerator]
  );

  const handleMultiSelect = useCallback(
    (positions: GridPosition[]) => {
      const newSelection = new Set(selectedPositions);

      positions.forEach(position => {
        const positionId = positionIdGenerator(position.row, position.column);
        newSelection.add(positionId);
      });

      onSelectionChange(newSelection);
    },
    [selectedPositions, onSelectionChange, positionIdGenerator]
  );

  const handleSelectAll = useCallback(() => {
    const allPositions = new Set<PositionKey>();

    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const positionId = positionIdGenerator(row, column);
        allPositions.add(positionId);
      }
    }

    onSelectionChange(allPositions);
  }, [rows, columns, positionIdGenerator, onSelectionChange]);

  const handleClearSelection = useCallback(() => {
    onSelectionChange(new Set());
  }, [onSelectionChange]);

  // Use base keyboard navigation
  const navigation = useKeyboardNavigation({
    rows,
    columns,
    enableMultiSelect: true,
    enableRangeSelect: true,
    enableSelectAll: true,
    onSelect: handleSelect,
    onMultiSelect: handleMultiSelect,
    onSelectAll: handleSelectAll,
    onClearSelection: handleClearSelection,
  });

  // Enhanced cell props for tube grid
  const getTubeCellProps = useCallback(
    (row: number, column: number, tubeId?: string) => {
      const baseCellProps = navigation.getCellProps(row, column);
      const positionId = positionIdGenerator(row, column);
      const isSelected = selectedPositions.has(positionId);

      return {
        ...baseCellProps,
        'aria-selected': isSelected,
        'aria-label': tubeId
          ? `Tube ${tubeId} at position ${row + 1}-${column + 1}${isSelected ? ', selected' : ''}`
          : `Empty position ${row + 1}-${column + 1}${isSelected ? ', selected' : ''}`,
        'data-tube-id': tubeId,
        'data-position-id': positionId,
        'data-selected': isSelected,
      };
    },
    [navigation, selectedPositions, positionIdGenerator]
  );

  return {
    ...navigation,
    getTubeCellProps,
    selectedCount: selectedPositions.size,
  };
};

// Hook for list/results keyboard navigation
export const useListKeyboardNavigation = <T, TElement extends HTMLElement = HTMLDivElement>(
  items: T[],
  onSelect: (item: T, index: number) => void,
  multiSelect = false
) => {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const containerRef = useRef<TElement>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex(prev => Math.max(0, prev - 1));
          break;

        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex(prev => Math.min(items.length - 1, prev + 1));
          break;

        case 'Home':
          event.preventDefault();
          setFocusedIndex(0);
          break;

        case 'End':
          event.preventDefault();
          setFocusedIndex(items.length - 1);
          break;

        case 'Enter':
        case ' ':
          event.preventDefault();
          if (items[focusedIndex]) {
            onSelect(items[focusedIndex], focusedIndex);

            if (multiSelect) {
              const newSelection = new Set(selectedIndices);
              if (newSelection.has(focusedIndex)) {
                newSelection.delete(focusedIndex);
              } else {
                newSelection.add(focusedIndex);
              }
              setSelectedIndices(newSelection);
            }
          }
          break;

        case 'a':
        case 'A':
          if ((event.ctrlKey || event.metaKey) && multiSelect) {
            event.preventDefault();
            const allIndices = new Set(Array.from({ length: items.length }, (_, i) => i));
            setSelectedIndices(allIndices);
          }
          break;

        case 'Escape':
          event.preventDefault();
          setSelectedIndices(new Set());
          break;
      }
    },
    [items, focusedIndex, onSelect, multiSelect, selectedIndices]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);

    if (!container.hasAttribute('tabindex')) {
      container.setAttribute('tabindex', '0');
    }

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const getItemProps = useCallback(
    (index: number) => ({
      'data-index': index,
      tabIndex: focusedIndex === index ? 0 : -1,
      role: 'option',
      'aria-selected': selectedIndices.has(index),
      onFocus: () => setFocusedIndex(index),
    }),
    [focusedIndex, selectedIndices]
  );

  const getContainerProps = useCallback(
    () => ({
      ref: containerRef,
      role: 'listbox',
      'aria-multiselectable': multiSelect,
      'aria-activedescendant': `item-${focusedIndex}`,
      tabIndex: 0,
    }),
    [multiSelect, focusedIndex]
  );

  return {
    focusedIndex,
    selectedIndices,
    getItemProps,
    getContainerProps,
    containerRef,
  };
};
