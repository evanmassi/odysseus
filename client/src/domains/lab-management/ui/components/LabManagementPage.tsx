/**
 * Lab Management Page
 *
 * Route-based page shell with sidebar tab navigation for equipment,
 * supplies, and reagents management.
 */

import { Microscope, Package, Biohazard, FlaskConical } from 'lucide-react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';

import { AppHeader } from '@app/components/layout/AppHeader';
import { EquipmentTab } from '@domains/equipment/ui/components/EquipmentTab';
import { useStorageData } from '@domains/storage';
import { SuppliesTab } from '@domains/supplies/ui/components/SuppliesTab';
import { NubDivider, PanelHeader, Tab, Tabs } from '@shared/ui';
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

export function LabManagementPage() {
  const { currentLab } = useStorageData();
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = TABS.find(tab => location.pathname.startsWith(tab.path))?.id ?? 'equipment';
  const onlineCount = TABS.filter(tab => tab.enabled).length;

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

            {/* Locator strip: suite counts */}
            <div className="relative flex flex-shrink-0 items-center gap-3 border-b border-line-faint bg-black/35 px-4 py-2.5">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-foreground/[0.05]"
              />
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  aria-hidden
                  className="h-2.5 w-0.5 flex-shrink-0 bg-primary/80 shadow-[0_0_6px_hsl(var(--primary)/0.55)]"
                />
                <span className="font-mono text-[11px] tracking-[0.04em] text-foreground">
                  {TABS.length} <span className="text-foreground/45">suites</span>
                </span>
              </span>
              <span className="flex-1" />
              <span className="font-mono text-[10px] tracking-[0.06em] text-foreground/45">
                {onlineCount} online
              </span>
              <NubDivider tone="primary" className="absolute inset-x-0 -bottom-px" />
            </div>

            <nav className="py-2">
              <Tabs orientation="vertical" value={activeTab} onChange={handleTabChange}>
                {TABS.map(tab => {
                  const Icon = tab.icon;

                  if (!tab.enabled) {
                    return (
                      <div
                        key={tab.id}
                        className="relative z-10 flex w-full cursor-not-allowed items-center gap-2 px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground/40"
                      >
                        <Icon size={18} />
                        <span>{tab.label}</span>
                        <span className="ml-auto text-[9px] tracking-[0.16em]">soon</span>
                      </div>
                    );
                  }

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
              <Route path="*" element={<Navigate to="/lab/equipment" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}
