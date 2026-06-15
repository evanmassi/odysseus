/**
 * Lab Management Page
 *
 * Route-based page shell with sidebar tab navigation for equipment,
 * supplies, and reagents management.
 */

import { useState, useCallback } from 'react';

import { Microscope, Package, Biohazard, FlaskConical } from 'lucide-react';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';

import { AppHeader } from '@app/components/layout/AppHeader';
import { EquipmentTab } from '@domains/equipment/ui/components/EquipmentTab';
import { useStorageData } from '@domains/storage';
import { SuppliesTab } from '@domains/supplies/ui/components/SuppliesTab';
import { PanelHeader } from '@shared/ui';
import { ConsolePanel } from '@shared/ui/primitives/console-panel/ConsolePanel';

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
        `flex items-center gap-2.5 border px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] transition-all ${
          isActive
            ? 'border-primary/40 bg-[linear-gradient(90deg,hsl(var(--primary)/0.12),transparent_72%)] text-foreground shadow-[inset_2px_0_0_hsl(var(--primary)),0_0_12px_-6px_hsl(var(--primary)/0.55)]'
            : 'border-transparent text-secondary-foreground hover:border-primary/20 hover:bg-primary/[0.06] hover:text-foreground'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className={isAnimating ? 'animate-icon-pop' : ''}>
            <Icon size={16} className={isActive ? 'text-primary' : ''} />
          </span>
          <span>{tab.label}</span>
        </>
      )}
    </NavLink>
  );
}

export function LabManagementPage() {
  const { currentLab } = useStorageData();

  return (
    <div className="app-container">
      <div className="app-header">
        <AppHeader />
      </div>

      <div className="lab-management-layout">
        <aside className="lab-management-sidebar pt-2 pb-4">
          <ConsolePanel intensity="soft" className="flex max-h-full min-h-0 flex-col">
            <div className="flex-shrink-0 border-b border-line-faint pr-4">
              <PanelHeader
                icon={<FlaskConical className="h-4 w-4" />}
                title={currentLab?.name ?? 'Lab'}
              />
            </div>
            <nav className="flex flex-col gap-1 p-2">
              {TABS.map(tab => {
                const Icon = tab.icon;

                if (!tab.enabled) {
                  return (
                    <div
                      key={tab.id}
                      className="flex cursor-not-allowed items-center gap-2.5 border border-transparent px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground/40"
                    >
                      <Icon size={16} />
                      <span>{tab.label}</span>
                      <span className="ml-auto text-[9px] tracking-[0.16em]">soon</span>
                    </div>
                  );
                }

                return <SidebarNavItem key={tab.id} tab={tab} />;
              })}
            </nav>
          </ConsolePanel>
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
