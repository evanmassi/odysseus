/**
 * Admin Hooks
 *
 * React Query hooks for admin panel operations.
 */

// User management hooks
export { useUsersQuery } from './useUsersQuery';
export {
  useDeactivateUserMutation,
  useActivateUserMutation,
  useDeleteUserMutation,
} from './useUserMutations';

// Lab management hooks
export {
  useLabsQuery,
  useSystemOverviewQuery,
  useLabDetailsQuery,
  useDemoLimitsQuery,
  useLabAuditLogsQuery,
} from './useLabQueries';

export {
  useCreateLabMutation,
  useDeactivateLabMutation,
  useActivateLabMutation,
  useUpdateLabMutation,
  useActivateLabUserMutation,
  useDeactivateLabUserMutation,
  useSuspendLabUserMutation,
  useDeleteLabUserMutation,
  useResetDemoDataMutation,
  useCreateLabInviteCodeMutation,
  useSeedDemoMutation,
  useUnseedDemoMutation,
  useUpdateDemoLimitsMutation,
} from './useLabMutations';

// Security monitoring hooks
export {
  useSecurityOverviewQuery,
  useActiveSessionsQuery,
  useIpActivityQuery,
  useFailedLoginsQuery,
  useSessionActivityQuery,
} from './useSecurityMonitoringQueries';
export {
  usePurgeExpiredSessionsMutation,
  useRevokeSessionMutation,
  useBulkRevokeSessionsMutation,
} from './useSecurityMonitoringMutations';
