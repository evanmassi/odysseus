/**
 * Monitoring Tab Component
 *
 * Provides admin interface for system monitoring and audit trail viewing.
 * Displays:
 * - Audit log with filtering and search
 * - System activity tracking
 * - User action history
 *
 * Part of the Admin Settings modal tab system.
 *
 * @module admin/ui/components/tabs
 */

import { RefreshCw, Activity } from 'lucide-react';
import type { SystemMetrics } from '@odysseus/shared-schemas';
import { AuditLogViewer } from '../AuditLogViewer';

/**
 * MonitoringTab Props Interface
 *
 * @interface MonitoringTabProps
 */
export interface MonitoringTabProps {
  /** System statistics for monitoring metrics */
  stats: SystemMetrics | null;

  /** Callback invoked to refresh monitoring data */
  onRefresh: () => void;
}

/**
 * Monitoring Tab Component
 *
 * Displays audit log viewer with comprehensive activity tracking.
 *
 * @param {MonitoringTabProps} props - Component props
 * @returns {JSX.Element} Monitoring interface with audit log
 *
 * @example
 * ```tsx
 * <MonitoringTab
 *   stats={systemStats}
 *   onRefresh={loadSystemStats}
 * />
 * ```
 */
export function MonitoringTab({ stats, onRefresh }: MonitoringTabProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-2 pb-3 border-b border-gray-200">
        <Activity size={22} className="text-gray-700" />
        <h3 className="text-xl font-semibold text-gray-900">System Monitoring</h3>
      </div>

      {/* Audit Log Viewer */}
      <AuditLogViewer />
    </div>
  );
}
