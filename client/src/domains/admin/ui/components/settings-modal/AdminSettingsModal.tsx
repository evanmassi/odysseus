import React, { useState, useEffect, lazy, Suspense, useCallback } from 'react';

import { sortByName } from '@odysseus/shared-schemas';
import { useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  Activity,
  ShieldUser,
  Gauge,
  UsersRound,
  Dna,
  BookOpen,
  TicketCheck,
} from 'lucide-react';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId, useAuthStore } from '@domains/authentication';
import { useDemoTaxonomyLock, useStorageData } from '@domains/storage';
import {
  AccentTick,
  AlertBanner,
  Button,
  SectionHeader,
  Tab,
  LoadingSkeleton,
  Tabs,
  Tooltip,
} from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays/BaseModal';

import { useSecurityConfig } from '../../../hooks/useSecurityConfig';
import { useLabStorageAnalyticsQuery } from '../../../hooks/useStorageAnalyticsQueries';
import { useSystemMetricsQuery } from '../../../hooks/useSystemMetricsQuery';
import { useUsersQuery } from '../../../hooks/useUsersQuery';
import { UtilizationBar } from '../displays/UtilizationBar';

const SecurityTab = lazy(() =>
  import('./tabs/SecurityTab').then(m => ({ default: m.SecurityTab }))
);
const UsersTab = lazy(() => import('./tabs/UsersTab').then(m => ({ default: m.UsersTab })));
const ResearchersTab = lazy(() =>
  import('./tabs/ResearchersTab').then(m => ({ default: m.ResearchersTab }))
);
const SystemTab = lazy(() => import('./tabs/SystemTab').then(m => ({ default: m.SystemTab })));
const MonitoringTab = lazy(() =>
  import('./tabs/MonitoringTab').then(m => ({ default: m.MonitoringTab }))
);
const CatalogTab = lazy(() => import('./tabs/CatalogTab').then(m => ({ default: m.CatalogTab })));
const InviteCodesTab = lazy(() =>
  import('./tabs/InviteCodesTab').then(m => ({ default: m.InviteCodesTab }))
);

type TabId =
  | 'security'
  | 'users'
  | 'researchers'
  | 'catalog'
  | 'system'
  | 'monitoring'
  | 'invite-codes';

interface TabVisibilityContext {
  isDemo: boolean;
  isSystemAdmin: boolean;
}

type TabMeta = {
  icon: React.ReactNode;
  title: string;
  visible?: (ctx: TabVisibilityContext) => boolean;
};

