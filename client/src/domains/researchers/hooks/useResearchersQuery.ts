/**
 * React Query hooks for researcher data management
 * Provides type-safe server state management with automatic caching and invalidation
 */

import {
  type Researcher,
  type AdminResearcher,
  type CreateResearcherProfile,
  type UpdateResearcherProfile,
  formatResearcherDropdownDisplay,
  formatResearcherListDisplay,
  sortResearchers
} from '@odysseus/shared-schemas';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

import { DOMAIN_QUERY_OPTIONS } from '@app/queryClient';
import { queryKeys } from '@app/queryKeys';

import { ResearcherService } from '../services/ResearcherService';

import type { UseQueryOptions } from '@tanstack/react-query';


/**
 * Hook to fetch all researchers (basic data only)
 * Use this for dropdowns, forms, and general display
 */
export function useResearchersQuery(options?: {
  filters?: { active?: boolean; search?: string };
  queryOptions?: Omit<UseQueryOptions<Researcher[]>, 'queryKey' | 'queryFn'>;
}) {
  const { filters, queryOptions } = options ?? {};

  return useQuery({
    queryKey: queryKeys.researchers.list(filters),
    queryFn: async (): Promise<Researcher[]> => {
      const researchers = await ResearcherService.list({ filters });
      return researchers.sort(sortResearchers);
    },
    ...DOMAIN_QUERY_OPTIONS.researchers,
    ...queryOptions
  });
}

/**
 * Hook to fetch all researchers with admin metadata
 * Use this for admin UI that needs tubeCount, linkedUserId, linkedUsername
 */
export function useAdminResearchersQuery(options?: {
  filters?: { active?: boolean; search?: string };
  queryOptions?: Omit<UseQueryOptions<AdminResearcher[]>, 'queryKey' | 'queryFn'>;
}) {
  const { filters, queryOptions } = options ?? {};

  return useQuery({
    queryKey: queryKeys.researchers.admin(filters),
    queryFn: async (): Promise<AdminResearcher[]> => {
      const researchers = await ResearcherService.list({ admin: true, filters });
      return researchers.sort(sortResearchers);
    },
    ...DOMAIN_QUERY_OPTIONS.researchers,
    ...queryOptions
  });
}

/**
 * Hook to fetch a single researcher by ID
 */
export function useResearcherQuery(researcherId: string, options?: {
  queryOptions?: Omit<UseQueryOptions<AdminResearcher>, 'queryKey' | 'queryFn'>;
}) {
  return useQuery({
    queryKey: queryKeys.researchers.detail(researcherId),
    queryFn: () => ResearcherService.get(researcherId),
    staleTime: 10 * 60 * 1000,
    enabled: !!researcherId,
    ...options?.queryOptions
  });
}

/**
 * Hook for creating a new researcher
 * Uses profile-only schema - separates profile data from auth/permissions
 */
export function useCreateResearcherMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (researcherData: CreateResearcherProfile) => ResearcherService.create(researcherData),
    onSuccess: (newResearcher) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.researchers.all });
      toast.success(`Researcher "${formatResearcherDropdownDisplay(newResearcher)}" created successfully`);
    },
    onError: (error: any) => {
      toast.error(`Failed to create researcher: ${error.message || 'Unknown error'}`);
    }
  });
}

/**
 * Hook for updating an existing researcher
 * Uses profile-only schema - separates profile data from auth/permissions
 */
export function useUpdateResearcherMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateResearcherProfile }) =>
      ResearcherService.update(id, data),
    onSuccess: (updatedResearcher, variables) => {
      queryClient.setQueryData(
        queryKeys.researchers.detail(updatedResearcher.id),
        updatedResearcher
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.researchers.all });

      // Show appropriate success message based on what was updated
      if (variables.data.active !== undefined) {
        const action = variables.data.active ? 'reactivated' : 'deactivated';
        toast.success(`Researcher "${formatResearcherListDisplay(updatedResearcher)}" ${action} successfully`);
      } else {
        toast.success(`Researcher "${formatResearcherListDisplay(updatedResearcher)}" updated successfully`);
      }
    },
    onError: (error: any) => {
      toast.error(`Failed to update researcher: ${error.message || 'Unknown error'}`);
    }
  });
}

/**
 * Hook for deleting a researcher
 */
export function useDeleteResearcherMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (researcherId: string) => ResearcherService.delete(researcherId),
    onSuccess: (_, researcherId) => {
      queryClient.removeQueries({ queryKey: queryKeys.researchers.detail(researcherId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.researchers.all });
      toast.success('Researcher deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete researcher: ${error.message || 'Unknown error'}`);
    }
  });
}


/**
 * Hook to get active researchers only (commonly used in forms)
 *
 * Derives from base list via 'select' to eliminate duplicate API calls.
 * Uses client-side filtering for small-medium datasets.
 */
export function useActiveResearchersQuery(options?: {
  queryOptions?: Omit<UseQueryOptions<Researcher[], Error, Researcher[]>, 'queryKey' | 'queryFn' | 'select'>;
}) {
  return useQuery<Researcher[], Error, Researcher[]>({
    queryKey: queryKeys.researchers.lists(),
    queryFn: () => ResearcherService.list(),
    select: (researchers) => researchers.filter(r => r.active !== false),
    ...DOMAIN_QUERY_OPTIONS.researchers,
    ...options?.queryOptions
  });
}
