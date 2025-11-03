/**
 * Example Test - Verifies testing infrastructure works
 * 
 * This test validates that our testing setup (Vitest + RTL + providers) 
 * is working correctly. Remove this file once real tests are added.
 */

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@testing-library/react';

// Simple component for testing
function TestComponent() {
  return (
    <div>
      <h1>Test Component</h1>
      <button>Click me</button>
    </div>
  );
}

describe('Testing Infrastructure Validation', () => {
  it('should render basic components', () => {
    render(<TestComponent />);
    
    expect(screen.getByText('Test Component')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('should have testing globals available', () => {
    expect(vi).toBeDefined();
    expect(describe).toBeDefined();
    expect(it).toBeDefined();
    expect(expect).toBeDefined();
  });
});
