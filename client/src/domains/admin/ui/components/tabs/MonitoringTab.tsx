/**
 * Monitoring Tab Component
 *
 * Provides admin interface for system monitoring (placeholder for future implementation).
 * Will display real-time metrics including:
 * - Login attempt tracking
 * - Security event logs
 * - System performance metrics
 * - Active user sessions
 *
 * Part of the Admin Settings modal tab system.
 *
 * @module admin/ui/components/tabs
 */

import { RefreshCw, Activity } from 'lucide-react';
import type { SystemMetrics } from '@odysseus/shared-schemas';

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
 * Currently displays placeholder content. Future implementation will include
 * real-time dashboard with security monitoring and system performance metrics.
 *
 * @param {MonitoringTabProps} props - Component props
 * @returns {JSX.Element} Monitoring interface (placeholder)
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
    <div className="space-y-2">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
        <div className="flex items-center space-x-2">
          <Activity size={22} className="text-gray-700" />
          <h3 className="text-xl font-semibold text-gray-900">System Monitoring</h3>
        </div>
        <button
          onClick={onRefresh}
          className="btn-refresh flex items-center space-x-2"
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Placeholder Content */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <Activity size={16} className="text-blue-600" />
          <h4 className="font-medium text-blue-800">Coming Soon</h4>
        </div>
        <p className="text-blue-700 text-sm mt-2">
          Real-time monitoring dashboard will show login attempts, security events,
          and system performance metrics in the next update.
        </p>
      </div>
    </div>
  );
}
