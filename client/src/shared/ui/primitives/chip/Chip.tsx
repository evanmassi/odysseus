/**
 * Chip
 *
 * Square hairline tag for filters, status, and counts.
 */

import { forwardRef } from 'react';

import { cva } from 'class-variance-authority';
import { X } from 'lucide-react';

import { defaultChipProps } from './types';

import type { ChipProps, ChipRef, ChipSize } from './types';

const chipVariants = cva(
  [
    'inline-flex items-center gap-1.5',
    'border font-medium uppercase whitespace-nowrap leading-none',
    'font-mono tracking-[0.14em]',
    '[text-shadow:0_0_4px_currentColor]',
    'transition-colors duration-150',
  ],
  {
    variants: {
      color: {
        default: 'bg-muted text-secondary-foreground border-border',
        outlined: 'bg-transparent text-secondary-foreground border-border',
        primary: 'bg-action-light text-action border-action',
        active:
          'bg-chip-active text-chip-active-foreground border-chip-active hover:bg-chip-active-hover',
        success: 'bg-success-light text-success-text border-success-border',
        warning: 'bg-warning-light text-warning-text border-warning-border',
        danger: 'bg-danger-light text-danger-text border-danger-border',
        info: 'bg-info-light text-info-text border-info-border',
      },
      size: {
        xs: 'h-5 px-1.5 text-[9px]',
        sm: 'h-[22px] px-2 text-[10px]',
      },
      behavior: {
        static: '',
        selectable:
          'cursor-pointer hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
        removable: 'pr-1',
      },
      selected: {
        true: '',
        false: '',
      },
      disabled: {
        true: 'opacity-50 cursor-not-allowed',
        false: '',
      },
    },
    compoundVariants: [
      // Selected state overrides color with a solid fill
      {
        behavior: 'selectable',
        selected: true,
        className: 'bg-action text-primary-foreground border-action',
      },
    ],
    defaultVariants: {
      color: 'default',
      size: 'sm',
      behavior: 'static',
      disabled: false,
    },
  }
);

const iconSizeClasses: Record<ChipSize, string> = {
  xs: '[&>svg]:w-2.5 [&>svg]:h-2.5',
  sm: '[&>svg]:w-3 [&>svg]:h-3',
};

const dotSizeClasses: Record<ChipSize, string> = {
  xs: 'w-1 h-1',
  sm: 'w-[5px] h-[5px]',
};

interface RemoveButtonProps {
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  size: ChipSize;
}

function RemoveButton({ onClick, disabled, size }: RemoveButtonProps) {
  const iconSizes: Record<ChipSize, number> = { xs: 10, sm: 12 };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="ml-0.5 p-0.5 hover:bg-black/10 dark:hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-ring"
      aria-label="Remove"
    >
      <X size={iconSizes[size]} />
    </button>
  );
}

export const Chip = forwardRef<ChipRef, ChipProps>(
  (
    {
      children,
      color = defaultChipProps.color,
      size = defaultChipProps.size,
      behavior = defaultChipProps.behavior,
      selected = defaultChipProps.selected,
      onSelect,
      onRemove,
      leftIcon,
      disabled = defaultChipProps.disabled,
      'aria-label': ariaLabel,
      className,
      ...rest
    },
    ref
  ) => {
    const isInteractive = behavior === 'selectable';

    const chipClasses = [
      chipVariants({
        color,
        size: size!,
        behavior,
        selected,
        disabled,
      }),
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const handleClick = () => {
      if (disabled) return;
      if (behavior === 'selectable' && onSelect) {
        onSelect();
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    };

    const handleRemove = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!disabled && onRemove) {
        onRemove();
      }
    };

    const content = (
      <>
        {leftIcon ? (
          <span className={`flex-shrink-0 ${iconSizeClasses[size!]}`}>{leftIcon}</span>
        ) : (
          <span aria-hidden className={`flex-shrink-0 bg-current ${dotSizeClasses[size!]}`} />
        )}
        <span>{children}</span>
        {behavior === 'removable' && onRemove && (
          <RemoveButton onClick={handleRemove} disabled={disabled} size={size!} />
        )}
      </>
    );

    if (isInteractive) {
      return (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          type="button"
          className={chipClasses}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-pressed={behavior === 'selectable' ? selected : undefined}
          {...rest}
        >
          {content}
        </button>
      );
    }

    return (
      <span
        ref={ref as React.Ref<HTMLSpanElement>}
        className={chipClasses}
        aria-label={ariaLabel}
        {...rest}
      >
        {content}
      </span>
    );
  }
);

Chip.displayName = 'Chip';
