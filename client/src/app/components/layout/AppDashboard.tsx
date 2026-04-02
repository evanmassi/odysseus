/**
 * App Dashboard
 *
 * Routing shell that directs to Biobank, Lab Management, or System Admin
 * based on user context and URL path.
 */

import { lazy } from 'react';

import { Routes, Route } from 'react-router-dom';

import { useStorageSync } from '@domains/storage/hooks/useStorageSync';
import { SuspenseBoundary } from '@shared/ui';

import { AppHeader } from './AppHeader';
import { BiobankDashboard } from './BiobankDashboard';

import '@shared/styles/base/layout.css';

const SystemAdminDashboard = lazy(() =>
  import('@domains/admin').then(m => ({ default: m.SystemAdminDashboard }))
);

const LabManagementPage = lazy(() =>
  import('@domains/lab-management').then(m => ({ default: m.LabManagementPage }))
);

export function AppDashboard() {
  const { hasNoLab } = useStorageSync();

  if (hasNoLab) {
    return (
      <div className="app-container">
        <div className="app-header">
          <AppHeader />
        </div>
        <SuspenseBoundary
          fallback={
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          }
          name="SystemAdminDashboard"
        >
          <SystemAdminDashboard />
        </SuspenseBoundary>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/lab/*"
        element={
          <SuspenseBoundary
            fallback={
              <div className="app-container">
                <div className="app-header">
                  <AppHeader />
                </div>
                <div className="flex items-center justify-center h-full">
                  <div className="text-muted-foreground">Loading...</div>
                </div>
              </div>
            }
            name="LabManagementPage"
          >
            <LabManagementPage />
          </SuspenseBoundary>
        }
      />
      <Route path="/*" element={<BiobankDashboard />} />
    </Routes>
  );
}
