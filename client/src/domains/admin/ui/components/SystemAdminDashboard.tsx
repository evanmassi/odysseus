/**
 * System Admin Dashboard
 *
 * Cross-lab management panel visible only to system_admin users.
 * Provides lab CRUD, lab admin invite code generation, and overview stats.
 */

import { useState, useEffect, useCallback } from 'react';

import {
  Building2,
  Plus,
  Users,
  TestTubes,
  TicketCheck,
  Copy,
  Power,
  RefreshCw,
} from 'lucide-react';

import { logger } from '@shared/infrastructure/logger';
import { Button, Chip } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/ConfirmDialog';
import { BaseModal } from '@shared/ui/components/modals/BaseModal';
import { notifications } from '@shared/utils';

import { labService } from '../../services/LabService';

import type { LabData, InviteCodeData } from '@odysseus/shared-schemas';

interface SystemAdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SystemAdminDashboard({ isOpen, onClose }: SystemAdminDashboardProps) {
  const [labs, setLabs] = useState<LabData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState<{
    totalLabs: number;
    totalUsers: number;
    totalTubes: number;
    labStats: Array<{ labId: string; labName: string; userCount: number; tubeCount: number }>;
  } | null>(null);

  // Create lab form
  const [showCreateLab, setShowCreateLab] = useState(false);
  const [newLabName, setNewLabName] = useState('');
  const [isCreatingLab, setIsCreatingLab] = useState(false);

  // Deactivate lab
  const [deactivateTarget, setDeactivateTarget] = useState<string | null>(null);

