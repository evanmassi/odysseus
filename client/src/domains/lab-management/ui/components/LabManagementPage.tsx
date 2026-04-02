/**
 * Lab Management Page
 *
 * Route-based page shell with sidebar tab navigation for equipment,
 * consumables, and reagents management.
 */

import { Wrench, Package, FlaskConical } from 'lucide-react';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';

import { AppHeader } from '@app/components/layout/AppHeader';
import { EquipmentTab } from '@domains/equipment/ui/components/EquipmentTab';

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
          <div className="h-full">
            <Routes>
              <Route path="equipment" element={<EquipmentTab />} />
              <Route path="*" element={<Navigate to="/lab/equipment" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}
