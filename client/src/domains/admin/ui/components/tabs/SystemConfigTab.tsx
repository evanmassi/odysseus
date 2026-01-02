/**
 * System Configuration Tab Component
 *
 * Provides admin interface for viewing system configuration including:
 * - System statistics (tubes, users, researchers, backups)
 * - Audit settings (logging configuration)
 *
 * Part of the Admin Settings modal tab system.
 *
 * @module admin/ui/components/tabs
 */

import { Gauge } from 'lucide-react';

import type { SecurityConfig, SystemMetrics } from '@odysseus/shared-schemas';

/**
 * SystemConfigTab Props Interface
 *
 * @interface SystemConfigTabProps
 */
export interface SystemConfigTabProps {
  /** Current security configuration (for audit settings) */
  config: SecurityConfig;

  /** System statistics (tubes, users, researchers, backup info) */
  stats: SystemMetrics | null;

  /** Callback invoked when any security setting is changed */
  onChange: (field: keyof SecurityConfig, value: boolean | number | string) => void;
}

/**
 * System Configuration Tab Component
 *
 * Displays read-only system statistics and audit controls.
 *
 * @param {SystemConfigTabProps} props - Component props
 * @returns {JSX.Element} System configuration interface
 *
 * @example
 * ```tsx
 * <SystemConfigTab
 *   config={config}
 *   stats={systemStats}
 *   onChange={handleConfigChange}
 * />
 * ```
 */
export function SystemConfigTab({ config, stats, onChange }: SystemConfigTabProps) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center space-x-2 pb-3 border-b border-gray-200 mb-4">
        <Gauge size={22} className="text-gray-700" />
        <h3 className="text-xl font-semibold text-gray-900">System</h3>
      </div>

      {/* System Statistics Section */}
      <div>
        <h4 className="text-base font-semibold text-gray-900 mb-2">Statistics</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Total Tubes */}
          <div className="bg-gray-50 p-2.5 rounded-lg">
            <div className="text-xl font-bold text-gray-900">{stats?.totalTubes ?? 0}</div>
            <div className="text-xs text-gray-600">Total Tubes</div>
          </div>

          {/* Total Users */}
          <div className="bg-gray-50 p-2.5 rounded-lg">
            <div className="text-xl font-bold text-gray-900">{stats?.totalUsers ?? 0}</div>
            <div className="text-xs text-gray-600">Total Users</div>
          </div>

          {/* Total Researchers */}
          <div className="bg-gray-50 p-2.5 rounded-lg">
            <div className="text-xl font-bold text-gray-900">{stats?.totalResearchers ?? 0}</div>
            <div className="text-xs text-gray-600">Researchers</div>
          </div>

          {/* Last Backup */}
          <div className="bg-gray-50 p-2.5 rounded-lg">
            <div className="text-xs text-gray-600">Last Backup</div>
            <div className="text-xs text-gray-600 font-medium">
              {stats?.lastBackup ? new Date(stats.lastBackup).toLocaleDateString() : 'Never'}
            </div>
          </div>
        </div>
      </div>

      {/* Audit & Monitoring Section */}
      <div>
        <h4 className="text-base font-semibold text-gray-900 mb-2">Audit & Monitoring</h4>
        <div className="space-y-1.5">
          {/* Detailed Logging Toggle */}
          <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
            <div>
              <h5 className="text-sm font-medium text-gray-900">Detailed Logging</h5>
              <p className="text-xs text-gray-600">Log all system operations</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enableDetailedLogging}
                onChange={e => onChange('enableDetailedLogging', e.target.checked)}
                className="sr-only peer"
                aria-label="Enable detailed logging for all system operations"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-action/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-action"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
