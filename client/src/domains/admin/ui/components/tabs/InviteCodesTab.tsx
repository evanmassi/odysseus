/**
 * Invite Codes Tab
 *
 * Manages invite codes for the current lab (lab admins)
 * or any lab (system admins via the system admin dashboard).
 */

import { useState, useEffect, useCallback } from 'react';

import { TicketCheck, Plus, Copy, Trash2, RefreshCw } from 'lucide-react';

import { logger } from '@shared/infrastructure/logger';
import { Button, Chip } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/ConfirmDialog';
import { notifications } from '@shared/utils';

import { adminService } from '../../../services/AdminService';

import type { InviteCodeData } from '@odysseus/shared-schemas';

export function InviteCodesTab() {
  const [codes, setCodes] = useState<InviteCodeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // New code form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCodeMaxUses, setNewCodeMaxUses] = useState<number | undefined>(undefined);

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
        maxUses: newCodeMaxUses,
      });
      notifications.success('Invite code created');
      setShowCreateForm(false);
      setNewCodeMaxUses(undefined);
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

  const activeCodes = codes.filter(c => c.isActive);
  const inactiveCodes = codes.filter(c => !c.isActive);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center space-x-2">
          <TicketCheck size={22} className="text-secondary-foreground" />
          <h3 className="text-xl font-semibold text-card-foreground">Invite Codes</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
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
          >
            New Code
          </Button>
        </div>
      </div>

      {showCreateForm && (
        <div className="p-3 bg-muted rounded-lg space-y-3">
          <h4 className="text-sm font-medium text-card-foreground">Create Invite Code</h4>
          <div className="flex items-end gap-3">
            <div>
              <label
                htmlFor="invite-code-max-uses"
                className="text-xs text-muted-foreground block mb-1"
              >
                Max uses (optional)
              </label>
              <input
                id="invite-code-max-uses"
                type="number"
                min={1}
                value={newCodeMaxUses ?? ''}
                onChange={e =>
                  setNewCodeMaxUses(e.target.value ? Number(e.target.value) : undefined)
                }
                placeholder="Unlimited"
                className="w-32 px-2 py-1.5 text-sm border border-border rounded bg-background text-foreground"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={handleCreate} isLoading={isCreating}>
                Create
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewCodeMaxUses(undefined);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {isLoading && codes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Loading invite codes...
        </div>
      ) : activeCodes.length === 0 && !showCreateForm ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No active invite codes. Create one to invite new users to your lab.
        </div>
      ) : (
        <div className="space-y-2">
          {activeCodes.map(code => (
            <div
              key={code.id}
              className="flex items-center justify-between p-3 bg-muted rounded-lg"
            >
              <div className="flex items-center gap-3">
                <code className="text-sm font-mono font-semibold text-foreground bg-background px-2 py-1 rounded border border-border">
                  {code.code}
                </code>
                <div className="flex items-center gap-2">
                  <Chip color="default" size="sm">
                    {code.role === 'lab_admin' ? 'Lab Admin' : 'User'}
                  </Chip>
                  <span className="text-xs text-muted-foreground">
                    {code.useCount}
                    {code.maxUses ? `/${code.maxUses}` : ''} uses
                  </span>
                  {code.expiresAt && (
                    <span className="text-xs text-muted-foreground">
                      expires {new Date(code.expiresAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(code.code)}
                  aria-label="Copy code"
                >
                  <Copy size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteTarget(code.id)}
                  aria-label="Deactivate code"
                  className="text-danger-text hover:text-danger-text"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {inactiveCodes.length > 0 && (
        <div className="pt-3 border-t border-border">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            Inactive Codes ({inactiveCodes.length})
          </h4>
          <div className="space-y-1">
            {inactiveCodes.map(code => (
              <div
                key={code.id}
                className="flex items-center justify-between p-2 bg-muted/50 rounded opacity-60"
              >
                <div className="flex items-center gap-3">
                  <code className="text-xs font-mono text-muted-foreground">{code.code}</code>
                  <span className="text-xs text-muted-foreground">{code.useCount} uses</span>
                </div>
              </div>
            ))}
          </div>
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
