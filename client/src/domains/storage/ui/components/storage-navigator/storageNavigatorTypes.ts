/**
 * Storage Navigator Types
 *
 * View-model interfaces for the tree-based storage location picker.
 */

import type { GridConfiguration, RackTube } from '@odysseus/shared-schemas';
import type { UserBadgeType } from '@shared/ui/components/badges';

export interface StorageHierarchy {
  tanks: Tank[];
}

export interface Tank {
  id: string;
  name: string;
  racks: Rack[];
}

export interface Rack {
  id: string;
  name: string;
  boxes: Box[];
  assignedUserId?: string | null;
}

export interface Box {
  id: string;
  name: string;
  position: number;
  assignedUserId?: string | null;
  gridConfig: GridConfiguration;
}

export interface SelectedLocation {
  tankId: string | null;
  rackId: string | null;
  boxId: string | null;
}

interface CurrentUserInfo {
  id: string;
  initials: string;
  isAdmin?: boolean;
}

export interface StorageNavigatorProps {
  data: StorageHierarchy;
  selected: SelectedLocation;
  onSelect: (location: SelectedLocation) => void;
  currentUser?: CurrentUserInfo;
  getUserInitials?: (userId: string) => string | undefined;
}

export interface StorageNavigatorNodeProps {
  id: string;
  name: string;
  level: 'tank' | 'rack';
  hasChildren: boolean;
  isSelected: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
  children?: React.ReactNode;
  tabIndex?: -1 | 0;
  buttonRef?: ((element: HTMLButtonElement | null) => void) | React.RefObject<HTMLButtonElement>;
  onFocus?: () => void;
  ariaLevel?: number;
  ariaPosinset?: number;
  ariaSetsize?: number;
  ownershipType?: UserBadgeType;
  ownershipInitials?: string;
  occupancyFilled?: number;
  occupancyCapacity?: number;
}

export interface StorageBoxMinimapProps {
  box: Box;
  tubes: RackTube[];
  filled: number;
  capacity: number;
  isSelected: boolean;
  onSelect: () => void;
  tabIndex: -1 | 0;
  buttonRef: (element: HTMLButtonElement | null) => void;
  onFocus: () => void;
  ariaLevel?: number;
  ariaPosinset?: number;
  ariaSetsize?: number;
  ownershipType?: UserBadgeType;
  ownershipInitials?: string;
}

export interface VisibleTreeNode {
  id: string;
  name: string;
  level: 'tank' | 'rack' | 'box';
  tankId: string;
  rackId?: string;
  boxId?: string;
  isExpanded: boolean;
  isSelected: boolean;
  hasChildren: boolean;
  nodeKey: string;
  ariaLevel: number;
  ariaPosinset: number;
  ariaSetsize: number;
}
