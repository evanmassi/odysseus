import React, { forwardRef } from 'react';

import { CircleCheckBig, OctagonX, TriangleAlert, X } from 'lucide-react';

import { defaultChipProps } from './types';

import type { ChipColor, ChipProps, ChipRef, ChipSize } from './types';

const AUTO_GLYPHS: Partial<Record<ChipColor, React.ReactNode>> = {
  success: <CircleCheckBig />,
  warning: <TriangleAlert />,
  danger: <OctagonX />,
};

const LIT_CLASSES: Partial<Record<ChipColor, string>> = {
  success: 'chip-lit chip-lit--success',
  warning: 'chip-lit chip-lit--warning',
  danger: 'chip-lit chip-lit--danger',
  info: 'chip-lit chip-lit--info',
  primary: 'chip-lit chip-lit--primary',
};

interface ToneClasses {
  text: string;
  border: string;
  labelBg: string;
  leadBg: string;
}

const TONE_CLASSES: Record<ChipColor, ToneClasses> = {
  success: {
    text: 'text-success-text',
    border: 'border-success-border',
    labelBg: 'bg-success-bg/[0.06]',
    leadBg: 'bg-success-bg/[0.14]',
  },
  warning: {
    text: 'text-warning-text',
    border: 'border-warning-border',
    labelBg: 'bg-warning-bg/[0.06]',
    leadBg: 'bg-warning-bg/[0.14]',
  },
  danger: {
    text: 'text-danger-text',
    border: 'border-danger-border',
    labelBg: 'bg-danger-bg/[0.06]',
    leadBg: 'bg-danger-bg/[0.14]',
  },
  info: {
    text: 'text-info-text',
    border: 'border-info-border',
    labelBg: 'bg-info-bg/[0.06]',
    leadBg: 'bg-info-bg/[0.14]',
  },
  primary: {
    text: 'text-action',
    border: 'border-action',
    labelBg: 'bg-primary/[0.06]',
    leadBg: 'bg-primary/[0.14]',
  },
  default: {
    text: 'text-secondary-foreground',
    border: 'border-border',
    labelBg: 'bg-foreground/[0.03]',
    leadBg: 'bg-foreground/[0.06]',
  },
  outlined: {
    text: 'text-secondary-foreground',
    border: 'border-border',
    labelBg: 'bg-transparent',
    leadBg: 'bg-foreground/[0.03]',
  },
  active: {
    text: 'text-chip-active-foreground',
    border: 'border-chip-active',
    labelBg: 'bg-chip-active',
    leadBg: 'bg-chip-active-hover',
  },
};

const SELECTED_BORDER = 'border-primary/55';
const SELECTED_GLOW = 'dark:shadow-[inset_0_0_11px_-2px_hsl(var(--primary)/0.40)]';

interface SizeConfig {
  height: string;
  leadText: string;
  lblText: string;
  numText: string;
  leadPx: string;
  lblPx: string;
  removeIcon: number;
}

const SIZE_CONFIG: Record<ChipSize, SizeConfig> = {
  sm: {
    height: 'h-5',
    leadText: 'text-label-xs',
    lblText: 'text-label-2xs',
    numText: 'text-data-sm',
    leadPx: 'px-[7px]',
    lblPx: 'pl-2 pr-2.5',
    removeIcon: 10,
  },
  xs: {
    height: 'h-[18px]',
    leadText: 'text-label-2xs',
    lblText: 'text-label-2xs',
    numText: 'text-data-sm',
    leadPx: 'px-1.5',
    lblPx: 'pl-1.5 pr-2',
    removeIcon: 9,
  },
};

interface RemoveButtonProps {
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  size: ChipSize;
}

function RemoveButton({ onClick, disabled, size }: RemoveButtonProps) {
  const sizeCfg = SIZE_CONFIG[size];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center pl-1.5 pr-2 opacity-60 transition-opacity duration-150 hover:opacity-100 focus:outline-none disabled:cursor-not-allowed"
      aria-label="Remove"
    >
      <X size={sizeCfg.removeIcon} />
    </button>
  );
}

