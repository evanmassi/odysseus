import React, { useState, useEffect, useCallback } from 'react';

import { refrigeratorFreezer } from '@lucide/lab';
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

import { useLabId } from '@domains/authentication';
import { useStorageData } from '@domains/storage';
import { Button, Chip, Input, SettingsRow, StatCell, STAT_STRIP, Subsection } from '@shared/ui';
import { NavTreeLines } from '@shared/ui/components/tree-lines';
import { notifications } from '@shared/utils';
import { formatDateForDisplay } from '@shared/utils/dateFormatters';

import { useLabStorageAnalyticsQuery } from '../../../../hooks/useStorageAnalyticsQueries';
import { useUpdateSystemSettingsMutation } from '../../../../hooks/useSystemSettingsMutation';
import { useVersionInfoQuery } from '../../../../hooks/useVersionInfoQuery';
import { UtilizationBar } from '../../displays/UtilizationBar';
import { DataExportForm } from '../DataExportForm';

import type { SystemMetrics } from '@odysseus/shared-schemas';

interface SystemTabProps {
  stats: SystemMetrics | null;
}

export function SystemTab({ stats }: SystemTabProps) {
  const labId = useLabId();
  const hasLab = !!labId;
  const { currentLab } = useStorageData({ enabled: hasLab });
  const { data: versionInfo } = useVersionInfoQuery();
  const updateSystemSettingsMutation = useUpdateSystemSettingsMutation();

  const [isEditingLabName, setIsEditingLabName] = useState(false);
  const [labNameInput, setLabNameInput] = useState(currentLab?.name ?? '');

  useEffect(() => {
    setLabNameInput(currentLab?.name ?? '');
  }, [currentLab?.name]);

  const handleSaveLabName = useCallback(() => {
    if (updateSystemSettingsMutation.isPending) return;
    const trimmedName = labNameInput.trim();
    if (!trimmedName) {
      notifications.error('Lab name cannot be empty');
      return;
    }

    if (trimmedName === currentLab?.name) {
      setIsEditingLabName(false);
      return;
    }

    updateSystemSettingsMutation.mutate(trimmedName, {
      onSuccess: () => {
        notifications.success('Lab name updated successfully');
        setIsEditingLabName(false);
      },
      onError: () => {
        setLabNameInput(currentLab?.name ?? '');
      },
    });
  }, [labNameInput, currentLab?.name, updateSystemSettingsMutation]);

  const handleCancelLabNameEdit = useCallback(() => {
    setLabNameInput(currentLab?.name ?? '');
    setIsEditingLabName(false);
  }, [currentLab?.name]);

  const handleLabNameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSaveLabName();
      } else if (e.key === 'Escape') {
        handleCancelLabNameEdit();
      }
    },
    [handleSaveLabName, handleCancelLabNameEdit]
  );

  return (
    <div>
      {stats && (
        <div className={`${STAT_STRIP} ml-1 mr-3`}>
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
            label="Config Modified"
            value={stats.lastBackup ? formatDateForDisplay(stats.lastBackup) : 'Never'}
            icon={<DatabaseBackup size={11} />}
            className="flex-1"
          />
        </div>
      )}

      {hasLab && (
        <Subsection title="Laboratory" index={1} accent>
          <SettingsRow
            label="Lab Name"
            hint="Display name shown across the app"
            className="col-span-2"
          >
            <div className="flex w-72 items-center justify-end gap-2">
              {isEditingLabName ? (
                <Input
                  type="text"
                  value={labNameInput}
                  onValueChange={setLabNameInput}
                  onKeyDown={handleLabNameKeyDown}
                  onBlur={() => handleSaveLabName()}
                  size="sm"
                  className="w-full"
                  title="Enter to save · Esc to cancel"
                  // eslint-disable-next-line jsx-a11y/no-autofocus -- Intentional for inline edit UX
                  autoFocus
                />
              ) : (
                <>
                  <span
                    className="truncate font-mono text-data-sm font-semibold text-foreground"
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
        </Subsection>
      )}

      {hasLab && <StorageUtilizationSection />}

      <Subsection title="Data Export" index={hasLab ? 3 : 1} accent>
        <div className="col-span-2 py-4">
          <DataExportForm />
        </div>
      </Subsection>

      <Subsection title="About" index={hasLab ? 4 : 2} accent>
        <SettingsRow label="Odysseus version" hint="© 2025 Evan Massi" className="col-span-2">
          <span className="font-mono text-data-sm font-semibold text-foreground">
            v{versionInfo?.version ?? '—'}
          </span>
        </SettingsRow>
      </Subsection>
    </div>
  );
}

function toggleInSet(
  setExpanded: (updater: (prev: Set<string>) => Set<string>) => void,
  id: string
) {
  setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
}

function StorageUtilizationSection() {
  const { data } = useLabStorageAnalyticsQuery();
  const [expandedTanks, setExpandedTanks] = useState<Set<string>>(new Set());
  const [expandedRacks, setExpandedRacks] = useState<Set<string>>(new Set());

  const toggleTank = (id: string) => toggleInSet(setExpandedTanks, id);
  const toggleRack = (id: string) => toggleInSet(setExpandedRacks, id);

  if (!data) return null;

  return (
    <Subsection title="Storage Utilization" index={2} accent>
      <div className="col-span-2 space-y-3 py-4">
        <div className="flex items-center justify-between border border-transparent px-2">
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
                    className={`nav-tree-row row-glow nav-tree-row--category ${isTankOpen ? 'is-open' : ''}`}
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
                              className={`nav-tree-row row-glow nav-tree-row--subcategory ${isRackOpen ? 'is-open' : ''}`}
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
                                    <div className="nav-tree-row row-glow nav-tree-row--subcategory nav-tree-row--static">
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
                labelClassName="normal-case !tracking-data"
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

function StorageRowMeter({ occupied, total, percent }: StorageRowMeterProps) {
  return (
    <div className="flex flex-shrink-0 items-center gap-2.5">
      <span className="w-20 text-right font-mono text-data-sm tabular-nums text-muted-foreground">
        {occupied}/{total}
      </span>
      <UtilizationBar percent={percent} />
    </div>
  );
}
