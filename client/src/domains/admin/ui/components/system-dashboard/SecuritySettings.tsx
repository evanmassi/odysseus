/**
 * Security Settings
 *
 * Expandable security configuration block for the system-admin dashboard.
 */

import { useEffect, useState } from 'react';

import { ChevronDown, Save } from 'lucide-react';

import { Button, ConsolePanel, SectionHeader, UnsavedChangesIndicator } from '@shared/ui';
import { notifications } from '@shared/utils';

import { useSecurityConfig } from '../../../hooks/useSecurityConfig';
import { SecurityTab } from '../settings-modal/tabs/SecurityTab';

export function SecuritySettings() {
  const { config, handleConfigChange, changedCount, hasChanges, isLoaded, isSaving, load, save } =
    useSecurityConfig();
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    void load();
  }, [load]);

  const saveConfiguration = async () => {
    try {
      await save();
      notifications.success('Security configuration updated');
    } catch {
      // The save mutation surfaces the error toast globally; keep the form for retry.
    }
  };

  return (
    <ConsolePanel intensity="soft">
      <SectionHeader
        className="px-4 pt-4"
        title="Security Settings"
        meta={
          <button
            type="button"
            onClick={() => setIsExpanded(o => !o)}
            className="inline-flex items-center gap-1 uppercase transition-colors hover:text-foreground/70"
          >
            <ChevronDown
              size={12}
              className={`transition-transform ${isExpanded ? '' : '-rotate-90'}`}
            />
            {isExpanded ? 'Hide' : 'Show'}
          </button>
        }
      />
      {isExpanded &&
        (isLoaded ? (
          <>
            <SecurityTab config={config} onChange={handleConfigChange} />
            <div className="flex items-center justify-between gap-4 border-t border-line-soft bg-card dark:bg-shade/25 dark:[background-image:linear-gradient(0deg,hsl(var(--foreground)/0.035)_0%,transparent_70%)] px-5 py-3">
              <UnsavedChangesIndicator count={changedCount} />
              <Button
                variant="primary"
                size="sm"
                onClick={saveConfiguration}
                isLoading={isSaving}
                disabled={!hasChanges}
                leftIcon={<Save size={14} />}
              >
                Save Changes
              </Button>
            </div>
          </>
        ) : (
          <div className="px-4 pb-4 text-center text-body-sm text-muted-foreground">Loading...</div>
        ))}
    </ConsolePanel>
  );
}
