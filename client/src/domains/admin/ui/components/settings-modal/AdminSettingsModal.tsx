/**
 * Admin Settings Modal
 *
 * Top-level admin modal with lazy-loaded tabs for security, users, researchers, and system config.
 */
import React, { useState, useEffect, lazy, Suspense, useCallback } from 'react';

import { DEFAULT_SECURITY_CONFIG, sortByName } from '@odysseus/shared-schemas';
import {
  Shield,
  Activity,
  Save,
  ShieldUser,
  Gauge,
  UsersRound,
  Dna,
  BookOpen,
  TicketCheck,
} from 'lucide-react';

import { useModalStore } from '@app/stores/modalStore';
import { useAuthStore } from '@domains/authentication/stores/authStore';
import { useStorageData } from '@domains/storage';
import { logger } from '@infra/logger';
import {
  AlertBanner,
  Button,
  ConsolePanel,
  SectionHeader,
  Tab,
  LoadingSkeleton,
  Tabs,
  Tooltip,
  UnsavedChangesIndicator,
} from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays/BaseModal';
import { notifications } from '@shared/utils';

import { useLabStorageAnalyticsQuery } from '../../../hooks/useStorageAnalyticsQueries';
import { adminService } from '../../../services/AdminService';
import { adminUserService } from '../../../services/AdminUserService';
import { UtilizationBar } from '../displays/UtilizationBar';

import type { SecurityConfig, AdminUser, SystemMetrics } from '@odysseus/shared-schemas';

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

