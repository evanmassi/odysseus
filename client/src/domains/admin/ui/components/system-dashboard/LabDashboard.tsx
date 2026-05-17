/**
 * Lab Dashboard
 *
 * Drill-down view for a single lab: header, stat strip, demo settings, users, researchers, audit log.
 */

import { useState, useMemo } from 'react';

import {
  ArrowLeft,
  BeanOff,
  Check,
  ChevronDown,
  Dna,
  Power,
  RefreshCw,
  ShieldUser,
  Sprout,
  SquarePen,
  TestTube,
  UsersRound,
  X,
} from 'lucide-react';

import { Button, Chip, IdStamp, SectionHeader, StatCell } from '@shared/ui';
import { LabBadge } from '@shared/ui/components/badges';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { notifications } from '@shared/utils';

import {
  useActivateLabMutation,
  useDeactivateLabMutation,
  useUpdateLabMutation,
} from '../../../hooks/useLabMutations';
import { useLabDetailsQuery } from '../../../hooks/useLabQueries';
import { AuditLogViewer } from '../settings-modal/AuditLogViewer';

import { LabDemoSettings } from './LabDemoSettings';
import { LabResearchersPanel } from './LabResearchersPanel';
import { LabUsersPanel } from './LabUsersPanel';

import type { LabDetailsUser } from '@odysseus/shared-schemas';
import type { SortConfig } from '@shared/ui';

interface LabDashboardProps {
  labId: string;
  onBack: () => void;
}

