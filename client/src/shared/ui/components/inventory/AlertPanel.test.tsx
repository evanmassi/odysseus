/**
 * AlertPanel tests
 *
 * Guards the shared alert chrome: the zero-alert bail, zero-count suppression, the
 * danger-over-warning tone rule, sorting, the footer slot, and row selection.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { AlertPanel, type AlertCount } from './AlertPanel';

import type { TableColumn } from '../../primitives/table/types';

interface Row {
  id: string;
  name: string;
  remaining: number;
}

const columns: TableColumn<Row>[] = [
  { id: 'name', header: 'Name', sortable: true, render: (_v, row) => <span>{row.name}</span> },
  {
    id: 'remaining',
    header: 'Remaining',
    sortable: true,
    render: (_v, row) => <span>{row.remaining}</span>,
  },
];

const rows: Row[] = [
  { id: 'b', name: 'Beta', remaining: 5 },
  { id: 'a', name: 'Alpha', remaining: 0 },
  { id: 'c', name: 'Gamma', remaining: 2 },
];

function renderPanel(overrides: Partial<React.ComponentProps<typeof AlertPanel<Row>>> = {}) {
  const counts: AlertCount[] = [
    { count: 1, tone: 'danger', label: 'out of stock' },
    { count: 2, tone: 'warning', label: 'low' },
  ];

  return render(
    <AlertPanel
      label="Low Stock Alerts"
      counts={counts}
      columns={columns}
      rows={rows}
      defaultSort={{ columnId: 'remaining', direction: 'asc' }}
      rowTone={row => (row.remaining <= 0 ? 'danger' : 'warning')}
      onSelectItem={vi.fn()}
      ariaLabel="Low stock alerts"
      {...overrides}
    />
  );
}

describe('AlertPanel', () => {
  it('renders nothing when there are no rows', () => {
    const { container } = renderPanel({ rows: [] });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the label and every non-zero count', () => {
    renderPanel();
    expect(screen.getByText('Low Stock Alerts')).toBeInTheDocument();
    expect(screen.getByText('1 out of stock')).toBeInTheDocument();
    expect(screen.getByText('2 low')).toBeInTheDocument();
  });

  it('suppresses zero counts', () => {
    renderPanel({
      counts: [
        { count: 0, tone: 'danger', label: 'out of stock' },
        { count: 3, tone: 'warning', label: 'low' },
      ],
    });
    expect(screen.queryByText(/out of stock/)).not.toBeInTheDocument();
    expect(screen.getByText('3 low')).toBeInTheDocument();
  });

  it('tones the header danger when any danger count is present', () => {
    renderPanel();
    expect(screen.getByText('Low Stock Alerts')).toHaveClass('text-danger-text');
  });

  it('tones the header warning when only warning counts are present', () => {
    renderPanel({
      counts: [
        { count: 0, tone: 'danger', label: 'out of stock' },
        { count: 3, tone: 'warning', label: 'low' },
      ],
    });
    expect(screen.getByText('Low Stock Alerts')).toHaveClass('text-warning-text');
  });

  it('sorts rows by the default sort column', () => {
    renderPanel();
    const cells = screen.getAllByText(/Alpha|Beta|Gamma/);
    expect(cells.map(c => c.textContent)).toEqual(['Alpha', 'Gamma', 'Beta']);
  });

  it('sorts strings alphabetically when sorting by a text column', () => {
    renderPanel({ defaultSort: { columnId: 'name', direction: 'desc' } });
    const cells = screen.getAllByText(/Alpha|Beta|Gamma/);
    expect(cells.map(c => c.textContent)).toEqual(['Gamma', 'Beta', 'Alpha']);
  });

  it('calls onSelectItem with the row id on click', () => {
    const onSelectItem = vi.fn();
    renderPanel({ onSelectItem });
    fireEvent.click(screen.getByText('Alpha'));
    expect(onSelectItem).toHaveBeenCalledWith('a');
  });

  it('renders the footer slot when expanded', () => {
    renderPanel({ footer: <button>View Full Reorder List</button> });
    expect(screen.getByRole('button', { name: 'View Full Reorder List' })).toBeInTheDocument();
  });

  it('collapses on header click, hiding the table and footer', () => {
    renderPanel({ footer: <button>View Full Reorder List</button> });
    fireEvent.click(screen.getByText('Low Stock Alerts'));
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'View Full Reorder List' })
    ).not.toBeInTheDocument();
  });
});