const TAB_META: Record<TabId, { icon: React.ReactNode; title: string }> = {
  system: { icon: <Gauge size={18} />, title: 'System' },
  security: { icon: <Shield size={18} />, title: 'Security' },
  users: { icon: <UsersRound size={18} />, title: 'Users' },
  researchers: { icon: <Dna size={18} />, title: 'Researchers' },
  'invite-codes': { icon: <TicketCheck size={18} />, title: 'Invite Codes' },
  catalog: { icon: <BookOpen size={18} />, title: 'Catalog' },
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
  const demoSeeded =
    isDemo &&
    (currentLab?.equipment.tanks.some(
      t => t.isSeeded ?? t.racks.some(r => r.isSeeded ?? r.boxes.some(b => b.isSeeded))
    ) ??
      false);
  const securityReadOnly = !isSystemAdmin || isDemo;

  const [activeTab, setActiveTab] = useState<TabId>('system');
  const [config, setConfig] = useState<SecurityConfig>(DEFAULT_SECURITY_CONFIG);
  const [originalConfig, setOriginalConfig] = useState<SecurityConfig>(DEFAULT_SECURITY_CONFIG);
  const [isSaving, setSaving] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [systemStats, setSystemStats] = useState<SystemMetrics | null>(null);
  const [tabFooter, setTabFooter] = useState<React.ReactNode>(null);
  const modalService = useModalStore();

  useEffect(() => {
    if (isOpen) {
      void loadConfiguration();
      if (!isSystemAdmin) {
        void loadUsers();
        void loadSystemStats();
      }
    }
  }, [isOpen, isSystemAdmin]);

  const loadConfiguration = async () => {
    try {
      const config = await adminService.getSecurityConfig();
      const loadedConfig = { ...DEFAULT_SECURITY_CONFIG, ...config };
      setConfig(loadedConfig);
      setOriginalConfig(loadedConfig);
    } catch (error) {
      logger.error('Failed to load configuration', { error });
      setConfig(DEFAULT_SECURITY_CONFIG);
      setOriginalConfig(DEFAULT_SECURITY_CONFIG);
    }
  };

  const loadUsers = async () => {
    try {
      const users = await adminUserService.getUsers();
      setUsers(sortByName(users));
    } catch (error) {
      logger.error('Failed to load users', { error });
      setUsers([]);
    }
  };

  const loadSystemStats = async () => {
    try {
      const metrics = await adminService.getMetrics();
      setSystemStats(metrics);
    } catch (error) {
      logger.error('Failed to load system stats', { error });
      setSystemStats({
        totalTubes: 0,
        totalUsers: 1,
        totalResearchers: 0,
        lastBackup: new Date(),
      });
    }
  };

  const saveConfiguration = async () => {
    const changes: Partial<SecurityConfig> = {};
    Object.keys(config).forEach(key => {
      const configKey = key as keyof SecurityConfig;
      if (config[configKey] !== originalConfig[configKey]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic property assignment to partial config object
        (changes as any)[configKey] = config[configKey];
      }
    });

    setSaving(true);
    try {
      if (isSystemAdmin) {
        await adminService.updateSecurityConfigAsSystemAdmin(changes);
      } else {
        await adminService.updateSecurityConfig(changes);
      }

      notifications.success('Security configuration updated successfully');
      setOriginalConfig(config);
      onClose();
    } catch (error) {
      logger.error('Failed to save configuration', { error });
      notifications.error('Failed to update security configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleConfigChange = (field: keyof SecurityConfig, value: boolean | number | string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const changedCount = (Object.keys(config) as (keyof SecurityConfig)[]).filter(
    key => config[key] !== originalConfig[key]
  ).length;
  const hasChanges = changedCount > 0;

  const handleClose = () => {
    if (hasChanges && activeTab === 'security') {
      modalService.showUnsavedConfirm({
        onConfirm: () => {
          modalService.hideUnsavedConfirm();
          onClose();
        },
      });
    } else {
      onClose();
    }
  };

  const handleTabFooter = useCallback((footer: React.ReactNode) => setTabFooter(footer), []);

  const tabs = (
    <Tabs
      value={activeTab}
      onChange={v => {
        setActiveTab(v as TabId);
        setTabFooter(null);
      }}
    >
      <Tab id="system" icon={<Gauge size={18} />}>
        System
      </Tab>
      {!isDemo && !isSystemAdmin && (
        <Tab id="security" icon={<Shield size={18} />}>
          Security
        </Tab>
      )}
      {!isSystemAdmin && (
        <Tab id="users" icon={<UsersRound size={18} />}>
          Users
        </Tab>
      )}
      {!isSystemAdmin && (
        <Tab id="researchers" icon={<Dna size={18} />}>
          Researchers
        </Tab>
      )}
      {!isSystemAdmin && (
        <Tab id="invite-codes" icon={<TicketCheck size={18} />}>
          Invite Codes
        </Tab>
      )}
      {!isSystemAdmin && (
        <Tab id="catalog" icon={<BookOpen size={18} />}>
          Catalog
        </Tab>
      )}
      <Tab id="monitoring" icon={<Activity size={18} />}>
        Monitoring
      </Tab>
    </Tabs>
  );

  const footer =
    activeTab === 'security' ? (
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-shrink min-w-0">
          <UnsavedChangesIndicator count={changedCount} />
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
        <div className="flex space-x-2 flex-shrink-0">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={saveConfiguration}
            disabled={!hasChanges || securityReadOnly}
            isLoading={isSaving}
            loadingText="Saving..."
            leftIcon={<Save size={14} />}
          >
            Save Changes
          </Button>
        </div>
      </div>
    ) : (
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

  const accentBar = (
    <span
      aria-hidden
      className="h-2.5 w-0.5 bg-primary/80 dark:shadow-[0_0_6px_hsl(var(--primary)/0.55)]"
    />
  );

  const locator = (
    <div className="flex items-center justify-between gap-4 font-mono">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          {accentBar}
          <span className="type-label text-label-2xs tracking-label-wide text-muted-foreground">
            {isSystemAdmin ? 'Scope' : 'Lab'}
          </span>
          <span className="text-data-sm text-secondary-foreground phosphor-text">
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
          <span className="text-data-sm text-secondary-foreground phosphor-text">
            {user?.username ?? '—'}
          </span>
        </div>
      </div>

      {utilization && (
        <div className="flex items-center gap-2.5">
          {accentBar}
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
      size="xl"
      tabs={tabs}
      tabOrientation="vertical"
      footer={footer}
      tabFooter={tabFooter}
      locator={locator}
      className="h-[85vh]"
      onClose={handleClose}
    >
      <SectionHeader icon={TAB_META[activeTab].icon} title={TAB_META[activeTab].title} size="lg" />

      {activeTab === 'security' && !isDemo && (
        <Suspense fallback={<LoadingSkeleton />}>
          {securityReadOnly && (
            <AlertBanner variant="info" spacing="sm">
              Only system admins can modify security settings.
            </AlertBanner>
          )}
          <ConsolePanel intensity="soft">
            <SecurityTab
              config={config}
              onChange={handleConfigChange}
              readOnly={securityReadOnly}
            />
          </ConsolePanel>
        </Suspense>
      )}

      {activeTab === 'invite-codes' && !isSystemAdmin && (
        <Suspense fallback={<LoadingSkeleton />}>
          <InviteCodesTab readOnly={demoSeeded} />
        </Suspense>
      )}

      {activeTab === 'users' && !isSystemAdmin && (
        <Suspense fallback={<LoadingSkeleton />}>
          <UsersTab users={users} onUserUpdate={loadUsers} readOnly={isDemo} />
        </Suspense>
      )}

      {activeTab === 'researchers' && !isSystemAdmin && (
        <Suspense fallback={<LoadingSkeleton />}>
          <ResearchersTab
            onResearcherUpdate={() => {
              void loadSystemStats();
              void loadUsers();
            }}
            onTabFooter={handleTabFooter}
            readOnly={isDemo}
          />
        </Suspense>
      )}

      {activeTab === 'catalog' && !isSystemAdmin && (
        <Suspense fallback={<LoadingSkeleton />}>
          <CatalogTab onTabFooter={handleTabFooter} readOnly={demoSeeded} />
        </Suspense>
      )}

      {activeTab === 'system' && (
        <Suspense fallback={<LoadingSkeleton />}>
          <SystemTab config={config} stats={systemStats} onChange={handleConfigChange} />
        </Suspense>
      )}

      {activeTab === 'monitoring' && (
        <Suspense fallback={<LoadingSkeleton />}>
          <MonitoringTab isSystemAdmin={isSystemAdmin} isDemo={isDemo} />
        </Suspense>
      )}
    </BaseModal>
  );
}
