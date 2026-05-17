/**
 * System Admin Dashboard
 *
 * Top-level page for system admins.
 */

import { lazy, Suspense, useState } from 'react';

import { FlaskConical, HardDrive, LayoutDashboard, Shield } from 'lucide-react';

import { IdStamp, LoadingSkeleton, StatCell, Tab, Tabs } from '@shared/ui';

import { useSystemOverviewQuery } from '../../../hooks/useLabQueries';
import { useSecurityOverviewQuery } from '../../../hooks/useSecurityMonitoringQueries';

import { LabDashboard } from './LabDashboard';
import { LabsPanel } from './LabsPanel';

const SecurityPanel = lazy(() =>
  import('./SecurityPanel').then(m => ({ default: m.SecurityPanel }))
);

const StoragePanel = lazy(() => import('./StoragePanel').then(m => ({ default: m.StoragePanel })));

export function SystemAdminDashboard() {
  const [activeTab, setActiveTab] = useState<string>('labs');
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const { data: overview } = useSystemOverviewQuery();
  const { data: securityOverview } = useSecurityOverviewQuery();
  const activeSessions = securityOverview?.sessionOverview?.activeSessions;

  if (selectedLabId) {
    return <LabDashboard labId={selectedLabId} onBack={() => setSelectedLabId(null)} />;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-4">
        <div>
          <h1 className="flex items-center gap-3 font-display text-[32px] font-normal tracking-[-0.015em] leading-none">
            <LayoutDashboard size={28} className="text-foreground/60" />
            System Overview
          </h1>
          {overview && (
            <div className="mt-2">
              <IdStamp
                parts={[
                  `${overview.activeLabs + overview.inactiveLabs} ${
                    overview.activeLabs + overview.inactiveLabs === 1 ? 'lab' : 'labs'
                  }`,
                  `${overview.activeLabs} active · ${overview.inactiveLabs} inactive`,
                  `${overview.activeUsersLast24h} ${
                    overview.activeUsersLast24h === 1 ? 'user' : 'users'
                  } active today`,
                ]}
              />
            </div>
          )}
        </div>

        {overview && (
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
                label="Labs Online"
                value={overview.activeLabs}
                footer={`of ${overview.totalLabs} registered`}
                tone="success"
                className="flex-1"
              />
              <StatCell
                label="Users Active 24h"
                value={overview.activeUsersLast24h}
                footer={`of ${overview.totalUsers} registered`}
                className="flex-1"
              />
              <StatCell label="Active Sessions" value={activeSessions ?? '—'} className="flex-1" />
              {/* TODO(2026-05-15): wire to tubes-created-in-last-24h aggregator */}
              <StatCell label="Tubes Added 24h" value="—" className="flex-1" />
              {/* TODO(2026-05-15): wire to cross-cutting anomaly aggregator */}
              <StatCell
                label="Needs Attention"
                value="—"
                unit="items"
                tone="danger"
                className="flex-1"
              />
            </div>
          </div>
        )}

        <div className="border-b border-border">
          <Tabs value={activeTab} onChange={setActiveTab} orientation="horizontal">
            <Tab id="labs" icon={<FlaskConical size={18} />}>
              Labs
            </Tab>
            <Tab id="security" icon={<Shield size={18} />}>
              Security
            </Tab>
            <Tab id="storage" icon={<HardDrive size={18} />}>
              Storage
            </Tab>
          </Tabs>
        </div>

        <div className="pt-2">
          {activeTab === 'labs' && <LabsPanel onSelectLab={setSelectedLabId} />}

          {activeTab === 'security' && (
            <Suspense fallback={<LoadingSkeleton />}>
              <SecurityPanel />
            </Suspense>
          )}

          {activeTab === 'storage' && (
            <Suspense fallback={<LoadingSkeleton />}>
              <StoragePanel />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}
