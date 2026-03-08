/**
 * Modal Skeleton
 *
 * Suspense fallback for lazy-loaded modals.
 */

import React from 'react';

const skeletonAnimation =
  'animate-pulse bg-gradient-to-r from-muted via-border to-muted bg-[length:200%_100%]';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
}

const Skeleton: React.FC<SkeletonProps> = ({
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--overlay))]">
      <div className={`${sizeClasses[size]} w-full mx-4 bg-card rounded-lg shadow-xl ${className}`}>
        <div className="px-6 py-4 border-b border-border">
          <Skeleton width="40%" height="1.25rem" />
        </div>

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

        <div className="px-6 py-4 border-t border-border flex justify-end space-x-3">
          <Skeleton width={80} height={36} />
          <Skeleton width={100} height={36} />
        </div>
      </div>
    </div>
  );
};
