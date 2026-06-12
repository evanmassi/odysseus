/**
 * Help Content Registry
 *
 * Single source of truth for the help guide's tabs and sections. Drives the tab
 * navigation, the per-section headers (titles + anchors), and the search index.
 */
import type { ComponentType } from 'react';

import {
  Activity,
  BookOpen,
  BookUser,
  Dna,
  Gauge,
  Globe,
  Grid3X3,
  Keyboard,
  Lock,
  Navigation,
  Palette,
  Rocket,
  ScanEye,
  Search,
  Settings,
  Shield,
  ShieldUser,
  TestTubeDiagonal,
  TicketCheck,
  UserRoundCog,
  UserRoundSearch,
  UsersRound,
  Clock,
  Link as LinkIcon,
  ListTree,
  BookmarkCheck,
  IdCardLanyard,
  LockKeyhole,
} from 'lucide-react';

import { TankIcon } from '@shared/ui/components/icons/TankIcon';

import type { LucideIcon } from 'lucide-react';

export type HelpTabId =
  | 'getting-started'
  | 'tubes'
  | 'storage'
  | 'donors'
  | 'researchers'
  | 'shortcuts'
  | 'administration';

type IconComponent = LucideIcon | ComponentType<{ size?: number; className?: string }>;

export interface HelpTabMeta {
  id: HelpTabId;
  label: string;
  icon: IconComponent;
  /** Admin-only tabs are hidden from non-admin users. */
  adminOnly?: boolean;
}

/** Ordered tab list. Admin-gated entries are filtered in the modal. */
export const HELP_TABS: HelpTabMeta[] = [
  { id: 'getting-started', label: 'Getting Started', icon: Rocket },
  { id: 'tubes', label: 'Tubes', icon: TestTubeDiagonal },
  { id: 'storage', label: 'Storage', icon: TankIcon },
  { id: 'donors', label: 'Donors', icon: BookUser },
  { id: 'researchers', label: 'Researchers', icon: Dna },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
  { id: 'administration', label: 'Administration', icon: ShieldUser, adminOnly: true },
];

export const HELP_TAB_META: Record<HelpTabId, HelpTabMeta> = HELP_TABS.reduce(
  (acc, tab) => ({ ...acc, [tab.id]: tab }),
  {} as Record<HelpTabId, HelpTabMeta>
);

export interface HelpSectionMeta {
  id: string;
  tabId: HelpTabId;
  title: string;
  icon: IconComponent;
  /** Extra search terms beyond the title (synonyms, feature names, concepts). */
  keywords: string[];
  /** Sections only shown to admins are excluded from non-admin search results. */
  adminOnly?: boolean;
}

/**
 * Every help section, keyed by a stable anchor id. The section component reads its
 * title/icon from here; search filters across title + keywords.
 */
