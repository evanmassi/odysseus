/**
 * Data Table
 *
 * Sortable, selectable data grid with status-edge rows and zebra body.
 */

import React, { createContext, useContext } from 'react';

import { cva } from 'class-variance-authority';

import { Checkbox } from '../checkbox/Checkbox';

import { defaultTableProps } from './types';

import type { RowState, TableColumn, TableRowBase, TableProps, TableContextValue } from './types';

// Internal lookup keys — RowState collapses onto these for checkbox + glow recipes.
// 'success' / 'warning' / 'danger' carry their own tone; 'muted' / 'default' fall through to 'primary'.
type GlowTone = 'primary' | 'success' | 'warning' | 'danger';

const stateToGlowTone = (state: RowState): GlowTone =>
  state === 'success' || state === 'warning' || state === 'danger' ? state : 'primary';

// Each block is one literal string per tone — Tailwind JIT won't see interpolated classes.
const ROW_GLOW: Record<GlowTone, string> = {
  primary: [
    '[background-image:repeating-linear-gradient(to_bottom,hsl(var(--scanline))_0,hsl(var(--scanline))_1px,transparent_1px,transparent_3px),linear-gradient(180deg,hsl(var(--primary)/var(--alpha-glow-tint)),hsl(var(--primary)/var(--alpha-glow-tint))),linear-gradient(90deg,hsl(var(--primary)/var(--alpha-glow-wash-1))_0%,hsl(var(--primary)/var(--alpha-glow-wash-2))_18%,hsl(var(--primary)/var(--alpha-glow-wash-3))_48%,hsl(var(--primary)/var(--alpha-glow-wash-4))_78%,hsl(var(--primary)/0)_100%)]',
    'shadow-[inset_3px_0_0_0_hsl(var(--primary)),inset_14px_0_36px_-10px_hsl(var(--primary)/var(--alpha-glow-edge-inner)),inset_0_1px_0_hsl(var(--primary)/var(--alpha-glow-edge-rim)),inset_0_-1px_0_hsl(var(--primary)/var(--alpha-glow-edge-rim)),inset_0_10px_16px_-8px_hsl(var(--primary)/var(--alpha-glow-edge-bloom)),inset_0_-10px_16px_-8px_hsl(var(--primary)/var(--alpha-glow-edge-bloom)),0_0_32px_-4px_hsl(var(--primary)/var(--alpha-glow-outer-near)),0_0_80px_4px_hsl(var(--primary)/var(--alpha-glow-outer-far))]',
    '[&>td]:!bg-transparent',
    '[&>td:first-child]:relative',
    '[&>td:first-child]:before:content-[""] [&>td:first-child]:before:absolute [&>td:first-child]:before:left-0 [&>td:first-child]:before:top-0 [&>td:first-child]:before:bottom-0 [&>td:first-child]:before:w-[3px] [&>td:first-child]:before:bg-primary [&>td:first-child]:before:pointer-events-none',
    '[&>td:first-child]:before:shadow-[0_0_6px_0_hsl(var(--primary)/var(--alpha-glow-bar-strong)),0_0_24px_3px_hsl(var(--primary)/var(--alpha-glow-bar-mid)),0_0_72px_10px_hsl(var(--primary)/var(--alpha-glow-bar-far))]',
    '[&>td]:font-semibold',
    '[&>td]:[text-shadow:0_0_5px_color-mix(in_srgb,currentColor_35%,transparent)]',
  ].join(' '),
  success: [
    '[background-image:repeating-linear-gradient(to_bottom,hsl(var(--scanline))_0,hsl(var(--scanline))_1px,transparent_1px,transparent_3px),linear-gradient(180deg,hsl(var(--color-success-bg)/var(--alpha-glow-tint)),hsl(var(--color-success-bg)/var(--alpha-glow-tint))),linear-gradient(90deg,hsl(var(--color-success-bg)/var(--alpha-glow-wash-1))_0%,hsl(var(--color-success-bg)/var(--alpha-glow-wash-2))_18%,hsl(var(--color-success-bg)/var(--alpha-glow-wash-3))_48%,hsl(var(--color-success-bg)/var(--alpha-glow-wash-4))_78%,hsl(var(--color-success-bg)/0)_100%)]',
    'shadow-[inset_3px_0_0_0_hsl(var(--color-success-bg)),inset_14px_0_36px_-10px_hsl(var(--color-success-bg)/var(--alpha-glow-edge-inner)),inset_0_1px_0_hsl(var(--color-success-bg)/var(--alpha-glow-edge-rim)),inset_0_-1px_0_hsl(var(--color-success-bg)/var(--alpha-glow-edge-rim)),inset_0_10px_16px_-8px_hsl(var(--color-success-bg)/var(--alpha-glow-edge-bloom)),inset_0_-10px_16px_-8px_hsl(var(--color-success-bg)/var(--alpha-glow-edge-bloom)),0_0_32px_-4px_hsl(var(--color-success-bg)/var(--alpha-glow-outer-near)),0_0_80px_4px_hsl(var(--color-success-bg)/var(--alpha-glow-outer-far))]',
    '[&>td]:!bg-transparent',
    '[&>td:first-child]:relative',
    '[&>td:first-child]:before:content-[""] [&>td:first-child]:before:absolute [&>td:first-child]:before:left-0 [&>td:first-child]:before:top-0 [&>td:first-child]:before:bottom-0 [&>td:first-child]:before:w-[3px] [&>td:first-child]:before:bg-success-bg [&>td:first-child]:before:pointer-events-none',
    '[&>td:first-child]:before:shadow-[0_0_6px_0_hsl(var(--color-success-bg)/var(--alpha-glow-bar-strong)),0_0_24px_3px_hsl(var(--color-success-bg)/var(--alpha-glow-bar-mid)),0_0_72px_10px_hsl(var(--color-success-bg)/var(--alpha-glow-bar-far))]',
    '[&>td]:font-semibold',
    '[&>td]:[text-shadow:0_0_5px_color-mix(in_srgb,currentColor_35%,transparent)]',
  ].join(' '),
  warning: [
    '[background-image:repeating-linear-gradient(to_bottom,hsl(var(--scanline))_0,hsl(var(--scanline))_1px,transparent_1px,transparent_3px),linear-gradient(180deg,hsl(var(--color-warning-bg)/var(--alpha-glow-tint)),hsl(var(--color-warning-bg)/var(--alpha-glow-tint))),linear-gradient(90deg,hsl(var(--color-warning-bg)/var(--alpha-glow-wash-1))_0%,hsl(var(--color-warning-bg)/var(--alpha-glow-wash-2))_18%,hsl(var(--color-warning-bg)/var(--alpha-glow-wash-3))_48%,hsl(var(--color-warning-bg)/var(--alpha-glow-wash-4))_78%,hsl(var(--color-warning-bg)/0)_100%)]',
    'shadow-[inset_3px_0_0_0_hsl(var(--color-warning-bg)),inset_14px_0_36px_-10px_hsl(var(--color-warning-bg)/var(--alpha-glow-edge-inner)),inset_0_1px_0_hsl(var(--color-warning-bg)/var(--alpha-glow-edge-rim)),inset_0_-1px_0_hsl(var(--color-warning-bg)/var(--alpha-glow-edge-rim)),inset_0_10px_16px_-8px_hsl(var(--color-warning-bg)/var(--alpha-glow-edge-bloom)),inset_0_-10px_16px_-8px_hsl(var(--color-warning-bg)/var(--alpha-glow-edge-bloom)),0_0_32px_-4px_hsl(var(--color-warning-bg)/var(--alpha-glow-outer-near)),0_0_80px_4px_hsl(var(--color-warning-bg)/var(--alpha-glow-outer-far))]',
    '[&>td]:!bg-transparent',
    '[&>td:first-child]:relative',
    '[&>td:first-child]:before:content-[""] [&>td:first-child]:before:absolute [&>td:first-child]:before:left-0 [&>td:first-child]:before:top-0 [&>td:first-child]:before:bottom-0 [&>td:first-child]:before:w-[3px] [&>td:first-child]:before:bg-warning-bg [&>td:first-child]:before:pointer-events-none',
    '[&>td:first-child]:before:shadow-[0_0_6px_0_hsl(var(--color-warning-bg)/var(--alpha-glow-bar-strong)),0_0_24px_3px_hsl(var(--color-warning-bg)/var(--alpha-glow-bar-mid)),0_0_72px_10px_hsl(var(--color-warning-bg)/var(--alpha-glow-bar-far))]',
    '[&>td]:font-semibold',
    '[&>td]:[text-shadow:0_0_5px_color-mix(in_srgb,currentColor_35%,transparent)]',
  ].join(' '),
  danger: [
    '[background-image:repeating-linear-gradient(to_bottom,hsl(var(--scanline))_0,hsl(var(--scanline))_1px,transparent_1px,transparent_3px),linear-gradient(180deg,hsl(var(--color-danger-bg)/var(--alpha-glow-tint)),hsl(var(--color-danger-bg)/var(--alpha-glow-tint))),linear-gradient(90deg,hsl(var(--color-danger-bg)/var(--alpha-glow-wash-1))_0%,hsl(var(--color-danger-bg)/var(--alpha-glow-wash-2))_18%,hsl(var(--color-danger-bg)/var(--alpha-glow-wash-3))_48%,hsl(var(--color-danger-bg)/var(--alpha-glow-wash-4))_78%,hsl(var(--color-danger-bg)/0)_100%)]',
    'shadow-[inset_3px_0_0_0_hsl(var(--color-danger-bg)),inset_14px_0_36px_-10px_hsl(var(--color-danger-bg)/var(--alpha-glow-edge-inner)),inset_0_1px_0_hsl(var(--color-danger-bg)/var(--alpha-glow-edge-rim)),inset_0_-1px_0_hsl(var(--color-danger-bg)/var(--alpha-glow-edge-rim)),inset_0_10px_16px_-8px_hsl(var(--color-danger-bg)/var(--alpha-glow-edge-bloom)),inset_0_-10px_16px_-8px_hsl(var(--color-danger-bg)/var(--alpha-glow-edge-bloom)),0_0_32px_-4px_hsl(var(--color-danger-bg)/var(--alpha-glow-outer-near)),0_0_80px_4px_hsl(var(--color-danger-bg)/var(--alpha-glow-outer-far))]',
    '[&>td]:!bg-transparent',
    '[&>td:first-child]:relative',
    '[&>td:first-child]:before:content-[""] [&>td:first-child]:before:absolute [&>td:first-child]:before:left-0 [&>td:first-child]:before:top-0 [&>td:first-child]:before:bottom-0 [&>td:first-child]:before:w-[3px] [&>td:first-child]:before:bg-danger-bg [&>td:first-child]:before:pointer-events-none',
    '[&>td:first-child]:before:shadow-[0_0_6px_0_hsl(var(--color-danger-bg)/var(--alpha-glow-bar-strong)),0_0_24px_3px_hsl(var(--color-danger-bg)/var(--alpha-glow-bar-mid)),0_0_72px_10px_hsl(var(--color-danger-bg)/var(--alpha-glow-bar-far))]',
    '[&>td]:font-semibold',
    '[&>td]:[text-shadow:0_0_5px_color-mix(in_srgb,currentColor_35%,transparent)]',
  ].join(' '),
};

