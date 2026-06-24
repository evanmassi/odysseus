import type { ReactElement } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';

import { BootstrapProvider } from '../../app/contexts/BootstrapContext';

import type { UseAppBootstrapResult } from '@app/bootstrap';

// Test-specific QueryClient with disabled retries and silent logging
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    // TanStack Query v5: logger option removed, use mutationCache/queryCache for error handling if needed
  });

// Mock bootstrap state for testing
const createMockBootstrapState = (
  overrides: Partial<UseAppBootstrapResult> = {}
): UseAppBootstrapResult => ({
  isReady: true,
  isLoading: false,
  isError: false,
  error: null,
  state: 'complete',
  canRetry: false,
  retry: vi.fn(),
  flags: {
    firstTimeSetupRequired: false,
    needsSystemAdmin: false,
  },
  ...overrides,
});

interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  bootstrapState?: Partial<UseAppBootstrapResult>;
}

/**
 * Custom render function that wraps components with all necessary providers
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    queryClient = createTestQueryClient(),
    bootstrapState = {},
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  const mockBootstrapState = createMockBootstrapState(bootstrapState);

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BootstrapProvider value={mockBootstrapState}>{children}</BootstrapProvider>
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
    mockBootstrapState,
  };
}

// Re-export everything from testing-library
export * from '@testing-library/react';