export const HELP_SECTIONS: HelpSectionMeta[] = [
  // Getting Started
  {
    id: 'gs-grid',
    tabId: 'getting-started',
    title: 'Navigating the Grid',
    icon: Navigation,
    keywords: ['navigator', 'sidebar', 'tanks', 'racks', 'boxes', 'tube information', 'location'],
  },
  {
    id: 'gs-edit',
    tabId: 'getting-started',
    title: 'Adding & Editing Tubes',
    icon: TestTubeDiagonal,
    keywords: ['add', 'edit', 'copy', 'cut', 'paste', 'bulk', 'double-click', 'right-click'],
  },
  {
    id: 'gs-lock',
    tabId: 'getting-started',
    title: 'Locking & Sharing',
    icon: Lock,
    keywords: ['lock', 'share', 'access', 'lock note', 'permissions'],
  },
  {
    id: 'gs-search',
    tabId: 'getting-started',
    title: 'Search',
    icon: Search,
    keywords: ['filter', 'advanced search', 'csv', 'export', 'find tubes'],
  },

  // Tubes
  {
    id: 'tubes-anatomy',
    tabId: 'tubes',
    title: 'Tube Cell Anatomy',
    icon: ScanEye,
    keywords: ['position', 'lot', 'cell type', 'donor id', 'culture condition', 'diagram', 'lock'],
  },
  {
    id: 'tubes-lock-states',
    tabId: 'tubes',
    title: 'Lock States',
    icon: LockKeyhole,
    keywords: ['lock', 'shared access', 'locked out', 'lock note', 'dimmed'],
  },
  {
    id: 'tubes-color',
    tabId: 'tubes',
    title: 'Color Coding',
    icon: Palette,
    keywords: ['cell line', 'donor color', 'brightness', 'swatch', 'indicator', 'lot', 'contrast'],
  },

  // Storage
  {
    id: 'storage-hierarchy',
    tabId: 'storage',
    title: 'Storage Hierarchy',
    icon: ListTree,
    keywords: ['tank', 'rack', 'box', 'freezer', 'dewar', 'nesting'],
  },
  {
    id: 'storage-ownership',
    tabId: 'storage',
    title: 'Ownership & Assignment',
    icon: UsersRound,
    keywords: ['assign', 'owner', 'common', 'badge', 'inherit', 'unassigned'],
  },
  {
    id: 'storage-roles',
    tabId: 'storage',
    title: 'Roles',
    icon: IdCardLanyard,
    keywords: ['admin', 'user', 'permissions', 'labels', 'grid size'],
  },
  {
    id: 'storage-quick-ref',
    tabId: 'storage',
    title: 'Quick Reference',
    icon: BookmarkCheck,
    keywords: ['custom labels', 'grid sizes', 'bulk creation', '5x5', '10x10'],
  },

  // Donors
  {
    id: 'donors-what',
    tabId: 'donors',
    title: 'What is the Donor Registry?',
    icon: BookUser,
    keywords: ['source id', 'internal id', 'demographics', 'clinical', 'database'],
  },
  {
    id: 'donors-browse',
    tabId: 'donors',
    title: 'Browsing & Searching',
    icon: Search,
    keywords: ['search', 'source id', 'internal id', 'table', 'detail panel'],
  },
  {
    id: 'donors-profiles',
    tabId: 'donors',
    title: 'Donor Profiles',
    icon: UserRoundSearch,
    keywords: ['identifiers', 'demographics', 'clinical', 'species', 'age', 'sex', 'notes'],
  },
  {
    id: 'donors-history',
    tabId: 'donors',
    title: 'Collection History',
    icon: Clock,
    keywords: ['collection date', 'specimen type', 'source', 'whole blood', 'leukopak', 'timeline'],
  },
  {
    id: 'donors-linking',
    tabId: 'donors',
    title: 'Linking Donors to Tubes',
    icon: LinkIcon,
    keywords: ['link', 'donor search', 'auto-create', 'color coding', 'filter'],
  },
  {
    id: 'donors-managing',
    tabId: 'donors',
    title: 'Managing Donors',
    icon: ShieldUser,
    keywords: ['add', 'edit', 'delete', 'review', 'collection history', 'curated'],
    adminOnly: true,
  },

  // Researchers
  {
    id: 'researchers-vs-users',
    tabId: 'researchers',
    title: 'Users vs Researchers',
    icon: UsersRound,
    keywords: ['user', 'researcher', 'login', 'account', 'profile', 'owns tubes'],
  },
  {
    id: 'researchers-tubes',
    tabId: 'researchers',
    title: 'How Tubes Connect to Researchers',
    icon: TestTubeDiagonal,
    keywords: ['assign', 'ownership', 'froze down', 'optional'],
  },
  {
    id: 'researchers-linked',
    tabId: 'researchers',
    title: 'Linked vs Unlinked Researchers',
    icon: LinkIcon,
    keywords: ['link', 'user account', 'unlinked', 'collaborator', 'manage own tubes'],
  },
  {
    id: 'researchers-managing',
    tabId: 'researchers',
    title: 'Managing Researchers',
    icon: UserRoundCog,
    keywords: ['create', 'edit', 'link', 'deactivate', 'tube counts', 'status'],
  },

  // Shortcuts
  {
    id: 'shortcuts-grid',
    tabId: 'shortcuts',
    title: 'Grid',
    icon: Grid3X3,
    keywords: ['arrows', 'select', 'copy', 'cut', 'paste', 'lock', 'share', 'delete', 'keyboard'],
  },
  {
    id: 'shortcuts-navigator',
    tabId: 'shortcuts',
    title: 'Navigator',
    icon: Navigation,
    keywords: ['arrows', 'expand', 'collapse', 'jump', 'focus', 'keyboard'],
  },
  {
    id: 'shortcuts-global',
    tabId: 'shortcuts',
    title: 'Global',
    icon: Globe,
    keywords: ['search', 'escape', 'close', 'keyboard'],
  },

  // Administration
  {
    id: 'admin-overview',
    tabId: 'administration',
    title: 'Admin Settings Overview',
    icon: Settings,
    keywords: ['admin settings', 'hub', 'manage lab'],
    adminOnly: true,
  },
  {
    id: 'admin-system',
    tabId: 'administration',
    title: 'System',
    icon: Gauge,
    keywords: ['lab name', 'storage utilization', 'export', 'logging'],
    adminOnly: true,
  },
  {
    id: 'admin-security',
    tabId: 'administration',
    title: 'Security Settings',
    icon: Shield,
    keywords: ['authentication', 'passwords', 'sessions', 'timeout', 'login protection', 'lockout'],
    adminOnly: true,
  },
  {
    id: 'admin-users',
    tabId: 'administration',
    title: 'User Management',
    icon: UsersRound,
    keywords: ['roles', 'reset password', 'link researcher', 'activate', 'deactivate', 'access'],
    adminOnly: true,
  },
  {
    id: 'admin-researchers',
    tabId: 'administration',
    title: 'Researcher Management',
    icon: Dna,
    keywords: ['create', 'link', 'unlink', 'deactivate', 'tube counts'],
    adminOnly: true,
  },
  {
    id: 'admin-invites',
    tabId: 'administration',
    title: 'Invite Codes',
    icon: TicketCheck,
    keywords: ['register', 'invite', 'max uses', 'auto-create researcher', 'deactivate'],
    adminOnly: true,
  },
  {
    id: 'admin-catalog',
    tabId: 'administration',
    title: 'Catalog Management',
    icon: BookOpen,
    keywords: ['species', 'source', 'media', 'specimen type', 'options', 'rename', 'lookup'],
    adminOnly: true,
  },
  {
    id: 'admin-monitoring',
    tabId: 'administration',
    title: 'Monitoring',
    icon: Activity,
    keywords: ['audit log', 'activity', 'filter', 'troubleshooting'],
    adminOnly: true,
  },
];

const SECTION_BY_ID = new Map(HELP_SECTIONS.map(s => [s.id, s]));

// 1-based ordinal of each section within its own tab, for the subsection index.
const SECTION_ORDINAL = new Map<string, number>();
for (const tab of HELP_TABS) {
  let ordinal = 0;
  for (const section of HELP_SECTIONS) {
    if (section.tabId === tab.id) {
      SECTION_ORDINAL.set(section.id, (ordinal += 1));
    }
  }
}

export function getHelpSection(id: string): HelpSectionMeta | undefined {
  return SECTION_BY_ID.get(id);
}

export function getHelpSectionIndex(id: string): number | undefined {
  return SECTION_ORDINAL.get(id);
}

/** Sections matching the query across title + keywords, optionally hiding admin content. */
export function searchHelpSections(query: string, includeAdmin: boolean): HelpSectionMeta[] {
  const visible = HELP_SECTIONS.filter(s => includeAdmin || !s.adminOnly);
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return visible;

  const terms = trimmed.split(/\s+/);
  return visible.filter(section => {
    const haystack = `${section.title} ${section.keywords.join(' ')}`.toLowerCase();
    return terms.every(term => haystack.includes(term));
  });
}
