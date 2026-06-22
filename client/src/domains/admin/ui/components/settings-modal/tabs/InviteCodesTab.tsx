/**
 * Invite Codes Tab
 *
 * Manages invite codes for the current lab (lab admins)
 * or any lab (system admins via the system admin dashboard).
 */

import { useState, useEffect, useCallback } from 'react';

import { Plus, Copy, Trash2, RefreshCw, ChevronDown } from 'lucide-react';

import { logger } from '@infra/logger';
import {
  Button,
  Chip,
  ConsolePanel,
  NubDivider,
  NumberInput,
  Select,
  SettingsRow,
  Subsection,
  Table,
  Toggle,
} from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { notifications } from '@shared/utils';

import { adminService } from '../../../../services/AdminService';

import type { InviteCodeData } from '@odysseus/shared-schemas';
import type { SelectOption, TableColumn } from '@shared/ui';

interface InviteCodesTabProps {
  readOnly?: boolean;
}

// Expiry presets in days; 0 means the code never expires.
const EXPIRY_OPTIONS: SelectOption[] = [
  { value: 0, label: 'Never' },
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
];

const DEFAULT_EXPIRY_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function InviteCodesTab({ readOnly = false }: InviteCodesTabProps) {
  const [codes, setCodes] = useState<InviteCodeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // New code form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCodeMaxUses, setNewCodeMaxUses] = useState(1);
  const [newCodeCreateResearcher, setNewCodeCreateResearcher] = useState(false);
  const [newCodeExpiryDays, setNewCodeExpiryDays] = useState(DEFAULT_EXPIRY_DAYS);
  const [showInactive, setShowInactive] = useState(false);

  const loadCodes = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await adminService.getInviteCodes();
      setCodes(result);
    } catch (error) {
      logger.error('Failed to load invite codes', { error });
      notifications.error('Failed to load invite codes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCodes();
  }, [loadCodes]);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await adminService.createInviteCode({
        createResearcher: newCodeCreateResearcher,
        maxUses: newCodeMaxUses,
        expiresAt:
          newCodeExpiryDays > 0
            ? new Date(Date.now() + newCodeExpiryDays * MS_PER_DAY).toISOString()
            : undefined,
      });
      notifications.success('Invite code created');
      setShowCreateForm(false);
      setNewCodeMaxUses(1);
      setNewCodeCreateResearcher(false);
      setNewCodeExpiryDays(DEFAULT_EXPIRY_DAYS);
      await loadCodes();
    } catch (error) {
      logger.error('Failed to create invite code', { error });
      notifications.error('Failed to create invite code');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await adminService.deactivateInviteCode(id);
      notifications.success('Invite code deactivated');
      setDeleteTarget(null);
      await loadCodes();
    } catch (error) {
      logger.error('Failed to deactivate invite code', { error });
      notifications.error('Failed to deactivate invite code');
    }
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      notifications.success('Code copied to clipboard');
    } catch {
      notifications.error('Failed to copy code');
    }
  };

  const now = new Date();
  const activeCodes = codes.filter(c => c.isActive && !(c.expiresAt && c.expiresAt < now));
  const inactiveCodes = codes.filter(c => !c.isActive || (c.expiresAt && c.expiresAt < now));

  const activeColumns: TableColumn<InviteCodeData>[] = [
    {
      id: 'code',
      header: 'Code',
      render: (_, code) => (
        <code className="font-mono text-data font-semibold tracking-wide text-foreground">
          {code.code}
        </code>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      render: (_, code) => (
        <Chip color={code.createResearcher ? 'info' : 'outlined'} size="sm">
          {code.createResearcher ? 'User + Researcher Profile' : 'User Only'}
        </Chip>
      ),
    },
    {
      id: 'uses',
      header: 'Uses',
      width: 90,
      render: (_, code) => (
        <span className="text-muted-foreground">
          {code.useCount}
          {code.maxUses ? `/${code.maxUses}` : ''}
        </span>
      ),
    },
    {
      id: 'expires',
      header: 'Expires',
      width: 120,
      render: (_, code) => (
        <span className="text-muted-foreground">
          {code.expiresAt ? code.expiresAt.toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      width: 90,
      render: (_, code) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="xs"
            iconOnly
            onClick={() => handleCopy(code.code)}
            aria-label="Copy code"
          >
            <Copy size={14} />
          </Button>
          {!readOnly && (
            <Button
              variant="ghost-danger"
              size="xs"
              iconOnly
              onClick={() => setDeleteTarget(code.id)}
              aria-label="Deactivate code"
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const inactiveColumns: TableColumn<InviteCodeData>[] = [
    {
      id: 'code',
      header: 'Code',
      render: (_, code) => (
        <code className="font-mono text-data text-muted-foreground">{code.code}</code>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      width: 140,
      render: (_, code) => {
        const reason =
          code.deactivationReason ??
          (code.expiresAt && code.expiresAt < now ? 'expired' : undefined);
        if (reason === 'used')
          return (
            <Chip color="default" size="xs">
              Used
            </Chip>
          );
        if (reason === 'expired')
          return (
            <Chip color="warning" size="xs">
              Expired
            </Chip>
          );
        if (reason === 'manual')
          return (
            <Chip color="default" size="xs">
              Deactivated
            </Chip>
          );
        return <span className="text-caption text-muted-foreground">{code.useCount} uses</span>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      {showCreateForm && (
        <ConsolePanel intensity="soft">
          <Subsection title="New Code" index={1}>
            <SettingsRow
              label="Researcher Profile"
              hint="Include researcher access"
              className="col-span-2"
            >
              <Toggle
                checked={newCodeCreateResearcher}
                onChange={setNewCodeCreateResearcher}
                aria-label="Include researcher profile"
              />
            </SettingsRow>
            <SettingsRow label="Max Uses" hint="Times code can be used" className="col-span-2">
              <NumberInput
                value={newCodeMaxUses}
                onChange={setNewCodeMaxUses}
                min={1}
                max={100}
                size="sm"
                aria-label="Max uses"
              />
            </SettingsRow>
            <SettingsRow label="Expires" hint="Code is unusable after this" className="col-span-2">
              <div className="w-36">
                <Select
                  options={EXPIRY_OPTIONS}
                  value={newCodeExpiryDays}
                  onChange={value => setNewCodeExpiryDays(Number(value))}
                  size="sm"
                  aria-label="Code expiry"
                />
              </div>
            </SettingsRow>
          </Subsection>
          <div className="flex justify-end gap-2 border-t border-line-soft px-5 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowCreateForm(false);
                setNewCodeMaxUses(1);
                setNewCodeCreateResearcher(false);
                setNewCodeExpiryDays(DEFAULT_EXPIRY_DAYS);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreate} isLoading={isCreating}>
              Create
            </Button>
          </div>
        </ConsolePanel>
      )}

      <Table
        columns={activeColumns}
        data={activeCodes}
        hoverable
        loading={isLoading && codes.length === 0}
        emptyMessage="No active invite codes. Create one to invite new users to your lab."
        loadingMessage="Loading invite codes..."
        aria-label="Active invite codes"
        toolbar={{
          right: (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={loadCodes}
                disabled={isLoading}
                leftIcon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
              >
                Refresh
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowCreateForm(true)}
                leftIcon={<Plus size={14} />}
                disabled={readOnly}
              >
                New Code
              </Button>
            </>
          ),
        }}
      />

      {inactiveCodes.length > 0 && (
        <div className="relative pt-5">
          <NubDivider tone="neutral" className="absolute inset-x-0 top-0" />
          <button
            onClick={() => setShowInactive(prev => !prev)}
            className="group flex items-center gap-2"
          >
            <ChevronDown
              size={13}
              className={`text-foreground/40 transition-transform ${showInactive ? 'rotate-0' : '-rotate-90'}`}
            />
            <span className="type-label text-label-xs tracking-label-wide text-foreground/70 transition-colors group-hover:text-foreground/90">
              Inactive Codes
            </span>
            <span className="type-label text-label-2xs text-foreground/35">
              {inactiveCodes.length}
            </span>
          </button>
          {showInactive && (
            <div className="mt-3">
              <Table
                columns={inactiveColumns}
                data={inactiveCodes}
                emptyMessage=""
                aria-label="Inactive invite codes"
                className="opacity-60"
              />
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Deactivate Invite Code"
        message="This code will no longer be usable for registration. This cannot be undone."
        confirmText="Deactivate"
        variant="danger"
        onConfirm={() => deleteTarget && handleDeactivate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
