import type { NameDisplay } from '../../../../utils/formulas/nameDisplay';

export function referenceToneClass({ kind, isDropped }: NameDisplay): string {
  if (kind === 'missing') return 'text-danger-text';
  if (isDropped) return 'text-warning-text line-through';
  if (kind === 'item') return 'font-semibold text-foreground';
  return 'text-primary';
}
