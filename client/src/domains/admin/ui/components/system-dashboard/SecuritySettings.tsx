/**
 * Security Settings
 *
 * Collapsible security configuration form for the system admin dashboard.
 */

import { useEffect, useState } from 'react';

import { DEFAULT_SECURITY_CONFIG } from '@odysseus/shared-schemas';
import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronDown, Save, Shield } from 'lucide-react';

import { Button } from '@shared/ui';
import { notifications } from '@shared/utils';

import { adminService } from '../../../services/AdminService';
import { SecurityTab } from '../settings-modal/tabs/SecurityTab';

import type { SecurityConfig } from '@odysseus/shared-schemas';

export function SecuritySettings() {
  const [config, setConfig] = useState<SecurityConfig>(DEFAULT_SECURITY_CONFIG);
  const [originalConfig, setOriginalConfig] = useState<SecurityConfig>(DEFAULT_SECURITY_CONFIG);
  const [isSaving, setSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const loaded = await adminService.getSecurityConfig();
        const merged = { ...DEFAULT_SECURITY_CONFIG, ...loaded };
        setConfig(merged);
        setOriginalConfig(merged);
        setIsLoaded(true);
      } catch {
        setIsLoaded(true);
      }
    };
    void load();
  }, []);

  const handleConfigChange = (field: keyof SecurityConfig, value: boolean | number | string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const hasChanges = Object.keys(config).some(key => {
    const configKey = key as keyof SecurityConfig;
    return config[configKey] !== originalConfig[configKey];
  });

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
    <Collapsible.Root defaultOpen={false} className="rounded-lg border border-border bg-card">
      <Collapsible.Trigger className="flex w-full items-center justify-between p-3 cursor-pointer group">
        <div className="flex items-center gap-2">
          <ChevronDown
            size={14}
            className="text-secondary-foreground transition-transform duration-200 group-data-[state=closed]:-rotate-90"
          />
          <Shield size={18} className="text-muted-foreground" />
          <h3 className="text-lg font-semibold text-card-foreground">Security Settings</h3>
        </div>
      </Collapsible.Trigger>
      <Collapsible.Content className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
        <div className="px-3 pb-3 space-y-3">
          {isLoaded ? (
            <>
              <SecurityTab config={config} onChange={handleConfigChange} hideHeader />
              {hasChanges && (
                <div className="flex justify-end pt-1">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={saveConfiguration}
                    isLoading={isSaving}
                    leftIcon={<Save size={14} />}
                  >
                    Save Changes
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">Loading...</div>
          )}
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
