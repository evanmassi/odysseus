/**
 * Button
 *
 * Tonal action primitive — standard and ghost weights across five tones.
 */

import { forwardRef } from 'react';

import { cva } from 'class-variance-authority';

import { defaultButtonProps } from './types';

import type { ButtonMarker, ButtonProps, ButtonRef, ButtonSize, ButtonVariant } from './types';

const GHOST_HOVER_SHADOW =
  'hover:[text-shadow:0_0_8px_color-mix(in_srgb,currentColor_55%,transparent),0_0_14px_color-mix(in_srgb,currentColor_35%,transparent)]';

const buttonVariants = cva(
  [
    'group inline-flex items-center justify-center',
    'border font-mono font-medium',
    'text-center whitespace-nowrap leading-none',
    'transition-[background,border-color,filter,box-shadow,color,text-shadow] duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'focus-visible:ring-ring focus-visible:ring-offset-background',
    'cursor-pointer select-none touch-manipulation',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none',
    'data-[loading=true]:cursor-wait data-[loading=true]:pointer-events-none',
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-primary/10 border-primary/45 text-foreground shadow-standard-primary hover:bg-primary/20 hover:border-primary hover:shadow-standard-primary-hover',

        danger:
          'bg-danger-bg/10 border-danger-bg/45 text-foreground shadow-standard-danger hover:bg-danger-bg/20 hover:border-danger-bg hover:shadow-standard-danger-hover',

        success:
          'bg-success-bg/10 border-success-bg/45 text-foreground shadow-standard-success hover:bg-success-bg/20 hover:border-success-bg hover:shadow-standard-success-hover',

        warning:
          'bg-warning-bg/10 border-warning-bg/45 text-foreground shadow-standard-warning hover:bg-warning-bg/20 hover:border-warning-bg hover:shadow-standard-warning-hover',

        info: 'bg-info-bg/10 border-info-bg/45 text-foreground shadow-standard-info hover:bg-info-bg/20 hover:border-info-bg hover:shadow-standard-info-hover',

        ghost: `bg-transparent border-transparent text-muted-foreground hover:text-[color-mix(in_srgb,hsl(var(--muted-foreground))_70%,white)] ${GHOST_HOVER_SHADOW}`,

        'ghost-danger': `bg-transparent border-transparent text-danger-text hover:text-[color-mix(in_srgb,hsl(var(--color-danger-text))_70%,white)] ${GHOST_HOVER_SHADOW}`,

        secondary: `bg-transparent border-transparent text-muted-foreground hover:text-[color-mix(in_srgb,hsl(var(--muted-foreground))_70%,white)] ${GHOST_HOVER_SHADOW}`,

        cancel: `bg-transparent border-transparent text-muted-foreground hover:text-[color-mix(in_srgb,hsl(var(--muted-foreground))_70%,white)] ${GHOST_HOVER_SHADOW}`,
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

      ceremonial: {
        true: 'uppercase tracking-[0.32em] text-[10.5px]',
        false: '',
      },
    },

    compoundVariants: [
      { iconOnly: true, size: 'xs', className: 'w-6 h-6' },
      { iconOnly: true, size: 'sm', className: 'w-8 h-8' },
      { iconOnly: true, size: 'md', className: 'w-10 h-10' },
      { iconOnly: true, size: 'xl', className: 'w-14 h-14' },
      { iconOnly: true, className: 'drop-shadow-icon-bloom' },
      { variant: 'ghost', iconOnly: true, className: 'hover:drop-shadow-icon-bloom-hover' },
      { variant: 'ghost-danger', iconOnly: true, className: 'hover:drop-shadow-icon-bloom-hover' },
      { variant: 'secondary', iconOnly: true, className: 'hover:drop-shadow-icon-bloom-hover' },
      { variant: 'cancel', iconOnly: true, className: 'hover:drop-shadow-icon-bloom-hover' },
      // Ceremonial register replaces size dims entirely.
      { ceremonial: true, className: '!h-11 !px-4 !text-[10.5px] !gap-3.5' },
    ],

    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
      iconOnly: false,
      ceremonial: false,
    },
  }
);