export const Chip = forwardRef<ChipRef, ChipProps>(
  (
    {
      children,
      lead,
      color = defaultChipProps.color,
      size = defaultChipProps.size,
      behavior = defaultChipProps.behavior,
      selected = defaultChipProps.selected,
      onSelect,
      onRemove,
      onClick,
      labelClassName,
      numeric = false,
      lit = defaultChipProps.lit,
      disabled = defaultChipProps.disabled,
      'aria-label': ariaLabel,
      className,
      ...rest
    },
    ref
  ) => {
    const isSelectable = behavior === 'selectable';
    const isAction = behavior === 'action';
    const isInteractive = isSelectable || isAction;
    const tone = TONE_CLASSES[color];
    const sizeCfg = SIZE_CONFIG[size];

    const autoGlyph = AUTO_GLYPHS[color];
    const displayLead: React.ReactNode = lead ?? autoGlyph ?? (
      <span
        aria-hidden="true"
        className="block h-[3px] w-[3px] bg-current dark:shadow-[0_0_6px_1px_color-mix(in_srgb,currentColor_70%,transparent)]"
      />
    );
    const leadIsAutoFilled = lead == null;

    const isLit = isSelectable && selected;
    const litToneClasses = LIT_CLASSES[color];
    const borderClass = isLit ? SELECTED_BORDER : tone.border;
    const textClass = isLit ? 'text-foreground' : tone.text;
    const labelTextClass = litToneClasses ? 'text-foreground' : textClass;
    const leadBgClass = isLit ? 'bg-primary/25' : tone.leadBg;
    const labelBgClass = isLit ? 'bg-primary/[0.10]' : tone.labelBg;

    const wrapperClasses = [
      'inline-flex items-stretch border whitespace-nowrap leading-none',
      'font-mono',
      'transition-[filter,background-color,text-shadow,box-shadow,border-color] duration-150',
      sizeCfg.height,
      borderClass,
      labelBgClass,
      isLit ? SELECTED_GLOW : '',
      litToneClasses ?? (lit ? 'chip-lit chip-lit--neutral' : ''),
      disabled ? 'opacity-50 cursor-not-allowed' : '',
      isInteractive && !disabled
        ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'
        : '',
      isSelectable && !disabled ? 'hover:brightness-110' : '',
      isAction && !disabled
        ? 'hover:bg-foreground/[0.06] hover:brightness-110 dark:hover:[text-shadow:0_0_1px_currentColor,0_0_6px_color-mix(in_srgb,currentColor_40%,transparent)]'
        : '',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ');

    const handleClick = (e: React.MouseEvent<HTMLElement>) => {
      if (disabled) return;
      if (isSelectable && onSelect) onSelect();
      if (isAction && onClick) onClick(e);
    };

    const handleRemove = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!disabled && onRemove) onRemove();
    };

    const labelTypography = numeric
      ? `${sizeCfg.numText} font-semibold tabular-nums tracking-data`
      : `${sizeCfg.lblText} type-label tracking-label-wide`;
    const labelState = isLit ? 'opacity-100' : '';

    const content = (
      <>
        <span
          aria-hidden={leadIsAutoFilled}
          className={`flex items-center justify-center border-r ${borderClass} ${leadBgClass} ${textClass} ${sizeCfg.leadPx} ${sizeCfg.leadText} font-medium tracking-[0.04em]`}
        >
          {displayLead}
        </span>
        <span
          className={`flex items-center ${labelTextClass} ${sizeCfg.lblPx} ${labelTypography} ${labelState} ${labelClassName ?? ''}`}
        >
          {children}
        </span>
        {behavior === 'removable' && onRemove && (
          <RemoveButton onClick={handleRemove} disabled={disabled} size={size} />
        )}
      </>
    );

    if (isInteractive) {
      return (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          type="button"
          className={wrapperClasses}
          onClick={handleClick}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-pressed={isSelectable ? selected : undefined}
          {...rest}
        >
          {content}
        </button>
      );
    }

    return (
      <span
        ref={ref as React.Ref<HTMLSpanElement>}
        className={wrapperClasses}
        aria-label={ariaLabel}
        {...rest}
      >
        {content}
      </span>
    );
  }
);

Chip.displayName = 'Chip';
