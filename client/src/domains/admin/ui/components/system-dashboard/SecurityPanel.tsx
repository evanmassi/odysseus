/**
 * Security Panel
 *
 * System-wide session and token monitoring for system admins.
 */

import { useMemo, useState } from 'react';

import {
  AlertTriangle,
  Clock,
  Globe,
  HeartPulse,
  KeyRound,
  LogOut,
  MonitorCheck,
  MonitorX,
  Search,
  Trash2,
  UsersRound,
} from 'lucide-react';

import { useAuthStore } from '@domains/authentication/stores/authStore';
import { Button, Chip, Table, DatePicker } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { notifications } from '@shared/utils';

import {
  usePurgeExpiredSessionsMutation,
  useRevokeSessionMutation,
} from '../../../hooks/useSecurityMonitoringMutations';
import {
  useSecurityOverviewQuery,
  useActiveSessionsQuery,
  useIpActivityQuery,
} from '../../../hooks/useSecurityMonitoringQueries';

import { SecuritySettings } from './SecuritySettings';

import type { ActiveSessionEntry, IpActivityEntry } from '@odysseus/shared-schemas';
import type { SortConfig, TableColumn } from '@shared/ui';

type IpActivityRow = IpActivityEntry & { id: string };

export function SecurityPanel() {
  const user = useAuthStore(s => s.user);
  const { data: overview } = useSecurityOverviewQuery();
  const { data: sessionsData, isLoading: sessionsLoading } = useActiveSessionsQuery();

  const [filterText, setFilterText] = useState('');
  const [sessionSortConfig, setSessionSortConfig] = useState<SortConfig | undefined>({
    columnId: 'lastActivity',
    direction: 'desc',
  });
  const [revokeTarget, setRevokeTarget] = useState<ActiveSessionEntry | null>(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: ipData } = useIpActivityQuery(startDate || undefined, endDate || undefined);

  const purgeExpiredMutation = usePurgeExpiredSessionsMutation();
  const revokeSessionMutation = useRevokeSessionMutation();

  const formatDateStacked = (iso: string) => {
    const d = new Date(iso);
    const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return { date, time };
  };

  const isOwnSession = (session: ActiveSessionEntry) => session.userId === user?.id;

  const filteredSessions = useMemo(() => {
    const sessions = sessionsData?.sessions ?? [];
    if (!filterText) return sessions;
    const lower = filterText.toLowerCase();
    return sessions.filter(
      s =>
        s.userName.toLowerCase().includes(lower) ||
        s.userEmail.toLowerCase().includes(lower) ||
        (s.ipAddress?.toLowerCase().includes(lower) ?? false)
    );
  }, [sessionsData, filterText]);

  const sortedSessions = useMemo(() => {
    if (!sessionSortConfig) return filteredSessions;
    return [...filteredSessions].sort((a, b) => {
      const dir = sessionSortConfig.direction === 'asc' ? 1 : -1;
      switch (sessionSortConfig.columnId) {
        case 'userName':
          return dir * a.userName.localeCompare(b.userName);
        case 'userRole':
          return dir * a.userRole.localeCompare(b.userRole);
        case 'ipAddress':
          return dir * (a.ipAddress ?? '').localeCompare(b.ipAddress ?? '');
        case 'loginTime':
          return dir * (new Date(a.loginTime).getTime() - new Date(b.loginTime).getTime());
        case 'lastActivity':
          return dir * (new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime());
        default:
          return 0;
      }
    });
  }, [filteredSessions, sessionSortConfig]);

  const handlePurge = async () => {
    try {
      const result = await purgeExpiredMutation.mutateAsync();
      notifications.success(
        `Purged ${result.purgedSessions} sessions and ${result.purgedTokens} tokens`
      );
      setShowPurgeConfirm(false);
    } catch {
      notifications.error('Failed to purge expired sessions');
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    try {
      await revokeSessionMutation.mutateAsync(revokeTarget.id);
      notifications.success('Session revoked');
      setRevokeTarget(null);
    } catch {
      notifications.error('Failed to revoke session');
    }
  };

  const sessionColumns: TableColumn<ActiveSessionEntry>[] = [
    {
      id: 'userName',
      header: 'User',
      sortable: true,
      render: (_val, row) => (
        <div>
          <div className="font-medium text-card-foreground">{row.userName}</div>
          <div className="text-xs text-muted-foreground">{row.userEmail}</div>
        </div>
      ),
    },
    {
      id: 'userRole',
      header: 'Role',
      sortable: true,
      accessor: 'userRole',
    },
    {
      id: 'ipAddress',
      header: 'IP Address',
      sortable: true,
      render: (_val, row) => <span className="font-mono text-xs">{row.ipAddress ?? '\u2014'}</span>,
    },
    {
      id: 'loginTime',
      header: 'Login',
      sortable: true,
      render: (_val, row) => {
        const { date, time } = formatDateStacked(row.loginTime);
        return (
          <div className="text-xs">
            <div className="text-secondary-foreground">{date}</div>
            <div className="text-muted-foreground">{time}</div>
          </div>
        );
      },
    },
    {
      id: 'lastActivity',
      header: 'Last Active',
      sortable: true,
      render: (_val, row) => {
        const { date, time } = formatDateStacked(row.lastActivity);
        return (
          <div className="text-xs">
            <div className="text-secondary-foreground">{date}</div>
            <div className="text-muted-foreground">{time}</div>
          </div>
        );
      },
    },
    {
      id: 'device',
      header: 'Device',
      render: (_val, row) => (
        <span className="text-xs max-w-[200px] truncate block">
          {row.deviceInfo ?? row.userAgent ?? '\u2014'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      width: 40,
      align: 'right',
      render: (_val, row) => (
        <Button
          variant="ghost-danger"
          size="sm"
          onClick={e => {
            (e as React.MouseEvent).stopPropagation();
            setRevokeTarget(row);
          }}
        >
          <LogOut size={14} />
        </Button>
      ),
    },
  ];

  const ipColumns: TableColumn<IpActivityRow>[] = [
    {
      id: 'ipAddress',
      header: 'IP Address',
      render: (_val, row) => <span className="font-mono text-xs">{row.ipAddress}</span>,
    },
    {
      id: 'sessionCount',
      header: 'Sessions',
      accessor: 'sessionCount',
    },
    {
      id: 'tokenCount',
      header: 'Tokens',
      accessor: 'tokenCount',
    },
    {
      id: 'uniqueUserCount',
      header: 'Users',
      render: (_val, row) => (
        <div className="flex items-center gap-2">
          <span>{row.uniqueUserCount}</span>
          {row.uniqueUserCount > 1 && (
            <Chip color="warning" size="sm" leftIcon={<AlertTriangle size={12} />}>
              Multiple users
            </Chip>
          )}
        </div>
      ),
    },
  ];

  const sessionOverview = overview?.sessionOverview;
  const tokenHealth = overview?.tokenHealth;

  return (
    <div className="space-y-6">
      <SecuritySettings />

      {/* Overview */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <HeartPulse size={18} className="text-muted-foreground" />
          <h3 className="text-lg font-semibold text-card-foreground">Session & Token Health</h3>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Chip color="info" size="sm" leftIcon={<UsersRound />}>
              {sessionOverview?.activeSessions ?? 0} active{' '}
              {(sessionOverview?.activeSessions ?? 0) === 1 ? 'session' : 'sessions'}
            </Chip>
            <Chip
              color={(sessionOverview?.expiredAwaitingCleanup ?? 0) > 0 ? 'warning' : 'success'}
              size="sm"
              leftIcon={<Clock />}
            >
              {sessionOverview?.expiredAwaitingCleanup ?? 0} expired awaiting cleanup
            </Chip>
            <Chip color="info" size="sm" leftIcon={<Clock />}>
              {sessionOverview?.avgSessionDurationMinutes ?? 0} min avg duration
            </Chip>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Chip color="info" size="sm" leftIcon={<KeyRound />}>
              {tokenHealth?.activeTokens ?? 0} active tokens
            </Chip>
            <Chip color="default" size="sm" leftIcon={<Clock />}>
              {tokenHealth?.expiredTokens ?? 0} expired
            </Chip>
            <Chip color="default" size="sm" leftIcon={<MonitorX />}>
              {tokenHealth?.revokedTokens ?? 0} revoked
            </Chip>
            <Chip color="info" size="sm" leftIcon={<KeyRound />}>
              {tokenHealth?.avgLifespanDays ?? 0}d avg lifespan
            </Chip>
          </div>
        </div>

        {(sessionOverview?.expiredAwaitingCleanup ?? 0) > 0 && (
          <div className="mt-3">
            <Button
              variant="ghost-danger"
              size="sm"
              onClick={() => setShowPurgeConfirm(true)}
              leftIcon={<Trash2 size={14} />}
            >
              Purge Expired Sessions
            </Button>
          </div>
        )}
      </div>

      {/* Active Sessions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MonitorCheck size={18} className="text-muted-foreground" />
            <h3 className="text-lg font-semibold text-card-foreground">Active Sessions</h3>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-3 h-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter by name, email, or IP..."
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              className="input-search w-64 pl-8"
            />
          </div>
        </div>

        <Table<ActiveSessionEntry>
          columns={sessionColumns}
          data={sortedSessions}
          sortable
          sortConfig={sessionSortConfig}
          onSort={setSessionSortConfig}
          loading={sessionsLoading}
          hoverable
          size="sm"
          rounded="lg"
          emptyMessage={filterText ? 'No sessions match your filter' : 'No active sessions'}
          aria-label="Active sessions"
          rowClassName={row =>
            isOwnSession(row) ? 'bg-muted/30 border-l-4 border-l-success-bg' : ''
          }
        />
      </div>

      {/* IP Activity */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Globe size={18} className="text-muted-foreground" />
          <h3 className="text-lg font-semibold text-card-foreground">IP Activity</h3>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">From</span>
            <DatePicker
              value={startDate}
              onChange={v => setStartDate(v)}
              size="sm"
              clearable
              className="w-40"
              aria-label="Start date"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">To</span>
            <DatePicker
              value={endDate}
              onChange={v => setEndDate(v)}
              size="sm"
              clearable
              className="w-40"
              aria-label="End date"
            />
          </div>
          {(startDate || endDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
            >
              Clear
            </Button>
          )}
        </div>

        <Table<IpActivityRow>
          columns={ipColumns}
          data={(ipData?.entries ?? []).map(e => ({ ...e, id: e.ipAddress }))}
          hoverable
          size="sm"
          rounded="lg"
          emptyMessage="No IP activity data"
          aria-label="IP activity"
        />
      </div>

      <ConfirmDialog
        isOpen={showPurgeConfirm}
        title="Purge Expired Sessions"
        message="This will permanently delete all expired sessions and tokens. This cannot be undone."
        confirmText="Purge"
        variant="danger"
        isLoading={purgeExpiredMutation.isPending}
        onConfirm={handlePurge}
        onCancel={() => setShowPurgeConfirm(false)}
      />

      <ConfirmDialog
        isOpen={revokeTarget !== null}
        title="Revoke Session"
        message={
          revokeTarget && isOwnSession(revokeTarget)
            ? 'This is your current session. Revoking it will log you out immediately.'
            : `Revoke the session for ${revokeTarget?.userName ?? 'this user'}? They will be logged out immediately.`
        }
        confirmText="Revoke"
        variant="danger"
        isLoading={revokeSessionMutation.isPending}
        onConfirm={handleRevoke}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  );
}
