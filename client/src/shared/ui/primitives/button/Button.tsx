/**
 * Button Component
 *
 * Accessible button primitive with design system semantic colors and CVA variants.
 */

import { forwardRef } from 'react';

import { cva } from 'class-variance-authority';

import { defaultButtonProps } from './types';

import type { ButtonProps, ButtonRef } from './types';

const buttonVariants = cva(
  [
    // Layout
    'inline-flex items-center justify-center',
    'relative overflow-hidden',

    // Typography
    'font-medium text-center whitespace-nowrap leading-none',

    // Transitions
    'transition-all duration-200 ease-out transform-gpu',

    // Focus ring
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'focus-visible:ring-ring focus-visible:ring-offset-background',

    // Cursor & interaction
    'cursor-pointer select-none touch-manipulation',

    // Disabled state
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none',

    // Loading state
    'data-[loading=true]:cursor-wait data-[loading=true]:pointer-events-none',
  ],
  {
    variants: {
      variant: {
        // Dark mode overrides in buttons.css
        primary: [
          'btn-variant-primary',
          'bg-action text-white border border-action',
          'hover:bg-action-hover hover:border-action-hover',
          'active:bg-action-hover',
          'shadow-sm hover:shadow-md active:shadow-sm',
        ],

        secondary: [
          'bg-transparent text-secondary-foreground border border-transparent',
          'hover:bg-accent hover:text-accent-foreground',
          'active:bg-accent',
          'shadow-none',
        ],

        tertiary: [
          'bg-transparent text-secondary-foreground border-transparent',
          'hover:bg-accent hover:text-accent-foreground',
          'active:bg-accent',
        ],

        danger: [
          'bg-danger-bg/70 text-danger-btnText border border-danger-bg/70',
          'hover:bg-danger-hover/70 hover:border-danger-hover/70',
          'active:bg-danger-hover/70',
          'shadow-sm hover:shadow-md active:shadow-sm',
        ],

        success: [
          'bg-success-bg text-success-btnText border border-success-bg',
          'hover:bg-success-hover hover:border-success-hover',
          'active:bg-success-hover',
          'shadow-sm hover:shadow-md active:shadow-sm',
        ],

        warning: [
          'bg-warning-bg/70 text-warning-btnText border border-warning-bg/70',
          'hover:bg-warning-hover/70 hover:border-warning-hover/70',
          'active:bg-warning-hover/70',
          'shadow-sm hover:shadow-md active:shadow-sm',
        ],

        info: [
          'bg-info-bg/70 text-info-btnText border border-info-bg/70',
          'hover:bg-info-hover/70 hover:border-info-hover/70',
          'active:bg-info-hover/70',
          'shadow-sm hover:shadow-md active:shadow-sm',
        ],

        ghost: [
          'bg-transparent text-muted-foreground border-transparent',
          'hover:bg-muted hover:text-accent-foreground',
          'active:bg-muted',
        ],

        'ghost-danger': [
          'bg-transparent text-danger-text border-transparent',
          'hover:bg-danger-light',
          'active:bg-danger-light',
        ],

        'ghost-warning': [
          'bg-transparent text-warning-text border-transparent',
          'hover:bg-warning-light',
          'active:bg-warning-light',
        ],

        cancel: [
          'bg-card text-card-foreground border border-border',
          'hover:bg-accent hover:text-accent-foreground',
          'active:bg-accent',
          'shadow-sm',
        ],

        clear: [
          'bg-clear-bg text-clear-text border border-clear-bg',
          'hover:bg-clear-hover hover:border-clear-hover',
          'active:bg-clear-hover',
          'shadow-sm hover:shadow-md active:shadow-sm',
        ],
      },

      size: {
        xs: ['h-6 px-2 text-xs', 'gap-1', 'min-w-6'],
        sm: ['h-8 px-3 text-sm', 'gap-1.5', 'min-w-8'],
        md: ['h-10 px-4 text-sm', 'gap-2', 'min-w-10'],
        lg: ['h-12 px-6 text-base', 'gap-2', 'min-w-12'],
        xl: ['h-14 px-8 text-base', 'gap-3', 'min-w-14'],
      },

      shape: {
        rounded: 'rounded-lg',
        pill: 'rounded-full',
        square: 'rounded-none',
      },

      fullWidth: {
        true: 'w-full',
        false: 'w-auto',
      },

      iconOnly: {
        true: 'p-0',
        false: '',
      },
    },

    compoundVariants: [
      { iconOnly: true, size: 'xs', className: 'w-6 h-6' },
      { iconOnly: true, size: 'sm', className: 'w-8 h-8' },
      { iconOnly: true, size: 'md', className: 'w-10 h-10' },
      { iconOnly: true, size: 'lg', className: 'w-12 h-12' },
      { iconOnly: true, size: 'xl', className: 'w-14 h-14' },
    ],

    defaultVariants: {
      variant: 'primary',
      size: 'md',
      shape: 'rounded',
      fullWidth: false,
      iconOnly: false,
    },
  }
);

interface LoadingSpinnerProps {
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

function LoadingSpinner({ size }: LoadingSpinnerProps) {
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
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

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
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR logic is correct here
    const isDisabled = disabled || isLoading;

    const buttonClasses = buttonVariants({
      variant,
      size,
      shape,
      fullWidth,
      iconOnly,
      className,
    });

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) {
        event.preventDefault();
        return;
      }
      onClick?.(event);
    };

    const renderContent = () => {
      if (isLoading) {
        return (
          <>
            <LoadingSpinner size={size!} />
            {loadingText && !iconOnly && <span className="ml-2">{loadingText}</span>}
            {!loadingText && !iconOnly && children && <span className="ml-2">{children}</span>}
          </>
        );
      }

      if (iconOnly) {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading render: use first available icon/children
        return leftIcon || rightIcon || children;
      }

      return (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children && <span>{children}</span>}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      );
    };

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

Button.displayName = 'Button';
