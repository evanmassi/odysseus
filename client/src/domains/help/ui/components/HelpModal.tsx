/**
 * Help Modal
 *
 * Read-only reference modal with vertical tab navigation.
 */
import { lazy, Suspense, useState } from 'react';

import { CircleHelp, Dna, Keyboard, Rocket, TestTube } from 'lucide-react';

import { TabSkeleton } from '@domains/admin/ui/components/TabSkeleton';
import { Tab, Tabs } from '@shared/ui';
import { TankIcon } from '@shared/ui/components/icons/TankIcon';
import { BaseModal } from '@shared/ui/components/modals/BaseModal';

const GettingStartedTab = lazy(() =>
  import('./tabs/GettingStartedTab').then(m => ({ default: m.GettingStartedTab }))
);

const TubesTab = lazy(() => import('./tabs/TubesTab').then(m => ({ default: m.TubesTab })));

const StorageTab = lazy(() => import('./tabs/StorageTab').then(m => ({ default: m.StorageTab })));

const ResearchersTab = lazy(() =>
  import('./tabs/ResearchersTab').then(m => ({ default: m.ResearchersTab }))
);

const ShortcutsTab = lazy(() =>
  import('./tabs/ShortcutsTab').then(m => ({ default: m.ShortcutsTab }))
);

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type HelpTabId = 'getting-started' | 'tubes' | 'storage' | 'researchers' | 'shortcuts';

const tabItems = [
  { id: 'getting-started' as const, label: 'Getting Started', icon: Rocket },
  { id: 'tubes' as const, label: 'Tubes', icon: TestTube },
  { id: 'storage' as const, label: 'Storage', icon: TankIcon },
  { id: 'researchers' as const, label: 'Researchers', icon: Dna },
  { id: 'shortcuts' as const, label: 'Shortcuts', icon: Keyboard },
];

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<HelpTabId>('getting-started');

  const tabs =
    tabItems.length > 1 ? (
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
    ) : undefined;

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
        <Suspense fallback={<TabSkeleton />}>
          <GettingStartedTab />
        </Suspense>
      )}
      {activeTab === 'tubes' && (
        <Suspense fallback={<TabSkeleton />}>
          <TubesTab />
        </Suspense>
      )}
      {activeTab === 'storage' && (
        <Suspense fallback={<TabSkeleton />}>
          <StorageTab />
        </Suspense>
      )}
      {activeTab === 'researchers' && (
        <Suspense fallback={<TabSkeleton />}>
          <ResearchersTab />
        </Suspense>
      )}
      {activeTab === 'shortcuts' && (
        <Suspense fallback={<TabSkeleton />}>
          <ShortcutsTab />
        </Suspense>
      )}
    </BaseModal>
  );
}
