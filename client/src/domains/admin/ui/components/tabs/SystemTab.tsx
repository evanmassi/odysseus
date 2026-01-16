/**
 * System Tab Component
 *
 * Provides admin interface for viewing system configuration including:
 * - Lab name configuration
 * - System statistics (tubes, users, researchers, backups)
 * - Audit settings (logging configuration)
 *
 * Part of the Admin Settings modal tab system.
 *
 * @module admin/ui/components/tabs
 */

import { useState, useEffect, useCallback } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { Gauge, FlaskConical, Check, X } from 'lucide-react';

import { queryKeys } from '@app/queryKeys';
import { useStorageData } from '@domains/storage';
import { httpClient } from '@infra/api/httpClient';
import { Toggle } from '@shared/ui';
import { notifications } from '@shared/utils';

import type { SecurityConfig, SystemMetrics } from '@odysseus/shared-schemas';

/**
 * SystemTab Props Interface
 *
 * @interface SystemTabProps
 */
export interface SystemTabProps {
  /** Current security configuration (for audit settings) */
  config: SecurityConfig;

  /** System statistics (tubes, users, researchers, backup info) */
  stats: SystemMetrics | null;

  /** Callback invoked when any security setting is changed */
  onChange: (field: keyof SecurityConfig, value: boolean | number | string) => void;
}

/**
 * System Tab Component
 *
 * Displays read-only system statistics and audit controls.
 *
 * @param {SystemTabProps} props - Component props
 * @returns {JSX.Element} System configuration interface
 *
 * @example
 * ```tsx
 * <SystemTab
 *   config={config}
 *   stats={systemStats}
 *   onChange={handleConfigChange}
 * />
 * ```
 */
export function SystemTab({ config, stats, onChange }: SystemTabProps) {
  const { currentLab } = useStorageData();
  const queryClient = useQueryClient();

  // Lab name editing state
  const [isEditingLabName, setIsEditingLabName] = useState(false);
  const [labNameInput, setLabNameInput] = useState(currentLab?.name ?? '');
  const [isSavingLabName, setIsSavingLabName] = useState(false);

  // Sync input when currentLab changes
  useEffect(() => {
    setLabNameInput(currentLab?.name ?? '');
  }, [currentLab?.name]);

  const handleSaveLabName = useCallback(async () => {
    const trimmedName = labNameInput.trim();
    if (!trimmedName) {
      notifications.error('Lab name cannot be empty');
      return;
    }

    if (trimmedName === currentLab?.name) {
      setIsEditingLabName(false);
      return;
    }

    setIsSavingLabName(true);
    try {
      // Use dedicated system settings endpoint - only updates labName, preserves all equipment
      await httpClient.put('/configuration/system', { labName: trimmedName });

      // Invalidate React Query cache to refetch updated data
      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.storage() });

      notifications.success('Lab name updated successfully');
      setIsEditingLabName(false);
    } catch {
      notifications.error('Failed to update lab name');
      // Revert input on error
      setLabNameInput(currentLab?.name ?? '');
    } finally {
      setIsSavingLabName(false);
    }
  }, [labNameInput, currentLab?.name, queryClient]);

  const handleCancelLabNameEdit = useCallback(() => {
    setLabNameInput(currentLab?.name ?? '');
    setIsEditingLabName(false);
  }, [currentLab?.name]);

  const handleLabNameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        void handleSaveLabName();
      } else if (e.key === 'Escape') {
        handleCancelLabNameEdit();
      }
    },
    [handleSaveLabName, handleCancelLabNameEdit]
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-2 pb-3 border-b border-border mb-4">
        <Gauge size={22} className="text-secondary-foreground" />
        <h3 className="text-xl font-semibold text-card-foreground">System</h3>
      </div>

      {/* Lab Name Section */}
      <div>
        <h4 className="text-base font-semibold text-card-foreground mb-2">Laboratory</h4>
        <div className="bg-muted p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FlaskConical size={18} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Lab:</span>
              {isEditingLabName ? (
                <input
                  type="text"
                  value={labNameInput}
                  onChange={e => setLabNameInput(e.target.value)}
                  onKeyDown={handleLabNameKeyDown}
                  className="text-sm font-medium text-card-foreground border border-border rounded px-2 py-1 focus-ring-default"
                  // eslint-disable-next-line jsx-a11y/no-autofocus -- Intentional for inline edit UX
                  autoFocus
                  disabled={isSavingLabName}
                />
              ) : (
                <span className="text-sm font-medium text-card-foreground">
                  {currentLab?.name ?? ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {isEditingLabName ? (
                <>
                  <button
                    onClick={handleSaveLabName}
                    disabled={isSavingLabName}
                    className="p-1.5 text-success-text hover:bg-success-light rounded transition-colors disabled:opacity-50 focus-ring-default"
                    aria-label="Save lab name"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={handleCancelLabNameEdit}
                    disabled={isSavingLabName}
                    className="p-1.5 text-muted-foreground hover:bg-accent rounded transition-colors disabled:opacity-50 focus-ring-default"
                    aria-label="Cancel editing"
                  >
                    <X size={16} />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditingLabName(true)}
                  className="text-xs text-muted-foreground hover:text-accent-foreground hover:bg-accent px-2 py-1 rounded transition-colors focus-ring-default"
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* System Statistics Section */}
      <div>
        <h4 className="text-base font-semibold text-card-foreground mb-2">Statistics</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Total Tubes */}
          <div className="bg-muted p-2.5 rounded-lg">
            <div className="text-xl font-bold text-card-foreground">{stats?.totalTubes ?? 0}</div>
            <div className="text-xs text-secondary-foreground">Total Tubes</div>
          </div>

          {/* Total Users */}
          <div className="bg-muted p-2.5 rounded-lg">
            <div className="text-xl font-bold text-card-foreground">{stats?.totalUsers ?? 0}</div>
            <div className="text-xs text-secondary-foreground">Total Users</div>
          </div>

          {/* Total Researchers */}
          <div className="bg-muted p-2.5 rounded-lg">
            <div className="text-xl font-bold text-card-foreground">
              {stats?.totalResearchers ?? 0}
            </div>
            <div className="text-xs text-secondary-foreground">Researchers</div>
          </div>

          {/* Last Backup */}
          <div className="bg-muted p-2.5 rounded-lg">
            <div className="text-xs text-secondary-foreground">Last Backup</div>
            <div className="text-xs text-secondary-foreground font-medium">
              {stats?.lastBackup ? new Date(stats.lastBackup).toLocaleDateString() : 'Never'}
            </div>
          </div>
        </div>
      </div>

      {/* Audit & Monitoring Section */}
      <div>
        <h4 className="text-base font-semibold text-card-foreground mb-2">Audit & Monitoring</h4>
        <div className="space-y-1.5">
          {/* Detailed Logging Toggle */}
          <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
            <div>
              <h5 className="text-sm font-medium text-card-foreground">Detailed Logging</h5>
              <p className="text-xs text-secondary-foreground">Log all system operations</p>
            </div>
            <Toggle
              checked={config.enableDetailedLogging}
              onChange={checked => onChange('enableDetailedLogging', checked)}
              aria-label="Enable detailed logging for all system operations"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
