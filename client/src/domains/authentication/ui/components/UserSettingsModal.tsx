/**
 * User Settings Modal
 *
 * Modal for managing user-specific preferences and settings.
 * Extensible tab-based interface for future settings categories.
 */
import { useState, useEffect, lazy, Suspense } from 'react';

import { Save, RefreshCw, Settings, Table2, UserRound, Shield, AlertTriangle } from 'lucide-react';

import { useModalStore } from '@app/stores/modalStore';
import { TabSkeleton } from '@domains/admin/ui/components/TabSkeleton';
import { logger } from '@shared/infrastructure/logger';
import { BaseModal } from '@shared/ui/components/modals/BaseModal';
import { notifications } from '@shared/utils';

import { useUserSettings, useUserSettingsActions } from '../../hooks/useUserSettings';

import type { UserSettings, PositionDisplayPreference } from '@odysseus/shared-schemas';

// Lazy-load tab components for code splitting
const PositionDisplayPreferenceTab = lazy(() =>
  import('./tabs/PositionDisplayPreferenceTab').then(m => ({
    default: m.PositionDisplayPreferenceTab,
  }))
);
const AccountTab = lazy(() => import('./tabs/AccountTab').then(m => ({ default: m.AccountTab })));
const SecurityTab = lazy(() =>
  import('./tabs/SecurityTab').then(m => ({ default: m.SecurityTab }))
);

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserSettingsModal({ isOpen, onClose }: UserSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'account' | 'security' | 'display'>('account');
  const [localSettings, setLocalSettings] = useState<UserSettings>({});
  const [originalSettings, setOriginalSettings] = useState<UserSettings>({});

  // Fetch user settings
  const { settings, isLoading } = useUserSettings();
  const { updateSettings, isSaving } = useUserSettingsActions();
  const modalService = useModalStore();

  // Load settings when modal opens
  useEffect(() => {
    if (isOpen && settings) {
      setLocalSettings(settings);
      setOriginalSettings(settings);
    }
  }, [isOpen, settings]);

  const handlePositionDisplayChange = (preference: PositionDisplayPreference | undefined) => {
    setLocalSettings(prev => ({
      ...prev,
      defaultPositionDisplay: preference?.format ? preference : undefined,
    }));
  };

  const handleSave = async () => {
    try {
      await updateSettings(localSettings, {
        onSuccess: () => {
          notifications.success('Settings saved successfully');
          setOriginalSettings(localSettings);
          onClose();
        },
        onError: (error: Error) => {
          logger.error('UserSettingsModal save failed', { error });
          notifications.error(`Failed to save settings: ${error.message}`);
        },
      });
    } catch (error) {
      logger.error('UserSettingsModal failed to save settings', { error });
      notifications.error('Failed to save settings');
    }
  };

  // Check if there are any unsaved changes
  const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(originalSettings);

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

  const tabItems = [
    { id: 'account', label: 'Account', icon: UserRound },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'display', label: 'Display Preferences', icon: Table2 },
  ] as const;

  // Vertical sidebar tabs (only rendered if multiple tabs)
  const tabs =
    tabItems.length > 1 ? (
      <nav className="space-y-1">
        {tabItems.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              data-focus="none"
              className={`w-full flex items-center space-x-2 px-4 py-2.5 text-left transition-colors border-l-4 focus:outline-none focus:bg-muted ${
                isActive
                  ? 'border-l-secondary-foreground bg-muted text-foreground'
                  : 'border-l-transparent text-secondary-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon
                size={18}
                className={isActive ? 'text-secondary-foreground' : 'text-muted-foreground'}
              />
              <span className="font-medium text-sm">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    ) : undefined;

  const footer = (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center space-x-1.5 text-[11px] text-muted-foreground flex-shrink min-w-0">
        <AlertTriangle size={12} className="flex-shrink-0" />
        <span className="truncate">These settings apply only to your account.</span>
      </div>
      <div className="flex space-x-2 flex-shrink-0">
        <button onClick={handleClose} className="btn btn-secondary px-6">
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="btn btn-primary flex items-center space-x-2 text-sm px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      icon={<Settings size={20} />}
      title="User Settings"
      subtitle="Account & Personal Preferences"
      size="lg"
      animation="slide"
      tabs={tabs}
      tabOrientation="vertical"
      footer={footer}
      className="h-[75vh]"
      onClose={handleClose}
    >
      {isLoading ? (
        <TabSkeleton />
      ) : (
        <>
          {activeTab === 'account' && (
            <Suspense fallback={<TabSkeleton />}>
              <AccountTab onSaveComplete={onClose} />
            </Suspense>
          )}
          {activeTab === 'security' && (
            <Suspense fallback={<TabSkeleton />}>
              <SecurityTab />
            </Suspense>
          )}
          {activeTab === 'display' && (
            <Suspense fallback={<TabSkeleton />}>
              <PositionDisplayPreferenceTab
                defaultPositionDisplay={localSettings.defaultPositionDisplay}
                savedPositionDisplay={originalSettings.defaultPositionDisplay}
                onChange={handlePositionDisplayChange}
              />
            </Suspense>
          )}
        </>
      )}
    </BaseModal>
  );
}
