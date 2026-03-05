/**
 * Admin Domain Public API
 *
 * Services and hooks for admin panel, user management, and audit functionality.
 */

export { adminService, AdminService } from './services/AdminService';
export { adminUserService, AdminUserService } from './services/AdminUserService';
export { adminResearcherService, AdminResearcherService } from './services/AdminResearcherService';
export { auditService, AuditService } from './services/AuditService';
export { exportService, ExportService } from './services/ExportService';

export { useUsersQuery } from './hooks/useUsersQuery';
export { useDeleteUserMutation } from './hooks/useUserMutations';

export { AdminSettingsModal } from './ui/components/settings-modal/AdminSettingsModal';
export { SystemAdminDashboard } from './ui/components/system-dashboard/SystemAdminDashboard';
