/**
 * Lab Management Hooks
 *
 * React Query hooks for system admin operations on labs and their users.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { logger } from '@shared/infrastructure/logger';

import { labService } from '../services/LabService';

import type {
  LabData,
  LabDetails,
  InviteCodeData,
  CreateInviteCodeRequest,
  DemoLimits,
  SeedDemoResponse,
  UnseedDemoResponse,
  AuditLogEntry,
  AuditLogFilters,
  SystemOverview,
} from '@odysseus/shared-schemas';

export function useLabsQuery() {
  return useQuery<LabData[]>({
    queryKey: queryKeys.labs.list(),
    queryFn: () => labService.getLabs(),
    staleTime: 60 * 1000,
  });
}

export function useSystemOverviewQuery() {
  return useQuery<SystemOverview>({
    queryKey: queryKeys.labs.overview(),
    queryFn: () => labService.getSystemOverview(),
    staleTime: 60 * 1000,
  });
}

export function useCreateLabMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, isDemo }: { name: string; isDemo?: boolean }) =>
      labService.createLab(name, isDemo),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.labs.all });
    },
    onError: error => {
      logger.error('Failed to create lab', { error });
    },
  });
}

export function useDeactivateLabMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (labId: string) => labService.deactivateLab(labId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.labs.all });
    },
    onError: error => {
      logger.error('Failed to deactivate lab', { error });
    },
  });
}

export function useActivateLabMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (labId: string) => labService.activateLab(labId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.labs.all });
    },
    onError: error => {
      logger.error('Failed to activate lab', { error });
    },
  });
}

export function useLabDetailsQuery(labId: string | null) {
  return useQuery<LabDetails>({
    queryKey: queryKeys.labs.labDetails(labId ?? ''),
    queryFn: () => labService.getLabDetails(labId!),
    enabled: !!labId,
    staleTime: 30 * 1000,
  });
}

export function useUpdateLabMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => labService.updateLab(id, name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.labs.all });
    },
    onError: error => {
      logger.error('Failed to update lab', { error });
    },
  });
}

export function useActivateLabUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ labId, userId }: { labId: string; userId: string }) =>
      labService.activateUser(labId, userId),
    onSuccess: (_data, { labId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.labs.labDetails(labId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.labs.overview() });
    },
    onError: error => {
      logger.error('Failed to activate user', { error });
    },
  });
}

export function useDeactivateLabUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ labId, userId }: { labId: string; userId: string }) =>
      labService.deactivateUser(labId, userId),
    onSuccess: (_data, { labId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.labs.labDetails(labId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.labs.overview() });
    },
    onError: error => {
      logger.error('Failed to deactivate user', { error });
    },
  });
}

export function useSuspendLabUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ labId, userId }: { labId: string; userId: string }) =>
      labService.suspendUser(labId, userId),
    onSuccess: (_data, { labId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.labs.labDetails(labId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.labs.overview() });
    },
    onError: error => {
      logger.error('Failed to suspend user', { error });
    },
  });
}

export function useDeleteLabUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ labId, userId }: { labId: string; userId: string }) =>
      labService.deleteUser(labId, userId),
    onSuccess: (_data, { labId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.labs.labDetails(labId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.labs.overview() });
    },
    onError: error => {
      logger.error('Failed to delete user', { error });
    },
  });
}

export function useResetDemoDataMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (labId: string) => labService.resetDemoData(labId),
    onSuccess: (_data, labId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.labs.labDetails(labId) });
    },
    onError: error => {
      logger.error('Failed to reset demo data', { error });
    },
  });
}

export function useCreateLabInviteCodeMutation() {
  return useMutation<InviteCodeData, Error, { labId: string } & CreateInviteCodeRequest>({
    mutationFn: ({ labId, ...data }) => labService.createLabInviteCode(labId, data),
    onError: error => {
      logger.error('Failed to generate lab admin code', { error });
    },
  });
}

export function useDemoLimitsQuery(labId: string | null) {
  return useQuery<DemoLimits>({
    queryKey: queryKeys.labs.demoLimits(labId ?? ''),
    queryFn: () => labService.getDemoLimits(labId!),
    enabled: !!labId,
    staleTime: 60 * 1000,
  });
}

export function useSeedDemoMutation() {
  const queryClient = useQueryClient();

  return useMutation<SeedDemoResponse, Error, string>({
    mutationFn: (labId: string) => labService.seedDemo(labId),
    onSuccess: (_data, labId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.labs.labDetails(labId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.labs.list() });
    },
    onError: error => {
      logger.error('Failed to seed demo lab', { error });
    },
  });
}

export function useUnseedDemoMutation() {
  const queryClient = useQueryClient();

  return useMutation<UnseedDemoResponse, Error, string>({
    mutationFn: (labId: string) => labService.unseedDemo(labId),
    onSuccess: (_data, labId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.labs.labDetails(labId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.labs.list() });
    },
    onError: error => {
      logger.error('Failed to unseed demo lab', { error });
    },
  });
}

export function useLabAuditLogsQuery(
  labId: string | null,
  filters: AuditLogFilters = {},
  includeArchive: boolean = false
) {
  return useQuery<{
    entries: AuditLogEntry[];
    pagination: { total: number; limit: number; offset: number; hasMore: boolean };
  }>({
    queryKey: [...queryKeys.labs.audit(labId ?? ''), filters, includeArchive],
    queryFn: () => labService.getLabAuditLog(labId!, filters, includeArchive),
    enabled: !!labId,
    staleTime: 30 * 1000,
  });
}

export function useUpdateDemoLimitsMutation() {
  const queryClient = useQueryClient();

  return useMutation<DemoLimits, Error, { labId: string; limits: Partial<DemoLimits> }>({
    mutationFn: ({ labId, limits }) => labService.updateDemoLimits(labId, limits),
    onSuccess: (_data, { labId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.labs.demoLimits(labId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.labs.labDetails(labId) });
    },
    onError: error => {
      logger.error('Failed to update demo limits', { error });
    },
  });
}
