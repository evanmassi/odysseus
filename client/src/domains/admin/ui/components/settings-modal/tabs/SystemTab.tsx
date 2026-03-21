/**
 * System Tab
 *
 * Admin interface for lab settings, audit configuration, data export, and system statistics.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { refrigeratorFreezer } from '@lucide/lab';
import { useQueryClient } from '@tanstack/react-query';
import {
  Gauge,
  FlaskConical,
  FileText,
  Check,
  X,
  HardDrive,
  AlertTriangle,
  Icon,
  Rows3,
  Box as BoxIcon,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

import { queryKeys } from '@app/cache/queryKeys';
import { useAuthStore } from '@domains/authentication';
import { useStorageData } from '@domains/storage';
import { httpClient } from '@infra/api';
import { logger } from '@infra/logger';
import { Button, Chip, Input, Toggle } from '@shared/ui';
import { notifications } from '@shared/utils';

import { useLabStorageAnalyticsQuery } from '../../../../hooks/useStorageAnalyticsQueries';
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
  const labId = useAuthStore(s => s.user?.labId);
  const hasLab = !!labId;
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

      if (labId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.storage.data(labId) });
      }

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

      {hasLab && <StorageUtilizationSection />}

      <DataExportForm />
    </div>
  );
}

function getUtilizationColor(percent: number): string {
  if (percent >= 90) return 'bg-danger-bg';
  if (percent >= 70) return 'bg-warning-bg';
  return 'bg-success-bg';
}

function StorageUtilizationSection() {
  const { data } = useLabStorageAnalyticsQuery();
  const [expandedTankId, setExpandedTankId] = useState<string | null>(null);
  const [expandedRackId, setExpandedRackId] = useState<string | null>(null);

  const expandedTank = useMemo(
    () => data?.tanks.find(t => t.tankId === expandedTankId),
    [data, expandedTankId]
  );

  if (!data) return null;

  return (
    <div>
      <h4 className="text-base font-semibold text-card-foreground mb-2">Storage Utilization</h4>
      <div className="bg-muted p-3 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive size={18} className="text-muted-foreground" />
            <span className="text-sm text-card-foreground font-medium">
              {data.totalOccupied} / {data.totalPositions} positions used
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 rounded-full bg-background overflow-hidden">
              <div
                className={`h-full rounded-full ${getUtilizationColor(data.utilizationPercent)}`}
                style={{ width: `${Math.min(data.utilizationPercent, 100)}%` }}
              />
            </div>
            <span className="text-xs font-medium text-secondary-foreground">
              {data.utilizationPercent}%
            </span>
          </div>
        </div>

        {data.tanks.length > 0 && (
          <div className="space-y-1">
            {data.tanks.map(tank => {
              const isExpanded = tank.tankId === expandedTankId;
              return (
                <div key={tank.tankId}>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between text-xs py-1 px-1 rounded hover:bg-background/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setExpandedTankId(isExpanded ? null : tank.tankId);
                      setExpandedRackId(null);
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      {isExpanded ? (
                        <ChevronDown size={10} className="text-muted-foreground" />
                      ) : (
                        <ChevronRight size={10} className="text-muted-foreground" />
                      )}
                      <Icon
                        iconNode={refrigeratorFreezer}
                        size={12}
                        className="text-muted-foreground"
                      />
                      <span className="text-secondary-foreground">{tank.tankName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {tank.occupied}/{tank.totalPositions}
                      </span>
                      <div className="w-16 h-1.5 rounded-full bg-background overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getUtilizationColor(tank.utilizationPercent)}`}
                          style={{ width: `${Math.min(tank.utilizationPercent, 100)}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground w-8 text-right">
                        {tank.utilizationPercent}%
                      </span>
                    </div>
                  </button>

                  {isExpanded && expandedTank && (
                    <div className="ml-6 mt-1 mb-2 space-y-0.5 border-l-2 border-border pl-3">
                      {expandedTank.racks.map(rack => {
                        const isRackExpanded = rack.rackId === expandedRackId;
                        return (
                          <div key={rack.rackId}>
                            <button
                              type="button"
                              className="w-full flex items-center justify-between text-xs py-0.5 px-1 rounded hover:bg-background/50 transition-colors cursor-pointer"
                              onClick={() => setExpandedRackId(isRackExpanded ? null : rack.rackId)}
                            >
                              <div className="flex items-center gap-1.5">
                                {isRackExpanded ? (
                                  <ChevronDown size={8} className="text-muted-foreground" />
                                ) : (
                                  <ChevronRight size={8} className="text-muted-foreground" />
                                )}
                                <Rows3 size={10} className="text-muted-foreground" />
                                <span className="text-secondary-foreground">{rack.rackName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">
                                  {rack.occupied}/{rack.totalPositions}
                                </span>
                                <div className="w-12 h-1.5 rounded-full bg-background overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${getUtilizationColor(rack.utilizationPercent)}`}
                                    style={{ width: `${Math.min(rack.utilizationPercent, 100)}%` }}
                                  />
                                </div>
                                <span className="text-muted-foreground w-8 text-right">
                                  {rack.utilizationPercent}%
                                </span>
                              </div>
                            </button>

                            {isRackExpanded && (
                              <div className="ml-5 mt-0.5 mb-1 space-y-0.5 border-l-2 border-border/50 pl-2.5">
                                {rack.boxes.map(box => (
                                  <div
                                    key={box.boxName}
                                    className="flex items-center justify-between text-xs py-0.5"
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <BoxIcon size={9} className="text-muted-foreground" />
                                      <span className="text-secondary-foreground">
                                        {box.boxName}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">
                                        {box.occupied}/{box.maxPositions}
                                      </span>
                                      <div className="w-10 h-1 rounded-full bg-background overflow-hidden">
                                        <div
                                          className={`h-full rounded-full ${getUtilizationColor(box.utilizationPercent)}`}
                                          style={{
                                            width: `${Math.min(box.utilizationPercent, 100)}%`,
                                          }}
                                        />
                                      </div>
                                      <span className="text-muted-foreground w-8 text-right">
                                        {box.utilizationPercent}%
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {data.nearCapacityBoxes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {data.nearCapacityBoxes.map(box => (
              <Chip
                key={`${box.tankName}-${box.rackName}-${box.boxName}`}
                color="warning"
                size="xs"
                leftIcon={<AlertTriangle size={10} />}
              >
                {box.tankName} · {box.rackName} · {box.boxName}: {box.utilizationPercent}%
              </Chip>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
