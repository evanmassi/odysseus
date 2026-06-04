/**
 * System Tab
 *
 * Admin interface for lab settings, audit configuration, data export, and system statistics.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { refrigeratorFreezer } from '@lucide/lab';
import { useQueryClient } from '@tanstack/react-query';
import {
  HardDrive,
  Icon,
  Rows3,
  Box as BoxIcon,
  ChevronRight,
  ChevronDown,
  TestTubes,
  UsersRound,
  Dna,
  DatabaseBackup,
} from 'lucide-react';

import { queryKeys } from '@app/cache/queryKeys';
import { useAuthStore } from '@domains/authentication';
import { useStorageData } from '@domains/storage';
import { httpClient } from '@infra/api';
import { logger } from '@infra/logger';
import {
  Button,
  Chip,
  ConsolePanel,
  Input,
  SettingsRow,
  StatCell,
  Subsection,
  Toggle,
} from '@shared/ui';
import { notifications } from '@shared/utils';
import { formatDateForDisplay } from '@shared/utils/dateFormatters';

import { useLabStorageAnalyticsQuery } from '../../../../hooks/useStorageAnalyticsQueries';
import { adminService } from '../../../../services/AdminService';
import { UtilizationBar } from '../../displays/UtilizationBar';
import { DataExportForm } from '../DataExportForm';

import type { SecurityConfig, SystemMetrics } from '@odysseus/shared-schemas';

export interface SystemTabProps {
  config: SecurityConfig;
  stats: SystemMetrics | null;
  onChange: (field: keyof SecurityConfig, value: boolean | number | string) => void;
}

export function SystemTab({ config, stats, onChange }: SystemTabProps) {
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

  const handleSaveLabName = useCallback(async () => {
    if (isSavingLabName) return;
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
  }, [isSavingLabName, labNameInput, currentLab?.name, queryClient, labId]);

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
      {stats && (
        <ConsolePanel intensity="soft">
          <div className="relative flex divide-x divide-line-soft [&>*:not(:first-child)]:[border-image:linear-gradient(180deg,transparent_0%,hsl(var(--foreground)/0.13)_8%,hsl(var(--foreground)/0.13)_84%,transparent_100%)_1]">
            <StatCell
              size="sm"
              label="Total Tubes"
              value={stats.totalTubes}
              icon={<TestTubes size={11} />}
              className="flex-1"
            />
            <StatCell
              size="sm"
              label="Total Users"
              value={stats.totalUsers}
              icon={<UsersRound size={11} />}
              className="flex-1"
            />
            <StatCell
              size="sm"
              label="Researchers"
              value={stats.totalResearchers}
              icon={<Dna size={11} />}
              className="flex-1"
            />
            <StatCell
              size="sm"
              label="Last Backup"
              value={stats.lastBackup ? formatDateForDisplay(stats.lastBackup) : 'Never'}
              icon={<DatabaseBackup size={11} />}
              className="flex-1"
            />
          </div>
        </ConsolePanel>
      )}

      <ConsolePanel intensity="soft">
        <Subsection title="Laboratory" index={1}>
          {hasLab && (
            <SettingsRow label="Lab Name" hint="Display name shown across the app">
              <div className="flex w-48 items-center justify-end gap-2">
                {isEditingLabName ? (
                  <Input
                    type="text"
                    value={labNameInput}
                    onValueChange={setLabNameInput}
                    onKeyDown={handleLabNameKeyDown}
                    onBlur={() => void handleSaveLabName()}
                    size="sm"
                    className="w-full"
                    title="Enter to save · Esc to cancel"
                    // eslint-disable-next-line jsx-a11y/no-autofocus -- Intentional for inline edit UX
                    autoFocus
                  />
                ) : (
                  <>
                    <span
                      className="truncate font-mono text-xs text-secondary-foreground phosphor-text"
                      title={currentLab?.name ?? undefined}
                    >
                      {currentLab?.name ?? '—'}
                    </span>
                    <Button variant="ghost" size="xs" onClick={() => setIsEditingLabName(true)}>
                      Edit
                    </Button>
                  </>
                )}
              </div>
            </SettingsRow>
          )}

          <SettingsRow
            label="Detailed System Logging"
            hint="Verbose audit logging for all operations"
            className={hasLab ? undefined : 'col-span-2'}
          >
            <Toggle
              checked={config.enableDetailedLogging}
              onChange={checked => onChange('enableDetailedLogging', checked)}
              aria-label="Enable detailed logging for all system operations"
            />
          </SettingsRow>
        </Subsection>

        {hasLab && <StorageUtilizationSection />}

        <Subsection title="Data Export" index={hasLab ? 3 : 2}>
          <div className="col-span-2 py-4">
            <DataExportForm />
          </div>
        </Subsection>

        <div className="border-t border-line-soft px-5 py-2.5 text-right font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground/60">
          Odysseus v{versionInfo?.version ?? '—'} · © 2025 Evan Massi
        </div>
      </ConsolePanel>
    </div>
  );
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
    <Subsection title="Storage Utilization" index={2}>
      <div className="col-span-2 space-y-3 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive size={16} className="text-muted-foreground" />
            <span className="font-mono text-[11px] tracking-[0.04em] text-secondary-foreground">
              {data.totalOccupied} / {data.totalPositions} positions used
            </span>
          </div>
          <UtilizationBar percent={data.utilizationPercent} />
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
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {tank.occupied}/{tank.totalPositions}
                      </span>
                      <UtilizationBar percent={tank.utilizationPercent} width="w-16" />
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
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  {rack.occupied}/{rack.totalPositions}
                                </span>
                                <UtilizationBar percent={rack.utilizationPercent} width="w-14" />
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
                                      <span className="font-mono text-[10px] text-muted-foreground">
                                        {box.occupied}/{box.maxPositions}
                                      </span>
                                      <UtilizationBar
                                        percent={box.utilizationPercent}
                                        width="w-12"
                                      />
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
              >
                {box.tankName} · {box.rackName} · {box.boxName}: {box.utilizationPercent}%
              </Chip>
            ))}
          </div>
        )}
      </div>
    </Subsection>
  );
}
