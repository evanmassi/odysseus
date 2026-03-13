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
  Info,
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
import { AlertBanner, Button, Tab, LoadingSkeleton, Tabs, Tooltip } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays/BaseModal';
import { notifications } from '@shared/utils';

import { adminService } from '../../../services/AdminService';
import { adminUserService } from '../../../services/AdminUserService';

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

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSettingsModal({ isOpen, onClose }: AdminSettingsModalProps) {
  const user = useAuthStore(s => s.user);
  const isSystemAdmin = user?.role === 'system_admin';
  const isDemo = user?.isDemo ?? false;
  const { currentLab } = useStorageData();
  const demoSeeded =
    isDemo &&
    (currentLab?.equipment.tanks.some(
      t => t.isSeeded ?? t.racks.some(r => r.isSeeded ?? r.boxes.some(b => b.isSeeded))
    ) ??
      false);
  const securityReadOnly = !isSystemAdmin || isDemo;

  const [activeTab, setActiveTab] = useState<
    'security' | 'users' | 'researchers' | 'catalog' | 'system' | 'monitoring' | 'invite-codes'
  >('system');
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
        lastBackup: new Date().toISOString(),
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

  const hasChanges = Object.keys(config).some(key => {
    const configKey = key as keyof SecurityConfig;
    return config[configKey] !== originalConfig[configKey];
  });

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

  type TabId =
    | 'security'
    | 'users'
    | 'researchers'
    | 'catalog'
    | 'system'
    | 'monitoring'
    | 'invite-codes';

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
      {!isDemo && (
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
          <div className="flex items-center space-x-1.5 text-xs text-muted-foreground">
            <Info size={14} className="flex-shrink-0" />
            <span className="truncate">Changes apply to all users immediately</span>
          </div>
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

  return (
    <BaseModal
      isOpen={isOpen}
      icon={<ShieldUser size={24} />}
      title="Admin Settings"
      subtitle="Security & System Configuration"
      size="xl"
      animation="slide"
      tabs={tabs}
      tabOrientation="vertical"
      footer={footer}
      tabFooter={tabFooter}
      className="h-[85vh]"
      onClose={handleClose}
    >
      {activeTab === 'security' && !isDemo && (
        <Suspense fallback={<LoadingSkeleton />}>
          <SecurityTab config={config} onChange={handleConfigChange} readOnly={securityReadOnly} />
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
            onResearcherUpdate={loadSystemStats}
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
          <SystemTab
            config={config}
            stats={systemStats}
            onChange={handleConfigChange}
            onTabFooter={handleTabFooter}
          />
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
