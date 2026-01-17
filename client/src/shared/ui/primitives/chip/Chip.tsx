/**
 * Chip Component
 *
 * Compact element for filters, tags, and status indicators with selectable and removable variants.
 */

import { forwardRef } from 'react';

import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';

import { defaultChipProps } from './types';

import type { ChipProps, ChipRef, ChipEntityType } from './types';

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
        success: 'bg-success-light text-success-text',
        warning: 'bg-warning-light text-warning-text',
        danger: 'bg-danger-light text-danger-text',
        info: 'bg-info-light text-info-text',
        entity: '',
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
          'cursor-pointer hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-1',
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
      shape: 'pill',
      behavior: 'static',
      selected: false,
      disabled: false,
    },
  }
);

const entityColors: Record<ChipEntityType, string> = {
  storage: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  sample: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  user: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  researcher: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

interface RemoveButtonProps {
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  size: 'xs' | 'sm' | 'md';
}

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
      className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-action"
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
      entityType,
      disabled = defaultChipProps.disabled,
      count,
      'aria-label': ariaLabel,
      className,
    },
    ref
  ) => {
    const isInteractive = behavior !== 'static';
    const effectiveColor = entityType ? 'entity' : color;

    const chipClasses = [
      chipVariants({
        color: effectiveColor,
        size: size!,
        shape,
        behavior,
        selected,
        disabled,
      }),
      entityType ? entityColors[entityType] : '',
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
        {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {count !== undefined && (
          <span className="ml-1 rounded-full bg-black/10 dark:bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold leading-none">
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
        >
          {content}
        </button>
      );
    }

    return (
      <span ref={ref as React.Ref<HTMLSpanElement>} className={chipClasses} aria-label={ariaLabel}>
        {content}
      </span>
    );
  }
);

Chip.displayName = 'Chip';

export type ChipVariantsProps = VariantProps<typeof chipVariants>;
