/**
 * CategoryTreePanel tests
 *
 * Guards the parametrization that lets one panel back both equipment and
 * supplies: the injected hidden-status predicate, searchable fields, count-noun
 * labels (including in subcategories), the tree id, item rendering, and — the
 * subtle one — the Remove-disable parity between a category (counts subcategory
 * items) and a subcategory (counts only its own items).
 *
 * NavTreeLines (document-scoped SVG geometry) and OverflowMenu (a portalled
 * widget) are stubbed; OverflowMenu becomes plain buttons so disabled state is
 * assertable.
 */

import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { CategoryTreePanel, type CategoryTreePanelLabels } from './CategoryTreePanel';

vi.mock('../tree-lines', () => ({ NavTreeLines: () => null }));

vi.mock('../../primitives', async importActual => {
  const actual = (await importActual()) as Record<string, unknown>;
  return {
    ...actual,
    OverflowMenu: ({
      items,
      'aria-label': label,
    }: {
      items: Array<{ label: string; disabled?: boolean }>;
      'aria-label'?: string;
    }) => (
      <div role="group" aria-label={label}>
        {items.map(i => (
          <button key={i.label} type="button" disabled={i.disabled}>
            {i.label}
          </button>
        ))}
      </div>
    ),
  };
});

interface TestItem {
  id: string;
  name: string;
  categoryId: string;
  manufacturer?: string;
  createdAt: string;
  status: string;
}

const category = (id: string, name: string, parentId: string | null, sortOrder: number) => ({
  id,
  name,
  parentId,
  sortOrder,
});

const categories = [
  category('c1', 'Pipettes', null, 1),
  category('c1s', 'Single Channel', 'c1', 1),
  category('c1s2', 'Empty Sub', 'c1', 2),
  category('c2', 'Reagents', null, 2),
  category('c3', 'Empty', null, 3),
];

const items: TestItem[] = [
  {
    id: 'i1',
    name: 'P200',
    categoryId: 'c1s',
    manufacturer: 'Eppendorf',
    createdAt: '2020-01-01',
    status: 'active',
  },
  {
    id: 'i2',
    name: 'Old P',
    categoryId: 'c1s',
    manufacturer: 'Gilson',
    createdAt: '2020-01-01',
    status: 'decommissioned',
  },
  {
    id: 'i3',
    name: 'Buffer',
    categoryId: 'c2',
    manufacturer: 'Sigma',
    createdAt: '2020-01-01',
    status: 'active',
  },
  {
    id: 'i4',
    name: 'Agar',
    categoryId: 'c2',
    manufacturer: 'BD',
    createdAt: '2020-01-01',
    status: 'active',
  },
];

const labels: CategoryTreePanelLabels = {
  countNoun: ['unit', 'units'],
  emptyCategories: 'No equipment categories yet.',
  noSearchMatch: 'No equipment matching',
  emptyCategoryBody: 'No equipment',
};

const baseProps = {
  categories,
  items,
  searchQuery: '',
  isAdmin: true,
  sortField: 'name' as const,
  sortDirection: 'asc' as const,
  showHidden: false,
  isHidden: (item: TestItem) => item.status === 'decommissioned',
  getSearchFields: (item: TestItem) => [item.name, item.manufacturer],
  renderItem: (item: TestItem) => <div data-testid={`item-${item.id}`}>{item.name}</div>,
  treeId: 'equipment',
  labels,
  onAddCategory: vi.fn(),
  onAddSubcategory: vi.fn(),
  onRenameCategory: vi.fn(),
  onDeleteCategory: vi.fn(),
};

describe('CategoryTreePanel', () => {
  it('renders top-level categories under the given tree id', () => {
    const { container } = render(<CategoryTreePanel {...baseProps} />);

    expect(screen.getByText('Pipettes')).toBeInTheDocument();
    expect(screen.getByText('Reagents')).toBeInTheDocument();
    expect(container.querySelector('[data-tree-id="equipment"]')).toBeInTheDocument();
  });

  it('renders items via the injected renderItem when a category is expanded', () => {
    render(<CategoryTreePanel {...baseProps} />);
    expect(screen.queryByTestId('item-i3')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Reagents')); // c2 has direct items, no subcategories
    expect(screen.getByTestId('item-i3')).toBeInTheDocument();
    expect(screen.getByTestId('item-i4')).toBeInTheDocument();
  });

  it('hides items matched by isHidden unless showHidden is set', () => {
    const { rerender } = render(<CategoryTreePanel {...baseProps} />);
    fireEvent.click(screen.getByText('Pipettes')); // expand c1 → subcategory sections auto-open

    expect(screen.getByTestId('item-i1')).toBeInTheDocument(); // active
    expect(screen.queryByTestId('item-i2')).not.toBeInTheDocument(); // decommissioned, hidden

    rerender(<CategoryTreePanel {...baseProps} showHidden />);
    expect(screen.getByTestId('item-i2')).toBeInTheDocument();
  });

  it('searches the injected fields and reports no match', () => {
    const { rerender } = render(<CategoryTreePanel {...baseProps} searchQuery="eppendorf" />);
    // Matches i1 by manufacturer (an injected field); c2's items do not match.
    expect(screen.getByTestId('item-i1')).toBeInTheDocument();
    expect(screen.queryByTestId('item-i3')).not.toBeInTheDocument();

    rerender(<CategoryTreePanel {...baseProps} searchQuery="zzznomatch" />);
    expect(screen.getByText(/No equipment matching/)).toBeInTheDocument();
  });

  it('labels counts with the singular/plural noun, in categories and subcategories', () => {
    render(<CategoryTreePanel {...baseProps} />);

    expect(screen.getByText('unit')).toBeInTheDocument(); // c1 = 1
    expect(screen.getAllByText('units').length).toBeGreaterThan(0); // c2 = 2

    // Expanding surfaces the subcategory rows, which must use the same noun.
    fireEvent.click(screen.getByText('Pipettes'));
    expect(screen.getAllByText('unit').length).toBeGreaterThan(1); // c1 + subcategory c1s (each 1)
  });

  it('disables Remove per count-scope parity (category totals subs, subcategory does not)', () => {
    render(<CategoryTreePanel {...baseProps} />);

    // c1 has no direct items but its subcategory does → totalCount > 0 → disabled.
    expect(
      within(screen.getByRole('group', { name: 'Actions for Pipettes' })).getByRole('button', {
        name: 'Remove',
      })
    ).toBeDisabled();

    // c3 is genuinely empty → enabled.
    expect(
      within(screen.getByRole('group', { name: 'Actions for Empty' })).getByRole('button', {
        name: 'Remove',
      })
    ).toBeEnabled();

    fireEvent.click(screen.getByText('Pipettes'));

    // Subcategory with its own items → disabled.
    expect(
      within(screen.getByRole('group', { name: 'Actions for Single Channel' })).getByRole(
        'button',
        {
          name: 'Remove',
        }
      )
    ).toBeDisabled();

    // Empty subcategory → enabled, even though its parent has items elsewhere.
    expect(
      within(screen.getByRole('group', { name: 'Actions for Empty Sub' })).getByRole('button', {
        name: 'Remove',
      })
    ).toBeEnabled();
  });

  it('shows the empty-categories state when there are none', () => {
    render(<CategoryTreePanel {...baseProps} categories={[]} />);
    expect(screen.getByText('No equipment categories yet.')).toBeInTheDocument();
  });
});
