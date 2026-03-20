/**
 * Lab Demo Settings
 *
 * Collapsible panel for managing demo lab limits, seeding, and data reset.
 */

import { useState } from 'react';

import { DEMO_LIMITS_DEFAULTS } from '@odysseus/shared-schemas';
import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronDown, Save, RotateCcw, BeanOff, Sprout } from 'lucide-react';

import { Button, NumberInput } from '@shared/ui';
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

  return (
    <>
      <Collapsible.Root
        defaultOpen={false}
        className="rounded-lg border border-border bg-card max-w-md"
      >
        <Collapsible.Trigger className="flex w-full items-center justify-between p-3 cursor-pointer group">
          <div className="flex items-center gap-2">
            <ChevronDown
              size={14}
              className="text-secondary-foreground transition-transform duration-200 group-data-[state=closed]:-rotate-90"
            />
            <h3 className="text-sm font-semibold text-card-foreground">Demo Settings</h3>
          </div>
        </Collapsible.Trigger>
        <Collapsible.Content className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
          <div className="px-3 pb-3 space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
                <div>
                  <h5 className="text-sm font-medium text-card-foreground">Additional Tanks</h5>
                  <p className="text-xs text-secondary-foreground">
                    Max tanks beyond seeded baseline
                  </p>
                </div>
                <NumberInput
                  value={
                    editedLimits?.maxTanks ?? demoLimits?.maxTanks ?? DEMO_LIMITS_DEFAULTS.maxTanks
                  }
                  onChange={v => setEditedLimits(prev => ({ ...prev, maxTanks: v }))}
                  min={0}
                  max={50}
                  size="sm"
                  aria-label="Max additional tanks"
                />
              </div>
              <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
                <div>
                  <h5 className="text-sm font-medium text-card-foreground">
                    Additional Racks per Tank
                  </h5>
                  <p className="text-xs text-secondary-foreground">
                    Max racks beyond seeded baseline
                  </p>
                </div>
                <NumberInput
                  value={
                    editedLimits?.maxRacksPerTank ??
                    demoLimits?.maxRacksPerTank ??
                    DEMO_LIMITS_DEFAULTS.maxRacksPerTank
                  }
                  onChange={v => setEditedLimits(prev => ({ ...prev, maxRacksPerTank: v }))}
                  min={0}
                  max={50}
                  size="sm"
                  aria-label="Max racks per tank"
                />
              </div>
              <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
                <div>
                  <h5 className="text-sm font-medium text-card-foreground">
                    Additional Boxes per Rack
                  </h5>
                  <p className="text-xs text-secondary-foreground">
                    Max boxes beyond seeded baseline
                  </p>
                </div>
                <NumberInput
                  value={
                    editedLimits?.maxBoxesPerRack ??
                    demoLimits?.maxBoxesPerRack ??
                    DEMO_LIMITS_DEFAULTS.maxBoxesPerRack
                  }
                  onChange={v => setEditedLimits(prev => ({ ...prev, maxBoxesPerRack: v }))}
                  min={0}
                  max={26}
                  size="sm"
                  aria-label="Max boxes per rack"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              {editedLimits && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveLimits}
                  isLoading={updateDemoLimitsMutation.isPending}
                  leftIcon={<Save size={14} />}
                >
                  Save Limits
                </Button>
              )}
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
            </div>
          </div>
        </Collapsible.Content>
      </Collapsible.Root>

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
