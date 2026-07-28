/**
 * Lab Management Page
 *
 * Route-based page shell with sidebar tab navigation for equipment,
 * supplies, and reagents management.
 */

import { Microscope, Package, Biohazard, FlaskConical } from 'lucide-react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';

import { AppHeader } from '@app/components/layout/AppHeader';
import { EquipmentTab } from '@domains/equipment';
import { ReagentsTab } from '@domains/reagents';
import { useStorageData } from '@domains/storage';
import { SuppliesTab } from '@domains/supplies';
import { AccentTick, HeaderStrip, PanelHeader, Tab, Tabs } from '@shared/ui';
import { ConsolePanel } from '@shared/ui/primitives/console-panel/ConsolePanel';

import '@shared/styles/base/layout.css';

import type { LucideIcon } from 'lucide-react';

interface TabConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

const TABS: TabConfig[] = [
  { id: 'equipment', label: 'Equipment', icon: Microscope, path: '/lab/equipment' },
  { id: 'supplies', label: 'Supplies', icon: Package, path: '/lab/supplies' },
  { id: 'reagents', label: 'Reagents', icon: Biohazard, path: '/lab/reagents' },
];

export function LabManagementPage() {
  const { currentLab } = useStorageData();
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = TABS.find(tab => location.pathname.startsWith(tab.path))?.id ?? 'equipment';

  const handleTabChange = (id: string) => {
    const tab = TABS.find(t => t.id === id);
    if (tab) void navigate(tab.path);
  };

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

            <HeaderStrip className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex min-w-0 items-center gap-1.5">
                <AccentTick />
                <span className="whitespace-nowrap font-mono text-data-sm tracking-[0.04em] text-foreground">
                  {TABS.length} <span className="text-foreground/45">suites</span>
                </span>
              </span>
            </HeaderStrip>

            <nav className="py-2">
              <Tabs orientation="vertical" value={activeTab} onChange={handleTabChange}>
                {TABS.map(tab => {
                  const Icon = tab.icon;

                  return (
                    <Tab key={tab.id} id={tab.id} icon={<Icon size={18} />}>
                      {tab.label}
                    </Tab>
                  );
                })}
              </Tabs>
            </nav>
          </ConsolePanel>
        </aside>

        <main className="lab-management-content">
          <div className="h-full">
            <Routes>
              <Route path="equipment" element={<EquipmentTab />} />
              <Route path="supplies" element={<SuppliesTab />} />
              <Route path="reagents" element={<ReagentsTab />} />
              <Route path="*" element={<Navigate to="/lab/equipment" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}
