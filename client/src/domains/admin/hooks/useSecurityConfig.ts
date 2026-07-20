/**
 * Security Config Editor
 *
 * Loads the security configuration into editable state and persists changes via the
 * system-admin endpoint (the only writer of the single global security-config row).
 */

import { useCallback, useEffect, useState } from 'react';

import { DEFAULT_SECURITY_CONFIG } from '@odysseus/shared-schemas';

import { useUpdateSecurityConfigMutation } from './useSecurityConfigMutation';
import { useSecurityConfigQuery } from './useSecurityConfigQuery';

import type { SecurityConfig } from '@odysseus/shared-schemas';

export function useSecurityConfig() {
  const [config, setConfig] = useState<SecurityConfig>(DEFAULT_SECURITY_CONFIG);
  const [originalConfig, setOriginalConfig] = useState<SecurityConfig>(DEFAULT_SECURITY_CONFIG);

  const query = useSecurityConfigQuery();
  const updateMutation = useUpdateSecurityConfigMutation();

  // Seed the editable copy from the server config each time it (re)loads.
  useEffect(() => {
    if (query.data) {
      const merged = { ...DEFAULT_SECURITY_CONFIG, ...query.data };
      setConfig(merged);
      setOriginalConfig(merged);
    }
  }, [query.data]);

  const handleConfigChange = useCallback(
    (field: keyof SecurityConfig, value: boolean | number | string) => {
      setConfig(prev => ({ ...prev, [field]: value }));
    },
    []
  );

  const changedKeys = (Object.keys(config) as (keyof SecurityConfig)[]).filter(
    key => config[key] !== originalConfig[key]
  );

  /** Persists the changed keys; throws on failure — the global mutation handler surfaces the toast. */
  const save = async () => {
    const changes: Partial<SecurityConfig> = {};
    changedKeys.forEach(key => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic property assignment to partial config object
      (changes as any)[key] = config[key];
    });

    await updateMutation.mutateAsync(changes);
    setOriginalConfig(config);
  };

  return {
    config,
    handleConfigChange,
    changedCount: changedKeys.length,
    hasChanges: changedKeys.length > 0,
    isLoaded: query.isFetched,
    isSaving: updateMutation.isPending,
    load: query.refetch,
    save,
  };
}
