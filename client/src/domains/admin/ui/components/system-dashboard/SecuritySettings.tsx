import { useEffect, useState } from 'react';

import { ChevronDown, Save } from 'lucide-react';

import { Button, ConsolePanel, Divider, Subsection, UnsavedChangesIndicator } from '@shared/ui';
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
      // PITFALL: the save mutation already toasts its own error; swallowing it here keeps the form open for retry.
    }
  };

  return (
    <Subsection
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
      isCompact
    >
      {isExpanded && (
        <ConsolePanel intensity="soft" className="p-4">
          {isLoaded ? (
            <>
              <SecurityTab config={config} onChange={handleConfigChange} />
              <div className="relative mt-2 flex items-center justify-between gap-4 pt-4">
                <Divider tone="neutral" className="absolute inset-x-0 top-0" />
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
            <div className="text-center text-body-sm text-muted-foreground">Loading...</div>
          )}
        </ConsolePanel>
      )}
    </Subsection>
  );
}
