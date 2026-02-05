import { useState, useEffect, lazy, Suspense } from 'react';

import { DEFAULT_SECURITY_CONFIG, sortByName } from '@odysseus/shared-schemas';
import {
  Shield,
  Activity,
  AlertTriangle,
  Save,
  ShieldUser,
  Gauge,
  UsersRound,
  FlaskConical,
} from 'lucide-react';

import { useModalStore } from '@app/stores/modalStore';
import { logger } from '@shared/infrastructure/logger';
import { Button, Tab, Tabs } from '@shared/ui';
import { ResearcherIcon } from '@shared/ui/components/icons';
import { BaseModal } from '@shared/ui/components/modals/BaseModal';
import { notifications } from '@shared/utils';

import { adminService } from '../../services/AdminService';

import { TabSkeleton } from './TabSkeleton';

import type { SecurityConfig, AdminUser, SystemMetrics } from '@odysseus/shared-schemas';

// Lazy-load tab components for code splitting
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
const DemoManagementTab = lazy(() =>
  import('./tabs/DemoManagementTab').then(m => ({ default: m.DemoManagementTab }))
);

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSettingsModal({ isOpen, onClose }: AdminSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<
    'security' | 'users' | 'researchers' | 'system' | 'monitoring' | 'demo'
  >('system');
  const [config, setConfig] = useState<SecurityConfig>(DEFAULT_SECURITY_CONFIG);
  const [originalConfig, setOriginalConfig] = useState<SecurityConfig>(DEFAULT_SECURITY_CONFIG);
  const [isSaving, setSaving] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [systemStats, setSystemStats] = useState<SystemMetrics | null>(null);
  const modalService = useModalStore();

  // Load current configuration and data
  useEffect(() => {
    if (isOpen) {
      // SessionManager handles authentication automatically
      void loadConfiguration();
      void loadUsers();
      void loadSystemStats();
    }
  }, [isOpen]);

  const loadConfiguration = async () => {
    try {
      const response = await adminService.getSecurityConfig();

      if (response.success && response.config) {
        // Merge with defaults to ensure all fields are present
        const loadedConfig = { ...DEFAULT_SECURITY_CONFIG, ...response.config };
        setConfig(loadedConfig);
        setOriginalConfig(loadedConfig); // Store original for change tracking
      }
    } catch (error) {
      logger.error('Failed to load configuration', { error });
      // Keep defaults on error
      setConfig(DEFAULT_SECURITY_CONFIG);
      setOriginalConfig(DEFAULT_SECURITY_CONFIG);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await adminService.getUsers();

      if (response.success && Array.isArray(response.users)) {
        setUsers(sortByName(response.users));
      } else {
        // API returned unsuccessfully or invalid data - set empty array as fallback
        setUsers([]);
        logger.warn(
          'Failed to load users: API returned unsuccessful response or invalid data format'
        );
      }
    } catch (error) {
      logger.error('Failed to load users', { error });
      setUsers([]);
    }
  };

  const loadSystemStats = async () => {
    try {
      const response = await adminService.getMetrics();

      if (response.success && response.data) {
        setSystemStats(response.data);
      }
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
    // SessionManager handles authentication automatically

    // Calculate only the fields that actually changed
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
      const response = await adminService.updateSecurityConfig(changes);

      if (response.success) {
        notifications.success('Security configuration updated successfully');
        // Update original config to reflect saved state
        setOriginalConfig(config);
        // Close modal after successful save
        onClose();
      } else {
        notifications.error('Failed to update security configuration');
      }
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

  // Check if there are any unsaved changes
  const hasChanges = Object.keys(config).some(key => {
    const configKey = key as keyof SecurityConfig;
    return config[configKey] !== originalConfig[configKey];
  });

  const handleClose = () => {
    if (hasChanges) {
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

  type TabId = 'security' | 'users' | 'researchers' | 'system' | 'monitoring' | 'demo';

  const tabs = (
    <Tabs value={activeTab} onChange={v => setActiveTab(v as TabId)}>
      <Tab id="system" icon={<Gauge size={18} />}>
        System
      </Tab>
      <Tab id="security" icon={<Shield size={18} />}>
        Security
      </Tab>
      <Tab id="users" icon={<UsersRound size={18} />}>
        Users
      </Tab>
      <Tab id="researchers" icon={<ResearcherIcon size={24} />}>
        Researchers
      </Tab>
      <Tab id="monitoring" icon={<Activity size={18} />}>
        Monitoring
      </Tab>
      <Tab id="demo" icon={<FlaskConical size={18} />}>
        Demo
      </Tab>
    </Tabs>
  );

  const footer = (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center space-x-1.5 text-[11px] text-muted-foreground flex-shrink min-w-0">
        <AlertTriangle size={12} className="flex-shrink-0" />
        <span className="truncate">Changes apply to all users immediately</span>
      </div>
      <div className="flex space-x-2 flex-shrink-0">
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={saveConfiguration}
          disabled={!hasChanges}
          isLoading={isSaving}
          loadingText="Saving..."
          leftIcon={<Save size={14} />}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      icon={<ShieldUser size={20} />}
      title="Admin Settings"
      subtitle="Security & System Configuration"
      size="xl"
      animation="slide"
      tabs={tabs}
      tabOrientation="vertical"
      footer={footer}
      className="h-[85vh]"
      onClose={handleClose}
    >
      {activeTab === 'security' && (
        <Suspense fallback={<TabSkeleton />}>
          <SecurityTab config={config} onChange={handleConfigChange} />
        </Suspense>
      )}

      {activeTab === 'users' && (
        <Suspense fallback={<TabSkeleton />}>
          <UsersTab users={users} onUserUpdate={loadUsers} />
        </Suspense>
      )}

      {activeTab === 'researchers' && (
        <Suspense fallback={<TabSkeleton />}>
          <ResearchersTab onResearcherUpdate={loadSystemStats} />
        </Suspense>
      )}

      {activeTab === 'system' && (
        <Suspense fallback={<TabSkeleton />}>
          <SystemTab config={config} stats={systemStats} onChange={handleConfigChange} />
        </Suspense>
      )}

      {activeTab === 'monitoring' && (
        <Suspense fallback={<TabSkeleton />}>
          <MonitoringTab />
        </Suspense>
      )}

      {activeTab === 'demo' && (
        <Suspense fallback={<TabSkeleton />}>
          <DemoManagementTab onDemoUpdate={loadUsers} />
        </Suspense>
      )}
    </BaseModal>
  );
}
