/**
 * System Tab
 *
 * Admin interface for lab settings, audit configuration, data export, and system statistics.
 */

import React, { useState, useEffect, useCallback } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { Gauge, FlaskConical, FileText, Check, X } from 'lucide-react';

import { queryKeys } from '@app/cache/queryKeys';
import { useAuthStore, useLabId } from '@domains/authentication';
import { useStorageData } from '@domains/storage';
import { httpClient } from '@infra/api';
import { logger } from '@infra/logger';
import { Button, Input, Toggle } from '@shared/ui';
import { notifications } from '@shared/utils';

import { adminService } from '../../../../services/AdminService';
import { DataExportForm } from '../DataExportForm';

import type { SecurityConfig, SystemMetrics } from '@odysseus/shared-schemas';

export interface SystemTabProps {
  config: SecurityConfig;
  stats: SystemMetrics | null;
  onChange: (field: keyof SecurityConfig, value: boolean | number | string) => void;
  onTabFooter?: (footer: React.ReactNode) => void;
}

export function SystemTab({ config, stats, onChange, onTabFooter }: SystemTabProps) {
  const labId = useLabId();
  const hasLab = !!useAuthStore(s => s.user?.labId);
  const { currentLab } = useStorageData({ enabled: hasLab });
  const queryClient = useQueryClient();

  // Lab name editing state
  const [isEditingLabName, setIsEditingLabName] = useState(false);
  const [labNameInput, setLabNameInput] = useState(currentLab?.name ?? '');
  const [isSavingLabName, setIsSavingLabName] = useState(false);

  // Version info state
  const [versionInfo, setVersionInfo] = useState<{
    version: string;
    environment: string;
    nodeVersion: string;
    platform: string;
  } | null>(null);

  useEffect(() => {
    setLabNameInput(currentLab?.name ?? '');
  }, [currentLab?.name]);

  useEffect(() => {
    async function fetchVersionInfo() {
      try {
        const versionData = await adminService.getVersionInfo();
        setVersionInfo(versionData);
      } catch (error) {
        logger.error('Failed to fetch version info', { error });
      }
    }
    void fetchVersionInfo();
  }, []);

  useEffect(() => {
    onTabFooter?.(
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
          <span>Total Tubes:</span>
          <span className="font-semibold text-secondary-foreground">{stats?.totalTubes ?? 0}</span>
          <span className="text-border">•</span>
          <span>Total Users:</span>
          <span className="font-semibold text-secondary-foreground">{stats?.totalUsers ?? 0}</span>
          <span className="text-border">•</span>
          <span>Researchers:</span>
          <span className="font-semibold text-secondary-foreground">
            {stats?.totalResearchers ?? 0}
          </span>
          <span className="text-border">•</span>
          <span>Last Backup:</span>
          <span className="font-semibold text-secondary-foreground">
            {stats?.lastBackup ? new Date(stats.lastBackup).toLocaleDateString() : 'Never'}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          Odysseus v{versionInfo?.version ?? '—'} · © 2025 Evan Massi
        </div>
      </div>
    );
  }, [onTabFooter, stats, versionInfo]);

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
      await httpClient.put('/storage/system', { labName: trimmedName });

      void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data(labId) });

      notifications.success('Lab name updated successfully');
      setIsEditingLabName(false);
    } catch {
      notifications.error('Failed to update lab name');
      setLabNameInput(currentLab?.name ?? '');
    } finally {
      setIsSavingLabName(false);
    }
  }, [labNameInput, currentLab?.name, queryClient, labId]);

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
      <div className="flex items-center space-x-2 pb-3 border-b border-border mb-4">
        <Gauge size={22} className="text-secondary-foreground" />
        <h3 className="text-xl font-semibold text-card-foreground">System</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {hasLab && (
          <div>
            <h4 className="text-base font-semibold text-card-foreground mb-2">Laboratory</h4>
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FlaskConical size={18} className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Lab:</span>
                  {isEditingLabName ? (
                    <Input
                      type="text"
                      value={labNameInput}
                      onValueChange={setLabNameInput}
                      onKeyDown={handleLabNameKeyDown}
                      variant="default"
                      size="sm"
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
                      <Button
                        variant="success"
                        size="xs"
                        iconOnly
                        onClick={handleSaveLabName}
                        disabled={isSavingLabName}
                        aria-label="Save lab name"
                      >
                        <Check size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        iconOnly
                        onClick={handleCancelLabNameEdit}
                        disabled={isSavingLabName}
                        aria-label="Cancel editing"
                      >
                        <X size={16} />
                      </Button>
                    </>
                  ) : (
                    <Button variant="ghost" size="xs" onClick={() => setIsEditingLabName(true)}>
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div>
          <h4 className="text-base font-semibold text-card-foreground mb-2">Audit & Monitoring</h4>
          <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
            <div>
              <h5 className="text-sm font-medium text-card-foreground flex items-center gap-2">
                <FileText size={18} className="text-muted-foreground" />
                Detailed System Logging
              </h5>
            </div>
            <Toggle
              checked={config.enableDetailedLogging}
              onChange={checked => onChange('enableDetailedLogging', checked)}
              aria-label="Enable detailed logging for all system operations"
            />
          </div>
        </div>
      </div>

      <DataExportForm />
    </div>
  );
}
