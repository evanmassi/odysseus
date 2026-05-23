/**
 * Chip
 *
 * Stencil-plate tag: two cells (lead · label), 6px chamfered top-right.
 * Tone drives the colour palette; success/warning/danger fill the lead
 * with an auto-glyph when no explicit `lead` is provided.
 */

import React, { forwardRef } from 'react';

import { CircleCheckBig, OctagonX, TriangleAlert, X } from 'lucide-react';

import { defaultChipProps } from './types';

import type { ChipColor, ChipProps, ChipRef, ChipSize } from './types';

const AUTO_GLYPHS: Partial<Record<ChipColor, React.ReactNode>> = {
  success: <CircleCheckBig />,
  warning: <TriangleAlert />,
  danger: <OctagonX />,
};

interface ToneClasses {
  text: string;
  border: string;
  labelBg: string;
  leadBg: string;
  selectedLeadBg: string;
}

const TONE_CLASSES: Record<ChipColor, ToneClasses> = {
  success: {
    text: 'text-success-text',
    border: 'border-success-border',
    labelBg: 'bg-success-bg/[0.08]',
    leadBg: 'bg-success-bg/[0.14]',
    selectedLeadBg: 'bg-success-bg/30',
  },
  warning: {
    text: 'text-warning-text',
    border: 'border-warning-border',
    labelBg: 'bg-warning-bg/[0.08]',
    leadBg: 'bg-warning-bg/[0.14]',
    selectedLeadBg: 'bg-warning-bg/30',
  },
  danger: {
    text: 'text-danger-text',
    border: 'border-danger-border',
    labelBg: 'bg-danger-bg/[0.08]',
    leadBg: 'bg-danger-bg/[0.14]',
    selectedLeadBg: 'bg-danger-bg/30',
  },
  info: {
    text: 'text-info-text',
    border: 'border-info-border',
    labelBg: 'bg-info-bg/[0.08]',
    leadBg: 'bg-info-bg/[0.14]',
    selectedLeadBg: 'bg-info-bg/30',
  },
  primary: {
    text: 'text-action',
    border: 'border-action',
    labelBg: 'bg-primary/[0.08]',
    leadBg: 'bg-primary/[0.14]',
    selectedLeadBg: 'bg-primary/30',
  },
  default: {
    text: 'text-secondary-foreground',
    border: 'border-border',
    labelBg: 'bg-foreground/[0.03]',
    leadBg: 'bg-foreground/[0.06]',
    selectedLeadBg: 'bg-foreground/[0.15]',
  },
  outlined: {
    text: 'text-secondary-foreground',
    border: 'border-border',
    labelBg: 'bg-transparent',
    leadBg: 'bg-foreground/[0.03]',
    selectedLeadBg: 'bg-foreground/[0.10]',
  },
  active: {
    text: 'text-chip-active-foreground',
    border: 'border-chip-active',
    labelBg: 'bg-chip-active',
    leadBg: 'bg-chip-active-hover',
    selectedLeadBg: 'bg-chip-active-hover',
  },
};

interface SizeConfig {
  height: string;
  chamfer: number;
  leadText: string;
  lblText: string;
  leadPx: string;
  lblPx: string;
  removeIcon: number;
}

const SIZE_CONFIG: Record<ChipSize, SizeConfig> = {
  sm: {
    height: 'h-5',
    chamfer: 6,
    leadText: 'text-[11px]',
    lblText: 'text-[9.5px]',
    leadPx: 'px-[7px]',
    lblPx: 'pl-2 pr-2.5',
    removeIcon: 10,
  },
  xs: {
    height: 'h-[18px]',
    chamfer: 5,
    leadText: 'text-[10px]',
    lblText: 'text-[9px]',
    leadPx: 'px-1.5',
    lblPx: 'pl-1.5 pr-2',
    removeIcon: 9,
  },
};

function chamferStyle(chamfer: number): React.CSSProperties {
  return {
    clipPath: `polygon(0 0, calc(100% - ${chamfer}px) 0, 100% ${chamfer}px, 100% 100%, 0 100%)`,
  };
}

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
      leftIcon,
      color = defaultChipProps.color,
      size = defaultChipProps.size,
      behavior = defaultChipProps.behavior,
      selected = defaultChipProps.selected,
      onSelect,
      onRemove,
      disabled = defaultChipProps.disabled,
      'aria-label': ariaLabel,
      className,
      ...rest
    },
    ref
  ) => {
    const isInteractive = behavior === 'selectable';
    const tone = TONE_CLASSES[color!];
    const sizeCfg = SIZE_CONFIG[size!];

    // Lead resolution: explicit prop > deprecated leftIcon > tone auto-glyph > non-specific square.
    const leadFromProps = lead ?? leftIcon;
    const autoGlyph = AUTO_GLYPHS[color!];
    const displayLead: React.ReactNode = leadFromProps ?? autoGlyph ?? (
      <span aria-hidden="true" className="block w-1 h-1 bg-current" />
    );
    const leadIsAutoFilled = leadFromProps == null;

    const leadBgClass = isInteractive && selected ? tone.selectedLeadBg : tone.leadBg;

    const wrapperClasses = [
      'inline-flex items-stretch border whitespace-nowrap leading-none',
      'font-mono',
      'transition-[filter,background-color] duration-150',
      sizeCfg.height,
      tone.border,
      tone.labelBg,
      disabled ? 'opacity-50 cursor-not-allowed' : '',
      isInteractive && !disabled
        ? 'cursor-pointer hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'
        : '',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ');

    const style = chamferStyle(sizeCfg.chamfer);

    const handleClick = () => {
      if (disabled) return;
      if (behavior === 'selectable' && onSelect) onSelect();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    };

    const handleRemove = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!disabled && onRemove) onRemove();
    };

    const content = (
      <>
        <span
          aria-hidden={leadIsAutoFilled}
          className={`flex items-center border-r ${tone.border} ${leadBgClass} ${tone.text} ${sizeCfg.leadPx} ${sizeCfg.leadText} font-medium tracking-[0.04em]`}
        >
          {displayLead}
        </span>
        <span
          className={`flex items-center ${tone.text} ${sizeCfg.lblPx} ${sizeCfg.lblText} tracking-[0.20em] uppercase opacity-[0.82]`}
        >
          {children}
        </span>
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
          className={wrapperClasses}
          style={style}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-pressed={selected}
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
        style={style}
        aria-label={ariaLabel}
        {...rest}
      >
        {content}
      </span>
    );
  }
);

Chip.displayName = 'Chip';
