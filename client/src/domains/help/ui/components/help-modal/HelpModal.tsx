import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType } from 'react';

import { isAdminRole } from '@odysseus/shared-schemas';
import { CircleHelp, Search, X } from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import {
  AccentTick,
  Button,
  Tab,
  LoadingSkeleton,
  SearchInput,
  SectionHeader,
  Tabs,
} from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays/BaseModal';

import { getHelpSection, HELP_TABS, HELP_TAB_META } from '../../../content/helpContent';

import { HelpNavContext } from './HelpNavContext';
import { HelpSearchResults } from './HelpSearchResults';

import './help-modal.css';

import type { HelpNav } from './HelpNavContext';
import type { HelpTabId } from '../../../content/helpContent';

const GettingStartedTab = lazy(() =>
  import('./tabs/GettingStartedTab').then(m => ({ default: m.GettingStartedTab }))
);

const TubesTab = lazy(() => import('./tabs/TubesTab').then(m => ({ default: m.TubesTab })));

const StorageTab = lazy(() => import('./tabs/StorageTab').then(m => ({ default: m.StorageTab })));

const LabManagementTab = lazy(() =>
  import('./tabs/LabManagementTab').then(m => ({ default: m.LabManagementTab }))
);

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

const TAB_COMPONENTS: Record<HelpTabId, ComponentType> = {
  'getting-started': GettingStartedTab,
  tubes: TubesTab,
  storage: StorageTab,
  'lab-management': LabManagementTab,
  donors: DonorsTab,
  researchers: ResearchersTab,
  shortcuts: ShortcutsTab,
  administration: AdministrationTab,
};

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const { user } = useAuthStore();
  const isAdmin = isAdminRole(user?.role);
  const [activeTab, setActiveTab] = useState<HelpTabId>('getting-started');
  const [query, setQuery] = useState('');
  const pendingSectionRef = useRef<string | null>(null);

  const tabItems = useMemo(() => HELP_TABS.filter(tab => isAdmin || !tab.adminOnly), [isAdmin]);

  const goToTab = useCallback((tab: HelpTabId) => {
    pendingSectionRef.current = null;
    setQuery('');
    setActiveTab(tab);
  }, []);

  const goToSection = useCallback((sectionId: string) => {
    const section = getHelpSection(sectionId);
    if (!section) return;
    pendingSectionRef.current = sectionId;
    setQuery('');
    setActiveTab(section.tabId);
  }, []);

  const nav = useMemo<HelpNav>(() => ({ goToTab, goToSection }), [goToTab, goToSection]);

  useEffect(() => {
    const target = pendingSectionRef.current;
    if (!target) return;
    let raf = 0;
    let attempts = 0;
    const run = () => {
      const el = document.getElementById(target);
      if (el) {
        pendingSectionRef.current = null;
        el.scrollIntoView({ block: 'start', behavior: 'smooth' });
        el.classList.add('help-flash');
        window.setTimeout(() => el.classList.remove('help-flash'), 1200);
        return;
      }
      if (attempts++ < 60) {
        raf = requestAnimationFrame(run);
      } else {
        pendingSectionRef.current = null;
      }
    };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [activeTab, query]);

  const isSearching = query.trim().length > 0;
  const activeMeta = HELP_TAB_META[activeTab];
  const ActiveIcon = activeMeta.icon;
  const ActiveTab = TAB_COMPONENTS[activeTab];

  const tabs = (
    <Tabs value={activeTab} onChange={v => goToTab(v as HelpTabId)} orientation="vertical">
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

  const locator = (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5 font-mono">
        <AccentTick />
        <span className="type-label text-label-2xs tracking-label-wide text-muted-foreground">
          Guide
        </span>
        <span className="text-data-sm text-foreground">
          {isSearching ? 'Search' : activeMeta.label}
        </span>
      </div>
      <SearchInput
        value={query}
        onChange={setQuery}
        size="sm"
        placeholder="Search help…"
        aria-label="Search help"
        className="w-56"
        trailingSlot={
          query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            >
              <X size={13} />
            </button>
          ) : undefined
        }
      />
    </div>
  );

  const footer = (
    <div className="flex justify-end">
      <Button variant="secondary" onClick={onClose}>
        Done
      </Button>
    </div>
  );

  return (
    <HelpNavContext.Provider value={nav}>
      <BaseModal
        isOpen={isOpen}
        icon={<CircleHelp size={24} />}
        title="Help"
        subtitle="Reference Guide"
        size="lg"
        tabs={tabs}
        tabOrientation="vertical"
        locator={locator}
        footer={footer}
        className="h-[75vh]"
        onClose={onClose}
      >
        <div className="space-y-6">
          {isSearching ? (
            <>
              <SectionHeader
                size="lg"
                icon={<Search size={18} />}
                title="Search Results"
                rightMeta={`“${query.trim()}”`}
              />
              <HelpSearchResults query={query} includeAdmin={isAdmin} />
            </>
          ) : (
            <>
              <SectionHeader size="lg" icon={<ActiveIcon size={18} />} title={activeMeta.label} />
              <Suspense fallback={<LoadingSkeleton />}>
                <ActiveTab />
              </Suspense>
            </>
          )}
        </div>
      </BaseModal>
    </HelpNavContext.Provider>
  );
}
