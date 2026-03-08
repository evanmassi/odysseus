/**
 * Admin Domain Public API
 *
 * Services and hooks for admin panel, user management, and audit functionality.
 */

// Services
export { adminService, AdminService } from './services/AdminService';
export { adminUserService, AdminUserService } from './services/AdminUserService';
export { adminResearcherService, AdminResearcherService } from './services/AdminResearcherService';
export { auditService, AuditService } from './services/AuditService';
export { exportService, ExportService } from './services/ExportService';

// Hooks
export * from './hooks';

// UI Components
export { AdminSettingsModal } from './ui/components/settings-modal/AdminSettingsModal';
export { SystemAdminDashboard } from './ui/components/system-dashboard/SystemAdminDashboard';
