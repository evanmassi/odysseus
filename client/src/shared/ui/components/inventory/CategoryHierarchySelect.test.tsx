/**
 * CategoryHierarchySelect tests
 *
 * Verifies the shared dropdown builds the parent → subcategory option hierarchy
 * (sorted, with the parent as each subcategory's description), honors a custom
 * placeholder, and reports the selected id. The Select primitive (a portalled,
 * animated widget tested separately) is stubbed to a native select so the
 * option-building logic — the real consolidation risk — is asserted directly.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { CategoryHierarchySelect } from './CategoryHierarchySelect';

vi.mock('../../primitives', async importActual => {
  const actual = (await importActual()) as Record<string, unknown>;
  return {
    ...actual,
    Select: ({
      options,
      value,
      onChange,
    }: {
      options: Array<{ value: string; label: string; description?: string }>;
      value: string;
      onChange: (value: string) => void;
    }) => (
      <select value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.description ? `${o.description} / ${o.label}` : o.label}
          </option>
        ))}
      </select>
    ),
  };
});

// Intentionally unsorted so the sort-by-order assertion is meaningful.
const categories = [
  { id: 'p2', name: 'Beta', parentId: null, sortOrder: 2 },
  { id: 'p1', name: 'Alpha', parentId: null, sortOrder: 1 },
  { id: 's1', name: 'Alpha Sub', parentId: 'p1', sortOrder: 1 },
];

describe('CategoryHierarchySelect', () => {
  it('builds a sorted parent → subcategory option hierarchy', () => {
    render(
      <CategoryHierarchySelect categories={categories} value="" onChange={vi.fn()} labelId="lbl" />
    );

    expect(screen.getByText('Category')).toBeInTheDocument();
    const options = screen.getAllByRole('option').map(o => o.textContent);
    expect(options).toEqual([
      'Select category...', // default placeholder
      'Alpha', // sortOrder 1, before Beta
      'Alpha / Alpha Sub', // subcategory indented under its parent, parent as description
      'Beta',
    ]);
  });

  it('honors a custom placeholder', () => {
    render(
      <CategoryHierarchySelect
        categories={categories}
        value=""
        onChange={vi.fn()}
        labelId="lbl"
        placeholder="Select target category..."
      />
    );

    expect(screen.getByRole('option', { name: 'Select target category...' })).toBeInTheDocument();
  });

  it('reports the selected category id', () => {
    const onChange = vi.fn();
    render(
      <CategoryHierarchySelect categories={categories} value="" onChange={onChange} labelId="lbl" />
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'p1' } });
    expect(onChange).toHaveBeenCalledWith('p1');
  });
});
