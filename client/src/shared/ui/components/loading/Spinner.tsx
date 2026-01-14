/**
 * Spinner Component
 *
 * Loading spinner using CSS-only animation.
 * Thin ring style.
 */

type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

interface SpinnerProps {
  /** Spinner size variant */
  size?: SpinnerSize;
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'w-4 h-4 border',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-2',
  xl: 'w-14 h-14 border-[3px]',
};

/**
 * Renders a thin ring spinner with smooth rotation animation.
 */
export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div
      className={`
        inline-block rounded-full
        border-border border-t-text-muted
        animate-spin
        ${sizeClasses[size]}
        ${className}
      `}
      role="status"
      aria-label="Loading"
    />
  );
}
