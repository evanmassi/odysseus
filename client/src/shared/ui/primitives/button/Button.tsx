/**
 * Button
 *
 * Square button primitive — semantic actions filled, neutrals recessive.
 */

import { forwardRef } from 'react';

import { cva } from 'class-variance-authority';

import { defaultButtonProps } from './types';

import type { ButtonProps, ButtonRef, ButtonSize } from './types';

// Filled variants get a soft top-down sheen for surface depth.
const FILLED_OVERLAYS = [
  'relative isolate',
  'before:absolute before:inset-0 before:pointer-events-none',
  'before:bg-gradient-to-b before:from-white/[0.06] before:to-transparent',
].join(' ');

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center',
    'border font-mono font-medium',
    'text-center whitespace-nowrap leading-none',
    '[text-shadow:0_0_4px_color-mix(in_srgb,currentColor_40%,transparent)]',
    'transition-[background,border-color,filter,box-shadow] duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'focus-visible:ring-ring focus-visible:ring-offset-background',
    'cursor-pointer select-none touch-manipulation',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none',
    'data-[loading=true]:cursor-wait data-[loading=true]:pointer-events-none',
  ],
  {
    variants: {
      variant: {
        primary: `bg-action text-primary-foreground border-action shadow-glow-primary hover:brightness-110 ${FILLED_OVERLAYS}`,

        danger: `bg-danger-bg text-danger-btnText border-danger-bg shadow-glow-danger hover:brightness-110 ${FILLED_OVERLAYS}`,

        success: `bg-success-bg text-success-btnText border-success-bg shadow-glow-success hover:brightness-110 ${FILLED_OVERLAYS}`,

        warning: `bg-warning-bg text-warning-btnText border-warning-bg shadow-glow-warning hover:brightness-110 ${FILLED_OVERLAYS}`,

        info: `bg-info-bg text-info-btnText border-info-bg shadow-glow-info hover:brightness-110 ${FILLED_OVERLAYS}`,

        secondary:
          'bg-transparent text-secondary-foreground border-transparent hover:text-foreground hover:[text-shadow:0_0_8px_color-mix(in_srgb,currentColor_70%,transparent)]',

        cancel:
          'bg-transparent text-secondary-foreground border-transparent hover:text-foreground hover:[text-shadow:0_0_8px_color-mix(in_srgb,currentColor_70%,transparent)]',

        ghost:
          'bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:[text-shadow:0_0_8px_color-mix(in_srgb,currentColor_70%,transparent)]',

        'ghost-danger':
          'bg-transparent text-danger-text/60 border-transparent hover:text-danger-text hover:[text-shadow:0_0_8px_color-mix(in_srgb,currentColor_70%,transparent)]',
      },

      size: {
        xs: 'h-6 px-2.5 text-xs gap-1.5 min-w-6',
        sm: 'h-8 px-3 text-sm gap-2 min-w-8',
        md: 'h-10 px-4 text-sm gap-2 min-w-10',
        xl: 'h-14 px-8 text-base gap-3 min-w-14',
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
      { iconOnly: true, size: 'xl', className: 'w-14 h-14' },
      // text-shadow can't reach SVG icon strokes — drop-shadow filter is the parallel.
      { iconOnly: true, className: 'drop-shadow-icon-bloom' },
      { variant: 'ghost', iconOnly: true, className: 'hover:drop-shadow-icon-bloom-hover' },
      { variant: 'ghost-danger', iconOnly: true, className: 'hover:drop-shadow-icon-bloom-hover' },
      { variant: 'secondary', iconOnly: true, className: 'hover:drop-shadow-icon-bloom-hover' },
      { variant: 'cancel', iconOnly: true, className: 'hover:drop-shadow-icon-bloom-hover' },
    ],

    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
      iconOnly: false,
    },
  }
);

interface LoadingSpinnerProps {
  size: ButtonSize;
}

function LoadingSpinner({ size }: LoadingSpinnerProps) {
  const spinnerSizes: Record<ButtonSize, string> = {
    xs: 'w-3 h-3',
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
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
        return leftIcon || children;
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
