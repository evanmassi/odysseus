/**
 * ItemRowShell tests
 *
 * Guards the shared row chrome: name + slots, identity-part filtering, the
 * status-tone → stripe/dimmed mapping, and click selection.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { ItemRowShell } from './ItemRowShell';

describe('ItemRowShell', () => {
  it('renders the name, filtered identity parts, and the injected slots', () => {
    render(
      <ItemRowShell
        id="i1"
        isSelected={false}
        onSelect={vi.fn()}
        statusTone="success"
        name="P200"
        identityParts={['Eppendorf', undefined, 'SN 42']} // falsy entry dropped
        badge={<span>DECOMM</span>}
        leadingIcon={<span>icon</span>}
        trailing={<span>chip</span>}
      />
    );

    expect(screen.getByText('P200')).toBeInTheDocument();
    expect(screen.getByText('Eppendorf')).toBeInTheDocument();
    expect(screen.getByText('SN 42')).toBeInTheDocument();
    expect(screen.getByText('DECOMM')).toBeInTheDocument();
    expect(screen.getByText('icon')).toBeInTheDocument();
    expect(screen.getByText('chip')).toBeInTheDocument();
  });

  it('calls onSelect with the id on click', () => {
    const onSelect = vi.fn();
    render(
      <ItemRowShell
        id="i1"
        isSelected={false}
        onSelect={onSelect}
        statusTone="success"
        name="X"
        identityParts={[]}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('i1');
  });

  it('dims muted rows and drives the stripe tone from statusTone', () => {
    const { container, rerender } = render(
      <ItemRowShell
        id="i1"
        isSelected={false}
        onSelect={vi.fn()}
        statusTone="muted"
        name="X"
        identityParts={[]}
      />
    );

    expect(screen.getByRole('button').className).toContain('opacity-50');
    expect(container.querySelector('[aria-hidden]')?.className).toContain('bg-muted-foreground/40');

    rerender(
      <ItemRowShell
        id="i1"
        isSelected={false}
        onSelect={vi.fn()}
        statusTone="danger"
        name="X"
        identityParts={[]}
      />
    );

    expect(screen.getByRole('button').className).not.toContain('opacity-50');
    expect(container.querySelector('[aria-hidden]')?.className).toContain('bg-danger-bg');
  });
});
