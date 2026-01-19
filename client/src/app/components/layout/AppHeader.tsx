import { useState, lazy, useEffect, useRef, useCallback } from 'react';

import {
  LogOut,
  UserRound,
  Menu,
  Plus,
  Edit,
  Trash2,
  Copy,
  Scissors,
  ClipboardPaste,
  X,
  Settings,
  ShieldUser,
  Lock,
  Unlock,
  Share2,
  TestTube,
  FlaskConical,
} from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { SearchContainer } from '@domains/search/ui/components/SearchContainer';
import { useStorageData } from '@domains/storage';
import odysseusLogo from '@shared/assets/odysseus-logo-thick.svg';
import { parsePositionKey, type PositionKey } from '@shared/types/GridSelection';
import { Button, SuspenseBoundary, Tooltip } from '@shared/ui';
import { OnlineUsersBadges } from '@shared/ui/components';
import { TankIcon } from '@shared/ui/components/icons/TankIcon';
import { ModalSkeleton } from '@shared/ui/components/loading/LoadingSkeletons';
import { PreloadHelpers } from '@shared/utils/lazy/PreloadHelpers';

import type { TubeData } from '@domains/tubes/types';
// Assets - using ES6 imports for proper module resolution

// Lazy load modals for code splitting
const AdminSettingsModal = lazy(() =>
  import('@domains/admin').then(m => ({
    default: m.AdminSettingsModal,
  }))
);

const StorageManagerModal = lazy(() =>
  import('@domains/storage/ui/components/modals/StorageManagerModal').then(m => ({
    default: m.StorageManagerModal,
  }))
);

const UserSettingsModal = lazy(() =>
  import('@domains/authentication/ui/components/UserSettingsModal').then(m => ({
    default: m.UserSettingsModal,
  }))
);

// Create preload hooks for anticipatory loading
const useLazyAdminSettings = PreloadHelpers.createHook(() => import('@domains/admin'));

const useLazyStorageManager = PreloadHelpers.createHook(
  () => import('@domains/storage/ui/components/modals/StorageManagerModal')
);

const useLazyUserSettings = PreloadHelpers.createHook(
  () => import('@domains/authentication/ui/components/UserSettingsModal')
);

interface HeaderProps {
  selectedPositions?: Set<PositionKey>;
  _onEditTube?: (tubeId: string) => void;
  onClearSelection?: () => void;
  tubes?: TubeData[];
  // Grid controller actions passed from parent
  gridController?: {
    openModal: () => void;
    copy: () => void;
    cut: () => void;
    paste: () => void;
    delete: () => void;
    canPaste: boolean;
    selection: {
      hasFilledSelection: boolean;
      isMixed: boolean;
      // Lock-related counts
      lockableCount?: number;
      unlockableCount?: number;
      sharableCount?: number;
      isUnlocking?: boolean;
    };
    // Lock actions (optional)
    lock?: () => void;
    unlock?: () => Promise<void>;
    shareAccess?: () => void;
  };
  // View-only mode (container assigned to another user)
  isViewOnlySpace?: boolean;
}

