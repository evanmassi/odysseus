/**
 * BulkCategoryTreeSelector tests
 *
 * Guards the parametrization shared by the equipment and supplies bulk modals:
 * the injected selectability predicate, secondary text, count-noun labels, and
 * the controlled search — plus the selection-set math (item / category / all).
 *
 * BulkSelectTreeLines (SVG geometry) is stubbed to null; Checkbox and SearchInput
 * become plain inputs so clicks and the selection set are assertable.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import {
  BulkCategoryTreeSelector,
  type BulkCategoryTreeSelectorLabels,
} from './BulkCategoryTreeSelector';

vi.mock('../tree-lines', () => ({ BulkSelectTreeLines: () => null }));

vi.mock('../../primitives', async importActual => {
  const actual = (await importActual()) as Record<string, unknown>;
  return {
    ...actual,
    Checkbox: ({
      checked,
      onChange,
      'aria-label': label,
    }: {
      checked: boolean;
      onChange: () => void;
      'aria-label'?: string;
    }) => (
      <input type="checkbox" checked={checked} onChange={() => onChange()} aria-label={label} />
    ),
    SearchInput: ({
      value,
      onChange,
      placeholder,
      'aria-label': label,
    }: {
      value: string;
      onChange: (value: string) => void;
      placeholder?: string;
      'aria-label'?: string;
    }) => (
      <input
        value={value}
        placeholder={placeholder}
        aria-label={label}
        onChange={e => onChange(e.target.value)}
      />
    ),
  };
});

interface TestItem {
  id: string;
  name: string;
  categoryId: string;
  manufacturer?: string;
  status: string;
}

const categories = [
  { id: 'c1', name: 'Pipettes', parentId: null, sortOrder: 1 },
  { id: 'c1s', name: 'Single Channel', parentId: 'c1', sortOrder: 1 },
  { id: 'c2', name: 'Reagents', parentId: null, sortOrder: 2 },
];

const items: TestItem[] = [
  { id: 'i1', name: 'P200', categoryId: 'c1', manufacturer: 'Eppendorf', status: 'active' },
  { id: 'i2', name: 'Old P', categoryId: 'c1', manufacturer: 'Gilson', status: 'decommissioned' },
  { id: 'i3', name: 'Tips', categoryId: 'c1s', manufacturer: 'Rainin', status: 'active' },
  { id: 'i4', name: 'Buffer', categoryId: 'c2', manufacturer: 'Sigma', status: 'active' },
];

const labels: BulkCategoryTreeSelectorLabels = {
  countNoun: ['unit', 'units'],
  filterPlaceholder: 'Filter equipment…',
  filterAriaLabel: 'Filter equipment',
  selectAllLabel: 'All Equipment',
  selectAllAriaLabel: 'Select all equipment',
  noMatch: 'No equipment matching',
};

const baseProps = {
  items,
  categories,
  selectedIds: new Set<string>(),
  onSelectionChange: vi.fn(),
  searchQuery: '',
  onSearchChange: vi.fn(),
  isSelectable: (item: TestItem) => item.status === 'active',
  getSecondaryText: (item: TestItem) => [item.manufacturer],
  labels,
};

describe('BulkCategoryTreeSelector', () => {
  it('shows only selectable items and their secondary text', () => {
    render(<BulkCategoryTreeSelector {...baseProps} />);

    expect(screen.getByLabelText('Select P200')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Tips')).toBeInTheDocument();
    expect(screen.queryByLabelText('Select Old P')).not.toBeInTheDocument(); // decommissioned
    expect(screen.getByText('Eppendorf')).toBeInTheDocument(); // injected secondary text
  });

  it('toggles a single item', () => {
    const onSelectionChange = vi.fn();
    render(<BulkCategoryTreeSelector {...baseProps} onSelectionChange={onSelectionChange} />);

    fireEvent.click(screen.getByLabelText('Select P200'));
    expect(onSelectionChange).toHaveBeenCalledWith(new Set(['i1']));
  });

  it('selects every selectable item via select-all', () => {
    const onSelectionChange = vi.fn();
    render(<BulkCategoryTreeSelector {...baseProps} onSelectionChange={onSelectionChange} />);

    fireEvent.click(screen.getByLabelText('Select all equipment'));
    expect(onSelectionChange).toHaveBeenCalledWith(new Set(['i1', 'i3', 'i4']));
  });

  it('selects a category including its subcategory items', () => {
    const onSelectionChange = vi.fn();
    render(<BulkCategoryTreeSelector {...baseProps} onSelectionChange={onSelectionChange} />);

    // c1 has direct item i1 and subcategory (c1s) item i3.
    fireEvent.click(screen.getByLabelText('Select all in Pipettes'));
    expect(onSelectionChange).toHaveBeenCalledWith(new Set(['i1', 'i3']));
  });

  it('filters by the controlled search and reports it upward + shows no-match', () => {
    const onSearchChange = vi.fn();
    const { rerender } = render(
      <BulkCategoryTreeSelector
        {...baseProps}
        searchQuery="eppendorf"
        onSearchChange={onSearchChange}
      />
    );
    expect(screen.getByLabelText('Select P200')).toBeInTheDocument();
    expect(screen.queryByLabelText('Select Buffer')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filter equipment'), { target: { value: 'x' } });
    expect(onSearchChange).toHaveBeenCalledWith('x');

    rerender(<BulkCategoryTreeSelector {...baseProps} searchQuery="zzznomatch" />);
    expect(screen.getByText(/No equipment matching/)).toBeInTheDocument();
  });

  it('labels counts with the injected singular/plural noun', () => {
    render(<BulkCategoryTreeSelector {...baseProps} />);

    expect(screen.getAllByText('1 unit').length).toBeGreaterThan(0); // c2 + subcategory c1s (noun threads down)
    expect(screen.getByText('2 units')).toBeInTheDocument(); // c1 = 2 (direct i1 + subcategory i3)
  });
});
