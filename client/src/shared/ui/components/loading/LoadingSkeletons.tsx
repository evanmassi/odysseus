/**
 * Loading Skeleton Components
 *
 * Reusable loading skeleton components for lazy loading fallbacks
 * Provides visual feedback while components are being loaded
 */

import React from 'react';

// Base skeleton animation
const skeletonAnimation =
  'animate-pulse bg-gradient-to-r from-muted via-border to-muted bg-[length:200%_100%]';

// Generic skeleton component
interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width = '100%',
  height = '1rem',
  rounded = true,
}) => (
  <div
    className={`${skeletonAnimation} ${rounded ? 'rounded' : ''} ${className}`}
    style={{ width, height }}
    role="status"
    aria-label="Loading..."
  />
);

// Grid skeleton for tube grids
interface TubeGridSkeletonProps {
  rows?: number;
  columns?: number;
  cellSize?: number;
  className?: string;
}

export const TubeGridSkeleton: React.FC<TubeGridSkeletonProps> = ({
  rows = 9,
  columns = 9,
  cellSize = 80,
  className = '',
}) => (
  <div
    className={`grid gap-2 ${className}`}
    style={{
      gridTemplateColumns: `repeat(${columns}, ${cellSize}px)`,
      gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
    }}
    role="status"
    aria-label="Loading tube grid..."
  >
    {Array.from({ length: rows * columns }).map((_, index) => (
      <div
        key={index}
        className={`${skeletonAnimation} rounded-lg border border-border`}
        style={{ width: cellSize, height: cellSize }}
      />
    ))}
  </div>
);

// Search results skeleton
interface SearchResultsSkeletonProps {
  itemCount?: number;
  className?: string;
}

export const SearchResultsSkeleton: React.FC<SearchResultsSkeletonProps> = ({
  itemCount = 5,
  className = '',
}) => (
  <div className={`space-y-3 ${className}`} role="status" aria-label="Loading search results...">
    {Array.from({ length: itemCount }).map((_, index) => (
      <div key={index} className="p-4 border border-border rounded-lg">
        <div className="flex items-center space-x-3">
          <Skeleton width={20} height={20} />
          <div className="flex-1 space-y-2">
            <Skeleton width="60%" height="1rem" />
            <Skeleton width="40%" height="0.875rem" />
            <Skeleton width="80%" height="0.75rem" />
          </div>
          <div className="flex space-x-2">
            <Skeleton width={24} height={24} />
            <Skeleton width={24} height={24} />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Modal skeleton for heavy modals
interface ModalSkeletonProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const ModalSkeleton: React.FC<ModalSkeletonProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
      <div
        className={`${sizeClasses[size]} w-full mx-4 bg-background rounded-lg shadow-xl ${className}`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <Skeleton width="40%" height="1.25rem" />
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          <div className="space-y-3">
            <Skeleton width="30%" height="1rem" />
            <Skeleton width="100%" height="2.5rem" />
          </div>
          <div className="space-y-3">
            <Skeleton width="25%" height="1rem" />
            <Skeleton width="100%" height="2.5rem" />
          </div>
          <div className="space-y-3">
            <Skeleton width="35%" height="1rem" />
            <Skeleton width="100%" height="4rem" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end space-x-3">
          <Skeleton width={80} height={36} />
          <Skeleton width={100} height={36} />
        </div>
      </div>
    </div>
  );
};

// Table skeleton
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  className = '',
}) => (
  <div
    className={`border border-border rounded-lg overflow-hidden ${className}`}
    role="status"
    aria-label="Loading table..."
  >
    {/* Header */}
    <div className="bg-muted px-4 py-3 border-b border-border">
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} width="60%" height="1rem" />
        ))}
      </div>
    </div>

    {/* Rows */}
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="px-4 py-3">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} width={colIndex === 0 ? '80%' : '60%'} height="1rem" />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Form skeleton for complex forms
interface FormSkeletonProps {
  fields?: number;
  className?: string;
}

export const FormSkeleton: React.FC<FormSkeletonProps> = ({ fields = 6, className = '' }) => (
  <div className={`space-y-6 ${className}`} role="status" aria-label="Loading form...">
    {Array.from({ length: fields }).map((_, index) => (
      <div key={index} className="space-y-2">
        <Skeleton width="30%" height="1rem" />
        <Skeleton width="100%" height="2.5rem" />
        {index % 3 === 0 && <Skeleton width="70%" height="0.75rem" />}
      </div>
    ))}

    {/* Form actions */}
    <div className="flex justify-end space-x-3 pt-4">
      <Skeleton width={80} height={36} />
      <Skeleton width={100} height={36} />
    </div>
  </div>
);

// Dashboard widget skeleton
interface DashboardWidgetSkeletonProps {
  className?: string;
}

export const DashboardWidgetSkeleton: React.FC<DashboardWidgetSkeletonProps> = ({
  className = '',
}) => (
  <div
    className={`p-6 border border-border rounded-lg bg-background ${className}`}
    role="status"
    aria-label="Loading widget..."
  >
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton width="40%" height="1.25rem" />
        <Skeleton width={24} height={24} />
      </div>
      <Skeleton width="60%" height="2rem" />
      <div className="space-y-2">
        <Skeleton width="100%" height="1rem" />
        <Skeleton width="80%" height="1rem" />
        <Skeleton width="90%" height="1rem" />
      </div>
    </div>
  </div>
);

// Navigation skeleton
interface NavigationSkeletonProps {
  items?: number;
  className?: string;
}

export const NavigationSkeleton: React.FC<NavigationSkeletonProps> = ({
  items = 5,
  className = '',
}) => (
  <nav className={`space-y-1 ${className}`} role="status" aria-label="Loading navigation...">
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="flex items-center space-x-3 px-3 py-2">
        <Skeleton width={20} height={20} />
        <Skeleton width="60%" height="1rem" />
      </div>
    ))}
  </nav>
);

// Generic content skeleton for pages
interface ContentSkeletonProps {
  className?: string;
}

export const ContentSkeleton: React.FC<ContentSkeletonProps> = ({ className = '' }) => (
  <div className={`space-y-6 ${className}`} role="status" aria-label="Loading content...">
    {/* Page header */}
    <div className="space-y-2">
      <Skeleton width="40%" height="2rem" />
      <Skeleton width="70%" height="1rem" />
    </div>

    {/* Main content blocks */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Skeleton width="100%" height="12rem" />
        <Skeleton width="80%" height="1rem" />
        <Skeleton width="90%" height="1rem" />
      </div>
      <div className="space-y-4">
        <Skeleton width="100%" height="8rem" />
        <Skeleton width="70%" height="1rem" />
        <Skeleton width="85%" height="1rem" />
        <Skeleton width="60%" height="1rem" />
      </div>
    </div>

    {/* Action section */}
    <div className="flex justify-between items-center pt-4">
      <Skeleton width="30%" height="1rem" />
      <div className="flex space-x-3">
        <Skeleton width={100} height={36} />
        <Skeleton width={120} height={36} />
      </div>
    </div>
  </div>
);

// Export all skeletons
export const LoadingSkeletons = {
  Skeleton,
  TubeGridSkeleton,
  SearchResultsSkeleton,
  ModalSkeleton,
  TableSkeleton,
  FormSkeleton,
  DashboardWidgetSkeleton,
  NavigationSkeleton,
  ContentSkeleton,
} as const;