const CHECKBOX_CELL_OVERRIDE = '!px-3 text-center w-10';

// Primary glowing end-cap for the header/body divider (mirrors NubDivider's primary nub).
const HEADER_NUB =
  'pointer-events-none absolute bottom-0 z-10 h-0.5 w-0.5 translate-y-1/2 bg-primary dark:shadow-[0_0_6px_1px_hsl(var(--primary)/0.7)]';

// Warm, opaque header surface ported from the settings subsection header. `lit` adds the
// top-left → bottom-right directional glow; only the topmost bar gets it (the toolbar when
// present, else the column-header row) so the light reads once across the top, not twice.
const HEADER_SHEEN = 'linear-gradient(180deg, hsl(var(--foreground) / 0.025) 0%, transparent 35%)';
const HEADER_GLOW = [
  'radial-gradient(ellipse 65% 120% at 0% 0%, hsl(var(--foreground) / 0.05), transparent 60%)',
  'radial-gradient(ellipse 60% 120% at 100% 100%, hsl(var(--foreground) / 0.035), transparent 70%)',
];
const HEADER_BASE = 'color-mix(in srgb, hsl(var(--card)) 85%, black)';
const HEADER_TOP_EDGE = 'inset 0 1px 0 hsl(var(--foreground) / var(--alpha-header-rim))';
const headerSurface = (lit: boolean): string =>
  [HEADER_SHEEN, ...(lit ? HEADER_GLOW : []), HEADER_BASE].join(', ');

