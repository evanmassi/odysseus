import { forwardRef } from 'react';

import { cva } from 'class-variance-authority';

import { LoadingSpinner } from '@shared/ui/components/loading';

import { defaultButtonProps } from './types';

import type { ButtonProps, ButtonRef, ButtonSize, ButtonVariant } from './types';

const GHOST_HOVER_SHADOW =
  'hover:[text-shadow:0_0_8px_color-mix(in_srgb,currentColor_calc(55%_*_var(--lit)),transparent),0_0_14px_color-mix(in_srgb,currentColor_calc(35%_*_var(--lit)),transparent)]';

const GHOST_BASE = `bg-transparent border-transparent text-muted-foreground hover:font-medium hover:text-foreground ${GHOST_HOVER_SHADOW}`;
const CEREMONIAL_MARKER =
  'h-3 w-0.5 flex-shrink-0 bg-primary dark:shadow-[0_0_6px_-1px_hsl(var(--primary)/0.55)]';
const GHOST_ICON_TONE = 'dark:drop-shadow-icon-bloom dark:group-hover:drop-shadow-icon-bloom-hover';

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
        primary:
          'bg-primary/10 border-primary/45 text-foreground shadow-standard-primary hover:bg-primary/20 hover:border-primary hover:shadow-standard-primary-hover active:bg-primary/[0.28]',

        solid:
          'bg-primary border-[color-mix(in_srgb,hsl(var(--primary))_70%,black)] text-white shadow-[inset_0_1px_0_hsl(var(--sheen)/0.22),inset_0_-1px_0_hsl(var(--recess)/0.18),0_1px_2px_hsl(var(--recess)/0.18),0_3px_8px_-3px_hsl(var(--recess)/0.22)] hover:bg-[color-mix(in_srgb,hsl(var(--primary))_88%,black)] hover:shadow-[inset_0_1px_0_hsl(var(--sheen)/0.22),inset_0_-1px_0_hsl(var(--recess)/0.2),0_2px_3px_hsl(var(--recess)/0.2),0_5px_12px_-4px_hsl(var(--recess)/0.26)] active:translate-y-px dark:bg-[hsl(var(--primary)/0.32)] dark:border-[hsl(var(--primary)/0.85)] dark:text-[color-mix(in_srgb,hsl(var(--primary))_25%,white)] dark:[text-shadow:0_0_6px_hsl(var(--primary)/0.55)] dark:shadow-[inset_0_0_22px_-2px_hsl(var(--primary)/0.5),inset_0_1px_0_hsl(var(--sheen)/0.3),inset_0_-1px_0_hsl(var(--shade)/0.2),0_0_22px_-2px_hsl(var(--primary)/0.7),0_0_48px_-10px_hsl(var(--primary)/0.5)] dark:hover:bg-[hsl(var(--primary)/0.45)] dark:hover:text-white dark:hover:shadow-[inset_0_0_26px_-2px_hsl(var(--primary)/0.65),inset_0_1px_0_hsl(var(--sheen)/0.4),inset_0_-1px_0_hsl(var(--shade)/0.2),0_0_28px_-2px_hsl(var(--primary)/0.85),0_0_60px_-10px_hsl(var(--primary)/0.6)]',

        danger:
          'bg-danger-bg/10 border-danger-bg/45 text-foreground shadow-standard-danger hover:bg-danger-bg/20 hover:border-danger-bg hover:shadow-standard-danger-hover active:bg-danger-bg/[0.28]',

        warning:
          'bg-warning-bg/10 border-warning-bg/45 text-foreground shadow-standard-warning hover:bg-warning-bg/20 hover:border-warning-bg hover:shadow-standard-warning-hover active:bg-warning-bg/[0.28]',

        ghost: GHOST_BASE,

        'ghost-danger': `bg-transparent border-transparent text-danger-text hover:font-medium hover:text-[color-mix(in_srgb,hsl(var(--color-danger-text))_75%,black)] dark:hover:text-[color-mix(in_srgb,hsl(var(--color-danger-text))_70%,white)] ${GHOST_HOVER_SHADOW}`,

        'ghost-primary': `bg-transparent border-transparent text-primary hover:font-medium hover:text-[color-mix(in_srgb,hsl(var(--primary))_75%,black)] dark:hover:text-[color-mix(in_srgb,hsl(var(--primary))_70%,white)] ${GHOST_HOVER_SHADOW}`,

        secondary: GHOST_BASE,

        cancel: GHOST_BASE,
      },

      size: {
        xs: 'h-6 px-2.5 text-label-sm gap-1.5 min-w-6',
        sm: 'h-8 px-3 text-label-md gap-2 min-w-8',
        md: 'h-10 px-4 text-label-md gap-2 min-w-10',
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
      { iconOnly: true, className: 'dark:drop-shadow-icon-bloom' },
      { variant: 'ghost', iconOnly: true, className: 'dark:hover:drop-shadow-icon-bloom-hover' },
      {
        variant: 'ghost-danger',
        iconOnly: true,
        className: 'dark:hover:drop-shadow-icon-bloom-hover',
      },
      {
        variant: 'ghost-primary',
        iconOnly: true,
        className: 'dark:hover:drop-shadow-icon-bloom-hover',
      },
      {
        variant: 'secondary',
        iconOnly: true,
        className: 'dark:hover:drop-shadow-icon-bloom-hover',
      },
      { variant: 'cancel', iconOnly: true, className: 'dark:hover:drop-shadow-icon-bloom-hover' },
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

const ICON_TONE: Record<ButtonVariant, string> = {
  primary: 'text-primary dark:drop-shadow-icon-bloom',
  solid: 'text-white dark:drop-shadow-icon-bloom',
  danger: 'text-danger-bg dark:drop-shadow-icon-bloom',
  warning: 'text-warning-bg dark:drop-shadow-icon-bloom',
  ghost: GHOST_ICON_TONE,
  'ghost-danger': GHOST_ICON_TONE,
  'ghost-primary': GHOST_ICON_TONE,
  secondary: GHOST_ICON_TONE,
  cancel: GHOST_ICON_TONE,
};

const SPINNER_PX: Record<ButtonSize, number> = { xs: 12, sm: 12, md: 16 };

function ButtonSpinner({ size }: { size: ButtonSize }) {
  return <LoadingSpinner size={SPINNER_PX[size]} />;
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
      type = defaultButtonProps.type,
      onClick,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
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
      if (isLoading) return <ButtonSpinner size={size} />;
      return (
        <>
          {ceremonial && <span aria-hidden className={CEREMONIAL_MARKER} />}
          {leftIcon && <span className={`flex-shrink-0 ${ICON_TONE[variant]}`}>{leftIcon}</span>}
        </>
      );
    };

    const renderContent = () => {
      if (iconOnly) {
        if (isLoading) return <ButtonSpinner size={size} />;
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading render: use first available icon/children
        return leftIcon || children;
      }

      if (isLoading && loadingText) {
        return (
          <>
            <ButtonSpinner size={size} />
            <span>{loadingText}</span>
          </>
        );
      }

      return (
        <>
          {renderLeading()}
          {children && <span>{children}</span>}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
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
