/**
 * Security Settings
 *
 * Expandable security configuration block for the system-admin dashboard.
 */

import { useEffect, useState } from 'react';

import { DEFAULT_SECURITY_CONFIG } from '@odysseus/shared-schemas';
import { ChevronDown, Save } from 'lucide-react';

import { Button, SectionHeader } from '@shared/ui';
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
          <>
            <SecurityTab config={config} onChange={handleConfigChange} />
            <div className="flex flex-wrap items-center justify-end gap-2 pt-3">
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
          <div className="py-4 text-center text-sm text-muted-foreground">Loading...</div>
        ))}
    </div>
  );
}