const TableContext = createContext<TableContextValue | null>(null);

const useTableContext = () => {
  const context = useContext(TableContext);
  if (!context) {
    throw new Error('Table components must be used within a Table');
  }
  return context;
};

const headerVariants = cva(
  [
    'font-mono uppercase tracking-[0.22em] text-[9.5px] font-normal',
    'text-left text-foreground/60',
    'py-3.5 pr-[18px] pl-0 first:pl-[14px]',
  ],
  {
    variants: {
      sortable: {
        true: 'cursor-pointer hover:text-foreground select-none',
        false: '',
      },
      sticky: {
        true: 'sticky top-0 z-10',
        false: '',
      },
      align: {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
      },
      density: {
        compact: 'py-2',
        default: 'py-3',
      },
    },
    defaultVariants: {
      sortable: false,
      sticky: false,
      align: 'left',
      density: 'default',
    },
  }
);

const cellVariants = cva(
  [
    'pr-[18px] pl-0 text-sm font-mono text-foreground align-middle',
    'first:pl-[14px]',
    'group-hover:bg-[hsl(var(--foreground)/var(--alpha-hover))]',
    'group-hover:[text-shadow:0_0_5px_color-mix(in_srgb,currentColor_30%,transparent)]',
  ],
  {
    variants: {
      align: {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
      },
      density: {
        compact: 'py-2',
        default: 'py-3',
      },
    },
    defaultVariants: {
      align: 'left',
      density: 'default',
    },
  }
);

