/**
 * CategoryTreePanel tests
 *
 * Guards the parametrization that lets one panel back all three catalogs: the
 * count-noun labels (including in subcategories), the tree id, item rendering,
 * the search-driven expansion, and — the subtle one — the Remove-disable parity
 * between a category (counts subcategory items) and a subcategory (counts only
 * its own items).
 *
 * NavTreeLines (document-scoped SVG geometry) and OverflowMenu (a portalled
 * widget) are stubbed; OverflowMenu becomes plain buttons so disabled state is
 * assertable.
 */

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
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
  { id: 'i1', name: 'P200', categoryId: 'c1s', manufacturer: 'Eppendorf', createdAt: '2020-01-01' },
  { id: 'i3', name: 'Buffer', categoryId: 'c2', manufacturer: 'Sigma', createdAt: '2020-01-01' },
  { id: 'i4', name: 'Agar', categoryId: 'c2', manufacturer: 'BD', createdAt: '2020-01-01' },
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
  isTaxonomyLocked: false,
  sortField: 'name' as const,
  sortDirection: 'asc' as const,
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

  it('force-expands categories holding results while a search is active', () => {
    // The caller narrows the list; the panel opens whatever survived without a click.
    render(<CategoryTreePanel {...baseProps} items={[items[0]]} searchQuery="eppendorf" />);

    expect(screen.getByTestId('item-i1')).toBeInTheDocument();
    expect(screen.queryByText('Reagents')).not.toBeInTheDocument(); // no results, so no row
  });

  it('reports no match when a search narrows the list to nothing', () => {
    render(<CategoryTreePanel {...baseProps} items={[]} searchQuery="zzznomatch" />);
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

  it('withdraws category management from an admin when the demo taxonomy is locked', () => {
    // The lock swaps in a padlock, whose tooltip needs the provider the app root supplies.
    render(
      <TooltipPrimitive.Provider>
        <CategoryTreePanel {...baseProps} isTaxonomyLocked />
      </TooltipPrimitive.Provider>
    );

    expect(screen.queryByRole('button', { name: 'Add Category' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Actions for Pipettes' })).not.toBeInTheDocument();
  });
});
