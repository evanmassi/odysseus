/**
 * Chip Component
 *
 * Compact element for filters, tags, and status indicators with selectable and removable variants.
 */

import { forwardRef } from 'react';

import { cva } from 'class-variance-authority';
import { X } from 'lucide-react';

import { defaultChipProps } from './types';

import type { ChipProps, ChipRef } from './types';

const chipVariants = cva(
  [
    'inline-flex items-center gap-1.5',
    'font-medium whitespace-nowrap',
    'transition-colors duration-150',
  ],
  {
    variants: {
      color: {
        default: 'bg-muted text-secondary-foreground',
        primary: 'bg-action-light text-action',
        active: 'bg-chip-active text-chip-active-foreground hover:bg-chip-active-hover',
        inverted: 'bg-muted-foreground text-background',
        success: 'bg-success-light text-success-text',
        warning: 'bg-warning-light text-warning-text',
        danger: 'bg-danger-light text-danger-text',
        info: 'bg-info-light text-info-text',
      },
      size: {
        xs: 'h-5 px-1.5 text-[10px]',
        sm: 'h-6 px-2 text-xs',
        md: 'h-7 px-2.5 text-sm',
      },
      shape: {
        rounded: 'rounded-md',
        pill: 'rounded-full',
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
      // Selected state overrides color
      {
        behavior: 'selectable',
        selected: true,
        className: 'bg-action text-white',
      },
      // Unselected selectable chips use default styling with border
      {
        behavior: 'selectable',
        selected: false,
        className: 'border border-border',
      },
    ],
    defaultVariants: {
      color: 'default',
      size: 'sm',
      shape: 'rounded',
      behavior: 'static',
      selected: false,
      disabled: false,
    },
  }
);

interface RemoveButtonProps {
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  size: 'xs' | 'sm' | 'md';
}

const iconSizeClasses: Record<'xs' | 'sm' | 'md', string> = {
  xs: '[&>svg]:w-2.5 [&>svg]:h-2.5',
  sm: '[&>svg]:w-3 [&>svg]:h-3',
  md: '[&>svg]:w-3.5 [&>svg]:h-3.5',
};

function RemoveButton({ onClick, disabled, size }: RemoveButtonProps) {
  const iconSizes = {
    xs: 10,
    sm: 12,
    md: 14,
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-ring"
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
      shape = defaultChipProps.shape,
      behavior = defaultChipProps.behavior,
      selected = defaultChipProps.selected,
      onSelect,
      onRemove,
      leftIcon,
      disabled = defaultChipProps.disabled,
      count,
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
        shape,
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
        {leftIcon && <span className={`flex-shrink-0 ${iconSizeClasses[size!]}`}>{leftIcon}</span>}
        <span>{children}</span>
        {count !== undefined && (
          <span className="ml-1 rounded bg-black/10 dark:bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold leading-none">
            {count}
          </span>
        )}
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