const rowVariants = cva([''], {
  variants: {
    hoverable: {
      true: 'group',
      false: '',
    },
    clickable: {
      true: 'cursor-pointer',
      false: '',
    },
  },
  defaultVariants: {
    hoverable: false,
    clickable: false,
  },
});

// Text styling per row state. Applies whenever state !== 'default', independent of selection.
const STATE_TEXT: Record<RowState, string> = {
  default: '',
  success: 'text-success-text phosphor-text',
  warning: 'text-warning-text phosphor-text',
  danger: 'text-danger-text phosphor-text',
  muted: 'text-foreground/60',
};

// CRT phosphor: 1px cream hairlines top + bottom of every row + soft inset bloom.
// Reads as "the screen is on" — applied to all rows except those displaying the full selection glow.
const PHOSPHOR_ROW =
  'shadow-[inset_0_1px_0_hsl(var(--foreground)/var(--alpha-phosphor-rim)),inset_0_8px_10px_-8px_hsl(var(--foreground)/var(--alpha-phosphor-bloom)),inset_0_-1px_0_hsl(var(--foreground)/var(--alpha-phosphor-rim)),inset_0_-8px_10px_-8px_hsl(var(--foreground)/var(--alpha-phosphor-bloom))]';

// Hover preview of the selection glow at ~40% intensity. Mirrors ROW_GLOW structure
// (directional wash + full 8-layer shadow) with halved alphas, plus suppresses the cell bg tint
// so no gray stacks under the glow. Tone matches the row's state — success rows get a dim-success
// hover, default rows get a dim-primary hover. Reads as "this row is about to be selected".
const HOVER_GLOW: Record<GlowTone, string> = {
  primary: [
    'hover:[background-image:repeating-linear-gradient(to_bottom,hsl(var(--scanline))_0,hsl(var(--scanline))_1px,transparent_1px,transparent_3px),linear-gradient(90deg,hsl(var(--primary)/var(--alpha-hover-wash-1))_0%,hsl(var(--primary)/var(--alpha-hover-wash-2))_18%,hsl(var(--primary)/var(--alpha-hover-wash-3))_48%,hsl(var(--primary)/var(--alpha-hover-wash-4))_78%,hsl(var(--primary)/0)_100%)]',
    'hover:shadow-[inset_3px_0_0_0_hsl(var(--primary)/var(--alpha-hover-stripe)),inset_14px_0_36px_-10px_hsl(var(--primary)/var(--alpha-hover-edge)),inset_0_1px_0_hsl(var(--primary)/var(--alpha-hover-rim)),inset_0_-1px_0_hsl(var(--primary)/var(--alpha-hover-rim)),inset_0_10px_16px_-8px_hsl(var(--primary)/var(--alpha-hover-bloom-edge)),inset_0_-10px_16px_-8px_hsl(var(--primary)/var(--alpha-hover-bloom-edge)),0_0_22px_-4px_hsl(var(--primary)/var(--alpha-hover-bloom)),0_0_50px_4px_hsl(var(--primary)/var(--alpha-hover-bloom-far))]',
    '[&:hover>td]:!bg-transparent',
  ].join(' '),
  success: [
    'hover:[background-image:repeating-linear-gradient(to_bottom,hsl(var(--scanline))_0,hsl(var(--scanline))_1px,transparent_1px,transparent_3px),linear-gradient(90deg,hsl(var(--color-success-bg)/var(--alpha-hover-wash-1))_0%,hsl(var(--color-success-bg)/var(--alpha-hover-wash-2))_18%,hsl(var(--color-success-bg)/var(--alpha-hover-wash-3))_48%,hsl(var(--color-success-bg)/var(--alpha-hover-wash-4))_78%,hsl(var(--color-success-bg)/0)_100%)]',
    'hover:shadow-[inset_3px_0_0_0_hsl(var(--color-success-bg)/var(--alpha-hover-stripe)),inset_14px_0_36px_-10px_hsl(var(--color-success-bg)/var(--alpha-hover-edge)),inset_0_1px_0_hsl(var(--color-success-bg)/var(--alpha-hover-rim)),inset_0_-1px_0_hsl(var(--color-success-bg)/var(--alpha-hover-rim)),inset_0_10px_16px_-8px_hsl(var(--color-success-bg)/var(--alpha-hover-bloom-edge)),inset_0_-10px_16px_-8px_hsl(var(--color-success-bg)/var(--alpha-hover-bloom-edge)),0_0_22px_-4px_hsl(var(--color-success-bg)/var(--alpha-hover-bloom)),0_0_50px_4px_hsl(var(--color-success-bg)/var(--alpha-hover-bloom-far))]',
    '[&:hover>td]:!bg-transparent',
  ].join(' '),
  warning: [
    'hover:[background-image:repeating-linear-gradient(to_bottom,hsl(var(--scanline))_0,hsl(var(--scanline))_1px,transparent_1px,transparent_3px),linear-gradient(90deg,hsl(var(--color-warning-bg)/var(--alpha-hover-wash-1))_0%,hsl(var(--color-warning-bg)/var(--alpha-hover-wash-2))_18%,hsl(var(--color-warning-bg)/var(--alpha-hover-wash-3))_48%,hsl(var(--color-warning-bg)/var(--alpha-hover-wash-4))_78%,hsl(var(--color-warning-bg)/0)_100%)]',
    'hover:shadow-[inset_3px_0_0_0_hsl(var(--color-warning-bg)/var(--alpha-hover-stripe)),inset_14px_0_36px_-10px_hsl(var(--color-warning-bg)/var(--alpha-hover-edge)),inset_0_1px_0_hsl(var(--color-warning-bg)/var(--alpha-hover-rim)),inset_0_-1px_0_hsl(var(--color-warning-bg)/var(--alpha-hover-rim)),inset_0_10px_16px_-8px_hsl(var(--color-warning-bg)/var(--alpha-hover-bloom-edge)),inset_0_-10px_16px_-8px_hsl(var(--color-warning-bg)/var(--alpha-hover-bloom-edge)),0_0_22px_-4px_hsl(var(--color-warning-bg)/var(--alpha-hover-bloom)),0_0_50px_4px_hsl(var(--color-warning-bg)/var(--alpha-hover-bloom-far))]',
    '[&:hover>td]:!bg-transparent',
  ].join(' '),
  danger: [
    'hover:[background-image:repeating-linear-gradient(to_bottom,hsl(var(--scanline))_0,hsl(var(--scanline))_1px,transparent_1px,transparent_3px),linear-gradient(90deg,hsl(var(--color-danger-bg)/var(--alpha-hover-wash-1))_0%,hsl(var(--color-danger-bg)/var(--alpha-hover-wash-2))_18%,hsl(var(--color-danger-bg)/var(--alpha-hover-wash-3))_48%,hsl(var(--color-danger-bg)/var(--alpha-hover-wash-4))_78%,hsl(var(--color-danger-bg)/0)_100%)]',
    'hover:shadow-[inset_3px_0_0_0_hsl(var(--color-danger-bg)/var(--alpha-hover-stripe)),inset_14px_0_36px_-10px_hsl(var(--color-danger-bg)/var(--alpha-hover-edge)),inset_0_1px_0_hsl(var(--color-danger-bg)/var(--alpha-hover-rim)),inset_0_-1px_0_hsl(var(--color-danger-bg)/var(--alpha-hover-rim)),inset_0_10px_16px_-8px_hsl(var(--color-danger-bg)/var(--alpha-hover-bloom-edge)),inset_0_-10px_16px_-8px_hsl(var(--color-danger-bg)/var(--alpha-hover-bloom-edge)),0_0_22px_-4px_hsl(var(--color-danger-bg)/var(--alpha-hover-bloom)),0_0_50px_4px_hsl(var(--color-danger-bg)/var(--alpha-hover-bloom-far))]',
    '[&:hover>td]:!bg-transparent',
  ].join(' '),
};

