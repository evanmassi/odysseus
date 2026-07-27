/**
 * App Dashboard
 *
 * Routing shell that directs to Biobank, Lab Management, or System Admin
 * based on user context and URL path.
 */

import { lazy, type ReactNode } from 'react';

import { Routes, Route } from 'react-router-dom';

import { useStorageSync } from '@domains/storage';
import { SuspenseBoundary } from '@shared/ui';

import { AppHeader } from './AppHeader';
import { BiobankDashboard } from './BiobankDashboard';
import { DashboardLoading } from './DashboardLoading';

import '@shared/styles/base/layout.css';

const SystemAdminDashboard = lazy(() =>
  import('@domains/admin').then(m => ({ default: m.SystemAdminDashboard }))
);

const LabManagementPage = lazy(() =>
  import('./LabManagementPage').then(m => ({ default: m.LabManagementPage }))
);

function DashboardChrome({ children }: { children: ReactNode }) {
  return (
    <div className="app-container">
      <div className="app-header">
        <AppHeader />
      </div>
      {children}
    </div>
  );
}

export function AppDashboard() {
  const { hasNoLab, isSynced } = useStorageSync();

  if (hasNoLab) {
    return (
      <DashboardChrome>
        <SuspenseBoundary fallback={<DashboardLoading />} name="System Admin">
          <SystemAdminDashboard />
        </SuspenseBoundary>
      </DashboardChrome>
    );
  }

  return (
    <Routes>
      <Route
        path="/lab/*"
        element={
          <SuspenseBoundary
            fallback={
              <DashboardChrome>
                <DashboardLoading />
              </DashboardChrome>
            }
            name="Lab Management"
          >
            <LabManagementPage />
          </SuspenseBoundary>
        }
      />
      <Route path="/*" element={<BiobankDashboard isSynced={isSynced} />} />
    </Routes>
  );
}
