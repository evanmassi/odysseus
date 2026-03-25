/**
 * Invite Codes Tab
 *
 * Manages invite codes for the current lab (lab admins)
 * or any lab (system admins via the system admin dashboard).
 */

import { useState, useEffect, useCallback } from 'react';

import { TicketCheck, Plus, Copy, Trash2, RefreshCw, ChevronDown } from 'lucide-react';

import { logger } from '@infra/logger';
import { Button, Chip, NumberInput, Toggle } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { notifications } from '@shared/utils';

import { adminService } from '../../../../services/AdminService';

import type { InviteCodeData } from '@odysseus/shared-schemas';

interface InviteCodesTabProps {
  readOnly?: boolean;
}

export function InviteCodesTab({ readOnly = false }: InviteCodesTabProps) {
  const [codes, setCodes] = useState<InviteCodeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // New code form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCodeMaxUses, setNewCodeMaxUses] = useState(1);
  const [newCodeCreateResearcher, setNewCodeCreateResearcher] = useState(false);
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
      });
      notifications.success('Invite code created');
      setShowCreateForm(false);
      setNewCodeMaxUses(1);
      setNewCodeCreateResearcher(false);
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
            disabled={readOnly}
          >
            New Code
          </Button>
        </div>
      </div>

      {showCreateForm && (
        <div className="p-3 bg-muted rounded-lg space-y-2">
          <h4 className="text-sm font-medium text-card-foreground">Create Invite Code</h4>

          <div className="grid grid-cols-2 gap-1.5">
            <div className="flex items-center justify-between p-2.5 bg-background rounded-lg">
              <div>
                <h5 className="text-sm font-medium text-card-foreground">Max Uses</h5>
                <p className="text-xs text-secondary-foreground">Times code can be used</p>
              </div>
              <NumberInput
                value={newCodeMaxUses}
                onChange={setNewCodeMaxUses}
                min={1}
                max={100}
                size="sm"
                aria-label="Max uses"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 bg-background rounded-lg">
              <div>
                <h5 className="text-sm font-medium text-card-foreground">Researcher Profile</h5>
                <p className="text-xs text-secondary-foreground">Include researcher access</p>
              </div>
              <Toggle
                checked={newCodeCreateResearcher}
                onChange={setNewCodeCreateResearcher}
                aria-label="Include researcher profile"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowCreateForm(false);
                setNewCodeMaxUses(1);
                setNewCodeCreateResearcher(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreate} isLoading={isCreating}>
              Create
            </Button>
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
                  <Chip color={code.createResearcher ? 'info' : 'outlined'} size="sm">
                    {code.createResearcher ? 'User + Researcher Profile' : 'User Only'}
                  </Chip>
                  <span className="text-xs text-muted-foreground">
                    {code.useCount}
                    {code.maxUses ? `/${code.maxUses}` : ''} uses
                  </span>
                  {code.expiresAt && (
                    <span className="text-xs text-muted-foreground">
                      expires {code.expiresAt.toLocaleDateString()}
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
                {!readOnly && (
                  <Button
                    variant="ghost-danger"
                    size="sm"
                    onClick={() => setDeleteTarget(code.id)}
                    aria-label="Deactivate code"
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {inactiveCodes.length > 0 && (
        <div className="pt-3 border-t border-border">
          <button
            onClick={() => setShowInactive(prev => !prev)}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown
              size={14}
              className={`transition-transform ${showInactive ? 'rotate-0' : '-rotate-90'}`}
            />
            Inactive Codes ({inactiveCodes.length})
          </button>
          {showInactive && (
            <div className="space-y-1 mt-2">
              {inactiveCodes.map(code => {
                const reason =
                  code.deactivationReason ??
                  (code.expiresAt && code.expiresAt < now ? 'expired' : undefined);

                return (
                  <div
                    key={code.id}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded opacity-60"
                  >
                    <div className="flex items-center gap-3">
                      <code className="text-xs font-mono text-muted-foreground">{code.code}</code>
                      {reason === 'used' && (
                        <Chip color="default" size="xs">
                          Used
                        </Chip>
                      )}
                      {reason === 'expired' && (
                        <Chip color="warning" size="xs">
                          Expired
                        </Chip>
                      )}
                      {reason === 'manual' && (
                        <Chip color="default" size="xs">
                          Deactivated
                        </Chip>
                      )}
                      {!reason && (
                        <span className="text-xs text-muted-foreground">{code.useCount} uses</span>
                      )}
                    </div>
                  </div>
                );
              })}
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