// Leading 3px stripe per row state. Shown when row is selected (without glow) or has a non-default state.
// Strings are literal so Tailwind JIT can see them.
const STATE_STRIPE: Record<RowState, string> = {
  default: '[&>td:first-child]:shadow-[inset_3px_0_0_0_hsl(var(--primary))]',
  success: '[&>td:first-child]:shadow-[inset_3px_0_0_0_hsl(var(--color-success-bg))]',
  warning: '[&>td:first-child]:shadow-[inset_3px_0_0_0_hsl(var(--color-warning-bg))]',
  danger: '[&>td:first-child]:shadow-[inset_3px_0_0_0_hsl(var(--color-danger-bg))]',
  muted:
    '[&>td:first-child]:shadow-[inset_3px_0_0_0_hsl(var(--foreground)/var(--alpha-stripe-muted))]',
};

interface SortIndicatorProps {
  direction?: 'asc' | 'desc';
}

const SortIndicator: React.FC<SortIndicatorProps> = ({ direction }) => (
  <svg
    className="ml-2 w-3.5 h-3.5 shrink-0 inline-block"
    viewBox="0 0 14 14"
    fill="none"
    strokeWidth="1.5"
  >
    <path
      d="M5 4.5L7 2.5l2 2"
      stroke="currentColor"
      className={
        direction === 'asc' ? 'text-primary' : direction === 'desc' ? 'opacity-20' : 'opacity-40'
      }
    />
    <path
      d="M5 9.5L7 11.5l2-2"
      stroke="currentColor"
      className={
        direction === 'desc' ? 'text-primary' : direction === 'asc' ? 'opacity-20' : 'opacity-40'
      }
    />
  </svg>
);

