/**
 * User Settings Modal
 *
 * Modal for managing user-specific preferences and settings.
 * Extensible tab-based interface for future settings categories.
 */
import { useState, useEffect, lazy, Suspense } from 'react';

import { X, Save, RefreshCw, Cog, Table2, UserRound, Shield, AlertTriangle } from 'lucide-react';

import { TabSkeleton } from '@domains/admin/ui/components/TabSkeleton';
import { useFocusTrap } from '@shared/hooks/useFocusTrap';
import { notifications } from '@shared/utils';

import { useUserSettings, useUserSettingsActions } from '../../hooks/useUserSettings';

import type { UserSettings, PositionDisplayPreference } from '@odysseus/shared-schemas';


// Lazy-load tab components for code splitting
const PositionDisplayPreferenceTab = lazy(() =>
  import('./tabs/PositionDisplayPreferenceTab').then(m => ({ default: m.PositionDisplayPreferenceTab }))
);
const AccountTab = lazy(() =>
  import('./tabs/AccountTab').then(m => ({ default: m.AccountTab }))
);
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

  // Focus trap (only active when modal is open)
  const trapRef = useFocusTrap({
    isOpen,
    restoreFocus: true,
    autoFocusFirstInput: false,
  });

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
          console.error('❌ [UserSettingsModal] Save failed:', error);
          notifications.error(`Failed to save settings: ${error.message}`);
        },
      });
    } catch (error) {
      console.error('❌ [UserSettingsModal] Failed to save settings:', error);
      notifications.error('Failed to save settings');
    }
  };

  if (!isOpen) return null;

  // Check if there are any unsaved changes
  const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(originalSettings);

  const tabs = [
    { id: 'account', label: 'Account', icon: UserRound },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'display', label: 'Display Preferences', icon: Table2 },
  ] as const;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 animate-in fade-in duration-[180ms]">
      <div
        ref={trapRef}
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl h-[75vh] mx-4 overflow-hidden animate-slide-up-fade flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-action-hover via-action to-action-hover px-6 py-3 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Cog className="w-6 h-6" />
              <div>
                <h2 className="text-lg font-bold">User Settings</h2>
                <p className="text-white/80 text-xs">Account & Personal Preferences</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="btn-header-menu text-white/80 hover:text-white hover:bg-primary-hover/50"
              aria-label="Close settings"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar (only show if multiple tabs in future) */}
          {tabs.length > 1 && (
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
                          ? 'bg-primary-light text-primary-hover border border-primary-border'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <Icon size={20} />
                      <span className="font-medium text-sm">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto min-w-0">
            <div className="p-6 min-w-0">
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
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-3 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-2 text-xs text-gray-600 flex-shrink min-w-0">
              <AlertTriangle size={14} className="alert-warning-icon flex-shrink-0" />
              <span className="truncate">These settings apply only to your account.</span>
            </div>
            <div className="flex space-x-2 flex-shrink-0">
              <button onClick={onClose} className="btn-cancel">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                className="btn btn-primary flex items-center space-x-2 text-sm px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
