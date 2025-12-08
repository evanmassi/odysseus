/**
 * Admin Domain Public API
 *
 * Centralized exports for the admin domain following established patterns.
 * Provides clean public interface for admin functionality across the application.
 *
 * @module domains/admin
 */

// Services
export { adminService, AdminService } from './services/AdminService';

// Hooks
export { useUsersQuery } from './hooks/useUsersQuery';
export { useDeleteUserMutation } from './hooks/useUserMutations';

// Re-export admin types from shared-schemas for convenience
export type {
  AdminUser,
  SecurityConfig,
  SystemMetrics,
  SyncStatus,
  AuditLogEntry,
} from '@odysseus/shared-schemas';
export { DEFAULT_SECURITY_CONFIG } from '@odysseus/shared-schemas';

// UI Components
export { AdminSettingsModal } from './ui/components/AdminSettingsModal';
export { TabSkeleton } from './ui/components/TabSkeleton';

// Tab Components
export { SecurityTab } from './ui/components/tabs/SecurityTab';
export type { SecurityTabProps } from './ui/components/tabs/SecurityTab';

export { UserManagementTab } from './ui/components/tabs/UserManagementTab';
export type { UserManagementTabProps } from './ui/components/tabs/UserManagementTab';

export { SystemConfigTab } from './ui/components/tabs/SystemConfigTab';
export type { SystemConfigTabProps } from './ui/components/tabs/SystemConfigTab';

export { MonitoringTab } from './ui/components/tabs/MonitoringTab';
export type { MonitoringTabProps } from './ui/components/tabs/MonitoringTab';