const TableHeader = <T,>({
  columns,
  hasToolbar,
}: {
  columns: TableColumn<T>[];
  hasToolbar: boolean;
}) => {
  const {
    selectable,
    multiSelect,
    selectedRows,
    allRowIds,
    onSelectionChange,
    sortConfig,
    onSort,
    density,
  } = useTableContext();

  // Header cells carry a top rim; soften it when a toolbar sits above so the divider isn't harsh.
  const headerRim = hasToolbar
    ? 'shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)]'
    : 'shadow-[inset_0_1px_0_hsl(var(--foreground)/var(--alpha-header-rim))]';

  const handleSelectAll = (checked: boolean) => {
    onSelectionChange(checked ? allRowIds : []);
  };

  const handleSort = (columnId: string) => {
    if (!onSort) return;
    const newDirection =
      sortConfig?.columnId === columnId && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    onSort({ columnId, direction: newDirection });
  };

  return (
    <thead>
      <tr
        className="relative z-10 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:content-[''] after:bg-primary/30 dark:after:shadow-[0_0_8px_hsl(var(--primary)/0.45)]"
        style={{ background: headerSurface(!hasToolbar) }}
      >
        {selectable && (
          <th
            className={`relative ${headerVariants({ density })} ${headerRim} ${CHECKBOX_CELL_OVERRIDE}`}
          >
            <span aria-hidden className={`${HEADER_NUB} left-0`} />
            {multiSelect && (
              <Checkbox
                checked={selectedRows.length > 0}
                indeterminate={selectedRows.length > 0 && selectedRows.length < allRowIds.length}
                onChange={handleSelectAll}
                aria-label="Select all rows"
              />
            )}
          </th>
        )}

        {columns.map((column, colIndex) => {
          const isSorted = sortConfig?.columnId === column.id;
          const sortDirection = isSorted ? sortConfig.direction : undefined;
          const isFirstCell = colIndex === 0 && !selectable;
          const isLastCell = colIndex === columns.length - 1;

          return (
            <th
              key={column.id}
              className={`${headerVariants({
                sortable: column.sortable,
                align: column.align,
                density,
              })} ${headerRim}${isFirstCell || isLastCell ? ' relative' : ''}`}
              style={{ width: column.width }}
              onClick={column.sortable ? () => handleSort(column.id) : undefined}
              role={column.sortable ? 'columnheader button' : 'columnheader'}
              aria-sort={
                isSorted
                  ? sortDirection === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : column.sortable
                    ? 'none'
                    : undefined
              }
            >
              {isFirstCell && <span aria-hidden className={`${HEADER_NUB} left-0`} />}
              {isLastCell && <span aria-hidden className={`${HEADER_NUB} right-0`} />}
              <div className="flex items-center">
                {column.header}
                {column.sortable && <SortIndicator direction={sortDirection} />}
              </div>
            </th>
          );
        })}
      </tr>
    </thead>
  );
};

