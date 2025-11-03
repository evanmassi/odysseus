/**
 * Grid Component
 * 
 * Flexible CSS Grid layout primitive following design system tokens
 * Supports responsive breakpoints and consistent spacing
 */

import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

// Grid component props
export interface GridProps {
  children: React.ReactNode;
  
  // Grid configuration
  columns?: number | string | { xs?: number | string; sm?: number | string; md?: number | string; lg?: number | string; xl?: number | string };
  rows?: number | string | { xs?: number | string; sm?: number | string; md?: number | string; lg?: number | string; xl?: number | string };
  
  // Gap configuration
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  columnGap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  rowGap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  
  // Alignment
  justifyItems?: 'start' | 'end' | 'center' | 'stretch';
  alignItems?: 'start' | 'end' | 'center' | 'stretch';
  justifyContent?: 'start' | 'end' | 'center' | 'stretch' | 'space-between' | 'space-around' | 'space-evenly';
  alignContent?: 'start' | 'end' | 'center' | 'stretch' | 'space-between' | 'space-around' | 'space-evenly';
  
  // Layout flow
  autoFlow?: 'row' | 'column' | 'row-dense' | 'column-dense';
  
  // Responsive behavior
  responsive?: boolean;
  
  // Styling
  className?: string;
  
  // Component type
  as?: keyof JSX.IntrinsicElements;
}

// Grid Item component props
export interface GridItemProps {
  children: React.ReactNode;
  
  // Grid item positioning
  column?: number | string | { start?: number | string; end?: number | string; span?: number | string };
  row?: number | string | { start?: number | string; end?: number | string; span?: number | string };
  
  // Grid area
  area?: string;
  
  // Self alignment
  justifySelf?: 'start' | 'end' | 'center' | 'stretch';
  alignSelf?: 'start' | 'end' | 'center' | 'stretch';
  
  // Responsive positioning
  responsive?: {
    xs?: Partial<Pick<GridItemProps, 'column' | 'row' | 'justifySelf' | 'alignSelf'>>;
    sm?: Partial<Pick<GridItemProps, 'column' | 'row' | 'justifySelf' | 'alignSelf'>>;
    md?: Partial<Pick<GridItemProps, 'column' | 'row' | 'justifySelf' | 'alignSelf'>>;
    lg?: Partial<Pick<GridItemProps, 'column' | 'row' | 'justifySelf' | 'alignSelf'>>;
    xl?: Partial<Pick<GridItemProps, 'column' | 'row' | 'justifySelf' | 'alignSelf'>>;
  };
  
  // Styling
  className?: string;
  
  // HTML props
  as?: keyof JSX.IntrinsicElements;
}

// Grid styling
const gridVariants = cva(
  ['grid'],
  {
    variants: {
      // Gap variants using design system spacing
      gap: {
        none: 'gap-0',
        xs: 'gap-1',      // 4px
        sm: 'gap-2',      // 8px
        md: 'gap-4',      // 16px
        lg: 'gap-6',      // 24px
        xl: 'gap-8',      // 32px
        '2xl': 'gap-12',  // 48px
      },
      
      // Column gap
      columnGap: {
        none: 'gap-x-0',
        xs: 'gap-x-1',
        sm: 'gap-x-2',
        md: 'gap-x-4',
        lg: 'gap-x-6',
        xl: 'gap-x-8',
        '2xl': 'gap-x-12',
      },
      
      // Row gap
      rowGap: {
        none: 'gap-y-0',
        xs: 'gap-y-1',
        sm: 'gap-y-2',
        md: 'gap-y-4',
        lg: 'gap-y-6',
        xl: 'gap-y-8',
        '2xl': 'gap-y-12',
      },
      
      // Justify items
      justifyItems: {
        start: 'justify-items-start',
        end: 'justify-items-end',
        center: 'justify-items-center',
        stretch: 'justify-items-stretch',
      },
      
      // Align items
      alignItems: {
        start: 'items-start',
        end: 'items-end',
        center: 'items-center',
        stretch: 'items-stretch',
      },
      
      // Justify content
      justifyContent: {
        start: 'justify-start',
        end: 'justify-end',
        center: 'justify-center',
        stretch: 'justify-stretch',
        'space-between': 'justify-between',
        'space-around': 'justify-around',
        'space-evenly': 'justify-evenly',
      },
      
      // Align content
      alignContent: {
        start: 'content-start',
        end: 'content-end',
        center: 'content-center',
        stretch: 'content-stretch',
        'space-between': 'content-between',
        'space-around': 'content-around',
        'space-evenly': 'content-evenly',
      },
      
      // Auto flow
      autoFlow: {
        row: 'grid-flow-row',
        column: 'grid-flow-col',
        'row-dense': 'grid-flow-row-dense',
        'column-dense': 'grid-flow-col-dense',
      },
    },
    defaultVariants: {
      gap: 'md',
      justifyItems: 'stretch',
      alignItems: 'stretch',
      justifyContent: 'start',
      alignContent: 'start',
      autoFlow: 'row',
    },
  }
);