const MARKER_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-primary shadow-[0_0_6px_-1px_hsl(var(--primary)/0.55)]',
  danger: 'bg-danger-bg shadow-[0_0_6px_-1px_hsl(var(--color-danger-bg)/0.55)]',
  success: 'bg-success-bg shadow-[0_0_6px_-1px_hsl(var(--color-success-bg)/0.55)]',
  warning: 'bg-warning-bg shadow-[0_0_6px_-1px_hsl(var(--color-warning-bg)/0.55)]',
  info: 'bg-info-bg shadow-[0_0_6px_-1px_hsl(var(--color-info-bg)/0.55)]',
  ghost: 'bg-muted-foreground shadow-[0_0_6px_-1px_hsl(var(--muted-foreground)/0.55)]',
  'ghost-danger': 'bg-danger-text shadow-[0_0_6px_-1px_hsl(var(--color-danger-text)/0.55)]',
  secondary: 'bg-muted-foreground shadow-[0_0_6px_-1px_hsl(var(--muted-foreground)/0.55)]',
  cancel: 'bg-muted-foreground shadow-[0_0_6px_-1px_hsl(var(--muted-foreground)/0.55)]',
};

// Hover state for ghost markers only; standard markers have no hover transition.
const MARKER_HOVER_CLASSES: Partial<Record<ButtonVariant, string>> = {
  ghost:
    'group-hover:bg-[color-mix(in_srgb,hsl(var(--muted-foreground))_60%,white)] group-hover:shadow-[0_0_8px_0_hsl(var(--muted-foreground)/0.7),0_0_14px_2px_hsl(var(--muted-foreground)/0.35)]',
  'ghost-danger':
    'group-hover:bg-[color-mix(in_srgb,hsl(var(--color-danger-text))_60%,white)] group-hover:shadow-[0_0_8px_0_hsl(var(--color-danger-text)/0.7),0_0_14px_2px_hsl(var(--color-danger-text)/0.35)]',
  secondary:
    'group-hover:bg-[color-mix(in_srgb,hsl(var(--muted-foreground))_60%,white)] group-hover:shadow-[0_0_8px_0_hsl(var(--muted-foreground)/0.7),0_0_14px_2px_hsl(var(--muted-foreground)/0.35)]',
  cancel:
    'group-hover:bg-[color-mix(in_srgb,hsl(var(--muted-foreground))_60%,white)] group-hover:shadow-[0_0_8px_0_hsl(var(--muted-foreground)/0.7),0_0_14px_2px_hsl(var(--muted-foreground)/0.35)]',
};

const MARKER_SHAPE: Record<ButtonMarker, string> = {
  bar: 'w-0.5 h-3',
  square: 'w-1.5 h-1.5',
  diamond: 'w-2 h-2 rotate-45',
};

// Standard variants set the icon color explicitly; ghost variants inherit it from text-*.
const ICON_TONE: Record<ButtonVariant, string> = {
  primary: 'text-primary drop-shadow-icon-bloom',
  danger: 'text-danger-bg drop-shadow-icon-bloom',
  success: 'text-success-bg drop-shadow-icon-bloom',
  warning: 'text-warning-bg drop-shadow-icon-bloom',
  info: 'text-info-bg drop-shadow-icon-bloom',
  ghost: 'drop-shadow-icon-bloom group-hover:drop-shadow-icon-bloom-hover',
  'ghost-danger': 'drop-shadow-icon-bloom group-hover:drop-shadow-icon-bloom-hover',
  secondary: 'drop-shadow-icon-bloom group-hover:drop-shadow-icon-bloom-hover',
  cancel: 'drop-shadow-icon-bloom group-hover:drop-shadow-icon-bloom-hover',
};

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
      marker,
      tail = defaultButtonProps.tail,
      ceremonial = defaultButtonProps.ceremonial,
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
      ceremonial,
      className,
    });

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) {
        event.preventDefault();
        return;
      }
      onClick?.(event);
    };

    const renderLeading = () => {
      if (isLoading) return <LoadingSpinner size={size!} />;
      if (leftIcon) {
        return <span className={`flex-shrink-0 ${ICON_TONE[variant!]}`}>{leftIcon}</span>;
      }
      if (marker) {
        return (
          <span
            aria-hidden
            className={`flex-shrink-0 transition-[background,box-shadow] duration-150 ${MARKER_SHAPE[marker]} ${MARKER_CLASSES[variant!]} ${MARKER_HOVER_CLASSES[variant!] ?? ''}`}
          />
        );
      }
      return null;
    };

    const renderContent = () => {
      if (iconOnly) {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading render: use first available icon/children
        return leftIcon || children;
      }

      if (isLoading && loadingText) {
        return (
          <>
            <LoadingSpinner size={size!} />
            <span>{loadingText}</span>
          </>
        );
      }

      return (
        <>
          {renderLeading()}
          {children && <span>{children}</span>}
          {rightIcon && !tail && <span className="flex-shrink-0">{rightIcon}</span>}
          {tail && !rightIcon && (
            <span
              aria-hidden
              className="ml-auto pl-2 opacity-70 transition-[transform,opacity] duration-150 group-hover:translate-x-0.5 group-hover:opacity-100"
            >
              ›
            </span>
          )}
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