const TableBody = <T extends TableRowBase>({
  columns,
  data,
  hoverable,
  onRowClick,
  rowState,
  selectedRowGlow,
}: {
  columns: TableColumn<T>[];
  data: T[];
  hoverable: boolean;
  onRowClick?: (row: T, index: number) => void;
  rowState?: (row: T, index: number) => RowState;
  selectedRowGlow?: boolean;
}) => {
  const { selectable, selectedRows, onSelectionChange, density } = useTableContext();

  const handleRowSelect = (rowId: string | number, checked: boolean) => {
    const newSelection = checked
      ? [...selectedRows, rowId]
      : selectedRows.filter(id => id !== rowId);
    onSelectionChange(newSelection);
  };

  const getCellValue = (column: TableColumn<T>, row: T, index: number): React.ReactNode => {
    if (column.render) {
      return column.render(
        column.accessor
          ? typeof column.accessor === 'function'
            ? column.accessor(row)
            : row[column.accessor]
          : undefined,
        row,
        index
      );
    }

    if (column.accessor) {
      const value =
        typeof column.accessor === 'function' ? column.accessor(row) : row[column.accessor];
      return value as React.ReactNode;
    }

    return null;
  };

  return (
    <tbody>
      {data.map((row, index) => {
        const isSelected = selectedRows.includes(row.id);
        const state = rowState?.(row, index) ?? 'default';
        const zebra =
          index % 2 === 0 ? '[&>td]:bg-[hsl(var(--foreground)/var(--alpha-zebra))]' : '';
        const glow = selectedRowGlow && isSelected ? ROW_GLOW[stateToGlowTone(state)] : '';
        const stripe = !glow && (isSelected || state !== 'default') ? STATE_STRIPE[state] : '';
        const text = STATE_TEXT[state];
        const phosphor = !glow ? PHOSPHOR_ROW : '';
        // Hover previews the row's own tone (primary/success/warning/danger); muted rows skip it
        // since there is no muted glow recipe.
        const hover =
          hoverable && !isSelected && state !== 'muted' ? HOVER_GLOW[stateToGlowTone(state)] : '';

        return (
          <tr
            key={row.id}
            className={`${rowVariants({
              hoverable,
              clickable: Boolean(onRowClick),
            })} ${phosphor} ${zebra} ${stripe} ${text} ${glow} ${hover}`}
            onClick={onRowClick ? () => onRowClick(row, index) : undefined}
          >
            {selectable && (
              <td className={`${cellVariants({ density })} ${CHECKBOX_CELL_OVERRIDE}`}>
                <Checkbox
                  checked={isSelected}
                  onChange={checked => handleRowSelect(row.id, checked)}
                  aria-label={`Select row ${index + 1}`}
                  tone={state === 'success' ? 'success' : 'primary'}
                />
              </td>
            )}

            {columns.map(column => (
              <td
                key={column.id}
                className={cellVariants({ align: column.align, density })}
                style={{ width: column.width }}
              >
                {getCellValue(column, row, index)}
              </td>
            ))}
          </tr>
        );
      })}
    </tbody>
  );
};

