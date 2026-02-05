/**
 * Demo Management Tab Component
 *
 * Provides admin interface for managing demo mode including:
 * - Viewing and managing demo users
 * - Viewing and managing demo tanks
 * - Resetting demo data (clearing all tubes in demo tanks)
 *
 * Part of the Admin Settings modal tab system.
 */

import { useState, useEffect, useMemo } from 'react';

import { RefreshCw, UserRound, Trash2, FlaskConical, ToggleRight } from 'lucide-react';

import { AnimatedCheckmark, AnimatedXMark } from '@shared/components';
import { logger } from '@shared/infrastructure/logger';
import { Button, Table, Tooltip, Chip, Select } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/ConfirmDialog';
import { notifications } from '@shared/utils';

import { adminService } from '../../../services/AdminService';

import type { AdminUser, TankConfiguration } from '@odysseus/shared-schemas';
import type { TableColumn, TableRow, SortConfig } from '@shared/ui';

/**
 * DemoManagementTab Props Interface
 */
export interface DemoManagementTabProps {
  /** Callback invoked when demo data changes (for refreshing parent state) */
  onDemoUpdate?: () => void;
}

/**
 * Demo Management Tab Component
 *
 * Renders demo management interface with sections for demo users, demo tanks,
 * and a reset demo data action.
 */
