/**
 * Lab Demo Settings
 *
 * Demo lab management: per-resource limits, seed/unseed, reset.
 */

import { useState } from 'react';

import { DEMO_LIMITS_DEFAULTS } from '@odysseus/shared-schemas';
import { BeanOff, RotateCcw, Save, Sprout } from 'lucide-react';

import { Button, NumberInput, SectionHeader } from '@shared/ui';
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

  const maxTanks = editedLimits?.maxTanks ?? demoLimits?.maxTanks ?? DEMO_LIMITS_DEFAULTS.maxTanks;
  const maxRacksPerTank =
    editedLimits?.maxRacksPerTank ??
    demoLimits?.maxRacksPerTank ??
    DEMO_LIMITS_DEFAULTS.maxRacksPerTank;
  const maxBoxesPerRack =
    editedLimits?.maxBoxesPerRack ??
    demoLimits?.maxBoxesPerRack ??
    DEMO_LIMITS_DEFAULTS.maxBoxesPerRack;

  return (
    <>
      <div>
        <SectionHeader title="Demo Settings" />
        <div className="divide-y divide-line-faint border-b border-transparent [&>*:nth-child(2)]:[border-image:linear-gradient(90deg,hsl(var(--foreground)/0.14)_0%,hsl(var(--foreground)/0.10)_60%,transparent_100%)_1] [&>*:nth-child(3)]:[border-image:linear-gradient(90deg,hsl(var(--foreground)/0.12)_0%,hsl(var(--foreground)/0.08)_72%,transparent_100%)_1] [border-image:linear-gradient(90deg,hsl(var(--foreground)/0.10)_0%,hsl(var(--foreground)/0.06)_55%,transparent_100%)_1]">
          <DemoLimitRow
            label="Additional Tanks"
            hint="Max tanks beyond seeded baseline"
            value={maxTanks}
            onChange={v => setEditedLimits(prev => ({ ...prev, maxTanks: v }))}
            max={50}
          />
          <DemoLimitRow
            label="Additional Racks per Tank"
            hint="Max racks beyond seeded baseline"
            value={maxRacksPerTank}
            onChange={v => setEditedLimits(prev => ({ ...prev, maxRacksPerTank: v }))}
            max={50}
          />
          <DemoLimitRow
            label="Additional Boxes per Rack"
            hint="Max boxes beyond seeded baseline"
            value={maxBoxesPerRack}
            onChange={v => setEditedLimits(prev => ({ ...prev, maxBoxesPerRack: v }))}
            max={26}
          />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 pt-3">
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

interface DemoLimitRowProps {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  max: number;
}

function DemoLimitRow({ label, hint, value, onChange, max }: DemoLimitRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/85">
          {label}
        </div>
        <div className="mt-0.5 font-mono text-[10px] tracking-[0.06em] text-muted-foreground/70">
          {hint}
        </div>
      </div>
      <NumberInput
        value={value}
        onChange={onChange}
        min={0}
        max={max}
        size="sm"
        aria-label={label}
      />
    </div>
  );
}
