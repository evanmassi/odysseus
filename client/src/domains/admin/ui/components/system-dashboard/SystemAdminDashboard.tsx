/**
 * System Admin Dashboard
 *
 * Shell for system admins: overview chips and tabbed panels for labs and security monitoring.
 */

import { lazy, Suspense, useState } from 'react';

import { Activity, CircleAlert, Clock, FlaskConical, LayoutDashboard, Shield } from 'lucide-react';

import { Chip, LoadingSkeleton, Tab, Tabs } from '@shared/ui';

import { useSystemOverviewQuery } from '../../../hooks/useLabQueries';

import { LabDashboard } from './LabDashboard';
import { LabsPanel } from './LabsPanel';

const SecurityPanel = lazy(() =>
  import('./SecurityPanel').then(m => ({ default: m.SecurityPanel }))
);

export function SystemAdminDashboard() {
  const [activeTab, setActiveTab] = useState<string>('labs');
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const { data: overview } = useSystemOverviewQuery();

  if (selectedLabId) {
    return <LabDashboard labId={selectedLabId} onBack={() => setSelectedLabId(null)} />;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center gap-2">
          <LayoutDashboard size={18} className="text-muted-foreground" />
          <h2 className="text-lg font-semibold text-card-foreground">Overview</h2>
        </div>

        {overview && (
          <div className="flex flex-wrap items-center gap-2">
            <Chip color="info" size="sm" leftIcon={<FlaskConical />}>
              {overview.activeLabs} {overview.activeLabs === 1 ? 'lab' : 'labs'} active
              {overview.inactiveLabs > 0 && ` · ${overview.inactiveLabs} inactive`}
            </Chip>
            <Chip color="info" size="sm" leftIcon={<Activity />}>
              {overview.activeUsersLast24h} {overview.activeUsersLast24h === 1 ? 'user' : 'users'}{' '}
              active today
            </Chip>
            <Chip
              color={overview.pendingApprovals > 0 ? 'warning' : 'success'}
              size="sm"
              leftIcon={overview.pendingApprovals > 0 ? <CircleAlert /> : <Clock />}
            >
              {overview.pendingApprovals} {overview.pendingApprovals === 1 ? 'user' : 'users'}{' '}
              pending
            </Chip>
          </div>
        )}

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tab id="labs" icon={<FlaskConical size={18} />}>
            Labs
          </Tab>
          <Tab id="security" icon={<Shield size={18} />}>
            Security
          </Tab>
        </Tabs>

        {activeTab === 'labs' && <LabsPanel onSelectLab={setSelectedLabId} />}

        {activeTab === 'security' && (
          <Suspense fallback={<LoadingSkeleton />}>
            <SecurityPanel />
          </Suspense>
        )}
      </div>
    </div>
  );
}
