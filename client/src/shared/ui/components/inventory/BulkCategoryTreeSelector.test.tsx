import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import {
  BulkCategoryTreeSelector,
  type BulkCategoryTreeSelectorLabels,
} from './BulkCategoryTreeSelector';

vi.mock('../tree-lines', () => ({ NavTreeLines: () => null }));

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
    expect(screen.queryByLabelText('Select Old P')).not.toBeInTheDocument();
    expect(screen.getByText('Eppendorf')).toBeInTheDocument();
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

    const countLabels = Array.from(document.querySelectorAll('.nav-tree-row__count')).map(
      el => el.textContent
    );
    expect(countLabels).toContain('1 unit');
    expect(countLabels).toContain('2 units');
  });
});
