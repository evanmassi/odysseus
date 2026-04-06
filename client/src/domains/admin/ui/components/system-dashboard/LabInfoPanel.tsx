/**
 * Lab Info Panel
 *
 * Lab header card with inline rename, activate/deactivate controls, and summary stats chips.
 */

import { useState } from 'react';

import { refrigeratorFreezer } from '@lucide/lab';
import {
  Box as BoxIcon,
  Check,
  CircleCheckBig,
  Dna,
  Icon,
  OctagonX,
  SquarePen,
  Power,
  Rows3,
  ShieldUser,
  BeanOff,
  Sprout,
  TestTube,
  UsersRound,
  X,
} from 'lucide-react';

import { Button, Chip } from '@shared/ui';
import { LabBadge } from '@shared/ui/components/badges';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { notifications } from '@shared/utils';

import {
  useUpdateLabMutation,
  useActivateLabMutation,
  useDeactivateLabMutation,
} from '../../../hooks/useLabMutations';

import type { LabDetails } from '@odysseus/shared-schemas';

interface LabInfoPanelProps {
  labId: string;
  lab: LabDetails['lab'];
  isSeeded: boolean;
  adminCount: number;
  userCount: number;
  researcherCount: number;
  tubeCount: number;
  tubesWithoutResearcher: number;
  storageSummary: LabDetails['storageSummary'];
}

export function LabInfoPanel({
  labId,
  lab,
  isSeeded,
  adminCount,
  userCount,
  researcherCount,
  tubeCount,
  tubesWithoutResearcher,
  storageSummary,
}: LabInfoPanelProps) {
  const updateLabMutation = useUpdateLabMutation();
  const activateLabMutation = useActivateLabMutation();
  const deactivateLabMutation = useDeactivateLabMutation();

  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [deactivateTarget, setDeactivateTarget] = useState<string | null>(null);

  const handleRename = async () => {
    if (!newName.trim()) return;
    try {
      await updateLabMutation.mutateAsync({ id: labId, name: newName.trim() });
      notifications.success('Lab renamed');
      setIsRenaming(false);
    } catch {
      notifications.error('Failed to rename lab');
    }
  };

  const handleActivate = async () => {
    try {
      await activateLabMutation.mutateAsync(labId);
      notifications.success('Lab activated');
    } catch {
      notifications.error('Failed to activate lab');
    }
  };

  const handleDeactivate = async () => {
    try {
      await deactivateLabMutation.mutateAsync(labId);
      notifications.success('Lab deactivated');
      setDeactivateTarget(null);
    } catch {
      notifications.error('Failed to deactivate lab');
    }
  };

  return (
    <>
      <div className="rounded-lg outline outline-1 outline-offset-1 outline-secondary-foreground/50 p-1 space-y-1">
        <div className="rounded-md bg-muted px-3 py-2.5">
          <div className="flex items-center gap-3">
            <LabBadge labId={labId} labName={lab.name} size="md" isDemo={lab.isDemo} />
            {isRenaming ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="px-2 py-1 text-lg font-semibold border border-border rounded bg-background text-foreground"
                  onKeyDown={e => e.key === 'Enter' && handleRename()}
                  ref={(el: HTMLInputElement | null) => el?.focus()}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRename}
                  isLoading={updateLabMutation.isPending}
                >
                  <Check size={14} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setIsRenaming(false)}>
                  <X size={14} />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-card-foreground">{lab.name}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setNewName(lab.name);
                    setIsRenaming(true);
                  }}
                >
                  <SquarePen size={12} />
                </Button>
              </div>
            )}
            {lab.isActive ? (
              <Button
                variant="danger"
                size="sm"
                className="ml-auto"
                onClick={() => setDeactivateTarget(labId)}
                leftIcon={<Power size={14} />}
              >
                Deactivate
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                className="ml-auto"
                onClick={handleActivate}
                isLoading={activateLabMutation.isPending}
                leftIcon={<Power size={14} />}
              >
                Activate
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-md bg-muted px-3 py-1.5 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Chip
              color={lab.isActive ? 'success' : 'danger'}
              size="sm"
              leftIcon={lab.isActive ? <CircleCheckBig /> : <OctagonX />}
            >
              {lab.isActive ? 'Active' : 'Deactivated'}
            </Chip>
            {lab.isDemo && (
              <Chip
                color={isSeeded ? 'success' : 'warning'}
                size="sm"
                leftIcon={isSeeded ? <Sprout /> : <BeanOff />}
              >
                {isSeeded ? 'Seeded' : 'Not Seeded'}
              </Chip>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Chip color="info" size="sm" leftIcon={<ShieldUser />}>
              {adminCount} {adminCount === 1 ? 'admin' : 'admins'}
            </Chip>
            <Chip color="info" size="sm" leftIcon={<UsersRound />}>
              {userCount} {userCount === 1 ? 'user' : 'users'}
            </Chip>
            <Chip color="info" size="sm" leftIcon={<Dna />}>
              {researcherCount} {researcherCount === 1 ? 'researcher' : 'researchers'}
            </Chip>
            <span className="text-muted-foreground">·</span>
            <Chip
              color="info"
              size="sm"
              leftIcon={<Icon iconNode={refrigeratorFreezer} size={12} />}
            >
              {storageSummary.tankCount} {storageSummary.tankCount === 1 ? 'tank' : 'tanks'}
            </Chip>
            <Chip color="info" size="sm" leftIcon={<Rows3 />}>
              {storageSummary.rackCount} {storageSummary.rackCount === 1 ? 'rack' : 'racks'}
            </Chip>
            <Chip color="info" size="sm" leftIcon={<BoxIcon />}>
              {storageSummary.boxCount} {storageSummary.boxCount === 1 ? 'box' : 'boxes'}
            </Chip>
            <span className="text-muted-foreground">·</span>
            <Chip color="info" size="sm" leftIcon={<TestTube />}>
              {tubeCount} total {tubeCount === 1 ? 'tube' : 'tubes'}
            </Chip>
            {tubesWithoutResearcher > 0 && (
              <Chip color="warning" size="sm" leftIcon={<TestTube />}>
                {tubesWithoutResearcher} {tubesWithoutResearcher === 1 ? 'tube' : 'tubes'} without
                researcher
              </Chip>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={deactivateTarget !== null}
        title="Deactivate Lab"
        message="Deactivating a lab prevents all its users from logging in. Lab data is preserved. This can be reversed."
        confirmText="Deactivate"
        variant="danger"
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </>
  );
}
