/**
 * Help Modal
 *
 * Read-only reference modal with vertical tab navigation.
 * Admin users see an additional Administration tab.
 */
import { lazy, Suspense, useMemo, useState } from 'react';

import { isAdminRole } from '@odysseus/shared-schemas';
import {
  BookUser,
  CircleHelp,
  Dna,
  Keyboard,
  Rocket,
  ShieldUser,
  TestTubeDiagonal,
} from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { Tab, LoadingSkeleton, Tabs } from '@shared/ui';
import { TankIcon } from '@shared/ui/components/icons/TankIcon';
import { BaseModal } from '@shared/ui/components/overlays/BaseModal';

import type { LucideIcon } from 'lucide-react';

const GettingStartedTab = lazy(() =>
  import('./tabs/GettingStartedTab').then(m => ({ default: m.GettingStartedTab }))
);

const TubesTab = lazy(() => import('./tabs/TubesTab').then(m => ({ default: m.TubesTab })));

const StorageTab = lazy(() => import('./tabs/StorageTab').then(m => ({ default: m.StorageTab })));

const DonorsTab = lazy(() => import('./tabs/DonorsTab').then(m => ({ default: m.DonorsTab })));

const ResearchersTab = lazy(() =>
  import('./tabs/ResearchersTab').then(m => ({ default: m.ResearchersTab }))
);

const ShortcutsTab = lazy(() =>
  import('./tabs/ShortcutsTab').then(m => ({ default: m.ShortcutsTab }))
);

const AdministrationTab = lazy(() =>
  import('./tabs/AdministrationTab').then(m => ({ default: m.AdministrationTab }))
);

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type IconComponent = LucideIcon | React.ComponentType<{ size?: number; className?: string }>;

type HelpTabId =
  | 'getting-started'
  | 'tubes'
  | 'storage'
  | 'donors'
  | 'researchers'
  | 'shortcuts'
  | 'administration';

interface HelpTabItem {
  id: HelpTabId;
  label: string;
  icon: IconComponent;
}

const BASE_TABS: HelpTabItem[] = [
  { id: 'getting-started', label: 'Getting Started', icon: Rocket },
  { id: 'tubes', label: 'Tubes', icon: TestTubeDiagonal },
  { id: 'storage', label: 'Storage', icon: TankIcon },
  { id: 'donors', label: 'Donors', icon: BookUser },
  { id: 'researchers', label: 'Researchers', icon: Dna },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
];

const ADMIN_TAB: HelpTabItem = {
  id: 'administration',
  label: 'Administration',
  icon: ShieldUser,
};

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const { user } = useAuthStore();
  const isAdmin = isAdminRole(user?.role);
  const [activeTab, setActiveTab] = useState<HelpTabId>('getting-started');

  const tabItems = useMemo(() => (isAdmin ? [...BASE_TABS, ADMIN_TAB] : BASE_TABS), [isAdmin]);

  const tabs = (
    <Tabs value={activeTab} onChange={v => setActiveTab(v as HelpTabId)} orientation="vertical">
      {tabItems.map(tab => {
        const Icon = tab.icon;
        return (
          <Tab key={tab.id} id={tab.id} icon={<Icon size={18} />}>
            {tab.label}
          </Tab>
        );
      })}
    </Tabs>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      icon={<CircleHelp size={24} />}
      title="Help"
      subtitle="Reference Guide"
      size="lg"
      animation="slide"
      tabs={tabs}
      tabOrientation="vertical"
      className="h-[75vh]"
      onClose={onClose}
    >
      {activeTab === 'getting-started' && (
        <Suspense fallback={<LoadingSkeleton />}>
          <GettingStartedTab />
        </Suspense>
      )}
      {activeTab === 'tubes' && (
        <Suspense fallback={<LoadingSkeleton />}>
          <TubesTab />
        </Suspense>
      )}
      {activeTab === 'storage' && (
        <Suspense fallback={<LoadingSkeleton />}>
          <StorageTab />
        </Suspense>
      )}
      {activeTab === 'donors' && (
        <Suspense fallback={<LoadingSkeleton />}>
          <DonorsTab />
        </Suspense>
      )}
      {activeTab === 'researchers' && (
        <Suspense fallback={<LoadingSkeleton />}>
          <ResearchersTab />
        </Suspense>
      )}
      {activeTab === 'shortcuts' && (
        <Suspense fallback={<LoadingSkeleton />}>
          <ShortcutsTab />
        </Suspense>
      )}
      {activeTab === 'administration' && (
        <Suspense fallback={<LoadingSkeleton />}>
          <AdministrationTab />
        </Suspense>
      )}
    </BaseModal>
  );
}