export function Table<T extends TableRowBase>({
  columns,
  data,
  sortable = defaultTableProps.sortable,
  selectable = defaultTableProps.selectable,
  multiSelect = defaultTableProps.multiSelect,
  hoverable = defaultTableProps.hoverable,
  selectedRows = defaultTableProps.selectedRows,
  sortConfig,
  loading = defaultTableProps.loading,
  density = defaultTableProps.density,
  stickyHeader = defaultTableProps.stickyHeader,
  onSort,
  onSelectionChange = () => {},
  onRowClick,
  emptyMessage = defaultTableProps.emptyMessage,
  loadingMessage = defaultTableProps.loadingMessage,
  'aria-label': ariaLabel,
  className,
  rowState,
  selectedRowGlow,
  toolbar,
  chassis = defaultTableProps.chassis,
}: TableProps<T>) {
  const contextValue: TableContextValue = {
    selectable: selectable!,
    multiSelect: multiSelect!,
    selectedRows: selectedRows!,
    allRowIds: data.map(row => row.id),
    onSelectionChange,
    sortConfig,
    onSort: sortable ? onSort : undefined,
    density: density!,
  };

  const body = loading ? (
    <div className="flex items-center justify-center py-8">
      <div className="text-muted-foreground">{loadingMessage}</div>
    </div>
  ) : data.length === 0 ? (
    <div className="flex items-center justify-center py-8">
      <div className="text-muted-foreground">{emptyMessage}</div>
    </div>
  ) : (
    <TableContext.Provider value={contextValue}>
      <table
        className={`w-full border-collapse ${className ?? ''}`}
        role="table"
        aria-label={ariaLabel}
      >
        <TableHeader columns={columns} hasToolbar={Boolean(toolbar)} />
        <TableBody
          columns={columns}
          data={data}
          hoverable={hoverable!}
          onRowClick={onRowClick}
          rowState={rowState}
          selectedRowGlow={selectedRowGlow}
        />
      </table>
    </TableContext.Provider>
  );

  // Sticky-header consumers need a scrollable wrapper.
  const framedBody = stickyHeader ? <div className="relative overflow-auto">{body}</div> : body;

  if (!chassis) {
    return framedBody;
  }

  // Table-specific chassis: auth-console vocabulary at table intensity.
  // Background carries a continuous top-band wash (cream sheen) that adapts to whether a
  // toolbar is present — toolbar'd tables get a fuller sheen since the toolbar zone absorbs
  // it before the header, while header-only tables get a shorter, lighter sheen so the cream
  // doesn't pile up directly on the header row. Body diagonal lighting stays consistent.
  // Box-shadow edges match auth-modal lift/recess.
  const hasToolbar = Boolean(toolbar);
  const topSheen = hasToolbar
    ? 'linear-gradient(180deg, hsl(var(--primary) / 0.1) 0%, hsl(var(--primary) / 0.03) 10%, transparent 20%)'
    : 'linear-gradient(180deg, hsl(var(--primary) / 0.05) 0%, transparent 9%)';

  return (
    <div
      className="relative"
      style={{
        background: [
          topSheen,
          // body diagonal lighting
          'radial-gradient(ellipse 75% 95% at 100% 100%, hsl(var(--primary) / 0.09), transparent 60%)',
          'radial-gradient(ellipse 90% 80% at 0% 0%, hsl(var(--foreground) / 0.04), transparent 60%)',
          'radial-gradient(ellipse 110% 50% at 50% 100%, hsl(var(--shade) / 0.1), transparent 65%)',
          'hsl(var(--card))',
        ].join(', '),
        boxShadow: [
          'inset 0 1px 0 hsl(var(--sheen) / 0.2)',
          'inset 1px 0 0 hsl(var(--sheen) / 0.05)',
          'inset 0 -1px 0 hsl(var(--shade) / 0.35)',
          'inset -1px 0 0 hsl(var(--shade) / 0.18)',
          '0 0 0 1px hsl(var(--foreground) / 0.06)',
          '0 20px 50px -22px hsl(var(--shade) / 0.65)',
          '0 0 80px -28px hsl(var(--primary) / 0.12)',
        ].join(', '),
      }}
    >
      {toolbar && (
        <div
          className="relative flex items-center gap-3 px-4 py-3"
          style={{
            background: headerSurface(true),
            boxShadow: HEADER_TOP_EDGE,
          }}
        >
          {toolbar.left}
          <div className="flex-1" />
          {toolbar.right}
        </div>
      )}
      {framedBody}
    </div>
  );
}
