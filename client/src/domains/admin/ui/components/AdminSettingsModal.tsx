import { useState, useEffect, lazy, Suspense } from 'react';

import { DEFAULT_SECURITY_CONFIG } from '@odysseus/shared-schemas';
import {
  X,
  Shield,
  Activity,
  AlertTriangle,
  Save,
  RefreshCw,
  ShieldUser,
  Gauge,
  UsersRound,
} from 'lucide-react';

import { useModalStore } from '@app/stores/modalStore';
import { useFocusTrap } from '@shared/hooks/useFocusTrap';
import { logger } from '@shared/infrastructure/logger';
import { ResearcherIcon } from '@shared/ui/components/icons';
import { notifications } from '@shared/utils';

import { adminService } from '../../services/AdminService';

import { TabSkeleton } from './TabSkeleton';

import type {
  SecurityConfig,
  AdminUser,
  SystemMetrics,
  SyncStatus,
} from '@odysseus/shared-schemas';

// Lazy-load tab components for code splitting
const SecurityTab = lazy(() =>
  import('./tabs/SecurityTab').then(m => ({ default: m.SecurityTab }))
);
const UserManagementTab = lazy(() =>
  import('./tabs/UserManagementTab').then(m => ({ default: m.UserManagementTab }))
);
const ResearcherManagementTab = lazy(() =>
  import('./tabs/ResearcherManagementTab').then(m => ({ default: m.ResearcherManagementTab }))
);
const SystemConfigTab = lazy(() =>
  import('./tabs/SystemConfigTab').then(m => ({ default: m.SystemConfigTab }))
);
const MonitoringTab = lazy(() =>
  import('./tabs/MonitoringTab').then(m => ({ default: m.MonitoringTab }))
);

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSettingsModal({ isOpen, onClose }: AdminSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<
    'security' | 'users' | 'researchers' | 'system' | 'monitoring'
  >('system');
  const [config, setConfig] = useState<SecurityConfig>(DEFAULT_SECURITY_CONFIG);
  const [originalConfig, setOriginalConfig] = useState<SecurityConfig>(DEFAULT_SECURITY_CONFIG);
  const [isSaving, setSaving] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [systemStats, setSystemStats] = useState<SystemMetrics | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [inviteCode, setInviteCode] = useState<string>('');
  const modalService = useModalStore();

  // Focus trap (only active when modal is open)
  const trapRef = useFocusTrap({
    isOpen,
    restoreFocus: true,
    autoFocusFirstInput: false, // Focus first focusable element (tab button)
  });

  // Load current configuration and data
  useEffect(() => {
    if (isOpen) {
      // SessionManager handles authentication automatically
      void loadConfiguration();
      void loadUsers();
      void loadSystemStats();
      void loadSyncStatus();
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
        setUsers(response.users);
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
        setSystemStats({
          totalTubes: response.data.totalTubes || 0,
          totalUsers: response.data.totalUsers || 1,
          totalResearchers: response.data.totalResearchers || 0,
          lastBackup: new Date().toISOString(),
        });
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

  const loadSyncStatus = async () => {
    try {
      const { httpClient } = await import('@infra/api/httpClient');
      const response = await httpClient.get<{ success: boolean; sync: SyncStatus }>(
        '/admin/sync-status'
      );

      if (response.data.success) {
        setSyncStatus(response.data.sync);
      }
    } catch (error) {
      logger.error('Failed to load sync status', { error });
      setSyncStatus(null);
    }
  };

  const createInviteCode = async (role: 'admin' | 'user' = 'user') => {
    try {
      const { httpClient } = await import('@infra/api/httpClient');
      const response = await httpClient.post<{ success: boolean; inviteCode: string }>(
        '/admin/create-invite',
        { role }
      );

      if (response.data.success) {
        setInviteCode(response.data.inviteCode);
        notifications.success('Invite code created successfully!');
      } else {
        notifications.error('Failed to create invite code');
      }
    } catch (error) {
      logger.error('Failed to create invite code', { error });
      notifications.error('Failed to create invite code');
    }
  };

  const handleConfigChange = (field: keyof SecurityConfig, value: boolean | number | string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

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

  const tabs = [
    { id: 'system', label: 'System', icon: Gauge },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'users', label: 'User Management', icon: UsersRound },
    { id: 'researchers', label: 'Researcher Management', icon: ResearcherIcon },
    { id: 'monitoring', label: 'Monitoring', icon: Activity },
  ] as const;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 animate-in fade-in duration-[180ms]">
      <div
        ref={trapRef}
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-5xl h-[85vh] mx-4 overflow-hidden animate-slide-up-fade flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-danger-hover via-danger-bg to-danger-hover px-6 py-3 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ShieldUser className="w-6 h-6" />
              <div>
                <h2 className="text-lg font-bold">Admin Settings</h2>
                <p className="text-white/80 text-xs">Security & System Configuration</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="btn-header-menu text-white/80 hover:text-white hover:bg-danger-hover/50"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div className="w-48 bg-gray-50 border-r border-gray-200 p-4">
            <nav className="space-y-2">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`nav-tab ${
                      activeTab === tab.id
                        ? 'bg-danger-light text-danger-hover border border-danger-border'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={tab.id === 'researchers' ? 24 : 20} />
                    <span className="font-medium text-sm">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content with Lazy-Loaded Tabs */}
          <div className="flex-1 overflow-y-auto min-w-0">
            <div className="p-6 min-w-0">
              {activeTab === 'security' && (
                <Suspense fallback={<TabSkeleton />}>
                  <SecurityTab config={config} onChange={handleConfigChange} />
                </Suspense>
              )}

              {activeTab === 'users' && (
                <Suspense fallback={<TabSkeleton />}>
                  <UserManagementTab
                    users={users}
                    onUserUpdate={loadUsers}
                    inviteCode={inviteCode}
                    onCreateInvite={createInviteCode}
                  />
                </Suspense>
              )}

              {activeTab === 'researchers' && (
                <Suspense fallback={<TabSkeleton />}>
                  <ResearcherManagementTab onResearcherUpdate={loadSystemStats} />
                </Suspense>
              )}

              {activeTab === 'system' && (
                <Suspense fallback={<TabSkeleton />}>
                  <SystemConfigTab
                    config={config}
                    stats={systemStats}
                    syncStatus={syncStatus}
                    onChange={handleConfigChange}
                    onRefreshSync={loadSyncStatus}
                  />
                </Suspense>
              )}

              {activeTab === 'monitoring' && (
                <Suspense fallback={<TabSkeleton />}>
                  <MonitoringTab />
                </Suspense>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-3 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-2 text-xs text-gray-600 flex-shrink min-w-0">
              <AlertTriangle size={14} className="alert-warning-icon flex-shrink-0" />
              <span className="truncate">Changes apply to all users immediately</span>
            </div>
            <div className="flex space-x-2 flex-shrink-0">
              <button onClick={handleClose} className="btn-cancel">
                Cancel
              </button>
              <button
                onClick={saveConfiguration}
                disabled={isSaving || !hasChanges}
                className="btn btn-primary flex items-center space-x-2 text-sm px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