export function LabDashboard({ labId, onBack }: LabDashboardProps) {
  const { data: details, isLoading, isFetching, refetch } = useLabDetailsQuery(labId);
  const updateLabMutation = useUpdateLabMutation();
  const activateLabMutation = useActivateLabMutation();
  const deactivateLabMutation = useDeactivateLabMutation();

  const [userSortConfig, setUserSortConfig] = useState<SortConfig | undefined>(undefined);
  const [researcherSortConfig, setResearcherSortConfig] = useState<SortConfig | undefined>(
    undefined
  );
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  const users = useMemo(() => {
    const source = details?.users ?? [];
    if (!userSortConfig) return source;
    return [...source].sort((a, b) => {
      const { columnId, direction } = userSortConfig;
      const aVal = String(a[columnId as keyof LabDetailsUser] ?? '');
      const bVal = String(b[columnId as keyof LabDetailsUser] ?? '');
      const cmp = aVal.localeCompare(bVal);
      return direction === 'asc' ? cmp : -cmp;
    });
  }, [details?.users, userSortConfig]);

  const sortedResearchers = useMemo(() => {
    const source = details?.researchers ?? [];
    if (!researcherSortConfig) return source;
    return [...source].sort((a, b) => {
      const { columnId, direction } = researcherSortConfig;
      if (columnId === 'tubeCount') {
        const diff = a.tubeCount - b.tubeCount;
        return direction === 'asc' ? diff : -diff;
      }
      const aVal = columnId === 'name' ? a.lastName : '';
      const bVal = columnId === 'name' ? b.lastName : '';
      const cmp = aVal.localeCompare(bVal);
      return direction === 'asc' ? cmp : -cmp;
    });
  }, [details?.researchers, researcherSortConfig]);

  if (isLoading || !details) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <Button variant="ghost" size="sm" onClick={onBack} leftIcon={<ArrowLeft size={14} />}>
            Back to Labs
          </Button>
          <div className="text-center py-12 text-muted-foreground text-sm">
            Loading lab details...
          </div>
        </div>
      </div>
    );
  }

  const { lab, researcherCount, tubeCount, storageSummary } = details;
  const adminCount = users.filter(u => u.role === 'lab_admin').length;
  const assignedTubes = details.researchers.reduce((sum, r) => sum + r.tubeCount, 0);
  const tubesWithoutResearcher = tubeCount - assignedTubes;

  const handleRename = async () => {
    if (!newName.trim()) return;
    try {
      await updateLabMutation.mutateAsync({ id: labId, name: newName.trim() });
      notifications.success('Lab renamed');
      setIsRenaming(false);
    } catch {
      notifications.error('Failed to rename lab');
    }
  };

  const handleActivate = async () => {
    try {
      await activateLabMutation.mutateAsync(labId);
      notifications.success('Lab activated');
    } catch {
      notifications.error('Failed to activate lab');
    }
  };

  const handleDeactivate = async () => {
    try {
      await deactivateLabMutation.mutateAsync(labId);
      notifications.success('Lab deactivated');
      setShowDeactivate(false);
    } catch {
      notifications.error('Failed to deactivate lab');
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack} leftIcon={<ArrowLeft size={14} />}>
          Back to Labs
        </Button>

        <div className="flex items-end justify-between gap-4">
          <div className="flex items-end gap-3 min-w-0">
            <LabBadge
              labId={labId}
              labName={lab.name}
              size="md"
              isDemo={lab.isDemo}
              isActive={lab.isActive}
            />
            <div className="flex flex-col gap-2 min-w-0">
              {isRenaming ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="font-display text-[32px] font-normal leading-none tracking-[-0.015em] bg-transparent border-b border-foreground/20 px-1 focus:outline-none focus:border-primary text-foreground"
                    onKeyDown={e => e.key === 'Enter' && handleRename()}
                    ref={(el: HTMLInputElement | null) => el?.focus()}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    onClick={handleRename}
                    isLoading={updateLabMutation.isPending}
                    aria-label="Save"
                  >
                    <Check size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    onClick={() => setIsRenaming(false)}
                    aria-label="Cancel"
                  >
                    <X size={14} />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <h1 className="font-display text-[32px] font-normal leading-none tracking-[-0.015em] text-foreground">
                    {lab.name}
                  </h1>
                  <Button
                    variant="ghost"
                    size="xs"
                    iconOnly
                    onClick={() => {
                      setNewName(lab.name);
                      setIsRenaming(true);
                    }}
                    aria-label="Rename lab"
                  >
                    <SquarePen size={12} />
                  </Button>
                  {lab.isDemo && (
                    <Chip
                      color={details.isSeeded ? 'success' : 'warning'}
                      size="xs"
                      leftIcon={details.isSeeded ? <Sprout /> : <BeanOff />}
                    >
                      {details.isSeeded ? 'Seeded' : 'Not Seeded'}
                    </Chip>
                  )}
                </div>
              )}
              <IdStamp
                parts={[
                  `/${lab.slug}`,
                  `${storageSummary.tankCount} ${storageSummary.tankCount === 1 ? 'tank' : 'tanks'} · ${storageSummary.rackCount} ${storageSummary.rackCount === 1 ? 'rack' : 'racks'} · ${storageSummary.boxCount} ${storageSummary.boxCount === 1 ? 'box' : 'boxes'}`,
                  lab.isActive ? 'active' : 'deactivated',
                ]}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void refetch()}
              disabled={isLoading}
              leftIcon={<RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />}
            >
              Refresh
            </Button>
            {lab.isActive ? (
              <Button
                variant="ghost-danger"
                size="sm"
                onClick={() => setShowDeactivate(true)}
                leftIcon={<Power size={14} />}
              >
                Deactivate
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleActivate}
                isLoading={activateLabMutation.isPending}
                leftIcon={<Power size={14} />}
              >
                Activate
              </Button>
            )}
          </div>
        </div>

        <div className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-card bg-scanlines"
            style={{
              maskImage:
                'linear-gradient(to right, transparent, black 40px, black calc(100% - 40px), transparent), linear-gradient(to bottom, transparent, black 40px, black calc(100% - 40px), transparent)',
              WebkitMaskImage:
                'linear-gradient(to right, transparent, black 40px, black calc(100% - 40px), transparent), linear-gradient(to bottom, transparent, black 40px, black calc(100% - 40px), transparent)',
              maskComposite: 'intersect',
              WebkitMaskComposite: 'source-in',
            }}
          />
          <div className="relative flex divide-x divide-line-soft">
            <StatCell
              label="Admins"
              value={adminCount}
              icon={<ShieldUser size={11} />}
              className="flex-1"
            />
            <StatCell
              label="Users"
              value={users.length}
              icon={<UsersRound size={11} />}
              className="flex-1"
            />
            <StatCell
              label="Researchers"
              value={researcherCount}
              icon={<Dna size={11} />}
              className="flex-1"
            />
            <StatCell
              label="Tubes"
              value={tubeCount}
              footer={
                tubesWithoutResearcher > 0 ? `${tubesWithoutResearcher} unassigned` : undefined
              }
              tone={tubesWithoutResearcher > 0 ? 'warning' : 'default'}
              icon={<TestTube size={11} />}
              className="flex-1"
            />
          </div>
        </div>

        {lab.isDemo && <LabDemoSettings labId={labId} isSeeded={details.isSeeded} />}

        <LabUsersPanel
          labId={labId}
          users={users}
          sortConfig={userSortConfig}
          onSort={setUserSortConfig}
        />

        <LabResearchersPanel
          researchers={sortedResearchers}
          sortConfig={researcherSortConfig}
          onSort={setResearcherSortConfig}
          onResearcherDeleted={() => void refetch()}
        />

        <div>
          <div className="flex items-center gap-3">
            <SectionHeader title="Audit Log" />
            <button
              type="button"
              onClick={() => setShowAudit(o => !o)}
              className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 transition-colors hover:text-foreground/70"
            >
              <ChevronDown
                size={12}
                className={`transition-transform ${showAudit ? '' : '-rotate-90'}`}
              />
              {showAudit ? 'Hide' : 'Show'}
            </button>
          </div>
          {showAudit && <AuditLogViewer labId={labId} readOnly hideHeader />}
        </div>

        <ConfirmDialog
          isOpen={showDeactivate}
          title="Deactivate Lab"
          message="Deactivating a lab prevents all its users from logging in. Lab data is preserved. This can be reversed."
          confirmText="Deactivate"
          variant="danger"
          onConfirm={handleDeactivate}
          onCancel={() => setShowDeactivate(false)}
        />
      </div>
    </div>
  );
}
