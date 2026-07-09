/**
 * StripLabel tests
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { StripLabel } from './StripLabel';

describe('StripLabel', () => {
  it('renders its label text', () => {
    render(<StripLabel>Status</StripLabel>);
    expect(screen.getByText('Status')).toBeInTheDocument();
  });
});
