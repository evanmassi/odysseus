/**
 * Security Config Editor
 *
 * Loads the security configuration into editable state and persists changes via the
 * system-admin endpoint (the only writer of the single global security-config row).
 */

import { useCallback, useState } from 'react';

import { DEFAULT_SECURITY_CONFIG } from '@odysseus/shared-schemas';

import { logger } from '@infra/logger';

import { adminService } from '../services/AdminService';

import type { SecurityConfig } from '@odysseus/shared-schemas';

export function useSecurityConfig() {
  const [config, setConfig] = useState<SecurityConfig>(DEFAULT_SECURITY_CONFIG);
  const [originalConfig, setOriginalConfig] = useState<SecurityConfig>(DEFAULT_SECURITY_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const loaded = await adminService.getSecurityConfig();
      const merged = { ...DEFAULT_SECURITY_CONFIG, ...loaded };
      setConfig(merged);
      setOriginalConfig(merged);
    } catch (error) {
      logger.error('Failed to load security configuration', { error });
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const handleConfigChange = useCallback(
    (field: keyof SecurityConfig, value: boolean | number | string) => {
      setConfig(prev => ({ ...prev, [field]: value }));
    },
    []
  );

  const changedKeys = (Object.keys(config) as (keyof SecurityConfig)[]).filter(
    key => config[key] !== originalConfig[key]
  );

  /** Persists the changed keys; throws on failure so callers can surface their own message. */
  const save = async () => {
    const changes: Partial<SecurityConfig> = {};
    changedKeys.forEach(key => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic property assignment to partial config object
      (changes as any)[key] = config[key];
    });

    setIsSaving(true);
    try {
      await adminService.updateSecurityConfig(changes);
      setOriginalConfig(config);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    config,
    handleConfigChange,
    changedCount: changedKeys.length,
    hasChanges: changedKeys.length > 0,
    isLoaded,
    isSaving,
    load,
    save,
  };
}
