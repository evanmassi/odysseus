import type { StepDrop } from './useStepDrag';

export function stepRowDragStyle(
  id: string,
  draggingId: string | undefined,
  drop: StepDrop | undefined
): string {
  if (id === draggingId) return 'opacity-35';
  if (drop?.id !== id) return '';
  return drop.isAfter
    ? 'shadow-[inset_0_-2px_0_hsl(var(--primary))]'
    : 'shadow-[inset_0_2px_0_hsl(var(--primary))]';
}
