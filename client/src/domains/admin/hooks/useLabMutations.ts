/**
 * Lab Management Mutations
 *
 * React Query mutations for lab CRUD, user management, and demo operations (system admin only).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';

import { labService } from '../services/LabService';

import type {
  InviteCodeData,
  CreateInviteCodeRequest,
  DemoLimits,
  SeedDemoResponse,
  MessageResponse,
} from '@odysseus/shared-schemas';

export function useCreateLabMutation() {
  return useMutation({
    mutationFn: ({ name, isDemo }: { name: string; isDemo?: boolean }) =>
      labService.createLab(name, isDemo),
    meta: { invalidates: [queryKeys.labs.all] },
  });
}

export function useDeactivateLabMutation() {
  return useMutation({
    mutationFn: (labId: string) => labService.deactivateLab(labId),
    meta: { invalidates: [queryKeys.labs.all, queryKeys.storageAnalytics.all] },
  });
}

export function useActivateLabMutation() {
  return useMutation({
    mutationFn: (labId: string) => labService.activateLab(labId),
    meta: { invalidates: [queryKeys.labs.all, queryKeys.storageAnalytics.all] },
  });
}

export function useUpdateLabMutation() {
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => labService.updateLab(id, name),
    meta: { invalidates: [queryKeys.labs.all, queryKeys.storageAnalytics.all] },
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
  });
}

export function useResetDemoDataMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (labId: string) => labService.resetDemoData(labId),
    onSuccess: (_data, labId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.labs.labDetails(labId) });
    },
  });
}

export function useCreateLabInviteCodeMutation() {
  return useMutation<InviteCodeData, Error, { labId: string } & CreateInviteCodeRequest>({
    mutationFn: ({ labId, ...data }) => labService.createLabInviteCode(labId, data),
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
  });
}

export function useUnseedDemoMutation() {
  const queryClient = useQueryClient();

  return useMutation<MessageResponse, Error, string>({
    mutationFn: (labId: string) => labService.unseedDemo(labId),
    onSuccess: (_data, labId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.labs.labDetails(labId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.labs.list() });
    },
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
  });
}
