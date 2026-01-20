import type { OwnershipType } from '@shared/ui/components';

export type { OwnershipType };

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
}

export interface SelectedLocation {
  tankId: string | null;
  rackId: string | null;
  boxId: string | null;
}

export interface CurrentUserInfo {
  id: string;
  initials: string;
}

export interface StorageNavigatorProps {
  data: StorageHierarchy;
  selected: SelectedLocation;
  onSelect: (location: SelectedLocation) => void;
  className?: string;
  currentUser?: CurrentUserInfo;
}

export interface StorageNavigatorItemProps {
  id: string;
  name: string;
  level: 'tank' | 'rack' | 'box';
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
  ownershipType?: OwnershipType;
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

// Generate unique composite key for a node
export function getNodeKey(
  level: 'tank' | 'rack' | 'box',
  tankId: string,
  rackId?: string,
  boxId?: string
): string {
  if (level === 'tank') return `tank:${tankId}`;
  if (level === 'rack') return `rack:${tankId}:${rackId}`;
  return `box:${tankId}:${rackId}:${boxId}`;
}
