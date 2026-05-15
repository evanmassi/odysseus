/**
 * Button
 *
 * Square button primitive — semantic actions filled, neutrals recessive.
 */

import { forwardRef } from 'react';

import { cva } from 'class-variance-authority';

import { defaultButtonProps } from './types';

import type { ButtonProps, ButtonRef, ButtonSize } from './types';

// Text bloom is on the cva base, not here — recessive variants need it too.
const FILLED_OVERLAYS = [
  'relative isolate',
  'before:absolute before:inset-0 before:pointer-events-none',
  'before:bg-gradient-to-b before:from-white/[0.06] before:to-transparent',
  'after:absolute after:inset-0 after:pointer-events-none',
  'after:bg-scanlines after:mix-blend-multiply',
].join(' ');

const FILLED_VARIANTS = new Set<ButtonProps['variant']>([
  'primary',
  'danger',
  'success',
  'warning',
  'info',
]);

// Classic djb2-style string hash — used to pick a flourish composition per
// button. Length-mod clusters common verbs (Save/Update/Delete) into the same
// bucket; mixing char values scatters them properly.
const hashString = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

// Four asymmetric flourish compositions — one is picked per button so adjacent
// buttons render different mark arrangements.
const FLOURISHES = [
  // TL bracket + BR square+dash pair + right-mid vertical tick
  [
    '-top-0.5 -left-0.5 w-2 h-2 border-l border-t border-white/50',
    '-right-0.5 bottom-0.5 w-[3px] h-[3px] bg-white/40',
    '-right-0.5 bottom-[3px] w-3 h-px bg-white/40',
    '-right-0.5 top-1/3 w-px h-1.5 bg-white/30',
  ],
  // TR bracket + BL dash + left-mid vertical tick
  [
    '-top-0.5 -right-0.5 w-2 h-2 border-r border-t border-white/50',
    '-left-0.5 bottom-0.5 w-2 h-px bg-white/30',
    '-left-0.5 top-2/3 w-px h-1.5 bg-white/30',
  ],
  // BR bracket + TL dash + top-mid horizontal tick
  [
    '-bottom-0.5 -right-0.5 w-2 h-2 border-r border-b border-white/50',
    '-left-0.5 top-0.5 w-2 h-px bg-white/30',
    'left-1/3 -top-0.5 w-1.5 h-px bg-white/30',
  ],
  // BL bracket + TR dash + bottom-mid horizontal tick
  [
    '-bottom-0.5 -left-0.5 w-2 h-2 border-l border-b border-white/50',
    '-right-0.5 top-0.5 w-2 h-px bg-white/30',
    'left-2/3 -bottom-0.5 w-1.5 h-px bg-white/30',
  ],
] as const;

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center',
    'border font-medium',
    'text-center whitespace-nowrap leading-none',
    '[text-shadow:0_0_4px_rgb(255_255_255/0.4)]',
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
          'bg-transparent text-secondary-foreground border-transparent hover:text-foreground hover:[text-shadow:0_0_8px_rgb(255_255_255/0.7)]',

        cancel:
          'bg-transparent text-secondary-foreground border-border hover:bg-accent hover:text-accent-foreground',

        ghost:
          'bg-transparent text-muted-foreground border-transparent hover:border-border hover:text-foreground',

        'ghost-danger': 'bg-transparent text-danger-text border-transparent hover:bg-danger-light',
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
    const isFilled = FILLED_VARIANTS.has(variant);
    const flourish = isFilled
      ? FLOURISHES[hashString(`${variant}|${size}|${String(children ?? '')}`) % FLOURISHES.length]
      : null;

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
        {flourish && (
          <span aria-hidden className="absolute inset-0 pointer-events-none z-10">
            {flourish.map((cls, i) => (
              <span key={i} className={`absolute ${cls}`} />
            ))}
          </span>
        )}
        {renderContent()}
      </button>
    );
  }
);

Button.displayName = 'Button';
