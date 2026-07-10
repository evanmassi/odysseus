/**
 * User Settings Modal
 *
 * Modal for managing user-specific preferences and settings.
 */
import { useState, useEffect, lazy, Suspense, type ReactNode } from 'react';

import { Settings, Table2, UserRound, Shield } from 'lucide-react';

import { useTheme } from '@app/contexts/ThemeContext';
import { useModalStore } from '@app/stores/modalStore';
import { useAuthStore } from '@domains/authentication';
import { useUserSessions } from '@domains/users';
import { useUserSettings, useUserSettingsActions } from '@domains/users/hooks/useUserSettings';
import { logger } from '@infra/logger';
import { Button, Tab, LoadingSkeleton, SectionHeader, Tabs } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays/BaseModal';
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

type TabId = 'account' | 'security' | 'display';

const TAB_META: Record<TabId, { icon: ReactNode; title: string }> = {
  account: { icon: <UserRound size={18} />, title: 'Account' },
  security: { icon: <Shield size={18} />, title: 'Security' },
  display: { icon: <Table2 size={18} />, title: 'Display' },
};

const TAB_ORDER: TabId[] = ['account', 'security', 'display'];

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserSettingsModal({ isOpen, onClose }: UserSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('account');
  const [localSettings, setLocalSettings] = useState<UserSettings>({});
  const [originalSettings, setOriginalSettings] = useState<UserSettings>({});
  const [accountDirty, setAccountDirty] = useState(0);

  const { settings, isLoading } = useUserSettings();
  const { updateSettings, isSaving } = useUserSettingsActions();
  const modalService = useModalStore();
  const { setPreference } = useTheme();
  const user = useAuthStore(s => s.user);
  const { sessions } = useUserSessions();

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

  const handleSaveDisplay = () => {
    updateSettings(localSettings, {
      onSuccess: () => {
        notifications.success('Display settings saved');
        setOriginalSettings(localSettings);
      },
      onError: (error: Error) => {
        logger.error('UserSettingsModal display save failed', { error });
        notifications.error(`Failed to save settings: ${error.message}`);
      },
    });
  };

  const displayDirtyCount =
    (localSettings.theme !== originalSettings.theme ? 1 : 0) +
    (JSON.stringify(localSettings.defaultPositionDisplay ?? null) !==
    JSON.stringify(originalSettings.defaultPositionDisplay ?? null)
      ? 1
      : 0);

  const anyDirty = displayDirtyCount > 0 || accountDirty > 0;

  const handleClose = () => {
    if (anyDirty) {
      modalService.showUnsavedConfirm({
        onConfirm: () => {
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

  const tabs = (
    <Tabs value={activeTab} onChange={v => setActiveTab(v as TabId)}>
      {TAB_ORDER.map(id => (
        <Tab key={id} id={id} icon={TAB_META[id].icon}>
          {TAB_META[id].title}
        </Tab>
      ))}
    </Tabs>
  );

  const footer = (
    <div className="flex items-center justify-end gap-4">
      <Button variant="secondary" onClick={handleClose}>
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
    <div className="flex items-center gap-3 font-mono">
      <div className="flex items-center gap-2.5">
        {accentBar}
        <span className="type-label text-label-2xs tracking-label-wide text-muted-foreground">
          User
        </span>
        <span className="phosphor-text text-data-sm text-secondary-foreground">
          {user?.username ?? '—'}
        </span>
      </div>
      <span aria-hidden className="text-muted-foreground/40">
        ·
      </span>
      <div className="flex items-center gap-2.5">
        <span className="type-label text-label-2xs tracking-label-wide text-muted-foreground">
          Sessions
        </span>
        <span className="phosphor-text text-data-sm text-secondary-foreground">
          {sessions.length}
        </span>
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
      tabs={tabs}
      tabOrientation="vertical"
      footer={footer}
      locator={locator}
      className="h-[75vh]"
      onClose={handleClose}
    >
      <SectionHeader icon={TAB_META[activeTab].icon} title={TAB_META[activeTab].title} size="lg" />

      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {activeTab === 'account' && (
            <Suspense fallback={<LoadingSkeleton />}>
              <AccountTab onDirtyChange={setAccountDirty} />
            </Suspense>
          )}
          {activeTab === 'security' && (
            <Suspense fallback={<LoadingSkeleton />}>
              <SecurityTab />
            </Suspense>
          )}
          {activeTab === 'display' && (
            <Suspense fallback={<LoadingSkeleton />}>
              <DisplayTab
                defaultPositionDisplay={localSettings.defaultPositionDisplay}
                savedPositionDisplay={originalSettings.defaultPositionDisplay}
                onChange={handlePositionDisplayChange}
                theme={localSettings.theme ?? 'auto'}
                savedTheme={originalSettings.theme ?? 'auto'}
                onThemeChange={handleThemeChange}
                onSave={handleSaveDisplay}
                isSaving={isSaving}
                dirtyCount={displayDirtyCount}
              />
            </Suspense>
          )}
        </>
      )}
    </BaseModal>
  );
}
