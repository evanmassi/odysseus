/**
 * Monitoring Tab Component
 *
 * Provides admin interface for system monitoring and audit trail viewing.
 * Displays:
 * - Audit log retention settings and metrics
 * - Audit log with filtering and search
 * - System activity tracking
 * - User action history
 *
 * Part of the Admin Settings modal tab system.
 *
 * @module admin/ui/components/tabs
 */

import { Activity } from 'lucide-react';

import { AuditLogViewer } from '../AuditLogViewer';
import { AuditRetentionSettings } from '../AuditRetentionSettings';

/**
 * MonitoringTab Props Interface
 *
 * @interface MonitoringTabProps
 */
export interface MonitoringTabProps {}

/**
 * Monitoring Tab Component
 *
 * Displays retention settings and audit log viewer with comprehensive activity tracking.
 *
 * @param {MonitoringTabProps} props - Component props
 * @returns {JSX.Element} Monitoring interface with retention settings and audit log
 *
 * @example
 * ```tsx
 * <MonitoringTab />
 * ```
 */
export function MonitoringTab(_props: MonitoringTabProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-2 pb-3 border-b border-border">
        <Activity size={22} className="text-secondary-foreground" />
        <h3 className="text-xl font-semibold text-card-foreground">System Monitoring</h3>
      </div>

      {/* Audit Retention Settings - Collapsible */}
      <AuditRetentionSettings defaultCollapsed={true} />

      {/* Audit Log Viewer */}
      <AuditLogViewer />
    </div>
  );
}
