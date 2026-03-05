/**
 * User Settings Modal
 *
 * Modal for managing user-specific preferences and settings.
 */
import { useState, useEffect, lazy, Suspense } from 'react';

import { Save, Settings, Table2, UserRound, Shield, Info } from 'lucide-react';

import { useTheme } from '@app/contexts/ThemeContext';
import { useModalStore } from '@app/stores/modalStore';
import { useUserSettings, useUserSettingsActions } from '@domains/users/hooks/useUserSettings';
import { logger } from '@shared/infrastructure/logger';
import { Button, Tab, TabSkeleton, Tabs } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/modals/BaseModal';
import { notifications } from '@shared/utils';

import type {
  UserSettings,
  PositionDisplayPreference,
  ThemePreference,
} from '@odysseus/shared-schemas';

const DisplayTab = lazy(() =>
  import('./tabs/DisplayTab').then(m => ({
    default: m.DisplayTab,
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

  const { settings, isLoading } = useUserSettings();
  const { updateSettings, isSaving } = useUserSettingsActions();
  const modalService = useModalStore();
  const { setPreference } = useTheme();

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

  const handleThemeChange = (theme: ThemePreference) => {
    setLocalSettings(prev => ({
      ...prev,
      theme,
    }));
    // Apply theme immediately for instant visual feedback
    setPreference(theme);
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

  const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(originalSettings);

  const handleClose = () => {
    if (hasChanges) {
      modalService.showUnsavedConfirm({
        onConfirm: () => {
          // Revert theme to original if it was changed
          if (localSettings.theme !== originalSettings.theme) {
            setPreference(originalSettings.theme ?? 'auto');
          }
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
    { id: 'display', label: 'Display', icon: Table2 },
  ] as const;

  const tabs =
    tabItems.length > 1 ? (
      <Tabs value={activeTab} onChange={v => setActiveTab(v as 'account' | 'security' | 'display')}>
        {tabItems.map(tab => {
          const Icon = tab.icon;
          return (
            <Tab key={tab.id} id={tab.id} icon={<Icon size={18} />}>
              {tab.label}
            </Tab>
          );
        })}
      </Tabs>
    ) : undefined;

  const footer = (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center space-x-1.5 text-xs text-muted-foreground flex-shrink min-w-0">
        <Info size={14} className="flex-shrink-0" />
        <span className="truncate">These settings apply only to your account.</span>
      </div>
      <div className="flex space-x-2 flex-shrink-0">
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
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
      icon={<Settings size={24} />}
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
              <DisplayTab
                defaultPositionDisplay={localSettings.defaultPositionDisplay}
                savedPositionDisplay={originalSettings.defaultPositionDisplay}
                onChange={handlePositionDisplayChange}
                theme={localSettings.theme ?? 'auto'}
                savedTheme={originalSettings.theme ?? 'auto'}
                onThemeChange={handleThemeChange}
              />
            </Suspense>
          )}
        </>
      )}
    </BaseModal>
  );
}
