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
export { adminUserService, AdminUserService } from './services/AdminUserService';
export { adminResearcherService, AdminResearcherService } from './services/AdminResearcherService';
export { auditService, AuditService } from './services/AuditService';
export { exportService, ExportService } from './services/ExportService';

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
export { SystemAdminContent } from './ui/components/SystemAdminContent';
export { TabSkeleton } from './ui/components/TabSkeleton';

// Tab Components
export { SecurityTab } from './ui/components/tabs/SecurityTab';
export type { SecurityTabProps } from './ui/components/tabs/SecurityTab';

export { UsersTab } from './ui/components/tabs/UsersTab';
export type { UsersTabProps } from './ui/components/tabs/UsersTab';

export { SystemTab } from './ui/components/tabs/SystemTab';
export type { SystemTabProps } from './ui/components/tabs/SystemTab';

export { MonitoringTab } from './ui/components/tabs/MonitoringTab';
export type { MonitoringTabProps } from './ui/components/tabs/MonitoringTab';

export { CatalogTab } from './ui/components/tabs/CatalogTab';
