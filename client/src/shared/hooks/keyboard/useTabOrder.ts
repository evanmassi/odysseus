/**
 * Tab Order Hook
 * 
 * Manages logical tab order for forms and complex interfaces
 * Ensures keyboard navigation follows intuitive patterns
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// Tab order item interface
export interface TabOrderItem {
  id: string;
  element: HTMLElement;
  order: number;
  group?: string; // Optional grouping for complex forms
  disabled?: boolean;
}

// Tab order configuration
export interface TabOrderConfig {
  // Behavior
  autoManage?: boolean; // Automatically manage tab indices
  wrapAround?: boolean; // Wrap to first/last when reaching end
  respectGroups?: boolean; // Navigate within groups first
  
  // Custom navigation
  customNavigation?: Record<string, (currentItem: TabOrderItem, direction: 'forward' | 'backward') => TabOrderItem | null>;
  
  // Callbacks
  onTabOrderChange?: (items: TabOrderItem[]) => void;
  onFocusChange?: (item: TabOrderItem | null) => void;
  
  // Skip conditions
  skipDisabled?: boolean;
  skipHidden?: boolean;
}

// Default configuration
const defaultConfig: TabOrderConfig = {
  autoManage: true,
  wrapAround: false,
  respectGroups: false,
  skipDisabled: true,
  skipHidden: true,
};

// Main tab order hook
export const useTabOrder = (config: TabOrderConfig = {}) => {
  const finalConfig = { ...defaultConfig, ...config };
  const containerRef = useRef<HTMLElement>(null);
  const [tabOrderItems, setTabOrderItems] = useState<TabOrderItem[]>([]);
  const [currentFocusedItem, setCurrentFocusedItem] = useState<TabOrderItem | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  
  // Check if element should be included in tab order
  const shouldIncludeElement = useCallback((element: HTMLElement): boolean => {
    if (finalConfig.skipDisabled && element.hasAttribute('disabled')) {
      return false;
    }
    
    if (finalConfig.skipHidden) {
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden') {
        return false;
      }
      
      if (element.offsetWidth === 0 && element.offsetHeight === 0) {
        return false;
      }
    }
    
    return true;
  }, [finalConfig.skipDisabled, finalConfig.skipHidden]);
  
  // Discover focusable elements and build tab order
  const buildTabOrder = useCallback(() => {
    const container = containerRef.current;
    if (!container) return [];
    
    const focusableElements = Array.from(
      container.querySelectorAll([
        'button',
        'input',
        'textarea', 
        'select',
        'a[href]',
        '[tabindex]',
        '[contenteditable="true"]',
      ].join(', '))
    ) as HTMLElement[];
    
    const items: TabOrderItem[] = [];
    
    focusableElements.forEach((element, index) => {
      if (!shouldIncludeElement(element)) return;
      
      const tabIndex = element.getAttribute('tabindex');
      const dataOrder = element.getAttribute('data-tab-order');
      const dataGroup = element.getAttribute('data-tab-group');
      
      // Determine tab order
      let order: number;
      if (dataOrder) {
        order = parseInt(dataOrder, 10);
      } else if (tabIndex && tabIndex !== '0') {
        order = parseInt(tabIndex, 10);
      } else {
        order = index; // Natural DOM order
      }
      
      items.push({
        id: element.id || `tab-item-${index}`,
        element,
        order,
        group: dataGroup || undefined,
        disabled: element.hasAttribute('disabled'),
      });
    });
    
    // Sort by order, then by group if respecting groups
    items.sort((a, b) => {
      if (finalConfig.respectGroups && a.group !== b.group) {
        if (!a.group) return 1;
        if (!b.group) return -1;
        return a.group.localeCompare(b.group);
      }
      return a.order - b.order;
    });
    
    return items;
  }, [shouldIncludeElement, finalConfig.respectGroups]);
  
  // Update tab order
  const updateTabOrder = useCallback(() => {
    const items = buildTabOrder();
    setTabOrderItems(items);
    finalConfig.onTabOrderChange?.(items);
    
    // Auto-manage tab indices if enabled
    if (finalConfig.autoManage) {
      items.forEach((item, index) => {
        item.element.setAttribute('tabindex', index === 0 ? '0' : '-1');
      });
    }
    
    return items;
  }, [buildTabOrder, finalConfig]);
  
  // Navigate to specific item
  const navigateToItem = useCallback((item: TabOrderItem) => {
    if (shouldIncludeElement(item.element)) {
      item.element.focus();
      setCurrentFocusedItem(item);
      finalConfig.onFocusChange?.(item);
    }
  }, [shouldIncludeElement, finalConfig]);
  
  // Navigate to next/previous item
  const navigate = useCallback((direction: 'forward' | 'backward') => {
    const currentIndex = currentFocusedItem 
      ? tabOrderItems.findIndex(item => item.id === currentFocusedItem.id)
      : -1;
    
    let nextIndex: number;
    
    if (direction === 'forward') {
      nextIndex = currentIndex + 1;
      if (nextIndex >= tabOrderItems.length) {
        nextIndex = finalConfig.wrapAround ? 0 : tabOrderItems.length - 1;
      }
    } else {
      nextIndex = currentIndex - 1;
      if (nextIndex < 0) {
        nextIndex = finalConfig.wrapAround ? tabOrderItems.length - 1 : 0;
      }
    }
    
    const nextItem = tabOrderItems[nextIndex];
    if (nextItem) {
      navigateToItem(nextItem);
    }
  }, [currentFocusedItem, tabOrderItems, finalConfig.wrapAround, navigateToItem]);
  
  // Navigate to first/last item
  const navigateToFirst = useCallback(() => {
    const firstItem = tabOrderItems[0];
    if (firstItem) {
      navigateToItem(firstItem);
    }
  }, [tabOrderItems, navigateToItem]);
  
  const navigateToLast = useCallback(() => {
    const lastItem = tabOrderItems[tabOrderItems.length - 1];
    if (lastItem) {
      navigateToItem(lastItem);
    }
  }, [tabOrderItems, navigateToItem]);
  
  // Navigate within group
  const navigateWithinGroup = useCallback((groupName: string, direction: 'forward' | 'backward') => {
    const groupItems = tabOrderItems.filter(item => item.group === groupName);
    const currentIndex = currentFocusedItem && currentFocusedItem.group === groupName
      ? groupItems.findIndex(item => item.id === currentFocusedItem.id)
      : -1;
    
    let nextIndex: number;
    
    if (direction === 'forward') {
      nextIndex = currentIndex + 1;
      if (nextIndex >= groupItems.length) {
        nextIndex = finalConfig.wrapAround ? 0 : groupItems.length - 1;
      }
    } else {
      nextIndex = currentIndex - 1;
      if (nextIndex < 0) {
        nextIndex = finalConfig.wrapAround ? groupItems.length - 1 : 0;
      }
    }
    
    const nextItem = groupItems[nextIndex];
    if (nextItem) {
      navigateToItem(nextItem);
    }
  }, [tabOrderItems, currentFocusedItem, finalConfig.wrapAround, navigateToItem]);
  
  // Setup mutation observer to watch for DOM changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // Initial setup
    updateTabOrder();
    
    // Watch for DOM changes
    observerRef.current = new MutationObserver(() => {
      updateTabOrder();
    });
    
    observerRef.current.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'tabindex', 'data-tab-order', 'data-tab-group'],
    });
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [updateTabOrder]);
  
  // Handle focus events to track current item
  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      const item = tabOrderItems.find(item => item.element === target);
      
      if (item) {
        setCurrentFocusedItem(item);
        finalConfig.onFocusChange?.(item);
      }
    };
    
    const container = containerRef.current;
    if (container) {
      container.addEventListener('focusin', handleFocusIn);
      
      return () => {
        container.removeEventListener('focusin', handleFocusIn);
      };
    }
    
    // Return undefined explicitly when container is not available
    return undefined;
  }, [tabOrderItems, finalConfig]);
  
  // Get props for container
  const getContainerProps = useCallback(() => ({
    ref: containerRef,
  }), []);
  
  // Get props for tab order item
  const getItemProps = useCallback((id: string, order?: number, group?: string) => {
    const item = tabOrderItems.find(item => item.id === id);
    const isCurrent = currentFocusedItem?.id === id;
    
    return {
      id,
      'data-tab-order': order,
      'data-tab-group': group,
      tabIndex: isCurrent ? 0 : -1,
      onFocus: () => {
        const foundItem = tabOrderItems.find(item => item.id === id);
        if (foundItem) {
          setCurrentFocusedItem(foundItem);
          finalConfig.onFocusChange?.(foundItem);
        }
      },
    };
  }, [tabOrderItems, currentFocusedItem, finalConfig]);
  
  return {
    // State
    tabOrderItems,
    currentFocusedItem,
    
    // Navigation
    navigate,
    navigateToFirst,
    navigateToLast,
    navigateWithinGroup,
    navigateToItem,
    
    // Management
    updateTabOrder,
    buildTabOrder,
    
    // Props helpers
    getContainerProps,
    getItemProps,
    
    // Refs
    containerRef,
  };
};

// Form-specific tab order hook
export const useFormTabOrder = (formRef: React.RefObject<HTMLFormElement>) => {
  const tabOrder = useTabOrder({
    autoManage: true,
    respectGroups: true,
    skipDisabled: true,
    skipHidden: true,
  });
  
  // Sync container ref with form ref - using mutable ref pattern
  useEffect(() => {
    if (formRef.current && tabOrder.containerRef) {
      // Use type assertion to bypass readonly restriction safely
      (tabOrder.containerRef as React.MutableRefObject<HTMLElement | null>).current = formRef.current;
    }
  }, [formRef, tabOrder.containerRef]);
  
  // Form-specific navigation
  const navigateToNextField = useCallback(() => {
    tabOrder.navigate('forward');
  }, [tabOrder]);
  
  const navigateToPreviousField = useCallback(() => {
    tabOrder.navigate('backward');
  }, [tabOrder]);
  
  const focusFirstInvalidField = useCallback(() => {
    const firstInvalid = formRef.current?.querySelector('[aria-invalid="true"]') as HTMLElement;
    if (firstInvalid) {
      firstInvalid.focus();
      return true;
    }
    return false;
  }, [formRef]);
  
  return {
    ...tabOrder,
    navigateToNextField,
    navigateToPreviousField,
    focusFirstInvalidField,
  };
};

export default {
  useTabOrder,
  useFormTabOrder,
};