export function DemoManagementTab({ onDemoUpdate }: DemoManagementTabProps) {
  const [demoUsers, setDemoUsers] = useState<AdminUser[]>([]);
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [allTanks, setAllTanks] = useState<TankConfiguration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [updatingTankId, setUpdatingTankId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [userSortConfig, setUserSortConfig] = useState<SortConfig | undefined>(undefined);
  const [tankSortConfig, setTankSortConfig] = useState<SortConfig | undefined>(undefined);

  // Load data on mount
  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [demoUsersRes, allUsersRes, tanksRes] = await Promise.all([
        adminService.getDemoUsers(),
        adminService.getUsers(),
        adminService.getAllTanks(),
      ]);

      if (demoUsersRes.success) {
        setDemoUsers(demoUsersRes.users);
      }
      if (allUsersRes.success) {
        setAllUsers(allUsersRes.users);
      }
      if (tanksRes.success) {
        setAllTanks(tanksRes.tanks);
      }
    } catch (error) {
      logger.error('Failed to load demo management data', { error });
      notifications.error('Failed to load demo management data');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter for non-demo users (candidates for marking as demo)
  const nonDemoUsers = useMemo(() => {
    const demoUserIds = new Set(demoUsers.map(u => u.id));
    return allUsers.filter(u => !demoUserIds.has(u.id));
  }, [allUsers, demoUsers]);

  // Filter for demo and non-demo tanks
  const demoTanks = useMemo(() => allTanks.filter(t => t.isDemo), [allTanks]);
  const nonDemoTanks = useMemo(() => allTanks.filter(t => !t.isDemo), [allTanks]);

  /**
   * Toggle user demo status
   */
  const toggleUserDemoStatus = async (userId: string, currentIsDemo: boolean) => {
    setUpdatingUserId(userId);
    try {
      const response = await adminService.setUserDemoStatus(userId, !currentIsDemo);
      if (response.success) {
        notifications.success(
          currentIsDemo ? 'User removed from demo mode' : 'User marked as demo'
        );
        await loadData();
        onDemoUpdate?.();
      } else {
        notifications.error('Failed to update user demo status');
      }
    } catch (error) {
      logger.error('Failed to toggle user demo status', { userId, error });
      notifications.error('Failed to update user demo status');
    } finally {
      setUpdatingUserId(null);
    }
  };

  /**
   * Toggle tank demo status
   */
  const toggleTankDemoStatus = async (tankId: string, currentIsDemo: boolean) => {
    setUpdatingTankId(tankId);
    try {
      const response = await adminService.setTankDemoStatus(tankId, !currentIsDemo);
      if (response.success) {
        notifications.success(
          currentIsDemo ? 'Tank removed from demo mode' : 'Tank marked as demo'
        );
        await loadData();
        onDemoUpdate?.();
      } else {
        notifications.error('Failed to update tank demo status');
      }
    } catch (error) {
      logger.error('Failed to toggle tank demo status', { tankId, error });
      notifications.error('Failed to update tank demo status');
    } finally {
      setUpdatingTankId(null);
    }
  };

  /**
   * Reset all demo data
   */
  const handleResetDemoData = async () => {
    setIsResetting(true);
    try {
      const response = await adminService.resetDemoData();
      if (response.success) {
        notifications.success(`Demo data reset. ${response.deletedTubes} tubes deleted.`);
        setShowResetConfirm(false);
        onDemoUpdate?.();
      } else {
        notifications.error('Failed to reset demo data');
      }
    } catch (error) {
      logger.error('Failed to reset demo data', { error });
      notifications.error('Failed to reset demo data');
    } finally {
      setIsResetting(false);
    }
  };

  // Sort demo users
  const sortedDemoUsers = useMemo(() => {
    if (!userSortConfig) return demoUsers;
    return [...demoUsers].sort((a, b) => {
      const direction = userSortConfig.direction === 'asc' ? 1 : -1;
      if (userSortConfig.columnId === 'username') {
        return a.username.localeCompare(b.username) * direction;
      }
      return 0;
    });
  }, [demoUsers, userSortConfig]);

  // Sort demo tanks
  const sortedDemoTanks = useMemo(() => {
    if (!tankSortConfig) return demoTanks;
    return [...demoTanks].sort((a, b) => {
      const direction = tankSortConfig.direction === 'asc' ? 1 : -1;
      if (tankSortConfig.columnId === 'name') {
        return a.name.localeCompare(b.name) * direction;
      }
      return 0;
    });
  }, [demoTanks, tankSortConfig]);

  // Demo users table columns
  const userColumns: TableColumn<TableRow>[] = [
    {
      id: 'username',
      header: 'Username',
      sortable: true,
      render: (_, row) => {
        const user = row as unknown as AdminUser;
        return (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
              <UserRound size={14} className="text-secondary-foreground" />
            </div>
            <div>
              <div className="text-sm font-medium text-card-foreground">{user.username}</div>
              {user.firstName && user.lastName && (
                <div className="text-xs text-muted-foreground">
                  {user.firstName} {user.lastName}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: 'role',
      header: 'Role',
      render: (_, row) => {
        const user = row as unknown as AdminUser;
        return (
          <Chip size="sm" color={user.role === 'admin' ? 'primary' : 'default'}>
            {user.role}
          </Chip>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      render: (_, row) => {
        const user = row as unknown as AdminUser;
        return (
          <Tooltip content="Remove from demo mode" side="bottom">
            <Button
              variant="ghost-danger"
              size="xs"
              onClick={() => toggleUserDemoStatus(user.id, true)}
              isLoading={updatingUserId === user.id}
              leftIcon={<ToggleRight size={16} />}
            >
              Remove
            </Button>
          </Tooltip>
        );
      },
    },
  ];

  // Demo tanks table columns
  const tankColumns: TableColumn<TableRow>[] = [
    {
      id: 'name',
      header: 'Tank Name',
      sortable: true,
      render: (_, row) => {
        const tank = row as unknown as TankConfiguration;
        return (
          <div className="flex items-center gap-2">
            <FlaskConical size={16} className="text-secondary-foreground" />
            <span className="text-sm font-medium text-card-foreground">{tank.name}</span>
          </div>
        );
      },
    },
    {
      id: 'location',
      header: 'Location',
      render: (_, row) => {
        const tank = row as unknown as TankConfiguration;
        return <span className="text-sm text-muted-foreground">{tank.location || 'N/A'}</span>;
      },
    },
    {
      id: 'racks',
      header: 'Racks',
      render: (_, row) => {
        const tank = row as unknown as TankConfiguration;
        return <span className="text-sm text-muted-foreground">{tank.racks?.length ?? 0}</span>;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      render: (_, row) => {
        const tank = row as unknown as TankConfiguration;
        return (
          <Tooltip content="Remove from demo mode" side="bottom">
            <Button
              variant="ghost-danger"
              size="xs"
              onClick={() => toggleTankDemoStatus(tank.id, true)}
              isLoading={updatingTankId === tank.id}
              leftIcon={<ToggleRight size={16} />}
            >
              Remove
            </Button>
          </Tooltip>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center space-x-2">
          <FlaskConical size={22} className="text-secondary-foreground" />
          <h3 className="text-xl font-semibold text-card-foreground">Demo Management</h3>
        </div>
        <Button
          variant="secondary"
          onClick={() => void loadData()}
          leftIcon={<RefreshCw size={14} />}
        >
          Refresh
        </Button>
      </div>

      {/* Demo Users Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-medium text-card-foreground">
            Demo Users ({demoUsers.length})
          </h4>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Add user to demo:</span>
            <div className="w-48">
              <Select
                options={nonDemoUsers.map(user => ({
                  value: user.id,
                  label: user.username,
                  description:
                    user.firstName && user.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : undefined,
                }))}
                placeholder="Select user..."
                size="sm"
                disabled={nonDemoUsers.length === 0 || updatingUserId !== null}
                onChange={value => {
                  if (value && typeof value === 'string') {
                    void toggleUserDemoStatus(value, false);
                  }
                }}
                value={undefined}
                aria-label="Select user to add to demo mode"
              />
            </div>
          </div>
        </div>

        {demoUsers.length > 0 ? (
          <Table
            columns={userColumns}
            data={sortedDemoUsers as TableRow[]}
            size="sm"
            variant="default"
            hoverable
            rounded="lg"
            sortable
            sortConfig={userSortConfig}
            onSort={setUserSortConfig}
            emptyMessage="No demo users"
            aria-label="Demo users list"
          />
        ) : (
          <div className="text-sm text-muted-foreground bg-muted rounded-lg p-4 text-center">
            No demo users configured. Use the dropdown above to add users to demo mode.
          </div>
        )}
      </div>

      {/* Demo Tanks Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-medium text-card-foreground">
            Demo Tanks ({demoTanks.length})
          </h4>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Add tank to demo:</span>
            <div className="w-48">
              <Select
                options={nonDemoTanks.map(tank => ({
                  value: tank.id,
                  label: tank.name,
                  description: tank.location || undefined,
                }))}
                placeholder="Select tank..."
                size="sm"
                disabled={nonDemoTanks.length === 0 || updatingTankId !== null}
                onChange={value => {
                  if (value && typeof value === 'string') {
                    void toggleTankDemoStatus(value, false);
                  }
                }}
                value={undefined}
                aria-label="Select tank to add to demo mode"
              />
            </div>
          </div>
        </div>

        {demoTanks.length > 0 ? (
          <Table
            columns={tankColumns}
            data={sortedDemoTanks as TableRow[]}
            size="sm"
            variant="default"
            hoverable
            rounded="lg"
            sortable
            sortConfig={tankSortConfig}
            onSort={setTankSortConfig}
            emptyMessage="No demo tanks"
            aria-label="Demo tanks list"
          />
        ) : (
          <div className="text-sm text-muted-foreground bg-muted rounded-lg p-4 text-center">
            No demo tanks configured. Use the dropdown above to add tanks to demo mode.
          </div>
        )}
      </div>

      {/* Reset Demo Data Section */}
      <div className="border-t border-border pt-4">
        <div className="px-3 py-3 bg-muted border-l-4 border-l-danger-border rounded-lg shadow-sm">
          <p className="text-sm font-medium text-danger-text mb-2">Reset Demo Data</p>
          <div className="flex items-end justify-between gap-4">
            <ul className="space-y-1 text-card-foreground text-sm">
              <li className="flex items-center gap-2">
                <AnimatedXMark size={14} className="text-danger-text flex-shrink-0" />
                <span>Permanently deletes all tubes in demo tanks</span>
              </li>
              <li className="flex items-center gap-2">
                <AnimatedCheckmark size={14} className="text-success-text flex-shrink-0" />
                <span>Demo users are preserved</span>
              </li>
              <li className="flex items-center gap-2">
                <AnimatedCheckmark size={14} className="text-success-text flex-shrink-0" />
                <span>Tank configurations are preserved</span>
              </li>
            </ul>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowResetConfirm(true)}
              disabled={demoTanks.length === 0}
              leftIcon={<Trash2 size={14} />}
              className="flex-shrink-0"
            >
              Reset Demo Data
            </Button>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        variant="danger"
        title="Reset Demo Data"
        message="Are you sure you want to delete all tubes in demo tanks? This action cannot be undone."
        confirmText="Reset"
        onConfirm={handleResetDemoData}
        onCancel={() => setShowResetConfirm(false)}
        isLoading={isResetting}
      />
    </div>
  );
}
