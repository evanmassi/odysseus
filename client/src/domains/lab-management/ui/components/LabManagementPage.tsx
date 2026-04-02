/**
 * Lab Management Page
 *
 * Route-based page shell with sidebar tab navigation for equipment,
 * consumables, and reagents management.
 */

import { Wrench, Package, FlaskConical } from 'lucide-react';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';

import { AppHeader } from '@app/components/layout/AppHeader';

import '@shared/styles/base/layout.css';

import type { LucideIcon } from 'lucide-react';

interface TabConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  enabled: boolean;
}

const TABS: TabConfig[] = [
  { id: 'equipment', label: 'Equipment', icon: Wrench, path: '/lab/equipment', enabled: true },
  {
    id: 'consumables',
    label: 'Consumables',
    icon: Package,
    path: '/lab/consumables',
    enabled: false,
  },
  { id: 'reagents', label: 'Reagents', icon: FlaskConical, path: '/lab/reagents', enabled: false },
];

function EquipmentPlaceholder() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center text-muted-foreground">
        <Wrench size={48} className="mx-auto mb-3 opacity-30" />
        <p className="text-lg font-medium">Equipment Management</p>
        <p className="text-sm">Coming in Phase 7</p>
      </div>
    </div>
  );
}

export function LabManagementPage() {
  return (
    <div className="app-container">
      <div className="app-header">
        <AppHeader />
      </div>

      <div className="lab-management-layout">
        <aside className="lab-management-sidebar">
          <div className="h-full bg-card rounded-lg p-3 flex flex-col gap-1">
            {TABS.map(tab => {
              const Icon = tab.icon;

              if (!tab.enabled) {
                return (
                  <div
                    key={tab.id}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground/50 cursor-not-allowed"
                  >
                    <Icon size={16} />
                    <span>{tab.label}</span>
                  </div>
                );
              }

              return (
                <NavLink
                  key={tab.id}
                  to={tab.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                      isActive
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'text-secondary-foreground hover:bg-accent hover:text-accent-foreground'
                    }`
                  }
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </NavLink>
              );
            })}
          </div>
        </aside>

        <main className="lab-management-content">
          <div className="h-full bg-card rounded-lg">
            <Routes>
              <Route path="equipment" element={<EquipmentPlaceholder />} />
              <Route path="*" element={<Navigate to="/lab/equipment" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}
