/**
 * Lab Dashboard
 *
 * Drill-down view for a single lab: users, researchers, storage stats, demo settings, and audit log.
 */

import { useState, useMemo } from 'react';

import * as Collapsible from '@radix-ui/react-collapsible';
import { Activity, ArrowLeft, ChevronDown } from 'lucide-react';

import { Button } from '@shared/ui';

import { useLabDetailsQuery } from '../../../hooks/useLabQueries';
import { AuditLogViewer } from '../settings-modal/AuditLogViewer';

import { DemoSettings } from './DemoSettings';
import { LabInfoPanel } from './LabInfoPanel';
import { LabResearchersPanel } from './LabResearchersPanel';
import { LabUsersPanel } from './LabUsersPanel';

import type { LabDetailsUser } from '@odysseus/shared-schemas';
import type { SortConfig } from '@shared/ui';

interface LabDashboardProps {
  labId: string;
  onBack: () => void;
}

export function LabDashboard({ labId, onBack }: LabDashboardProps) {
  const { data: details, isLoading, refetch } = useLabDetailsQuery(labId);

  const [userSortConfig, setUserSortConfig] = useState<SortConfig | undefined>(undefined);
  const [researcherSortConfig, setResearcherSortConfig] = useState<SortConfig | undefined>(
    undefined
  );

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
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Button variant="ghost" size="sm" onClick={onBack} leftIcon={<ArrowLeft size={14} />}>
            Back
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

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} leftIcon={<ArrowLeft size={14} />}>
            Back
          </Button>
        </div>

        <LabInfoPanel
          labId={labId}
          lab={lab}
          isSeeded={details.isSeeded}
          adminCount={adminCount}
          userCount={users.length}
          researcherCount={researcherCount}
          tubeCount={tubeCount}
          storageSummary={storageSummary}
        />

        {lab.isDemo && <DemoSettings labId={labId} isSeeded={details.isSeeded} />}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <LabUsersPanel
              labId={labId}
              users={users}
              sortConfig={userSortConfig}
              onSort={setUserSortConfig}
            />
          </div>
          <div className="lg:col-span-2">
            <LabResearchersPanel
              researchers={sortedResearchers}
              sortConfig={researcherSortConfig}
              onSort={setResearcherSortConfig}
              onResearcherDeleted={() => void refetch()}
            />
          </div>
        </div>

        <Collapsible.Root defaultOpen={false} className="rounded-lg border border-border bg-card">
          <Collapsible.Trigger className="flex w-full items-center justify-between p-3 cursor-pointer group">
            <div className="flex items-center gap-2">
              <ChevronDown
                size={14}
                className="text-secondary-foreground transition-transform duration-200 group-data-[state=closed]:-rotate-90"
              />
              <Activity size={16} className="text-secondary-foreground" />
              <h3 className="text-sm font-semibold text-card-foreground">Audit Log</h3>
            </div>
          </Collapsible.Trigger>
          <Collapsible.Content className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
            <div className="px-3 pb-3">
              <AuditLogViewer labId={labId} readOnly />
            </div>
          </Collapsible.Content>
        </Collapsible.Root>
      </div>
    </div>
  );
}