// Grid item styling
const gridItemVariants = cva(
  [''],
  {
    variants: {
      justifySelf: {
        start: 'justify-self-start',
        end: 'justify-self-end',
        center: 'justify-self-center',
        stretch: 'justify-self-stretch',
      },
      
      alignSelf: {
        start: 'self-start',
        end: 'self-end',
        center: 'self-center',
        stretch: 'self-stretch',
      },
    },
    defaultVariants: {
      justifySelf: 'stretch',
      alignSelf: 'stretch',
    },
  }
);

// Utility function to convert columns/rows config to CSS classes
const getGridTemplateClasses = (
  value: number | string | { xs?: number | string; sm?: number | string; md?: number | string; lg?: number | string; xl?: number | string } | undefined,
  type: 'columns' | 'rows'
): string => {
  if (!value) return '';
  
  if (typeof value === 'number') {
    const prefix = type === 'columns' ? 'grid-cols' : 'grid-rows';
    return `${prefix}-${value}`;
  }
  
  if (typeof value === 'string') {
    return `grid-${type === 'columns' ? 'cols' : 'rows'}-[${value}]`;
  }
  
  // Responsive configuration
  const classes: string[] = [];
  const prefix = type === 'columns' ? 'grid-cols' : 'grid-rows';
  
  if (value.xs) {
    classes.push(typeof value.xs === 'number' ? `${prefix}-${value.xs}` : `${prefix}-[${value.xs}]`);
  }
  if (value.sm) {
    classes.push(typeof value.sm === 'number' ? `sm:${prefix}-${value.sm}` : `sm:${prefix}-[${value.sm}]`);
  }
  if (value.md) {
    classes.push(typeof value.md === 'number' ? `md:${prefix}-${value.md}` : `md:${prefix}-[${value.md}]`);
  }
  if (value.lg) {
    classes.push(typeof value.lg === 'number' ? `lg:${prefix}-${value.lg}` : `lg:${prefix}-[${value.lg}]`);
  }
  if (value.xl) {
    classes.push(typeof value.xl === 'number' ? `xl:${prefix}-${value.xl}` : `xl:${prefix}-[${value.xl}]`);
  }
  
  return classes.join(' ');
};

// Utility function to get grid item positioning classes
const getGridItemClasses = (
  column?: GridItemProps['column'],
  row?: GridItemProps['row'],
  area?: string
): string => {
  const classes: string[] = [];
  
  if (area) {
    classes.push(`[grid-area:${area}]`);
    return classes.join(' ');
  }
  
  // Column positioning
  if (column) {
    if (typeof column === 'number') {
      classes.push(`col-start-${column}`);
    } else if (typeof column === 'string') {
      classes.push(`[grid-column:${column}]`);
    } else if (typeof column === 'object') {
      if (column.start) {
        classes.push(typeof column.start === 'number' ? `col-start-${column.start}` : `[grid-column-start:${column.start}]`);
      }
      if (column.end) {
        classes.push(typeof column.end === 'number' ? `col-end-${column.end}` : `[grid-column-end:${column.end}]`);
      }
      if (column.span) {
        classes.push(typeof column.span === 'number' ? `col-span-${column.span}` : `[grid-column:span_${column.span}]`);
      }
    }
  }
  
  // Row positioning
  if (row) {
    if (typeof row === 'number') {
      classes.push(`row-start-${row}`);
    } else if (typeof row === 'string') {
      classes.push(`[grid-row:${row}]`);
    } else if (typeof row === 'object') {
      if (row.start) {
        classes.push(typeof row.start === 'number' ? `row-start-${row.start}` : `[grid-row-start:${row.start}]`);
      }
      if (row.end) {
        classes.push(typeof row.end === 'number' ? `row-end-${row.end}` : `[grid-row-end:${row.end}]`);
      }
      if (row.span) {
        classes.push(typeof row.span === 'number' ? `row-span-${row.span}` : `[grid-row:span_${row.span}]`);
      }
    }
  }
  
  return classes.join(' ');
};

