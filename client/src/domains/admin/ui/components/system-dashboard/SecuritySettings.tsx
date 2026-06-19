/**
 * Security Settings
 *
 * Expandable security configuration block for the system-admin dashboard.
 */

import { useEffect, useState } from 'react';

import { DEFAULT_SECURITY_CONFIG } from '@odysseus/shared-schemas';
import { ChevronDown, Save } from 'lucide-react';

import { Button, ConsolePanel, SectionHeader, UnsavedChangesIndicator } from '@shared/ui';
import { notifications } from '@shared/utils';

import { adminService } from '../../../services/AdminService';
import { SecurityTab } from '../settings-modal/tabs/SecurityTab';

import type { SecurityConfig } from '@odysseus/shared-schemas';

export function SecuritySettings() {
  const [config, setConfig] = useState<SecurityConfig>(DEFAULT_SECURITY_CONFIG);
  const [originalConfig, setOriginalConfig] = useState<SecurityConfig>(DEFAULT_SECURITY_CONFIG);
  const [isSaving, setSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const loaded = await adminService.getSecurityConfig();
        const merged = { ...DEFAULT_SECURITY_CONFIG, ...loaded };
        setConfig(merged);
        setOriginalConfig(merged);
      } finally {
        setIsLoaded(true);
      }
    };
    void load();
  }, []);

  const handleConfigChange = (field: keyof SecurityConfig, value: boolean | number | string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const changedKeys = (Object.keys(config) as (keyof SecurityConfig)[]).filter(
    key => config[key] !== originalConfig[key]
  );
  const hasChanges = changedKeys.length > 0;

  const saveConfiguration = async () => {
    const changes: Partial<SecurityConfig> = {};
    changedKeys.forEach(key => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic property assignment to partial config object
      (changes as any)[key] = config[key];
    });

    setSaving(true);
    try {
      await adminService.updateSecurityConfigAsSystemAdmin(changes);
      notifications.success('Security configuration updated');
      setOriginalConfig(config);
    } catch {
      notifications.error('Failed to update security configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <SectionHeader
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
          <ConsolePanel>
            <SecurityTab config={config} onChange={handleConfigChange} />
            <div className="flex items-center justify-between gap-4 border-t border-line-soft bg-card dark:bg-shade/25 dark:[background-image:linear-gradient(0deg,hsl(var(--foreground)/0.035)_0%,transparent_70%)] px-5 py-3">
              <UnsavedChangesIndicator count={changedKeys.length} />
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
          </ConsolePanel>
        ) : (
          <div className="py-4 text-center text-sm text-muted-foreground">Loading...</div>
        ))}
    </div>
  );
}
