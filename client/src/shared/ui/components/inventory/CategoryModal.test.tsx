/**
 * CategoryModal tests
 *
 * Verifies the shared create/rename dialog drives its injected persistence
 * callbacks and preserves the open-latch prefill behavior. BaseModal (an
 * animated, focus-trapping wrapper tested separately) is stubbed to a plain
 * passthrough so the assertions target this component's own logic.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { CategoryModal } from './CategoryModal';

vi.mock('@shared/utils/notifications', () => ({
  notifications: { success: vi.fn(), error: vi.fn() },
}));

// BaseModal (animated, focus-trapping) and Input (drives a requestAnimationFrame
// state sync) are shared primitives tested on their own; stub them to plain
// passthroughs so the assertions target this component's logic without their
// async internals. Button stays real so the action buttons are exercised.
vi.mock('../overlays', () => ({
  BaseModal: ({
    isOpen,
    title,
    children,
  }: {
    isOpen: boolean;
    title: string;
    children: React.ReactNode;
  }) =>
    isOpen ? (
      <div role="dialog">
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}));

vi.mock('../../primitives', async importActual => {
  const actual = (await importActual()) as Record<string, unknown>;
  return {
    ...actual,
    Input: ({
      id,
      value,
      placeholder,
      onValueChange,
      onKeyDown,
    }: {
      id?: string;
      value: string;
      placeholder?: string;
      onValueChange: (value: string) => void;
      onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    }) => (
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={e => onValueChange(e.target.value)}
        onKeyDown={onKeyDown}
      />
    ),
  };
});

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  onCreate: vi.fn().mockResolvedValue(undefined),
  onRename: vi.fn().mockResolvedValue(undefined),
  isPending: false,
  categoryPlaceholder: 'e.g., Pipettes',
  subcategoryPlaceholder: 'e.g., Single Channel',
};

describe('CategoryModal', () => {
  it('creates a top-level category', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<CategoryModal {...baseProps} onCreate={onCreate} onClose={onClose} />);

    expect(screen.getByText('Add Category')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., Pipettes')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Pipettes' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith('Pipettes', undefined));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('prefills and renames an existing category on open', async () => {
    const onRename = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const category = { id: 'c1', name: 'Old' };
    const { rerender } = render(
      <CategoryModal
        {...baseProps}
        isOpen={false}
        category={category}
        onRename={onRename}
        onClose={onClose}
      />
    );
    // Prefill fires only on the closed→open transition (open-latch).
    rerender(
      <CategoryModal
        {...baseProps}
        isOpen
        category={category}
        onRename={onRename}
        onClose={onClose}
      />
    );

    expect(screen.getByText('Rename Category')).toBeInTheDocument();
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('Old');

    fireEvent.change(input, { target: { value: 'New' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onRename).toHaveBeenCalledWith('c1', 'New'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('creates a subcategory under a parent', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <CategoryModal
        {...baseProps}
        parentId="p1"
        parentName="Pipettes"
        onCreate={onCreate}
        onClose={onClose}
      />
    );

    expect(screen.getByText('Add Subcategory')).toBeInTheDocument();
    expect(screen.getByText('Pipettes')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., Single Channel')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Single Channel' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith('Single Channel', 'p1'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
