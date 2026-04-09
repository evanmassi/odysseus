/**
 * Lab Management Page
 *
 * Route-based page shell with sidebar tab navigation for equipment,
 * supplies, and reagents management.
 */

import { useState, useCallback } from 'react';

import { Microscope, Package, Biohazard } from 'lucide-react';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';

import { AppHeader } from '@app/components/layout/AppHeader';
import { EquipmentTab } from '@domains/equipment/ui/components/EquipmentTab';
import { SuppliesTab } from '@domains/supplies/ui/components/SuppliesTab';

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
  { id: 'equipment', label: 'Equipment', icon: Microscope, path: '/lab/equipment', enabled: true },
  {
    id: 'supplies',
    label: 'Supplies',
    icon: Package,
    path: '/lab/supplies',
    enabled: true,
  },
  { id: 'reagents', label: 'Reagents', icon: Biohazard, path: '/lab/reagents', enabled: false },
];

function SidebarNavItem({ tab }: { tab: TabConfig }) {
  const [isAnimating, setIsAnimating] = useState(false);
  const Icon = tab.icon;

  const handleMouseEnter = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 350);
  }, []);

  return (
    <NavLink
      to={tab.path}
      onMouseEnter={handleMouseEnter}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
          isActive
            ? 'bg-accent text-accent-foreground font-medium'
            : 'text-secondary-foreground hover:bg-accent hover:text-accent-foreground'
        }`
      }
    >
      <span className={isAnimating ? 'animate-icon-pop' : ''}>
        <Icon size={16} />
      </span>
      <span>{tab.label}</span>
    </NavLink>
  );
}

export function LabManagementPage() {
  return (
    <div className="app-container">
      <div className="app-header">
        <AppHeader />
      </div>

      <div className="lab-management-layout">
        <aside className="lab-management-sidebar pt-2 pb-4">
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

              return <SidebarNavItem key={tab.id} tab={tab} />;
            })}
          </div>
        </aside>

        <main className="lab-management-content">
          <div className="h-full">
            <Routes>
              <Route path="equipment" element={<EquipmentTab />} />
              <Route path="supplies" element={<SuppliesTab />} />
              <Route path="*" element={<Navigate to="/lab/equipment" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}
