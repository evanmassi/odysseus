/**
 * InfoPanelEmpty tests
 *
 * Verifies the shared empty-state panel renders its injected title, icons,
 * message, and strip label — the per-domain props that back the equipment,
 * supplies, and donor panels.
 */

import { render, screen } from '@testing-library/react';
import { BookUser, Microscope, Package } from 'lucide-react';
import { describe, it, expect } from 'vitest';

import { InfoPanelEmpty } from './InfoPanelEmpty';

describe('InfoPanelEmpty', () => {
  it('renders the equipment configuration', () => {
    render(
      <InfoPanelEmpty
        title="Equipment Information"
        emptyIcon={Microscope}
        emptyMessage="Select equipment to view details"
      />
    );

    expect(screen.getByText('Equipment Information')).toBeInTheDocument();
    expect(screen.getByText('Select equipment to view details')).toBeInTheDocument();
  });

  it('renders the supplies configuration', () => {
    render(
      <InfoPanelEmpty
        title="Supply Information"
        emptyIcon={Package}
        emptyMessage="Select an item to view details"
      />
    );

    expect(screen.getByText('Supply Information')).toBeInTheDocument();
    expect(screen.getByText('Select an item to view details')).toBeInTheDocument();
  });

  it('renders the donor configuration with a custom strip label', () => {
    render(
      <InfoPanelEmpty
        title="Donor Information"
        headerIcon={BookUser}
        stripLabel="Collections"
        emptyIcon={BookUser}
        emptyMessage="Select a donor to view details"
      />
    );

    expect(screen.getByText('Donor Information')).toBeInTheDocument();
    expect(screen.getByText('Collections')).toBeInTheDocument();
    expect(screen.getByText('Select a donor to view details')).toBeInTheDocument();
  });

  it('defaults the strip label to "Status"', () => {
    render(
      <InfoPanelEmpty title="Equipment Information" emptyIcon={Microscope} emptyMessage="…" />
    );

    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