  // Invite code generation
  const [generatingCodeForLab, setGeneratingCodeForLab] = useState<string | null>(null);
  const [labInviteCodes, setLabInviteCodes] = useState<Record<string, InviteCodeData[]>>({});

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [labsResult, overviewResult] = await Promise.all([
        labService.getLabs(),
        labService.getSystemOverview(),
      ]);
      setLabs(labsResult);
      setOverview(overviewResult);
    } catch (error) {
      logger.error('Failed to load system admin data', { error });
      notifications.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      void loadData();
    }
  }, [isOpen, loadData]);

  const handleCreateLab = async () => {
    if (!newLabName.trim()) return;

    setIsCreatingLab(true);
    try {
      await labService.createLab(newLabName.trim());
      notifications.success(`Lab "${newLabName.trim()}" created`);
      setNewLabName('');
      setShowCreateLab(false);
      await loadData();
    } catch (error) {
      logger.error('Failed to create lab', { error });
      notifications.error('Failed to create lab');
    } finally {
      setIsCreatingLab(false);
    }
  };

  const handleDeactivateLab = async (labId: string) => {
    try {
      await labService.deactivateLab(labId);
      notifications.success('Lab deactivated');
      setDeactivateTarget(null);
      await loadData();
    } catch (error) {
      logger.error('Failed to deactivate lab', { error });
      notifications.error('Failed to deactivate lab');
    }
  };

  const handleGenerateLabAdminCode = async (labId: string) => {
    setGeneratingCodeForLab(labId);
    try {
      const code = await labService.createLabInviteCode(labId, { role: 'lab_admin' });
      setLabInviteCodes(prev => ({
        ...prev,
        [labId]: [...(prev[labId] ?? []), code],
      }));
      await navigator.clipboard.writeText(code.code);
      notifications.success('Lab admin invite code created and copied to clipboard');
    } catch (error) {
      logger.error('Failed to generate lab admin code', { error });
      notifications.error('Failed to generate invite code');
    } finally {
      setGeneratingCodeForLab(null);
    }
  };

  const getLabStats = (labId: string) => {
    return overview?.labStats.find(s => s.labId === labId);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      icon={<Building2 size={24} />}
      title="System Administration"
      subtitle="Lab Management & Global Settings"
      size="xl"
      animation="slide"
      className="h-[80vh]"
      onClose={onClose}
    >
      <div className="space-y-6">
        {/* Overview Stats */}
        {overview && (
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-muted rounded-lg text-center">
              <div className="text-2xl font-bold text-foreground">{overview.totalLabs}</div>
              <div className="text-xs text-muted-foreground">Labs</div>
            </div>
            <div className="p-3 bg-muted rounded-lg text-center">
              <div className="text-2xl font-bold text-foreground">{overview.totalUsers}</div>
              <div className="text-xs text-muted-foreground">Users</div>
            </div>
            <div className="p-3 bg-muted rounded-lg text-center">
              <div className="text-2xl font-bold text-foreground">{overview.totalTubes}</div>
              <div className="text-xs text-muted-foreground">Tubes</div>
            </div>
          </div>
        )}

        {/* Labs Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-card-foreground">Labs</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              leftIcon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateLab(true)}
              leftIcon={<Plus size={14} />}
            >
              Create Lab
            </Button>
          </div>
        </div>

        {/* Create Lab Form */}
        {showCreateLab && (
          <div className="p-3 bg-muted rounded-lg space-y-3">
            <h4 className="text-sm font-medium text-card-foreground">New Lab</h4>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label htmlFor="new-lab-name" className="text-xs text-muted-foreground block mb-1">
                  Lab name
                </label>
                <input
                  id="new-lab-name"
                  type="text"
                  value={newLabName}
                  onChange={e => setNewLabName(e.target.value)}
                  placeholder="e.g., Smith Lab"
                  className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background text-foreground"
                  maxLength={200}
                  onKeyDown={e => e.key === 'Enter' && handleCreateLab()}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCreateLab}
                  isLoading={isCreatingLab}
                >
                  Create
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCreateLab(false);
                    setNewLabName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Labs List */}
        {isLoading && labs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Loading labs...</div>
        ) : (
          <div className="space-y-3">
            {labs.map(lab => {
              const stats = getLabStats(lab.id);
              const codes = labInviteCodes[lab.id] ?? [];

              return (
                <div key={lab.id} className="p-4 bg-muted rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Building2 size={18} className="text-secondary-foreground" />
                      <div>
                        <h4 className="text-sm font-semibold text-card-foreground">{lab.name}</h4>
                        <span className="text-xs text-muted-foreground">{lab.slug}</span>
                      </div>
                      <Chip color={lab.isActive ? 'success' : 'default'} size="sm">
                        {lab.isActive ? 'Active' : 'Inactive'}
                      </Chip>
                    </div>
                    <div className="flex items-center gap-2">
                      {stats && (
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mr-3">
                          <span className="flex items-center gap-1">
                            <Users size={12} /> {stats.userCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <TestTubes size={12} /> {stats.tubeCount}
                          </span>
                        </div>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleGenerateLabAdminCode(lab.id)}
                        isLoading={generatingCodeForLab === lab.id}
                        leftIcon={<TicketCheck size={14} />}
                        disabled={!lab.isActive}
                      >
                        Lab Admin Code
                      </Button>
                      {lab.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeactivateTarget(lab.id)}
                          className="text-danger-text hover:text-danger-text"
                        >
                          <Power size={14} />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Recently generated codes for this lab */}
                  {codes.length > 0 && (
                    <div className="pl-7 space-y-1">
                      {codes.map(code => (
                        <div key={code.id} className="flex items-center gap-2 text-xs">
                          <code className="font-mono font-semibold bg-background px-2 py-0.5 rounded border border-border">
                            {code.code}
                          </code>
                          <Chip color="default" size="sm">
                            {code.role === 'lab_admin' ? 'Lab Admin' : 'User'}
                          </Chip>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              await navigator.clipboard.writeText(code.code);
                              notifications.success('Copied');
                            }}
                          >
                            <Copy size={12} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={deactivateTarget !== null}
        title="Deactivate Lab"
        message="Deactivating a lab prevents all its users from logging in. Lab data is preserved. This can be reversed."
        confirmText="Deactivate"
        variant="danger"
        onConfirm={() => deactivateTarget && handleDeactivateLab(deactivateTarget)}
        onCancel={() => setDeactivateTarget(null)}
      />
    </BaseModal>
  );
}
