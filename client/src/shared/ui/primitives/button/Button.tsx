/**
 * Button
 *
 * Tonal action primitive — standard and ghost weights across five tones.
 */

import { forwardRef } from 'react';

import { cva } from 'class-variance-authority';

import { defaultButtonProps } from './types';

import type { ButtonProps, ButtonRef, ButtonSize, ButtonVariant } from './types';

// Phosphor text-glow on ghost hover — scales with --lit, so it glows when lit (dark) and is
// purely a bolden+deepen when unlit (light, incl. the forced-dark light header).
const GHOST_HOVER_SHADOW =
  'hover:[text-shadow:0_0_8px_color-mix(in_srgb,currentColor_calc(55%_*_var(--lit)),transparent),0_0_14px_color-mix(in_srgb,currentColor_calc(35%_*_var(--lit)),transparent)]';

const buttonVariants = cva(
  [
    'group inline-flex items-center justify-center',
    'border font-mono font-normal',
    'text-center whitespace-nowrap leading-none',
    'transition-[background,border-color,filter,box-shadow,color,text-shadow,transform] duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'focus-visible:ring-ring focus-visible:ring-offset-background',
    'cursor-pointer select-none touch-manipulation',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none',
    'data-[loading=true]:cursor-wait data-[loading=true]:pointer-events-none',
  ],
  {
    variants: {
      variant: {
        // Standard weight: pale tint + printed ink rim. The lit-vs-paper shadow split
        // lives in the `shadow-standard-*` tokens; press deepens the tint a notch.
        primary:
          'bg-primary/10 border-primary/45 text-foreground shadow-standard-primary hover:bg-primary/20 hover:border-primary hover:shadow-standard-primary-hover active:bg-primary/[0.28]',

        // Solid weight: light is an opaque pigment chip (full fill, darker ink edge,
        // paper-white label + marker, contact drop). Dark restores the backlit glass.
        solid:
          'bg-primary border-[color-mix(in_srgb,hsl(var(--primary))_70%,black)] text-white shadow-[inset_0_1px_0_hsl(var(--sheen)/0.22),inset_0_-1px_0_hsl(var(--recess)/0.18),0_1px_2px_hsl(var(--recess)/0.18),0_3px_8px_-3px_hsl(var(--recess)/0.22)] hover:bg-[color-mix(in_srgb,hsl(var(--primary))_88%,black)] hover:shadow-[inset_0_1px_0_hsl(var(--sheen)/0.22),inset_0_-1px_0_hsl(var(--recess)/0.2),0_2px_3px_hsl(var(--recess)/0.2),0_5px_12px_-4px_hsl(var(--recess)/0.26)] active:translate-y-px dark:bg-[hsl(var(--primary)/0.32)] dark:border-[hsl(var(--primary)/0.85)] dark:text-[color-mix(in_srgb,hsl(var(--primary))_25%,white)] dark:[text-shadow:0_0_6px_hsl(var(--primary)/0.55)] dark:shadow-[inset_0_0_22px_-2px_hsl(var(--primary)/0.5),inset_0_1px_0_hsl(var(--sheen)/0.3),inset_0_-1px_0_hsl(var(--shade)/0.2),0_0_22px_-2px_hsl(var(--primary)/0.7),0_0_48px_-10px_hsl(var(--primary)/0.5)] dark:hover:bg-[hsl(var(--primary)/0.45)] dark:hover:text-white dark:hover:shadow-[inset_0_0_26px_-2px_hsl(var(--primary)/0.65),inset_0_1px_0_hsl(var(--sheen)/0.4),inset_0_-1px_0_hsl(var(--shade)/0.2),0_0_28px_-2px_hsl(var(--primary)/0.85),0_0_60px_-10px_hsl(var(--primary)/0.6)]',

        danger:
          'bg-danger-bg/10 border-danger-bg/45 text-foreground shadow-standard-danger hover:bg-danger-bg/20 hover:border-danger-bg hover:shadow-standard-danger-hover active:bg-danger-bg/[0.28]',

        success:
          'bg-success-bg/10 border-success-bg/45 text-foreground shadow-standard-success hover:bg-success-bg/20 hover:border-success-bg hover:shadow-standard-success-hover active:bg-success-bg/[0.28]',

        warning:
          'bg-warning-bg/10 border-warning-bg/45 text-foreground shadow-standard-warning hover:bg-warning-bg/20 hover:border-warning-bg hover:shadow-standard-warning-hover active:bg-warning-bg/[0.28]',

        info: 'bg-info-bg/10 border-info-bg/45 text-foreground shadow-standard-info hover:bg-info-bg/20 hover:border-info-bg hover:shadow-standard-info-hover active:bg-info-bg/[0.28]',

        // Ghost weight: no fill. Hover boldens the label and deepens it — to ink in light,
        // to cream + phosphor glow in dark (text-foreground flips with the theme). No square.
        ghost: `bg-transparent border-transparent text-muted-foreground hover:font-medium hover:text-foreground ${GHOST_HOVER_SHADOW}`,

        'ghost-danger': `bg-transparent border-transparent text-danger-text hover:font-medium hover:text-[color-mix(in_srgb,hsl(var(--color-danger-text))_75%,black)] dark:hover:text-[color-mix(in_srgb,hsl(var(--color-danger-text))_70%,white)] ${GHOST_HOVER_SHADOW}`,

        secondary: `bg-transparent border-transparent text-muted-foreground hover:font-medium hover:text-foreground ${GHOST_HOVER_SHADOW}`,

        cancel: `bg-transparent border-transparent text-muted-foreground hover:font-medium hover:text-foreground ${GHOST_HOVER_SHADOW}`,
      },

      size: {
        xs: 'h-6 px-2.5 text-label-sm gap-1.5 min-w-6',
        sm: 'h-8 px-3 text-label-md gap-2 min-w-8',
        md: 'h-10 px-4 text-label-md gap-2 min-w-10',
        xl: 'h-14 px-8 text-label-lg gap-3 min-w-14',
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
        true: 'type-label text-label-xs tracking-ceremonial',
        false: '',
      },
    },

    compoundVariants: [
      { iconOnly: true, size: 'xs', className: 'w-6 h-6' },
      { iconOnly: true, size: 'sm', className: 'w-8 h-8' },
      { iconOnly: true, size: 'md', className: 'w-10 h-10' },
      { iconOnly: true, size: 'xl', className: 'w-14 h-14' },
      { iconOnly: true, className: 'dark:drop-shadow-icon-bloom' },
      { variant: 'ghost', iconOnly: true, className: 'dark:hover:drop-shadow-icon-bloom-hover' },
      {
        variant: 'ghost-danger',
        iconOnly: true,
        className: 'dark:hover:drop-shadow-icon-bloom-hover',
      },
      {
        variant: 'secondary',
        iconOnly: true,
        className: 'dark:hover:drop-shadow-icon-bloom-hover',
      },
      { variant: 'cancel', iconOnly: true, className: 'dark:hover:drop-shadow-icon-bloom-hover' },
      // Ceremonial register replaces size dims entirely.
      { ceremonial: true, className: '!h-11 !px-4 !text-label-xs !gap-3.5' },
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
  primary: 'bg-primary dark:shadow-[0_0_6px_-1px_hsl(var(--primary)/0.55)]',
  solid:
    'bg-sheen/95 dark:shadow-[0_0_8px_0_hsl(var(--sheen)/0.65),inset_0_0_2px_hsl(var(--primary)/0.5)]',
  danger: 'bg-danger-bg dark:shadow-[0_0_6px_-1px_hsl(var(--color-danger-bg)/0.55)]',
  success: 'bg-success-bg dark:shadow-[0_0_6px_-1px_hsl(var(--color-success-bg)/0.55)]',
  warning: 'bg-warning-bg dark:shadow-[0_0_6px_-1px_hsl(var(--color-warning-bg)/0.55)]',
  info: 'bg-info-bg dark:shadow-[0_0_6px_-1px_hsl(var(--color-info-bg)/0.55)]',
  ghost:
    'bg-muted-foreground shadow-[0_0_6px_-1px_hsl(var(--muted-foreground)/calc(0.55_*_var(--lit)))]',
  'ghost-danger':
    'bg-danger-text shadow-[0_0_6px_-1px_hsl(var(--color-danger-text)/calc(0.55_*_var(--lit)))]',
  secondary: 'bg-muted-foreground dark:shadow-[0_0_6px_-1px_hsl(var(--muted-foreground)/0.55)]',
  cancel: 'bg-muted-foreground dark:shadow-[0_0_6px_-1px_hsl(var(--muted-foreground)/0.55)]',
};

// Hover state for ghost + solid markers; other variants' markers have no hover transition.
const MARKER_HOVER_CLASSES: Partial<Record<ButtonVariant, string>> = {
  solid:
    'group-hover:bg-sheen dark:group-hover:shadow-[0_0_12px_0_hsl(var(--sheen)/0.85),inset_0_0_2px_hsl(var(--primary)/0.6)]',
  ghost:
    'group-hover:bg-foreground group-hover:shadow-[0_0_8px_0_hsl(var(--muted-foreground)/calc(0.7_*_var(--lit))),0_0_14px_2px_hsl(var(--muted-foreground)/calc(0.35_*_var(--lit)))]',
  'ghost-danger':
    'group-hover:bg-[color-mix(in_srgb,hsl(var(--color-danger-text))_75%,black)] dark:group-hover:bg-[color-mix(in_srgb,hsl(var(--color-danger-text))_60%,white)] group-hover:shadow-[0_0_8px_0_hsl(var(--color-danger-text)/calc(0.7_*_var(--lit))),0_0_14px_2px_hsl(var(--color-danger-text)/calc(0.35_*_var(--lit)))]',
  secondary:
    'group-hover:bg-foreground dark:group-hover:shadow-[0_0_8px_0_hsl(var(--muted-foreground)/0.7),0_0_14px_2px_hsl(var(--muted-foreground)/0.35)]',
  cancel:
    'group-hover:bg-foreground dark:group-hover:shadow-[0_0_8px_0_hsl(var(--muted-foreground)/0.7),0_0_14px_2px_hsl(var(--muted-foreground)/0.35)]',
};

// Standard variants set the icon color explicitly; ghost variants inherit it from text-*.
const ICON_TONE: Record<ButtonVariant, string> = {
  primary: 'text-primary dark:drop-shadow-icon-bloom',
  solid: 'text-white dark:drop-shadow-icon-bloom',
  danger: 'text-danger-bg dark:drop-shadow-icon-bloom',
  success: 'text-success-bg dark:drop-shadow-icon-bloom',
  warning: 'text-warning-bg dark:drop-shadow-icon-bloom',
  info: 'text-info-bg dark:drop-shadow-icon-bloom',
  ghost: 'dark:drop-shadow-icon-bloom dark:group-hover:drop-shadow-icon-bloom-hover',
  'ghost-danger': 'dark:drop-shadow-icon-bloom dark:group-hover:drop-shadow-icon-bloom-hover',
  secondary: 'dark:drop-shadow-icon-bloom dark:group-hover:drop-shadow-icon-bloom-hover',
  cancel: 'dark:drop-shadow-icon-bloom dark:group-hover:drop-shadow-icon-bloom-hover',
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
      return (
        <>
          <span
            aria-hidden
            className={`h-3 w-0.5 flex-shrink-0 transition-[background,box-shadow] duration-150 ${MARKER_CLASSES[variant!]} ${MARKER_HOVER_CLASSES[variant!] ?? ''}`}
          />
          {leftIcon && <span className={`flex-shrink-0 ${ICON_TONE[variant!]}`}>{leftIcon}</span>}
        </>
      );
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
