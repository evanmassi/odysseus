/**
 * Security Panel
 *
 * System-wide session and token monitoring for system admins.
 */

import { useMemo, useState } from 'react';

import { AlertTriangle, Clock, Globe, Key, MonitorX, Shield, Trash2, Users } from 'lucide-react';

import { useAuthStore } from '@domains/authentication/stores/authStore';
import { Button, Chip } from '@shared/ui';
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

import type { ActiveSessionEntry } from '@odysseus/shared-schemas';

type SortField = 'userName' | 'userRole' | 'ipAddress' | 'loginTime' | 'lastActivity';
type SortDirection = 'asc' | 'desc';

export function SecurityPanel() {
  const user = useAuthStore(s => s.user);
  const { data: overview } = useSecurityOverviewQuery();
  const { data: sessionsData, isLoading: sessionsLoading } = useActiveSessionsQuery();

  const [filterText, setFilterText] = useState('');
  const [sortField, setSortField] = useState<SortField>('lastActivity');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [revokeTarget, setRevokeTarget] = useState<ActiveSessionEntry | null>(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: ipData } = useIpActivityQuery(startDate || undefined, endDate || undefined);

  const purgeExpiredMutation = usePurgeExpiredSessionsMutation();
  const revokeSessionMutation = useRevokeSessionMutation();

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

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
    return [...filteredSessions].sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      switch (sortField) {
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
  }, [filteredSessions, sortField, sortDirection]);

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

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return '';
    return sortDirection === 'asc' ? ' \u25B2' : ' \u25BC';
  };

  const isOwnSession = (session: ActiveSessionEntry) => session.userId === user?.id;

  const sessionOverview = overview?.sessionOverview;
  const tokenHealth = overview?.tokenHealth;

  return (
    <div className="space-y-6">
      <SecuritySettings />

      {/* Overview */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Shield size={18} className="text-muted-foreground" />
          <h3 className="text-lg font-semibold text-card-foreground">Session & Token Health</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip color="info" size="sm" leftIcon={<Users />}>
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
          <Chip color="info" size="sm" leftIcon={<Key />}>
            {tokenHealth?.activeTokens ?? 0} active tokens
          </Chip>
          <Chip color="default" size="sm" leftIcon={<Clock />}>
            {tokenHealth?.expiredTokens ?? 0} expired
          </Chip>
          <Chip color="default" size="sm" leftIcon={<MonitorX />}>
            {tokenHealth?.revokedTokens ?? 0} revoked
          </Chip>
          <Chip color="info" size="sm" leftIcon={<Key />}>
            {tokenHealth?.avgLifespanDays ?? 0}d avg lifespan
          </Chip>
        </div>
        {(sessionOverview?.expiredAwaitingCleanup ?? 0) > 0 && (
          <div className="mt-3">
            <Button
              variant="secondary"
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
            <Users size={18} className="text-muted-foreground" />
            <h3 className="text-lg font-semibold text-card-foreground">Active Sessions</h3>
          </div>
          <input
            type="text"
            placeholder="Filter by name, email, or IP..."
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
            className="px-2 py-1.5 text-sm border border-border rounded bg-background text-foreground w-64"
          />
        </div>

        {sessionsLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Loading sessions...</div>
        ) : sortedSessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {filterText ? 'No sessions match your filter' : 'No active sessions'}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-left">
                  <th
                    className="px-3 py-2 font-medium text-secondary-foreground cursor-pointer select-none"
                    onClick={() => handleSort('userName')}
                  >
                    User{sortIndicator('userName')}
                  </th>
                  <th
                    className="px-3 py-2 font-medium text-secondary-foreground cursor-pointer select-none"
                    onClick={() => handleSort('userRole')}
                  >
                    Role{sortIndicator('userRole')}
                  </th>
                  <th
                    className="px-3 py-2 font-medium text-secondary-foreground cursor-pointer select-none"
                    onClick={() => handleSort('ipAddress')}
                  >
                    IP Address{sortIndicator('ipAddress')}
                  </th>
                  <th
                    className="px-3 py-2 font-medium text-secondary-foreground cursor-pointer select-none"
                    onClick={() => handleSort('loginTime')}
                  >
                    Login Time{sortIndicator('loginTime')}
                  </th>
                  <th
                    className="px-3 py-2 font-medium text-secondary-foreground cursor-pointer select-none"
                    onClick={() => handleSort('lastActivity')}
                  >
                    Last Activity{sortIndicator('lastActivity')}
                  </th>
                  <th className="px-3 py-2 font-medium text-secondary-foreground">Device</th>
                  <th className="px-3 py-2 font-medium text-secondary-foreground w-20" />
                </tr>
              </thead>
              <tbody>
                {sortedSessions.map(session => (
                  <tr
                    key={session.id}
                    className={`border-t border-border hover:bg-muted/50 ${isOwnSession(session) ? 'bg-muted/30 border-l-4 border-l-success-bg' : ''}`}
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium text-card-foreground">{session.userName}</div>
                      <div className="text-xs text-muted-foreground">{session.userEmail}</div>
                    </td>
                    <td className="px-3 py-2 text-secondary-foreground">{session.userRole}</td>
                    <td className="px-3 py-2 font-mono text-xs text-secondary-foreground">
                      {session.ipAddress ?? '\u2014'}
                    </td>
                    <td className="px-3 py-2 text-secondary-foreground">
                      {formatDate(session.loginTime)}
                    </td>
                    <td className="px-3 py-2 text-secondary-foreground">
                      {formatDate(session.lastActivity)}
                    </td>
                    <td className="px-3 py-2 text-xs text-secondary-foreground max-w-[200px] truncate">
                      {session.deviceInfo ?? session.userAgent ?? '\u2014'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="danger" size="sm" onClick={() => setRevokeTarget(session)}>
                        Revoke
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* IP Activity */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Globe size={18} className="text-muted-foreground" />
          <h3 className="text-lg font-semibold text-card-foreground">IP Activity</h3>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <label htmlFor="ip-start-date" className="text-xs text-muted-foreground">
              From
            </label>
            <input
              id="ip-start-date"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-2 py-1.5 text-sm border border-border rounded bg-background text-foreground"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="ip-end-date" className="text-xs text-muted-foreground">
              To
            </label>
            <input
              id="ip-end-date"
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-2 py-1.5 text-sm border border-border rounded bg-background text-foreground"
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

        {!ipData?.entries.length ? (
          <div className="text-center py-8 text-muted-foreground text-sm">No IP activity data</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-left">
                  <th className="px-3 py-2 font-medium text-secondary-foreground">IP Address</th>
                  <th className="px-3 py-2 font-medium text-secondary-foreground">Sessions</th>
                  <th className="px-3 py-2 font-medium text-secondary-foreground">Tokens</th>
                  <th className="px-3 py-2 font-medium text-secondary-foreground">Users</th>
                </tr>
              </thead>
              <tbody>
                {ipData.entries.map(entry => (
                  <tr key={entry.ipAddress} className="border-t border-border hover:bg-muted/50">
                    <td className="px-3 py-2 font-mono text-xs text-card-foreground">
                      {entry.ipAddress}
                    </td>
                    <td className="px-3 py-2 text-secondary-foreground">{entry.sessionCount}</td>
                    <td className="px-3 py-2 text-secondary-foreground">{entry.tokenCount}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-secondary-foreground">{entry.uniqueUserCount}</span>
                        {entry.uniqueUserCount > 1 && (
                          <Chip color="warning" size="sm" leftIcon={<AlertTriangle size={12} />}>
                            Multiple users
                          </Chip>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
