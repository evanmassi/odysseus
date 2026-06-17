/**
 * Active Session List
 *
 * Displays active sessions with revocation controls.
 */

import { useState, useMemo } from 'react';

import { formatDistanceToNow, format } from 'date-fns';
import { Monitor, TabletSmartphone, MonitorCheck, LogOut, RefreshCw } from 'lucide-react';
import { UAParser } from 'ua-parser-js';

import { useUserSessions } from '@domains/users';
import { Button, Table, Tooltip } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { notifications } from '@shared/utils';

import type { ActiveSession } from '@odysseus/shared-schemas';
import type { TableColumn } from '@shared/ui';
import type { LucideIcon } from 'lucide-react';

function parseUserAgent(userAgent: string | undefined) {
  if (!userAgent) return { device: 'Unknown Device', type: 'desktop' as const };

  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  const browser = result.browser.name ?? 'Unknown Browser';
  const browserVersion = result.browser.version?.split('.')[0] ?? '';
  const os = result.os.name ?? 'Unknown OS';
  const osVersion = result.os.version ?? '';
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty device type is invalid, default to 'desktop'
  const deviceType = result.device.type || 'desktop';

  const deviceName = `${browser}${browserVersion ? ' ' + browserVersion : ''} on ${os}${osVersion ? ' ' + osVersion : ''}`;

  return {
    device: deviceName,
    type: deviceType as 'desktop' | 'mobile' | 'tablet',
  };
}

function formatTimestamp(date: Date) {
  const relative = formatDistanceToNow(date, { addSuffix: true });
  const absolute = format(date, 'MMM d, yyyy, h:mm a');
  return { relative, absolute };
}

function getDeviceIcon(isCurrentSession: boolean, deviceType: string) {
  if (isCurrentSession) return MonitorCheck;
  return deviceType === 'desktop' ? Monitor : TabletSmartphone;
}

function CurrentSessionBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success-light text-success-text mt-1">
      Current Session
    </span>
  );
}

type DisplaySession = ActiveSession & {
  device: string;
  DeviceIcon: LucideIcon;
  timestamp: { relative: string; absolute: string };
};

export function SessionListPanel() {
  const { sessions, isLoading, revokeSession, revokeSessionAsync, isRevoking } = useUserSessions();

  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [selectedSessionIds, setSelectedSessionIds] = useState<(string | number)[]>([]);
  const [showBulkRevokeConfirm, setShowBulkRevokeConfirm] = useState(false);
  const [isBulkRevoking, setIsBulkRevoking] = useState(false);

  const displayedSessions = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => b.lastUsedAt.getTime() - a.lastUsedAt.getTime());

    const current = sorted.find(s => s.isCurrentSession);
    const others = sorted.filter(s => !s.isCurrentSession).slice(0, 4);
    const selected = current ? [current, ...others] : others.slice(0, 5);

    return selected.map(session => {
      const parsed = parseUserAgent(session.userAgent);
      return {
        ...session,
        device: parsed.device,
        DeviceIcon: getDeviceIcon(session.isCurrentSession, parsed.type),
        timestamp: formatTimestamp(session.lastUsedAt),
      };
    });
  }, [sessions]);

  const handleRevokeSession = (sessionId: string) => {
    setRevokingSessionId(sessionId);
    revokeSession(sessionId, {
      onSuccess: () => {
        notifications.success('Logged out successfully');
        setRevokingSessionId(null);
      },
      onError: (error: Error) => {
        notifications.error(error.message || 'Failed to logout');
        setRevokingSessionId(null);
      },
    });
  };

  const handleBulkRevoke = async () => {
    const ids = selectedSessionIds.map(String);
    if (ids.length === 0) return;
    setIsBulkRevoking(true);
    const results = await Promise.allSettled(ids.map(id => revokeSessionAsync(id)));
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - succeeded;
    if (succeeded > 0) {
      notifications.success(`Logged out of ${succeeded} session${succeeded !== 1 ? 's' : ''}`);
    }
    if (failed > 0) {
      notifications.error(`Failed to revoke ${failed} session${failed !== 1 ? 's' : ''}`);
    }
    setSelectedSessionIds([]);
    setShowBulkRevokeConfirm(false);
    setIsBulkRevoking(false);
  };

  const sessionColumns: TableColumn<DisplaySession>[] = [
    {
      id: 'device',
      header: 'Device',
      render: (_val, row) => (
        <div className="flex items-center space-x-3">
          <row.DeviceIcon
            size={16}
            className={`flex-shrink-0 ${row.isCurrentSession ? 'text-success-text' : 'text-muted-foreground'}`}
          />
          <div>
            <p
              className={`text-sm font-medium ${row.isCurrentSession ? 'text-success-text' : 'text-card-foreground'}`}
            >
              {row.device}
            </p>
            {row.isCurrentSession && <CurrentSessionBadge />}
          </div>
        </div>
      ),
    },
    {
      id: 'ipAddress',
      header: 'Location',
      render: (_val, row) => (
        <p
          className={`text-sm ${row.isCurrentSession ? 'text-success-text' : 'text-secondary-foreground'}`}
        >
          {row.ipAddress ?? 'Unknown'}
        </p>
      ),
    },
    {
      id: 'lastUsedAt',
      header: 'Last Active',
      render: (_val, row) => (
        <div>
          <p
            className={`text-sm font-medium ${row.isCurrentSession ? 'text-success-text' : 'text-card-foreground'}`}
          >
            {row.timestamp.relative}
          </p>
          <p
            className={`text-xs ${row.isCurrentSession ? 'text-success-text/70' : 'text-muted-foreground'}`}
          >
            {row.timestamp.absolute}
          </p>
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      render: (_val, row) =>
        !row.isCurrentSession ? (
          <Tooltip content="Logout from this session" side="bottom">
            <Button
              variant="danger"
              size="xs"
              onClick={() => handleRevokeSession(row.id)}
              disabled={isRevoking}
              isLoading={revokingSessionId === row.id}
              leftIcon={<LogOut size={12} />}
            >
              Logout
            </Button>
          </Tooltip>
        ) : null,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="animate-spin text-muted-foreground" size={24} />
        <span className="ml-2 text-sm text-secondary-foreground">Loading sessions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table<DisplaySession>
        columns={sessionColumns}
        data={displayedSessions}
        hoverable
        selectable
        multiSelect
        selectedRows={selectedSessionIds}
        onSelectionChange={setSelectedSessionIds}
        emptyMessage="No active sessions"
        aria-label="Active sessions"
        rowState={row => (row.isCurrentSession ? 'success' : 'default')}
        selectedRowGlow
        toolbar={{
          left: (
            <p className="text-sm text-secondary-foreground">
              Showing {displayedSessions.length} of {sessions.length} active session
              {sessions.length !== 1 ? 's' : ''}
            </p>
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
                leftIcon={<LogOut size={12} />}
                disabled={selectedSessionIds.length === 0}
              >
                Revoke Selected
                {selectedSessionIds.length > 0 ? ` (${selectedSessionIds.length})` : ''}
              </Button>
            </>
          ),
        }}
      />

      <ConfirmDialog
        isOpen={showBulkRevokeConfirm}
        variant="danger"
        title="Revoke Selected Sessions?"
        message={`Revoke ${selectedSessionIds.length} selected session${selectedSessionIds.length !== 1 ? 's' : ''}? Those devices will be logged out immediately.`}
        confirmText="Revoke"
        isLoading={isBulkRevoking}
        onConfirm={handleBulkRevoke}
        onCancel={() => setShowBulkRevokeConfirm(false)}
      />
    </div>
  );
}
