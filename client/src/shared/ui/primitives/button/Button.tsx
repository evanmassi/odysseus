/**
 * Button Component
 * 
 * Accessible, customizable button primitive following design system tokens
 * Supports multiple variants, sizes, loading states, and full WCAG AA compliance
 */

import React, { forwardRef } from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { defaultButtonProps } from './types';

import type { ButtonProps, ButtonRef} from './types';


// Button styling using class-variance-authority for type-safe variants
const buttonVariants = cva(
  // Base styles - consistent across all variants
  [
    // Layout & positioning
    'inline-flex items-center justify-center',
    'relative overflow-hidden',
    
    // Typography - using design tokens
    'font-medium text-center whitespace-nowrap',
    'leading-none',
    
    // Transitions & animations
    'transition-all duration-200 ease-out',
    'transform-gpu',
    
    // Focus & accessibility
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'focus-visible:ring-primary-500 focus-visible:ring-offset-white',
    
    // Cursor & user interaction
    'cursor-pointer select-none touch-manipulation',
    
    // Disabled state
    'disabled:cursor-not-allowed disabled:opacity-50',
    'disabled:pointer-events-none',
    
    // Loading state
    'data-[loading=true]:cursor-wait data-[loading=true]:pointer-events-none',
  ],
  {
    variants: {
      // Variant styles using design system colors
      variant: {
        primary: [
          'bg-primary-600 text-white border-primary-600',
          'hover:bg-primary-700 hover:border-primary-700',
          'active:bg-primary-800 active:border-primary-800',
          'shadow-sm hover:shadow-md active:shadow-sm',
        ],
        secondary: [
          'bg-transparent text-primary-700 border-primary-300',
          'border-2',
          'hover:bg-primary-50 hover:border-primary-400 hover:text-primary-800',
          'active:bg-primary-100 active:border-primary-500',
          'shadow-sm hover:shadow-md active:shadow-sm',
        ],
        tertiary: [
          'bg-transparent text-primary-700 border-transparent',
          'hover:bg-primary-50 hover:text-primary-800',
          'active:bg-primary-100',
        ],
        danger: [
          'bg-error-600 text-white border-error-600',
          'hover:bg-error-700 hover:border-error-700',
          'active:bg-error-800 active:border-error-800',
          'shadow-sm hover:shadow-md active:shadow-sm',
        ],
        success: [
          'bg-success-600 text-white border-success-600',
          'hover:bg-success-700 hover:border-success-700',
          'active:bg-success-800 active:border-success-800',
          'shadow-sm hover:shadow-md active:shadow-sm',
        ],
        warning: [
          'bg-warning-600 text-white border-warning-600',
          'hover:bg-warning-700 hover:border-warning-700',
          'active:bg-warning-800 active:border-warning-800',
          'shadow-sm hover:shadow-md active:shadow-sm',
        ],
        ghost: [
          'bg-transparent text-neutral-700 border-transparent',
          'hover:bg-neutral-100 hover:text-neutral-800',
          'active:bg-neutral-200',
        ],
      },
      
      // Size styles using design system spacing
      size: {
        xs: [
          'h-6 px-2 text-xs',  // 24px height
          'gap-1',
          'min-w-6',
        ],
        sm: [
          'h-8 px-3 text-sm',  // 32px height  
          'gap-1.5',
          'min-w-8',
        ],
        md: [
          'h-10 px-4 text-sm', // 40px height (default)
          'gap-2',
          'min-w-10',
        ],
        lg: [
          'h-12 px-6 text-base', // 48px height
          'gap-2',
          'min-w-12',
        ],
        xl: [
          'h-14 px-8 text-base', // 56px height
          'gap-3',
          'min-w-14',
        ],
      },
      
      // Shape styles using design system border radius
      shape: {
        rounded: 'rounded-md',    // 6px border radius
        pill: 'rounded-full',     // Fully rounded
        square: 'rounded-none',   // No border radius
      },
      
      // Full width option
      fullWidth: {
        true: 'w-full',
        false: 'w-auto',
      },
      
      // Icon-only button
      iconOnly: {
        true: 'p-0', // Override padding for icon-only buttons
        false: '',
      },
    },
    
    // Compound variants for special combinations
    compoundVariants: [
      // Icon-only size adjustments
      {
        iconOnly: true,
        size: 'xs',
        className: 'w-6 h-6',
      },
      {
        iconOnly: true,
        size: 'sm', 
        className: 'w-8 h-8',
      },
      {
        iconOnly: true,
        size: 'md',
        className: 'w-10 h-10',
      },
      {
        iconOnly: true,
        size: 'lg',
        className: 'w-12 h-12',
      },
      {
        iconOnly: true,
        size: 'xl',
        className: 'w-14 h-14',
      },
    ],
    
    // Default variants
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      shape: 'rounded',
      fullWidth: false,
      iconOnly: false,
    },
  }
);

// Loading spinner component
interface LoadingSpinnerProps {
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size }) => {
  const spinnerSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3 h-3', 
    md: 'w-4 h-4',
    lg: 'w-4 h-4',
    xl: 'w-5 h-5',
  };
  
  return (
    <svg
      className={`animate-spin ${spinnerSizes[size]}`}
      fill="none"
      viewBox="0 0 24 24"
      role="status"
      aria-label="Loading"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

// Main Button component
export const Button = forwardRef<ButtonRef, ButtonProps>(
  (
    {
      children,
      variant = defaultButtonProps.variant,
      size = defaultButtonProps.size,
      shape = defaultButtonProps.shape,
      isLoading = defaultButtonProps.isLoading,
      loadingText,
      disabled = defaultButtonProps.disabled,
      leftIcon,
      rightIcon,
      iconOnly = defaultButtonProps.iconOnly,
      fullWidth = defaultButtonProps.fullWidth,
      className,
      type = 'button',
      onClick,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    // Determine if button is disabled (disabled prop or loading state)
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR logic is correct here
    const isDisabled = disabled || isLoading;
    
    // Generate button classes
    const buttonClasses = buttonVariants({
      variant,
      size,
      shape,
      fullWidth,
      iconOnly,
      className,
    });
    
    // Handle click events
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) {
        event.preventDefault();
        return;
      }
      
      onClick?.(event);
    };
    
    // Determine button content
    const renderContent = () => {
      // Loading state
      if (isLoading) {
        return (
          <>
            <LoadingSpinner size={size!} />
            {loadingText && !iconOnly && (
              <span className="ml-2">{loadingText}</span>
            )}
            {!loadingText && !iconOnly && children && (
              <span className="ml-2">{children}</span>
            )}
          </>
        );
      }
      
      // Icon-only button
      if (iconOnly) {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading render: use first available icon/children
        return leftIcon || rightIcon || children;
      }
      
      // Normal button with optional icons
      return (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children && <span>{children}</span>}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      );
    };
    
    // Generate appropriate aria-label
    const getAriaLabel = () => {
      if (ariaLabel) return ariaLabel;
      if (iconOnly && typeof children === 'string') return children;
      if (isLoading && loadingText) return loadingText;
      return undefined;
    };
    
    return (
      <button
        ref={ref}
        type={type}
        className={buttonClasses}
        disabled={isDisabled}
        onClick={handleClick}
        data-loading={isLoading}
        aria-label={getAriaLabel()}
        aria-describedby={ariaDescribedBy}
        {...props}
      >
        {renderContent()}
      </button>
    );
  }
);

// Display name for debugging
Button.displayName = 'Button';

// Export button variants type for external use
export type ButtonVariantsProps = VariantProps<typeof buttonVariants>;