// Main Grid component with polymorphic element support
export const Grid = forwardRef<HTMLDivElement, GridProps>(
  (
    {
      children,
      columns,
      rows,
      gap = 'md',
      columnGap,
      rowGap,
      justifyItems = 'stretch',
      alignItems = 'stretch',
      justifyContent = 'start',
      alignContent = 'start',
      autoFlow = 'row',
      responsive = false,
      className,
      as,
      ...props
    },
    ref
  ) => {
    // Generate grid classes
    const gridClasses = gridVariants({
      gap: !columnGap && !rowGap ? gap : undefined,
      columnGap,
      rowGap,
      justifyItems,
      alignItems,
      justifyContent,
      alignContent,
      autoFlow,
    });
    
    // Generate template classes
    const columnClasses = getGridTemplateClasses(columns, 'columns');
    const rowClasses = getGridTemplateClasses(rows, 'rows');
    
    // Combine all classes
    const finalClassName = [
      gridClasses,
      columnClasses,
      rowClasses,
      className,
    ].filter(Boolean).join(' ');
    
    const Element = as || 'div';
    
    // Industry-standard polymorphic component pattern with type safety bypass
    const elementProps = {
      ref: ref as any,
      className: finalClassName,
      ...(props as any)
    };
    
    return React.createElement(Element, elementProps, children);
  }
);

// Grid Item component  
export const GridItem = forwardRef<HTMLElement, GridItemProps>(
  (
    {
      children,
      column,
      row,
      area,
      justifySelf = 'stretch',
      alignSelf = 'stretch',
      responsive,
      className,
      as,
      ...props
    },
    ref
  ) => {
    // Generate grid item classes
    const itemClasses = gridItemVariants({
      justifySelf,
      alignSelf,
    });
    
    // Generate positioning classes
    const positionClasses = getGridItemClasses(column, row, area);
    
    // Generate responsive classes
    let responsiveClasses = '';
    if (responsive) {
      const responsiveClassArray: string[] = [];
      
      Object.entries(responsive).forEach(([breakpoint, config]) => {
        const prefix = breakpoint === 'xs' ? '' : `${breakpoint}:`;
        
        if (config.column || config.row) {
          const bpPositionClasses = getGridItemClasses(config.column, config.row);
          if (bpPositionClasses) {
            responsiveClassArray.push(
              bpPositionClasses
                .split(' ')
                .map(cls => `${prefix}${cls}`)
                .join(' ')
            );
          }
        }
        
        if (config.justifySelf && config.justifySelf !== 'stretch') {
          const justifyClass = gridItemVariants({ justifySelf: config.justifySelf }).replace('justify-self-stretch', '').trim();
          if (justifyClass) {
            responsiveClassArray.push(`${prefix}${justifyClass}`);
          }
        }
        
        if (config.alignSelf && config.alignSelf !== 'stretch') {
          const alignClass = gridItemVariants({ alignSelf: config.alignSelf }).replace('self-stretch', '').trim();
          if (alignClass) {
            responsiveClassArray.push(`${prefix}${alignClass}`);
          }
        }
      });
      
      responsiveClasses = responsiveClassArray.join(' ');
    }
    
    // Combine all classes
    const finalClassName = [
      itemClasses,
      positionClasses,
      responsiveClasses,
      className,
    ].filter(Boolean).join(' ');
    
    const Element = as || 'div';
    
    // Industry-standard polymorphic component pattern with type safety bypass
    const elementProps = {
      ref: ref as any,
      className: finalClassName,
      ...(props as any)
    };
    
    return React.createElement(Element, elementProps, children);
  }
);

// Display names for debugging
Grid.displayName = 'Grid';
GridItem.displayName = 'GridItem';

// Export types for external use
export type GridVariantsProps = VariantProps<typeof gridVariants>;
export type GridItemVariantsProps = VariantProps<typeof gridItemVariants>;
