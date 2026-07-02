/**
 * System Tab
 *
 * Admin interface for lab settings, audit configuration, data export, and system statistics.
 */

import React, { useState, useEffect, useCallback } from 'react';

import { refrigeratorFreezer } from '@lucide/lab';
import { useQueryClient } from '@tanstack/react-query';
import {
  HardDrive,
  Icon,
  Rows3,
  Box as BoxIcon,
  ChevronRight,
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
import { NavTreeLines } from '@shared/ui/components/tree-lines';
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
        <Subsection title="Laboratory" index={1} accent>
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
                      className="truncate font-mono text-data-sm text-secondary-foreground phosphor-text"
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

        <Subsection title="Data Export" index={hasLab ? 3 : 2} accent>
          <div className="col-span-2 py-4">
            <DataExportForm />
          </div>
        </Subsection>

        <div className="border-t border-line-soft px-5 py-2.5 text-right type-label text-label-2xs text-muted-foreground/60">
          Odysseus v{versionInfo?.version ?? '—'} · © 2025 Evan Massi
        </div>
      </ConsolePanel>
    </div>
  );
}

function StorageUtilizationSection() {
  const { data } = useLabStorageAnalyticsQuery();
  const [expandedTanks, setExpandedTanks] = useState<Set<string>>(new Set());
  const [expandedRacks, setExpandedRacks] = useState<Set<string>>(new Set());

  const toggleTank = (id: string) => {
    setExpandedTanks(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleRack = (id: string) => {
    setExpandedRacks(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (!data) return null;

  return (
    <Subsection title="Storage Utilization" index={2} accent>
      <div className="col-span-2 space-y-3 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive size={16} className="text-muted-foreground" />
            <span className="font-mono text-data-sm tracking-data text-secondary-foreground">
              {data.totalOccupied} / {data.totalPositions} positions used
            </span>
          </div>
          <UtilizationBar percent={data.utilizationPercent} />
        </div>

        {data.tanks.length > 0 && (
          <div data-tree-id="storage-utilization" className="nav-tree relative flex flex-col gap-1">
            <NavTreeLines treeId="storage-utilization" expandedCategoryIds={expandedTanks} />
            {data.tanks.map(tank => {
              const isTankOpen = expandedTanks.has(tank.tankId);
              return (
                <div key={tank.tankId} data-level="l1" data-id={tank.tankId}>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={isTankOpen}
                    className={`nav-tree-row nav-tree-row--category ${isTankOpen ? 'is-open' : ''}`}
                    onClick={() => toggleTank(tank.tankId)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') toggleTank(tank.tankId);
                    }}
                  >
                    <ChevronRight
                      size={11}
                      className={`nav-tree-row__chevron ${isTankOpen ? 'rotate-90' : ''}`}
                    />
                    <Icon
                      iconNode={refrigeratorFreezer}
                      size={14}
                      className="flex-shrink-0 text-muted-foreground"
                    />
                    <span className="nav-tree-row__label flex-1 font-display text-body-sm text-secondary-foreground">
                      {tank.tankName}
                    </span>
                    <StorageRowMeter
                      occupied={tank.occupied}
                      total={tank.totalPositions}
                      percent={tank.utilizationPercent}
                    />
                  </div>

                  {isTankOpen && (
                    <div className="nav-tree-children">
                      {tank.racks.map(rack => {
                        const isRackOpen = expandedRacks.has(rack.rackId);
                        return (
                          <div key={rack.rackId} data-level="l2" data-id={rack.rackId}>
                            <div
                              role="button"
                              tabIndex={0}
                              aria-expanded={isRackOpen}
                              className={`nav-tree-row nav-tree-row--subcategory ${isRackOpen ? 'is-open' : ''}`}
                              onClick={() => toggleRack(rack.rackId)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') toggleRack(rack.rackId);
                              }}
                            >
                              <ChevronRight
                                size={11}
                                className={`nav-tree-row__chevron ${isRackOpen ? 'rotate-90' : ''}`}
                              />
                              <Rows3 size={13} className="flex-shrink-0 text-muted-foreground" />
                              <span className="nav-tree-row__label flex-1 text-caption text-secondary-foreground">
                                {rack.rackName}
                              </span>
                              <StorageRowMeter
                                occupied={rack.occupied}
                                total={rack.totalPositions}
                                percent={rack.utilizationPercent}
                              />
                            </div>

                            {isRackOpen && rack.boxes.length > 0 && (
                              <div className="nav-tree-children">
                                {rack.boxes.map(box => (
                                  <div key={box.boxName} data-level="l3" data-id={box.boxName}>
                                    <div className="nav-tree-row nav-tree-row--subcategory nav-tree-row--static">
                                      <span className="nav-tree-row__chevron" aria-hidden />
                                      <BoxIcon
                                        size={12}
                                        className="flex-shrink-0 text-muted-foreground"
                                      />
                                      <span className="nav-tree-row__label flex-1 text-caption text-secondary-foreground">
                                        {box.boxName}
                                      </span>
                                      <StorageRowMeter
                                        occupied={box.occupied}
                                        total={box.maxPositions}
                                        percent={box.utilizationPercent}
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

interface StorageRowMeterProps {
  occupied: number;
  total: number;
  percent: number;
}

/** Fixed-width count + bar pinned to the row's right edge so meters align across tree depths. */
function StorageRowMeter({ occupied, total, percent }: StorageRowMeterProps) {
  return (
    <div className="flex flex-shrink-0 items-center gap-2.5">
      <span className="w-20 text-right font-mono text-data-sm tabular-nums text-muted-foreground">
        {occupied}/{total}
      </span>
      <UtilizationBar percent={percent} width="w-20" />
    </div>
  );
}
