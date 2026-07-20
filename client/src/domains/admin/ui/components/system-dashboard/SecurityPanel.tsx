/**
 * Security Panel
 *
 * System-wide session and token monitoring for system admins.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  AlertTriangle,
  Clock,
  Fingerprint,
  LogOut,
  MonitorX,
  RefreshCw,
  Shield,
  Trash2,
  UsersRound,
} from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { useResolvedTheme } from '@shared/hooks';
import {
  Button,
  Chip,
  ConsolePanel,
  PanelHeader,
  SectionHeader,
  StatCell,
  STAT_STRIP,
  Table,
  DatePicker,
  SearchInput,
} from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { Tooltip } from '@shared/ui/primitives/tooltip/Tooltip';
import { MS_PER_SECOND, formatRelativeTime, notifications } from '@shared/utils';

import {
  usePurgeExpiredSessionsMutation,
  useRevokeSessionMutation,
  useBulkRevokeSessionsMutation,
} from '../../../hooks/useSecurityMonitoringMutations';
import {
  useSecurityOverviewQuery,
  useActiveSessionsQuery,
  useIpActivityQuery,
  useFailedLoginsQuery,
  useSessionActivityQuery,
} from '../../../hooks/useSecurityMonitoringQueries';

import { SecuritySettings } from './SecuritySettings';

import type {
  ActiveSessionEntry,
  IpActivityEntry,
  FailedLoginEntry,
} from '@odysseus/shared-schemas';
import type { SortConfig, TableColumn } from '@shared/ui';

type IpActivityRow = IpActivityEntry & { id: string };
type FailedLoginRow = FailedLoginEntry & { id: string };

const STRONG_DENIAL_KEYWORDS = ['suspended', 'deactivated', 'denied', 'rejected'];

function getReasonTone(reason: string): string {
  const lower = reason.toLowerCase();
  const isStrong = STRONG_DENIAL_KEYWORDS.some(kw => lower.includes(kw));
  return isStrong ? 'phosphor-text text-danger-text-hover' : 'phosphor-text text-danger-text';
}

function formatDateStacked(value: Date) {
  const date = value.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const time = value.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return { date, time };
}

/** Stacked date / time / relative-time cell; `own` tints it as the viewer's own session. */
function renderTimeCell(value: Date, own = false) {
  const { date, time } = formatDateStacked(value);
  return (
    <div className="text-caption">
      <div className={own ? 'text-success-text' : 'text-secondary-foreground'}>{date}</div>
      <div className={own ? 'text-success-text/70' : 'text-muted-foreground'}>{time}</div>
      <div className={`text-caption ${own ? 'text-success-text/60' : 'text-muted-foreground'}`}>
        {formatRelativeTime(value)}
      </div>
    </div>
  );
}