const TAB_META: Record<TabId, TabMeta> = {
  system: { icon: <Gauge size={18} />, title: 'System' },
  security: {
    icon: <Shield size={18} />,
    title: 'Security',
    visible: ({ isDemo, isSystemAdmin }) => !isDemo && !isSystemAdmin,
  },
  users: {
    icon: <UsersRound size={18} />,
    title: 'Users',
    visible: ({ isSystemAdmin }) => !isSystemAdmin,
  },
  researchers: {
    icon: <Dna size={18} />,
    title: 'Researchers',
    visible: ({ isSystemAdmin }) => !isSystemAdmin,
  },
  'invite-codes': {
    icon: <TicketCheck size={18} />,
    title: 'Invite Codes',
    visible: ({ isSystemAdmin }) => !isSystemAdmin,
  },
  catalog: {
    icon: <BookOpen size={18} />,
    title: 'Catalog',
    visible: ({ isSystemAdmin }) => !isSystemAdmin,
  },
  monitoring: { icon: <Activity size={18} />, title: 'Monitoring' },
};

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSettingsModal({ isOpen, onClose }: AdminSettingsModalProps) {
  const user = useAuthStore(s => s.user);
  const isSystemAdmin = user?.role === 'system_admin';
  const isDemo = user?.isDemo ?? false;
  const { currentLab } = useStorageData();
  const { data: utilization } = useLabStorageAnalyticsQuery();
  const demoSeeded = useDemoTaxonomyLock();
  const [activeTab, setActiveTab] = useState<TabId>('system');
  const [tabFooter, setTabFooter] = useState<React.ReactNode>(null);
  const [tabAction, setTabAction] = useState<React.ReactNode>(null);

  const queryClient = useQueryClient();
  const labId = useLabId();
  const { data: users = [] } = useUsersQuery({
    queryOptions: { enabled: isOpen && !isSystemAdmin, select: sortByName },
  });
  const metricsQuery = useSystemMetricsQuery({ enabled: isOpen && !isSystemAdmin });
  const systemStats = metricsQuery.data ?? null;
  const refreshUsers = () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users(labId) });

  const { config, handleConfigChange, load: loadConfiguration } = useSecurityConfig();

  useEffect(() => {
    if (isOpen) {
      void loadConfiguration();
    }
  }, [isOpen, loadConfiguration]);

  const handleTabFooter = useCallback((footer: React.ReactNode) => setTabFooter(footer), []);
  const handleTabAction = useCallback((action: React.ReactNode) => setTabAction(action), []);

  const tabs = (
    <Tabs
      orientation="vertical"
      value={activeTab}
      onChange={v => {
        setActiveTab(v as TabId);
        setTabFooter(null);
        setTabAction(null);
      }}
    >
      {(Object.entries(TAB_META) as [TabId, TabMeta][])
        .filter(([, meta]) => meta.visible?.({ isDemo, isSystemAdmin }) ?? true)
        .map(([id, meta]) => (
          <Tab key={id} id={id} icon={meta.icon}>
            {meta.title}
          </Tab>
        ))}
    </Tabs>
  );

  const footer = (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 flex-shrink min-w-0">
        {isDemo && (
          <Tooltip content="Some management features are restricted" side="top">
            <div>
              <AlertBanner variant="demo" spacing="none">
                Demo Environment
              </AlertBanner>
            </div>
          </Tooltip>
        )}
      </div>
      <Button variant="secondary" onClick={onClose}>
        Done
      </Button>
    </div>
  );

  const locator = (
    <div className="flex items-center justify-between gap-4 font-mono">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <AccentTick />
          <span className="type-label text-label-2xs tracking-label-wide text-muted-foreground">
            {isSystemAdmin ? 'Scope' : 'Lab'}
          </span>
          <span className="text-data-sm text-foreground">
            {isSystemAdmin ? 'System-wide' : (currentLab?.name ?? '—')}
          </span>
        </div>
        <span aria-hidden className="text-muted-foreground/40">
          ·
        </span>
        <div className="flex items-center gap-2.5">
          <span className="type-label text-label-2xs tracking-label-wide text-muted-foreground">
            Admin
          </span>
          <span className="text-data-sm text-foreground">{user?.username ?? '—'}</span>
        </div>
      </div>

      {utilization && (
        <div className="flex items-center gap-2.5">
          <AccentTick />
          <span className="type-label text-label-2xs tracking-label-wide text-muted-foreground">
            Storage
          </span>
          <UtilizationBar percent={utilization.utilizationPercent} />
        </div>
      )}
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      icon={<ShieldUser size={24} />}
      title="Admin Settings"
      subtitle="Security & System Configuration"
      size="xl-wide"
      tabs={tabs}
      tabOrientation="vertical"
      footer={footer}
      tabFooter={tabFooter}
      locator={locator}
      className="h-[85vh]"
      contentClassName="flex h-full min-h-0 flex-col p-6"
      onClose={onClose}
    >
      <SectionHeader
        icon={TAB_META[activeTab].icon}
        title={TAB_META[activeTab].title}
        rightMeta={tabAction}
        className="mb-1.5"
        size="lg"
      />

      {activeTab === 'security' && !isDemo && (
        <Suspense fallback={<LoadingSkeleton />}>
          <div className="space-y-4">
            <AlertBanner variant="info" spacing="none">
              Only system admins can modify security settings.
            </AlertBanner>
            <SecurityTab config={config} onChange={handleConfigChange} readOnly />
          </div>
        </Suspense>
      )}

      {activeTab === 'invite-codes' && !isSystemAdmin && (
        <Suspense fallback={<LoadingSkeleton />}>
          <InviteCodesTab readOnly={demoSeeded} onTabAction={handleTabAction} />
        </Suspense>
      )}

      {activeTab === 'users' && !isSystemAdmin && (
        <Suspense fallback={<LoadingSkeleton />}>
          <UsersTab
            users={users}
            onUserUpdate={refreshUsers}
            onTabAction={handleTabAction}
            readOnly={isDemo}
          />
        </Suspense>
      )}

      {activeTab === 'researchers' && !isSystemAdmin && (
        <Suspense fallback={<LoadingSkeleton />}>
          <ResearchersTab
            onResearcherUpdate={() => {
              void queryClient.invalidateQueries({ queryKey: queryKeys.admin.metrics(labId) });
              refreshUsers();
            }}
            onTabFooter={handleTabFooter}
            onTabAction={handleTabAction}
            readOnly={isDemo}
          />
        </Suspense>
      )}

      {activeTab === 'catalog' && !isSystemAdmin && (
        <Suspense fallback={<LoadingSkeleton />}>
          <CatalogTab
            onTabFooter={handleTabFooter}
            onTabAction={handleTabAction}
            readOnly={demoSeeded}
          />
        </Suspense>
      )}

      {activeTab === 'system' && (
        <Suspense fallback={<LoadingSkeleton />}>
          <SystemTab stats={systemStats} />
        </Suspense>
      )}

      {activeTab === 'monitoring' && (
        <Suspense fallback={<LoadingSkeleton />}>
          <MonitoringTab
            isSystemAdmin={isSystemAdmin}
            isDemo={isDemo}
            onTabAction={handleTabAction}
          />
        </Suspense>
      )}
    </BaseModal>
  );
}
