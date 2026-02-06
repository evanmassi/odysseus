/**
 * Help Modal
 *
 * Read-only reference modal with tab-based navigation.
 * Currently shows tube anatomy; extensible for future help topics.
 */
import { lazy, Suspense } from 'react';

import { CircleHelp, TestTube } from 'lucide-react';

import { TabSkeleton } from '@domains/admin/ui/components/TabSkeleton';
import { BaseModal } from '@shared/ui/components/modals/BaseModal';

const TubeAnatomyTab = lazy(() =>
  import('./tabs/TubeAnatomyTab').then(m => ({ default: m.TubeAnatomyTab }))
);

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const tabItems = [{ id: 'tube-anatomy', label: 'Tube Anatomy', icon: TestTube }] as const;

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  // When only one tab, hide the sidebar — it auto-appears when more are added
  const tabs = tabItems.length > 1 ? undefined : undefined;

  return (
    <BaseModal
      isOpen={isOpen}
      icon={<CircleHelp size={24} />}
      title="Help"
      subtitle="Reference Guide"
      size="lg"
      animation="slide"
      tabs={tabs}
      onClose={onClose}
    >
      <Suspense fallback={<TabSkeleton />}>
        <TubeAnatomyTab />
      </Suspense>
    </BaseModal>
  );
}