export function AppHeader({
  selectedPositions = new Set(),
  _onEditTube,
  onClearSelection,
  tubes = [],
  gridController,
  isViewOnlySpace = false,
}: HeaderProps) {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { currentLab } = useStorageData();

  // Lazy loading hooks for modal preloading
  const { triggerProps: adminSettingsTriggerProps } = useLazyAdminSettings();
  const { triggerProps: storageManagerTriggerProps } = useLazyStorageManager();
  const { triggerProps: userSettingsTriggerProps } = useLazyUserSettings();

  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showStorageManager, setShowStorageManager] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);

  // Refs for hamburger menu
  const hamburgerMenuRef = useRef<HTMLDivElement>(null);
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);

  // Close hamburger menu when clicking outside
  useEffect(() => {
    if (!showHamburgerMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (hamburgerMenuRef.current && !hamburgerMenuRef.current.contains(e.target as Node)) {
        setShowHamburgerMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showHamburgerMenu]);

  // Keyboard navigation for hamburger menu (WAI-ARIA Menu Button pattern)
  const handleMenuKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowHamburgerMenu(false);
      hamburgerButtonRef.current?.focus();
      return;
    }

    // Arrow key navigation between menu items
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const items = hamburgerMenuRef.current?.querySelectorAll<HTMLElement>(
        'button[role="menuitem"]:not([disabled])'
      );
      if (!items?.length) return;

      const currentIndex = Array.from(items).findIndex(item => item === document.activeElement);
      const nextIndex =
        e.key === 'ArrowDown'
          ? (currentIndex + 1) % items.length
          : (currentIndex - 1 + items.length) % items.length;
      items[nextIndex].focus();
    }

    // Home/End keys for first/last item
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      const items = hamburgerMenuRef.current?.querySelectorAll<HTMLElement>(
        'button[role="menuitem"]:not([disabled])'
      );
      if (!items?.length) return;
      items[e.key === 'Home' ? 0 : items.length - 1].focus();
    }
  }, []);

  // Close menu when focus leaves the dropdown
  const handleMenuBlur = useCallback((e: React.FocusEvent) => {
    // relatedTarget is the element receiving focus
    // Only close if focus is moving outside the menu container
    if (!hamburgerMenuRef.current?.contains(e.relatedTarget as Node)) {
      setShowHamburgerMenu(false);
    }
  }, []);

  const handleLogout = () => {
    // Socket cleanup is now handled centrally by AppBootstrapService
    void logout();
  };

  // Selection analysis for contextual controls
  const selectionAnalysis = (() => {
    if (!selectedPositions || selectedPositions.size === 0 || !tubes) {
      return {
        hasSelection: false,
        selectedTubes: [],
        emptyPositions: new Set(),
        filledPositions: new Set(),
        hasEmpty: false,
        hasFilled: false,
        isMixed: false,
      };
    }

    const selectedTubes = Array.from(selectedPositions || [])
      .map(key => {
        const { tankId, rackId, boxId, position } = parsePositionKey(key);
        return tubes.find(
          t =>
            t.location.tankId === tankId &&
            t.location.rackId === rackId &&
            t.location.boxId === boxId &&
            t.location.position === position
        );
      })
      .filter((tube): tube is TubeData => tube !== undefined);

    const emptyPositions = new Set(
      Array.from(selectedPositions || []).filter(key => {
        const { tankId, rackId, boxId, position } = parsePositionKey(key);
        return !tubes.find(
          t =>
            t.location.tankId === tankId &&
            t.location.rackId === rackId &&
            t.location.boxId === boxId &&
            t.location.position === position
        );
      })
    );

    const filledPositions = new Set(
      Array.from(selectedPositions || []).filter(key => !emptyPositions.has(key))
    );

    const hasEmpty = emptyPositions.size > 0;
    const hasFilled = filledPositions.size > 0;

    const result = {
      hasSelection: true,
      selectedTubes,
      emptyPositions,
      filledPositions,
      hasEmpty,
      hasFilled,
      isMixed: hasEmpty && hasFilled,
    };

    return result;
  })();

  return (
    <header className="bg-background px-4 h-full flex items-center">
      <div className="flex justify-between items-center w-full">
        {/* Far Left: Logo */}
        <div className="flex items-center">
          <img src={odysseusLogo} alt="Odysseus" className="h-11 w-auto" />
        </div>

        {/* Right Side: Controls + Search + Hamburger */}
        <div className="flex items-center gap-3">
          {/* Action Toolbar */}
          {selectionAnalysis.hasSelection && gridController && (
            <div className="flex items-center space-x-1">
              {gridController && (
                <>
                  {/* Selection count - only show when more than 1 selected */}
                  {selectedPositions.size > 1 && (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-secondary-foreground bg-muted px-2.5 py-1 rounded-full mr-2">
                      <TestTube className="w-3.5 h-3.5" />
                      {selectedPositions.size} selected
                    </span>
                  )}

                  {/* Action buttons - hidden in view-only mode (banner shows on grid instead) */}
                  {!isViewOnlySpace && (
                    <>
                      {/* Section 1: Add/Edit */}
                      <Tooltip
                        content={
                          gridController.selection.isMixed
                            ? 'Add tubes to mixed selection (overwrite prompt will appear)'
                            : gridController.selection.hasFilledSelection
                              ? 'Edit selected tube(s)'
                              : 'Add new tube(s) to selected position(s)'
                        }
                        side="bottom"
                      >
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={gridController.openModal}
                          leftIcon={
                            gridController.selection.hasFilledSelection &&
                            !gridController.selection.isMixed ? (
                              <Edit className="w-3 h-3" />
                            ) : (
                              <Plus className="w-3 h-3" />
                            )
                          }
                        >
                          {gridController.selection.hasFilledSelection &&
                          !gridController.selection.isMixed
                            ? 'Edit'
                            : 'Add'}
                        </Button>
                      </Tooltip>

                      {/* Section 2: Copy, Cut, Paste */}
                      {(selectionAnalysis.hasFilled || gridController?.canPaste) && (
                        <>
                          {selectionAnalysis.hasFilled && (
                            <>
                              <Tooltip content="Copy selected tube(s)" side="bottom">
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  onClick={gridController.copy}
                                  leftIcon={<Copy className="w-3 h-3" />}
                                >
                                  Copy
                                </Button>
                              </Tooltip>
                              <Tooltip content="Cut selected tube(s)" side="bottom">
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  onClick={gridController.cut}
                                  leftIcon={<Scissors className="w-3 h-3" />}
                                >
                                  Cut
                                </Button>
                              </Tooltip>
                            </>
                          )}
                          {gridController?.canPaste && selectionAnalysis.hasSelection && (
                            <Tooltip content="Paste tube(s)" side="bottom">
                              <Button
                                variant="ghost"
                                size="xs"
                                onClick={gridController.paste}
                                leftIcon={<ClipboardPaste className="w-3 h-3" />}
                              >
                                Paste
                              </Button>
                            </Tooltip>
                          )}
                        </>
                      )}

                      {/* Section 3: Lock, Unlock, Share */}
                      {selectionAnalysis.hasFilled &&
                        ((gridController.selection.lockableCount ?? 0) > 0 ||
                          (gridController.selection.unlockableCount ?? 0) > 0 ||
                          (gridController.selection.sharableCount ?? 0) > 0) && (
                          <>
                            <div className="w-px h-4 bg-border mx-0.5"></div>
                            {(gridController.selection.lockableCount ?? 0) > 0 &&
                              gridController.lock && (
                                <Tooltip content="Lock selected tube(s)" side="bottom">
                                  <Button
                                    variant="ghost"
                                    size="xs"
                                    onClick={gridController.lock}
                                    leftIcon={<Lock className="w-3 h-3" />}
                                  >
                                    Lock
                                  </Button>
                                </Tooltip>
                              )}
                            {(gridController.selection.unlockableCount ?? 0) > 0 &&
                              gridController.unlock && (
                                <Tooltip content="Unlock selected tube(s)" side="bottom">
                                  <Button
                                    variant="ghost"
                                    size="xs"
                                    onClick={gridController.unlock}
                                    disabled={gridController.selection.isUnlocking}
                                    leftIcon={<Unlock className="w-3 h-3" />}
                                  >
                                    {gridController.selection.isUnlocking
                                      ? 'Unlocking...'
                                      : 'Unlock'}
                                  </Button>
                                </Tooltip>
                              )}
                            {(gridController.selection.sharableCount ?? 0) > 0 &&
                              gridController.shareAccess && (
                                <Tooltip content="Share access to locked tube(s)" side="bottom">
                                  <Button
                                    variant="ghost"
                                    size="xs"
                                    onClick={gridController.shareAccess}
                                    leftIcon={<Share2 className="w-3 h-3" />}
                                  >
                                    Share
                                  </Button>
                                </Tooltip>
                              )}
                          </>
                        )}

                      {/* Section 4: Remove */}
                      {selectionAnalysis.hasFilled && (
                        <>
                          <div className="w-px h-4 bg-border mx-0.5"></div>
                          <Tooltip content="Remove selected tube(s)" side="bottom">
                            <Button
                              variant="ghost-danger"
                              size="xs"
                              onClick={gridController.delete}
                              leftIcon={<Trash2 className="w-3 h-3" />}
                            >
                              Remove
                            </Button>
                          </Tooltip>
                        </>
                      )}
                    </>
                  )}

                  {/* Section 5: Clear (always last, visible even in view-only mode) */}
                  {!isViewOnlySpace && <div className="w-px h-4 bg-border mx-0.5"></div>}
                  <Tooltip content="Clear selection" side="bottom">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={onClearSelection}
                      leftIcon={<X className="w-3 h-3" />}
                    >
                      Clear
                    </Button>
                  </Tooltip>
                </>
              )}
            </div>
          )}

          {/* Online Users Badges */}
          <OnlineUsersBadges />

          {/* Search Container */}
          <div className="flex-shrink-0">
            <SearchContainer />
          </div>

          {/* Hamburger Menu */}
          <div className="relative" ref={hamburgerMenuRef}>
            <Button
              ref={hamburgerButtonRef}
              variant="ghost"
              size="xs"
              iconOnly
              onClick={() => setShowHamburgerMenu(!showHamburgerMenu)}
              aria-haspopup="menu"
              aria-expanded={showHamburgerMenu}
              aria-label="Main menu"
            >
              <Menu size={20} />
            </Button>

            {/* Hamburger Menu Dropdown - WAI-ARIA Menu Button pattern */}
            {showHamburgerMenu && (
              <div
                role="menu"
                aria-label="Main menu"
                tabIndex={-1}
                onKeyDown={handleMenuKeyDown}
                onBlur={handleMenuBlur}
                className="absolute top-10 right-0 bg-popover rounded-lg shadow-lg border border-border py-1.5 z-50 min-w-48 p-1"
              >
                {/* Lab Name */}
                <div className="px-3 py-2">
                  <div className="flex items-center gap-3">
                    <FlaskConical size={16} className="text-muted-foreground" />
                    <span className="text-sm text-secondary-foreground font-medium">
                      {currentLab?.name ?? 'Loading...'}
                    </span>
                  </div>
                </div>

                {/* User Info */}
                {isAuthenticated && user && (
                  <div className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      <UserRound size={16} className="text-muted-foreground" />
                      <span className="text-sm text-secondary-foreground font-medium">
                        {user.username}
                      </span>
                    </div>
                  </div>
                )}

                <div className="h-px bg-secondary my-1" />

                {/* User Settings */}
                <div className="px-1">
                  <button
                    {...userSettingsTriggerProps}
                    role="menuitem"
                    onClick={() => {
                      setShowUserSettings(true);
                      setShowHamburgerMenu(false);
                    }}
                    className="w-full flex items-center gap-3 py-2 px-3 rounded-md text-sm text-secondary-foreground hover:bg-accent transition-colors focus-ring-default"
                  >
                    <Settings size={16} className="text-muted-foreground" />
                    <span>{user?.role === 'admin' ? 'User Settings' : 'Settings'}</span>
                  </button>

                  {/* Storage Manager */}
                  <button
                    {...storageManagerTriggerProps}
                    role="menuitem"
                    onClick={() => {
                      setShowStorageManager(true);
                      setShowHamburgerMenu(false);
                    }}
                    className="w-full flex items-center gap-3 py-2 px-3 rounded-md text-sm text-secondary-foreground hover:bg-accent transition-colors focus-ring-default"
                  >
                    <TankIcon size={16} className="text-muted-foreground" />
                    <span>Storage Manager</span>
                  </button>

                  {/* Admin Settings - Only show to admins */}
                  {user?.role === 'admin' && (
                    <button
                      {...adminSettingsTriggerProps}
                      role="menuitem"
                      onClick={() => {
                        setShowAdminPanel(true);
                        setShowHamburgerMenu(false);
                      }}
                      className="w-full flex items-center gap-3 py-2 px-3 rounded-md text-sm text-secondary-foreground hover:bg-red-50 hover:text-red-600 transition-colors focus-ring-default"
                    >
                      <ShieldUser size={16} className="text-muted-foreground" />
                      <span>Admin Settings</span>
                    </button>
                  )}
                </div>

                <div className="h-px bg-secondary my-1" />

                {/* Logout */}
                <div className="px-1">
                  <button
                    role="menuitem"
                    onClick={() => {
                      handleLogout();
                      setShowHamburgerMenu(false);
                    }}
                    className="w-full flex items-center gap-3 py-2 px-3 rounded-md text-sm text-secondary-foreground hover:bg-accent transition-colors focus-ring-default"
                  >
                    <LogOut size={16} className="text-muted-foreground" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Storage Manager Modal */}
      <SuspenseBoundary fallback={<ModalSkeleton size="lg" />} name="StorageManagerModal">
        <StorageManagerModal
          isOpen={showStorageManager}
          onClose={() => setShowStorageManager(false)}
        />
      </SuspenseBoundary>

      {/* Admin Settings Modal */}
      <SuspenseBoundary fallback={<ModalSkeleton size="lg" />} name="AdminSettingsModal">
        <AdminSettingsModal isOpen={showAdminPanel} onClose={() => setShowAdminPanel(false)} />
      </SuspenseBoundary>

      {/* User Settings Modal */}
      <SuspenseBoundary fallback={<ModalSkeleton size="lg" />} name="UserSettingsModal">
        <UserSettingsModal isOpen={showUserSettings} onClose={() => setShowUserSettings(false)} />
      </SuspenseBoundary>
    </header>
  );
}
