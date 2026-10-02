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

interface LimitRow {
  key: keyof DemoLimits;
  label: string;
  hint: string;
  max: number;
}

const STORAGE_LIMITS: LimitRow[] = [
  { key: 'maxTanks', label: 'Additional Tanks', hint: 'Max tanks beyond seeded baseline', max: 50 },
  {
    key: 'maxRacksPerTank',
    label: 'Additional Racks per Tank',
    hint: 'Max racks beyond seeded baseline',
    max: 50,
  },
  {
    key: 'maxBoxesPerRack',
    label: 'Additional Boxes per Rack',
    hint: 'Max boxes beyond seeded baseline',
    max: 26,
  },
];

const CONTENT_LIMITS: LimitRow[] = [
  {
    key: 'maxDonors',
    label: 'Additional Donors',
    hint: 'Max donors beyond seeded baseline',
    max: 500,
  },
  {
    key: 'maxTubes',
    label: 'Additional Tubes',
    hint: 'Max tubes beyond seeded baseline',
    max: 5000,
  },
  {
    key: 'maxItemsPerCatalog',
    label: 'Additional Items per Catalog',
    hint: 'Reagents, supplies, and equipment counted separately',
    max: 500,
  },
];

const LIMIT_ROWS: LimitRow[] = STORAGE_LIMITS.flatMap((storage, i) => [storage, CONTENT_LIMITS[i]]);

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

  const handleResetDemo = () => {
    resetDemoMutation.mutate(labId, {
      onSuccess: () => {
        notifications.success('Demo data reset');
        setResetDemoConfirm(false);
      },
    });
  };

  const handleSeedDemo = () => {
    seedDemoMutation.mutate(labId, {
      onSuccess: () => {
        notifications.success('Demo infrastructure seeded');
        setSeedConfirm(false);
      },
    });
  };

  const handleUnseedDemo = () => {
    unseedDemoMutation.mutate(labId, {
      onSuccess: () => {
        notifications.success('Demo infrastructure unseeded');
        setUnseedConfirm(false);
      },
    });
  };

  const handleSaveLimits = () => {
    if (!editedLimits) return;
    updateDemoLimitsMutation.mutate(
      { labId, limits: editedLimits },
      {
        onSuccess: () => {
          notifications.success('Demo limits updated');
          setEditedLimits(null);
        },
      }
    );
  };

  const rows = LIMIT_ROWS.map(row => {
    const baseline = demoLimits?.[row.key] ?? DEMO_LIMITS_DEFAULTS[row.key];
    return { ...row, baseline, value: editedLimits?.[row.key] ?? baseline };
  });

  const changedCount = rows.filter(row => row.value !== row.baseline).length;

  return (
    <>
      <ConsolePanel intensity="soft">
        <SectionHeader
          className="px-4 pt-4"
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
          <>
            <Subsection title="Resource Limits" index={1} className="px-5">
              {rows.map(row => (
                <SettingsRow key={row.key} label={row.label} hint={row.hint}>
                  <NumberInput
                    value={row.value}
                    onChange={v => setEditedLimits(prev => ({ ...prev, [row.key]: v }))}
                    min={0}
                    max={row.max}
                    size="sm"
                    aria-label={row.label}
                  />
                </SettingsRow>
              ))}
            </Subsection>
            <div className="flex items-center justify-between gap-4 border-t border-line-soft bg-card dark:bg-shade/25 dark:[background-image:linear-gradient(0deg,hsl(var(--foreground)/0.035)_0%,transparent_70%)] px-5 py-3">
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
          </>
        )}
      </ConsolePanel>

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
