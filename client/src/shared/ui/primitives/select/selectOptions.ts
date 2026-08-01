/**
 * Select Option Builders
 *
 * Builds option arrays headed by the empty-value row the Select primitive
 * renders as placeholder text.
 */
import { compareByOrderThenName } from '@shared/utils/compareByOrderThenName';

import type { SelectOption } from './types';

interface HierarchyNode {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
}

/** Tree order — each child follows its parent, carrying the tier the Select indents by. */
export function buildHierarchyOptions(nodes: HierarchyNode[]): SelectOption[] {
  const options: SelectOption[] = [];

  const pushTier = (parentId: string | null, depth: number) => {
    nodes
      .filter(node => (node.parentId ?? null) === parentId)
      .sort(compareByOrderThenName)
      .forEach(node => {
        options.push({ value: node.id, label: node.name, depth });
        pushTier(node.id, depth + 1);
      });
  };

  pushTier(null, 0);
  return options;
}

export function withPlaceholder(placeholder: string, options: SelectOption[]): SelectOption[] {
  return [{ value: '', label: placeholder }, ...options];
}

/** Lookup values become self-labeled options (value doubles as the label). */
export function lookupOptions(
  values: ReadonlyArray<{ value: string }>,
  placeholder = 'Select...'
): SelectOption[] {
  return withPlaceholder(
    placeholder,
    values.map(v => ({ value: v.value, label: v.value }))
  );
}
