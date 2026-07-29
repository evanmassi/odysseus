/**
 * LowStockAlertPanel tests
 *
 * Guards what the catalogs delegate: the out-of-stock vs low split, the injected
 * unit formatting and column header, and the reorder shortcut.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { LowStockAlertPanel, type LowStockItem } from './LowStockAlertPanel';

interface TestItem extends LowStockItem {
  stockUnit?: string;
}

const items: TestItem[] = [
  { id: 'a', name: 'Alpha', totalStock: 0, manufacturer: 'Acme', stockUnit: 'mL' },
  { id: 'b', name: 'Beta', totalStock: 3, catalogNumber: 'B-9', stockUnit: 'mL' },
  { id: 'c', name: 'Gamma', totalStock: 5, stockUnit: 'mL' },
];

const formatStock = (item: TestItem) => `${item.totalStock} ${item.stockUnit ?? 'unit'}`;

function renderPanel(
  overrides: Partial<React.ComponentProps<typeof LowStockAlertPanel<TestItem>>> = {}
) {
  const onSelectItem = vi.fn();
  const onViewReorderList = vi.fn();
  render(
    <LowStockAlertPanel
      items={items}
      itemHeader="Reagent"
      formatStock={formatStock}
      onSelectItem={onSelectItem}
      onViewReorderList={onViewReorderList}
      {...overrides}
    />
  );
  return { onSelectItem, onViewReorderList };
}

describe('LowStockAlertPanel', () => {
  it('splits the counts into out-of-stock and low', () => {
    renderPanel();
    expect(screen.getByText('1 out of stock')).toBeInTheDocument();
    expect(screen.getByText('2 low')).toBeInTheDocument();
  });

  it('renders nothing when no item is below threshold', () => {
    const { container } = render(
      <LowStockAlertPanel
        items={[]}
        itemHeader="Item"
        formatStock={formatStock}
        onSelectItem={vi.fn()}
        onViewReorderList={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('uses the caller’s header and unit formatting', () => {
    renderPanel();
    expect(screen.getByText('Reagent')).toBeInTheDocument();
    expect(screen.getByText('0 mL')).toBeInTheDocument();
    expect(screen.getByText('3 mL')).toBeInTheDocument();
  });

  it('falls back to a dash for a missing manufacturer or catalog number', () => {
    renderPanel({ items: [items[2]] });
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('reports the clicked row and the reorder shortcut', () => {
    const { onSelectItem, onViewReorderList } = renderPanel();

    fireEvent.click(screen.getByText('Beta'));
    expect(onSelectItem).toHaveBeenCalledWith('b');

    fireEvent.click(screen.getByRole('button', { name: 'View Full Reorder List' }));
    expect(onViewReorderList).toHaveBeenCalled();
  });
});
