import { ROW_HOVER_GLOW } from '@shared/ui/primitives/table/rowGlow';
import {
  TABLE_HEADER_BAND,
  TABLE_HEADER_RULE,
} from '@shared/ui/primitives/table/tableHeaderStyles';

export const MATERIAL_TABLE = 'w-full border-collapse';

export const MATERIAL_HEAD_ROW = `relative ${TABLE_HEADER_BAND} ${TABLE_HEADER_RULE}`;

export const MATERIAL_HEAD_CELL =
  'group/head whitespace-nowrap px-4 py-3 text-left type-label text-label-2xs font-semibold text-primary/80 first:pl-5 dark:text-foreground/80';

export const MATERIAL_CELL =
  'whitespace-nowrap px-4 py-2.5 align-middle font-display text-body-sm tabular-nums text-foreground first:pl-5';

export const materialRowClass = (index: number): string =>
  `group ${ROW_HOVER_GLOW.primary} ${index % 2 ? 'bg-[hsl(var(--foreground)/var(--alpha-zebra))]' : ''}`;

export const MATERIAL_NAME = 'font-semibold';

export const MATERIAL_MUTED = 'text-body-sm text-muted-foreground';

export const MATERIAL_ACTIONS_CELL = 'w-px whitespace-nowrap px-2 text-right';

export const ROW_ACTION = 'opacity-0 focus-visible:opacity-100 group-hover:opacity-100';

export const MATERIAL_WARNING_TEXT = 'text-warning-text';

export const HORIZONTAL_SCROLL = { overflow: { y: 'hidden' } } as const;