export function SecurityPanel() {
  const user = useAuthStore(s => s.user);
  const { data: overview, refetch: refetchOverview } = useSecurityOverviewQuery();
  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    isFetching: sessionsFetching,
    refetch: refetchSessions,
  } = useActiveSessionsQuery();

  const [filterText, setFilterText] = useState('');
  const [sessionSortConfig, setSessionSortConfig] = useState<SortConfig | undefined>({
    columnId: 'lastActivity',
    direction: 'desc',
  });
  const [revokeTarget, setRevokeTarget] = useState<ActiveSessionEntry | null>(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState<(string | number)[]>([]);
  const [showBulkRevokeConfirm, setShowBulkRevokeConfirm] = useState(false);
  const [bulkRevokeIp, setBulkRevokeIp] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const { data: ipData, refetch: refetchIpActivity } = useIpActivityQuery(
    startDate || undefined,
    endDate || undefined
  );
  const { data: failedLoginsData, refetch: refetchFailedLogins } = useFailedLoginsQuery(50);
  const { data: activityData, refetch: refetchActivity } = useSessionActivityQuery(24);

  const purgeExpiredMutation = usePurgeExpiredSessionsMutation();
  const revokeSessionMutation = useRevokeSessionMutation();
  const bulkRevokeMutation = useBulkRevokeSessionsMutation();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const doRefresh = useCallback(() => {
    void refetchOverview();
    void refetchSessions();
    void refetchIpActivity();
    void refetchFailedLogins();
    void refetchActivity();
  }, [refetchOverview, refetchSessions, refetchIpActivity, refetchFailedLogins, refetchActivity]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(doRefresh, 30 * MS_PER_SECOND);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, doRefresh]);

  const sessionCountsByUser = useMemo(() => {
    const sessions = sessionsData?.sessions ?? [];
    const counts = new Map<string, number>();
    for (const s of sessions) {
      counts.set(s.userId, (counts.get(s.userId) ?? 0) + 1);
    }
    return counts;
  }, [sessionsData]);

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
          return dir * (a.loginTime.getTime() - b.loginTime.getTime());
        case 'lastActivity':
          return dir * (a.lastActivity.getTime() - b.lastActivity.getTime());
        default:
          return 0;
      }
    });
  }, [filteredSessions, sessionSortConfig]);

  const handlePurge = () => {
    purgeExpiredMutation.mutate(undefined, {
      onSuccess: result => {
        notifications.success(
          `Purged ${result.purgedSessions} sessions and ${result.purgedTokens} tokens`
        );
        setShowPurgeConfirm(false);
      },
    });
  };

  const handleRevoke = () => {
    if (!revokeTarget) return;
    revokeSessionMutation.mutate(revokeTarget.id, {
      onSuccess: () => {
        notifications.success('Session revoked');
        setRevokeTarget(null);
      },
    });
  };

  const handleBulkRevoke = () => {
    const ids = selectedSessionIds.map(String);
    if (ids.length === 0) return;
    bulkRevokeMutation.mutate(ids, {
      onSuccess: result => {
        notifications.success(`Revoked ${result.revokedCount} sessions`);
        setSelectedSessionIds([]);
        setShowBulkRevokeConfirm(false);
      },
    });
  };

  const handleRevokeFromIp = () => {
    if (!bulkRevokeIp) return;
    const ip = bulkRevokeIp;
    const sessions = sessionsData?.sessions ?? [];
    const ids = sessions.filter(s => s.ipAddress === ip).map(s => s.id);
    if (ids.length === 0) return;
    bulkRevokeMutation.mutate(ids, {
      onSuccess: result => {
        notifications.success(`Revoked ${result.revokedCount} sessions from ${ip}`);
        setBulkRevokeIp(null);
      },
    });
  };

  const activeSessionCountsByIp = useMemo(() => {
    const sessions = sessionsData?.sessions ?? [];
    const counts = new Map<string, number>();
    for (const s of sessions) {
      if (s.ipAddress) {
        counts.set(s.ipAddress, (counts.get(s.ipAddress) ?? 0) + 1);
      }
    }
    return counts;
  }, [sessionsData]);

  const activityBars = useMemo(() => {
    const entries = activityData?.entries ?? [];
    const now = new Date();
    const bars: Array<{ hour: string; label: string; count: number }> = [];

    for (let i = 23; i >= 0; i--) {
      const hourDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours() - i
      );
      const hourIso = hourDate.toISOString().slice(0, 13);
      const match = entries.find(e => e.hour.slice(0, 13) === hourIso);
      bars.push({
        hour: hourIso,
        label: hourDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
        count: match?.count ?? 0,
      });
    }

    return bars;
  }, [activityData]);

  const maxActivityCount = useMemo(
    () => Math.max(1, ...activityBars.map(b => b.count)),
    [activityBars]
  );

  const sessionColumns: TableColumn<ActiveSessionEntry>[] = [
    {
      id: 'userName',
      header: 'User',
      sortable: true,
      render: (_val, row) => {
        const count = sessionCountsByUser.get(row.userId) ?? 1;
        const own = isOwnSession(row);
        return (
          <div className="max-w-[260px]">
            <div
              className={`font-display font-medium truncate ${own ? 'text-success-text' : 'text-card-foreground'}`}
            >
              {row.userName}
            </div>
            <div
              className={`text-caption truncate ${own ? 'text-success-text/70' : 'text-muted-foreground'}`}
            >
              {row.userEmail}
            </div>
            {count > 1 && (
              <Chip color="info" size="xs">
                {count} sessions
              </Chip>
            )}
          </div>
        );
      },
    },
    {
      id: 'userRole',
      header: 'Role',
      sortable: true,
      render: (_val, row) => (
        <span className={isOwnSession(row) ? 'text-success-text' : ''}>{row.userRole}</span>
      ),
    },
    {
      id: 'ipAddress',
      header: 'IP Address',
      sortable: true,
      render: (_val, row) => (
        <span className={`font-mono text-data-sm ${isOwnSession(row) ? 'text-success-text' : ''}`}>
          {row.ipAddress ?? '\u2014'}
        </span>
      ),
    },
    {
      id: 'loginTime',
      header: 'Login',
      sortable: true,
      render: (_val, row) => renderTimeCell(row.loginTime, isOwnSession(row)),
    },
    {
      id: 'lastActivity',
      header: 'Last Active',
      sortable: true,
      render: (_val, row) => renderTimeCell(row.lastActivity, isOwnSession(row)),
    },
    {
      id: 'device',
      header: 'Device',
      render: (_val, row) => (
        <span
          className={`text-body-sm max-w-[200px] truncate block ${isOwnSession(row) ? 'text-success-text' : ''}`}
        >
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
          iconOnly
          aria-label="Revoke session"
          onClick={e => {
            e.stopPropagation();
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
      render: (_val, row) => <span className="font-mono text-data-sm">{row.ipAddress}</span>,
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
            <Chip color="warning" size="sm">
              Multiple users
            </Chip>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      width: 40,
      align: 'right',
      render: (_val, row) => {
        const count = activeSessionCountsByIp.get(row.ipAddress) ?? 0;
        if (count === 0) return null;
        return (
          <Button
            variant="ghost-danger"
            size="sm"
            iconOnly
            aria-label="Revoke all sessions from this IP"
            onClick={e => {
              e.stopPropagation();
              setBulkRevokeIp(row.ipAddress);
            }}
          >
            <LogOut size={14} />
          </Button>
        );
      },
    },
  ];

  const failedLoginColumns: TableColumn<FailedLoginRow>[] = [
    {
      id: 'username',
      header: 'Username',
      render: (_val, row) => <span className="font-display">{row.username}</span>,
    },
    {
      id: 'ipAddress',
      header: 'IP Address',
      render: (_val, row) => (
        <span className="font-mono text-data-sm">{row.ipAddress ?? '\u2014'}</span>
      ),
    },
    {
      id: 'reason',
      header: 'Reason',
      render: (_val, row) => (
        <span className={`text-body-sm ${getReasonTone(row.reason)}`}>{row.reason}</span>
      ),
    },
    {
      id: 'timestamp',
      header: 'Time',
      render: (_val, row) => renderTimeCell(row.timestamp),
    },
  ];

  const sessionOverview = overview?.sessionOverview;
  const tokenHealth = overview?.tokenHealth;

  const failedLoginsCount = failedLoginsData?.entries?.length ?? 0;
  const expiredAwaitingCleanup = sessionOverview?.expiredAwaitingCleanup ?? 0;
  const isDark = useResolvedTheme() === 'dark';

  return (
    <div className="space-y-4">
      <ConsolePanel intensity="soft">
        <div className="flex-shrink-0 border-b border-line-faint pr-4">
          <PanelHeader title="Security" icon={<Shield size={14} />} />
        </div>

        <div className="flex items-center justify-end gap-2 border-b border-line-faint px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={doRefresh}
            disabled={sessionsLoading}
            leftIcon={<RefreshCw size={14} className={sessionsFetching ? 'animate-spin' : ''} />}
          >
            Refresh
          </Button>
        </div>

        <div>
          {expiredAwaitingCleanup > 0 && (
            <div
              className="relative flex items-center gap-3 border-b border-line-soft px-4 py-1.5"
              style={{
                background:
                  'radial-gradient(80% 200% at -8% 50%, hsl(var(--color-warning-text) / 0.14) 0%, hsl(var(--color-warning-text) / 0.04) 35%, transparent 70%), hsl(var(--color-warning-text) / 0.05)',
              }}
            >
              <span
                aria-hidden
                className="absolute left-0 top-0 bottom-0 w-[2px]"
                style={{
                  background: 'hsl(var(--color-warning-text))',
                  boxShadow: isDark
                    ? '0 0 5px 0 hsl(var(--color-warning-text) / 0.45), 0 0 12px -2px hsl(var(--color-warning-text) / 0.25)'
                    : undefined,
                }}
              />
              <div className="flex items-center gap-2.5">
                <span className="flex shrink-0 items-center gap-2 type-label text-label-2xs tracking-label-wide text-warning-text">
                  <AlertTriangle size={12} />
                  Cleanup
                </span>
                <span aria-hidden className="h-3.5 w-px bg-warning-text/30" />
                <span className="font-display text-body-sm text-foreground/75">
                  <span className="phosphor-text font-medium text-warning-text">
                    {expiredAwaitingCleanup} expired{' '}
                    {expiredAwaitingCleanup === 1 ? 'session' : 'sessions'}
                  </span>{' '}
                  awaiting cleanup
                </span>
              </div>
              <Button
                variant="danger"
                size="xs"
                onClick={() => setShowPurgeConfirm(true)}
                leftIcon={<Trash2 size={12} />}
                className="ml-auto"
              >
                Purge Expired Sessions
              </Button>
            </div>
          )}
          <div className={STAT_STRIP}>
            <StatCell
              size="sm"
              label="Active Sessions"
              value={sessionOverview?.activeSessions ?? 0}
              icon={<UsersRound size={11} />}
              className="flex-1"
            />
            <StatCell
              size="sm"
              label="Active Tokens"
              value={tokenHealth?.activeTokens ?? 0}
              icon={<Fingerprint size={11} />}
              className="flex-1"
            />
            <StatCell
              size="sm"
              label="Cleanup"
              value={expiredAwaitingCleanup}
              icon={<Trash2 size={11} />}
              tone={expiredAwaitingCleanup > 0 ? 'warning' : 'success'}
              className="flex-1"
            />
            <StatCell
              size="sm"
              label="Revoked Tokens"
              value={tokenHealth?.revokedTokens ?? 0}
              icon={<MonitorX size={11} />}
              className="flex-1"
            />
            <StatCell
              size="sm"
              label="Failed Logins"
              value={failedLoginsCount}
              footer="last 7d"
              icon={<AlertTriangle size={11} />}
              tone={failedLoginsCount > 0 ? 'warning' : 'success'}
              className="flex-1"
            />
            <StatCell
              size="sm"
              label="Avg Session"
              value={sessionOverview?.avgSessionDurationMinutes ?? 0}
              unit="min"
              icon={<Clock size={11} />}
              className="flex-1"
            />
          </div>
        </div>
      </ConsolePanel>

      <SecuritySettings />

      <ConsolePanel intensity="soft">
        <div className="p-4">
          <SectionHeader title="Login Activity" meta="last 24h" />
          <div className="relative px-4 py-4">
            <span className="absolute right-4 top-4 type-label text-label-2xs text-foreground/40">
              peak {maxActivityCount}
            </span>

            <div className="relative h-24">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-primary/[0.06] to-transparent"
              />
              <span aria-hidden className="absolute inset-x-0 top-1/4 h-px bg-foreground/[0.05]" />
              <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-foreground/[0.05]" />
              <span aria-hidden className="absolute inset-x-0 top-3/4 h-px bg-foreground/[0.05]" />

              <div className="relative flex h-full items-end gap-px">
                {activityBars.map(bar => {
                  const ratio = bar.count / maxActivityCount;
                  const isHigh = ratio >= 0.75;
                  const isPeak = bar.count === maxActivityCount && bar.count > 0;
                  const tooltip = `${bar.label}: ${bar.count} login${bar.count !== 1 ? 's' : ''}`;

                  if (bar.count === 0) {
                    return (
                      <Tooltip key={bar.hour} content={tooltip} side="top">
                        <div className="flex h-full flex-1 flex-col justify-end">
                          <div className="h-px w-full bg-foreground/15" />
                        </div>
                      </Tooltip>
                    );
                  }

                  const toneClasses = isHigh
                    ? `bg-warning-bg ${isPeak ? 'dark:shadow-[0_0_8px_hsl(var(--color-warning-bg)/0.5)] dark:hover:shadow-[0_0_14px_hsl(var(--color-warning-bg)/0.75)]' : 'dark:shadow-[0_0_4px_hsl(var(--color-warning-bg)/0.3)] dark:hover:shadow-[0_0_10px_hsl(var(--color-warning-bg)/0.6)]'}`
                    : 'bg-primary dark:shadow-[0_0_4px_hsl(var(--primary)/0.3)] dark:hover:shadow-[0_0_10px_hsl(var(--primary)/0.6)]';

                  return (
                    <Tooltip key={bar.hour} content={tooltip} side="top">
                      <div className="flex h-full flex-1 flex-col justify-end">
                        <div
                          className={`bg-scanlines cursor-pointer transition-[filter,box-shadow] duration-150 hover:brightness-125 ${toneClasses}`}
                          style={{ height: `${ratio * 100}%` }}
                        />
                      </div>
                    </Tooltip>
                  );
                })}
              </div>
            </div>

            <div className="mt-0 h-px bg-foreground/15" />

            <div className="relative mt-1.5 h-3 type-label text-label-2xs tracking-meta text-foreground/40">
              <span className="absolute left-0">{activityBars[0]?.label}</span>
              <span className="absolute left-1/4 -translate-x-1/2">{activityBars[6]?.label}</span>
              <span className="absolute left-1/2 -translate-x-1/2">{activityBars[12]?.label}</span>
              <span className="absolute left-3/4 -translate-x-1/2">{activityBars[18]?.label}</span>
              <span className="absolute right-0">{activityBars[23]?.label}</span>
            </div>
          </div>
        </div>
      </ConsolePanel>

      <ConsolePanel intensity="soft">
        <div className="p-4">
          <SectionHeader title="Active Sessions" meta={`${sortedSessions.length} active`} />
          <Table<ActiveSessionEntry>
            columns={sessionColumns}
            data={sortedSessions}
            sortable
            selectable
            multiSelect
            selectedRows={selectedSessionIds}
            onSelectionChange={setSelectedSessionIds}
            sortConfig={sessionSortConfig}
            onSort={setSessionSortConfig}
            loading={sessionsLoading}
            hoverable
            emptyMessage={filterText ? 'No sessions match your filter' : 'No active sessions'}
            aria-label="Active sessions"
            rowState={row => (isOwnSession(row) ? 'success' : 'default')}
            selectedRowGlow
            toolbar={{
              left: (
                <>
                  <SearchInput
                    value={filterText}
                    onChange={setFilterText}
                    placeholder="Name, email, or IP…"
                    size="sm"
                    className="w-64"
                    aria-label="Filter sessions"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    onClick={() => setAutoRefresh(prev => !prev)}
                    aria-label="Toggle auto-refresh"
                    aria-pressed={autoRefresh}
                    className={autoRefresh ? 'text-primary' : ''}
                  >
                    <RefreshCw size={14} className={autoRefresh ? 'animate-spin' : ''} />
                  </Button>
                </>
              ),
              right: (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedSessionIds([])}
                    disabled={selectedSessionIds.length === 0}
                  >
                    Clear Selection
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setShowBulkRevokeConfirm(true)}
                    leftIcon={<LogOut size={14} />}
                    disabled={selectedSessionIds.length === 0}
                  >
                    Revoke Selected
                    {selectedSessionIds.length > 0 ? ` (${selectedSessionIds.length})` : ''}
                  </Button>
                </>
              ),
            }}
          />
        </div>
      </ConsolePanel>

      <ConsolePanel intensity="soft">
        <div className="p-4">
          <SectionHeader
            title="IP Activity"
            meta={`${ipData?.entries?.length ?? 0} unique addresses`}
          />
          <Table<IpActivityRow>
            columns={ipColumns}
            data={(ipData?.entries ?? []).map(e => ({ ...e, id: e.ipAddress }))}
            hoverable
            emptyMessage="No IP activity data"
            aria-label="IP activity"
            toolbar={{
              left: (
                <>
                  <span className="type-label text-label-2xs text-foreground/55">From</span>
                  <DatePicker
                    value={startDate}
                    onChange={v => setStartDate(v)}
                    size="sm"
                    clearable
                    className="w-40"
                    aria-label="Start date"
                  />
                  <span className="type-label text-label-2xs text-foreground/55">To</span>
                  <DatePicker
                    value={endDate}
                    onChange={v => setEndDate(v)}
                    size="sm"
                    clearable
                    className="w-40"
                    aria-label="End date"
                  />
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
                </>
              ),
            }}
          />
        </div>
      </ConsolePanel>

      <ConsolePanel intensity="soft">
        <div className="p-4">
          <SectionHeader
            title="Failed Login Attempts"
            meta={`${failedLoginsCount} ${failedLoginsCount === 1 ? 'event' : 'events'} · last 7d`}
          />
          <Table<FailedLoginRow>
            columns={failedLoginColumns}
            data={(failedLoginsData?.entries ?? []).map((e, i) => ({
              ...e,
              id: `${e.username}-${e.timestamp}-${i}`,
            }))}
            hoverable
            emptyMessage="No failed login attempts"
            aria-label="Failed login attempts"
          />
        </div>
      </ConsolePanel>

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

      <ConfirmDialog
        isOpen={showBulkRevokeConfirm}
        title="Revoke Selected Sessions"
        message={`Revoke ${selectedSessionIds.length} selected sessions? Those users will be logged out immediately.`}
        confirmText="Revoke All"
        variant="danger"
        isLoading={bulkRevokeMutation.isPending}
        onConfirm={handleBulkRevoke}
        onCancel={() => setShowBulkRevokeConfirm(false)}
      />

      <ConfirmDialog
        isOpen={bulkRevokeIp !== null}
        title="Revoke Sessions from IP"
        message={`Revoke all ${activeSessionCountsByIp.get(bulkRevokeIp ?? '') ?? 0} active sessions from ${bulkRevokeIp}? Those users will be logged out immediately.`}
        confirmText="Revoke All"
        variant="danger"
        isLoading={bulkRevokeMutation.isPending}
        onConfirm={handleRevokeFromIp}
        onCancel={() => setBulkRevokeIp(null)}
      />
    </div>
  );
}
