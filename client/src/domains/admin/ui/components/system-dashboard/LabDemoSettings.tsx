/**
 * Lab Demo Settings
 *
 * Demo lab management: per-resource limits, seed/unseed, reset.
 */

import { useState } from 'react';

import { DEMO_LIMITS_DEFAULTS } from '@odysseus/shared-schemas';
import { BeanOff, ChevronDown, RotateCcw, Save, Sprout } from 'lucide-react';

import {
  Button,
  ConsolePanel,
  NumberInput,
  SectionHeader,
  SettingsRow,
  Subsection,
  UnsavedChangesIndicator,
} from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { notifications } from '@shared/utils';

import {
  useResetDemoDataMutation,
  useSeedDemoMutation,
  useUnseedDemoMutation,
  useUpdateDemoLimitsMutation,
} from '../../../hooks/useLabMutations';
import { useDemoLimitsQuery } from '../../../hooks/useLabQueries';

import type { DemoLimits } from '@odysseus/shared-schemas';

interface LabDemoSettingsProps {
  labId: string;
  isSeeded: boolean;
}

export function LabDemoSettings({ labId, isSeeded }: LabDemoSettingsProps) {
  const { data: demoLimits } = useDemoLimitsQuery(labId);
  const updateDemoLimitsMutation = useUpdateDemoLimitsMutation();
  const resetDemoMutation = useResetDemoDataMutation();
  const seedDemoMutation = useSeedDemoMutation();
  const unseedDemoMutation = useUnseedDemoMutation();

  const [isExpanded, setIsExpanded] = useState(true);
  const [resetDemoConfirm, setResetDemoConfirm] = useState(false);
  const [seedConfirm, setSeedConfirm] = useState(false);
  const [unseedConfirm, setUnseedConfirm] = useState(false);
  const [editedLimits, setEditedLimits] = useState<Partial<DemoLimits> | null>(null);

  const handleResetDemo = async () => {
    try {
      await resetDemoMutation.mutateAsync(labId);
      notifications.success('Demo data reset');
      setResetDemoConfirm(false);
    } catch {
      notifications.error('Failed to reset demo data');
    }
  };

  const handleSeedDemo = async () => {
    try {
      await seedDemoMutation.mutateAsync(labId);
      notifications.success('Demo infrastructure seeded');
      setSeedConfirm(false);
    } catch {
      notifications.error('Failed to seed demo');
    }
  };

  const handleUnseedDemo = async () => {
    try {
      await unseedDemoMutation.mutateAsync(labId);
      notifications.success('Demo infrastructure unseeded');
      setUnseedConfirm(false);
    } catch {
      notifications.error('Failed to unseed demo');
    }
  };

  const handleSaveLimits = async () => {
    if (!editedLimits) return;
    try {
      await updateDemoLimitsMutation.mutateAsync({ labId, limits: editedLimits });
      notifications.success('Demo limits updated');
      setEditedLimits(null);
    } catch {
      notifications.error('Failed to update demo limits');
    }
  };

  const baselineTanks = demoLimits?.maxTanks ?? DEMO_LIMITS_DEFAULTS.maxTanks;
  const baselineRacksPerTank = demoLimits?.maxRacksPerTank ?? DEMO_LIMITS_DEFAULTS.maxRacksPerTank;
  const baselineBoxesPerRack = demoLimits?.maxBoxesPerRack ?? DEMO_LIMITS_DEFAULTS.maxBoxesPerRack;

  const maxTanks = editedLimits?.maxTanks ?? baselineTanks;
  const maxRacksPerTank = editedLimits?.maxRacksPerTank ?? baselineRacksPerTank;
  const maxBoxesPerRack = editedLimits?.maxBoxesPerRack ?? baselineBoxesPerRack;

  const changedCount =
    (maxTanks !== baselineTanks ? 1 : 0) +
    (maxRacksPerTank !== baselineRacksPerTank ? 1 : 0) +
    (maxBoxesPerRack !== baselineBoxesPerRack ? 1 : 0);

  return (
    <>
      <div>
        <SectionHeader
          title="Demo Settings"
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
        {isExpanded && (
          <ConsolePanel>
            <Subsection title="Resource Limits" index={1}>
              <SettingsRow label="Additional Tanks" hint="Max tanks beyond seeded baseline">
                <NumberInput
                  value={maxTanks}
                  onChange={v => setEditedLimits(prev => ({ ...prev, maxTanks: v }))}
                  min={0}
                  max={50}
                  size="sm"
                  aria-label="Additional Tanks"
                />
              </SettingsRow>
              <SettingsRow
                label="Additional Racks per Tank"
                hint="Max racks beyond seeded baseline"
              >
                <NumberInput
                  value={maxRacksPerTank}
                  onChange={v => setEditedLimits(prev => ({ ...prev, maxRacksPerTank: v }))}
                  min={0}
                  max={50}
                  size="sm"
                  aria-label="Additional Racks per Tank"
                />
              </SettingsRow>
              <SettingsRow
                label="Additional Boxes per Rack"
                hint="Max boxes beyond seeded baseline"
              >
                <NumberInput
                  value={maxBoxesPerRack}
                  onChange={v => setEditedLimits(prev => ({ ...prev, maxBoxesPerRack: v }))}
                  min={0}
                  max={26}
                  size="sm"
                  aria-label="Additional Boxes per Rack"
                />
              </SettingsRow>
            </Subsection>
            <div className="flex items-center justify-between gap-4 border-t border-line-soft bg-shade/25 [background-image:linear-gradient(0deg,hsl(var(--foreground)/0.035)_0%,transparent_70%)] px-5 py-3">
              <UnsavedChangesIndicator count={changedCount} />
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setResetDemoConfirm(true)}
                  leftIcon={<RotateCcw size={14} />}
                >
                  Reset Demo
                </Button>
                {isSeeded ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setUnseedConfirm(true)}
                    leftIcon={<BeanOff size={14} />}
                    isLoading={unseedDemoMutation.isPending}
                  >
                    Unseed
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setSeedConfirm(true)}
                    leftIcon={<Sprout size={14} />}
                    isLoading={seedDemoMutation.isPending}
                  >
                    Seed Demo
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveLimits}
                  isLoading={updateDemoLimitsMutation.isPending}
                  disabled={changedCount === 0}
                  leftIcon={<Save size={14} />}
                >
                  Save Limits
                </Button>
              </div>
            </div>
          </ConsolePanel>
        )}
      </div>

      <ConfirmDialog
        isOpen={resetDemoConfirm}
        title="Reset Demo Data"
        message="This will delete all tubes and remove all non-seeded infrastructure, returning to the clean seeded state. This cannot be undone."
        confirmText="Reset"
        variant="danger"
        isLoading={resetDemoMutation.isPending}
        onConfirm={handleResetDemo}
        onCancel={() => setResetDemoConfirm(false)}
      />

      <ConfirmDialog
        isOpen={seedConfirm}
        title="Seed Demo Infrastructure"
        message="This will mark all current tanks, racks, and boxes as protected. Demo lab admins will not be able to edit or delete seeded resources."
        confirmText="Seed"
        variant="warning"
        isLoading={seedDemoMutation.isPending}
        onConfirm={handleSeedDemo}
        onCancel={() => setSeedConfirm(false)}
      />

      <ConfirmDialog
        isOpen={unseedConfirm}
        title="Unseed Demo Infrastructure"
        message="This will remove protection from all resources, allowing demo lab admins to modify them. You can re-seed after making changes."
        confirmText="Unseed"
        variant="warning"
        isLoading={unseedDemoMutation.isPending}
        onConfirm={handleUnseedDemo}
        onCancel={() => setUnseedConfirm(false)}
      />
    </>
  );
}
