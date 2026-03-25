/**
 * App Header
 *
 * Top navigation bar with contextual tube action toolbar, search, and hamburger menu.
 */

import { useState, lazy, useEffect, useRef, useCallback } from 'react';

import { isAdminRole } from '@odysseus/shared-schemas';
import {
  LogOut,
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
  CircleHelp,
  BookUser,
} from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { useDonorRegistryStore } from '@domains/donors/stores/donorRegistryStore';
import { SearchPanel } from '@domains/search/ui/components/SearchPanel';
import { useStorageData } from '@domains/storage';
import { useGridSelectionAnalysis } from '@domains/tubes/ui/components/grid/useGridSelectionAnalysis';
import { useUserProfile } from '@domains/users/hooks/useUserProfile';
import OdysseusLogo from '@shared/assets/odysseus-logo-thick.svg?react';
import { Button, SuspenseBoundary, Tooltip } from '@shared/ui';
import { OnlineUsersBadgeList } from '@shared/ui/components/badges';
import { UserBadge } from '@shared/ui/components/badges/UserBadge';
import { TankIcon } from '@shared/ui/components/icons/TankIcon';
import { ModalSkeleton } from '@shared/ui/components/loading/ModalSkeleton';
import { createPreloadHook } from '@shared/utils/preloadHelpers';
import { getUserDisplayName, getUserInitials } from '@shared/utils/userDisplayFormatters';

import type { TubeData } from '@domains/tubes/types';
import type { PositionKey } from '@domains/tubes/types/gridSelectionTypes';
import type { LucideIcon } from 'lucide-react';

// Lazy load modals for code splitting
const AdminSettingsModal = lazy(() =>
  import('@domains/admin').then(m => ({
    default: m.AdminSettingsModal,
  }))
);

const StorageManagerModal = lazy(() =>
  import('@domains/storage/ui/components/storage-manager/StorageManagerModal').then(m => ({
    default: m.StorageManagerModal,
  }))
);

const UserSettingsModal = lazy(() =>
  import('@domains/users/ui/components/settings-modal/UserSettingsModal').then(m => ({
    default: m.UserSettingsModal,
  }))
);

const HelpModal = lazy(() =>
  import('@domains/help').then(m => ({
    default: m.HelpModal,
  }))
);

const DonorRegistryModal = lazy(() =>
  import('@domains/donors/ui/components/DonorRegistryModal').then(m => ({
    default: m.DonorRegistryModal,
  }))
);

const useLazyAdminSettings = createPreloadHook(() => import('@domains/admin'));

const useLazyStorageManager = createPreloadHook(
  () => import('@domains/storage/ui/components/storage-manager/StorageManagerModal')
);

const useLazyUserSettings = createPreloadHook(
  () => import('@domains/users/ui/components/settings-modal/UserSettingsModal')
);

const useLazyHelp = createPreloadHook(() => import('@domains/help'));

const useLazyDonorRegistry = createPreloadHook(
  () => import('@domains/donors/ui/components/DonorRegistryModal')
);

type IconComponent = LucideIcon | React.ComponentType<{ size?: number; className?: string }>;

interface HamburgerMenuItemProps {
  icon: IconComponent;
  label: string;
  onClick: () => void;
  triggerProps?: Record<string, unknown>;
}

function HamburgerMenuItem({ icon: Icon, label, onClick, triggerProps }: HamburgerMenuItemProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 350);
  }, []);

  return (
    <button
      {...triggerProps}
      role="menuitem"
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      className="w-full flex items-center gap-3 py-2 px-3 rounded-md text-sm text-secondary-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
    >
      <span className={isAnimating ? 'animate-icon-pop' : ''}>
        <Icon size={16} className="text-muted-foreground" />
      </span>
      <span>{label}</span>
    </button>
  );
}

interface HeaderProps {
  selectedPositions?: Set<PositionKey>;
  onClearSelection?: () => void;
  tubes?: TubeData[];
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
      lockableCount?: number;
      unlockableCount?: number;
      sharableCount?: number;
      isUnlocking?: boolean;
    };
    lock?: () => void;
    unlock?: () => Promise<void>;
    shareAccess?: () => void;
  };
  isViewOnlySpace?: boolean;
}

export function AppHeader({
  selectedPositions = new Set(),
  onClearSelection,
  tubes = [],
  gridController,
  isViewOnlySpace = false,
}: HeaderProps) {
  const { user, logout } = useAuthStore();
  const { profile } = useUserProfile();
  const hasLab = !!user?.labId;
  const { currentLab } = useStorageData({ enabled: hasLab });

  const displayName = user
    ? getUserDisplayName(user.username, profile?.firstName, profile?.lastName)
    : '';
  const initials = user
    ? getUserInitials(user.username, profile?.firstName, profile?.lastName)
    : '';

  const { triggerProps: adminSettingsTriggerProps } = useLazyAdminSettings();
  const { triggerProps: storageManagerTriggerProps } = useLazyStorageManager();
  const { triggerProps: userSettingsTriggerProps } = useLazyUserSettings();
  const { triggerProps: helpTriggerProps } = useLazyHelp();
  const { triggerProps: donorRegistryTriggerProps } = useLazyDonorRegistry();
  const donorRegistry = useDonorRegistryStore();
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showStorageManager, setShowStorageManager] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [isClosingMenu, setIsClosingMenu] = useState(false);

  const hamburgerMenuRef = useRef<HTMLDivElement>(null);
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);
  const menuCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animated close for hamburger menu
  const closeMenu = useCallback(() => {
    if (isClosingMenu || !showHamburgerMenu) return;
    setIsClosingMenu(true);
    menuCloseTimeoutRef.current = setTimeout(() => {
      setShowHamburgerMenu(false);
      setIsClosingMenu(false);
    }, 200); // Match animation duration
  }, [isClosingMenu, showHamburgerMenu]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (menuCloseTimeoutRef.current) {
        clearTimeout(menuCloseTimeoutRef.current);
      }
    };
  }, []);

  // Close hamburger menu when clicking outside
  useEffect(() => {
    if (!showHamburgerMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (hamburgerMenuRef.current && !hamburgerMenuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showHamburgerMenu, closeMenu]);

  // Keyboard navigation for hamburger menu (WAI-ARIA Menu Button pattern)
  const handleMenuKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu();
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
    },
    [closeMenu]
  );

  // Close menu when focus leaves the dropdown
  const handleMenuBlur = useCallback(
    (e: React.FocusEvent) => {
      // relatedTarget is the element receiving focus
      // Only close if focus is moving outside the menu container
      if (!hamburgerMenuRef.current?.contains(e.relatedTarget as Node)) {
        closeMenu();
      }
    },
    [closeMenu]
  );

  const handleLogout = () => {
    // Socket cleanup is now handled centrally by AppBootstrapService
    void logout();
  };

  const selectionAnalysis = useGridSelectionAnalysis(selectedPositions, tubes);

  return (
    <header className="bg-background px-4 h-full flex items-center">
      <div className="flex justify-between items-center w-full">
        {/* Far Left: Logo */}
        <div className="flex items-center">
          <OdysseusLogo
            className="h-11 w-auto text-secondary-foreground [[data-theme=dark]_&]:text-muted-foreground"
            aria-label="Odysseus"
          />
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
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-secondary-foreground bg-muted px-2 rounded-md h-6 mr-2">
                      <TestTube className="w-3 h-3" />
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
          <OnlineUsersBadgeList />

          {/* Search Container */}
          {hasLab && (
            <div className="flex-shrink-0">
              <SearchPanel />
            </div>
          )}

          {/* User Menu */}
          <div className="relative" ref={hamburgerMenuRef}>
            <button
              ref={hamburgerButtonRef}
              type="button"
              onClick={() => (showHamburgerMenu ? closeMenu() : setShowHamburgerMenu(true))}
              aria-haspopup="menu"
              aria-expanded={showHamburgerMenu}
              aria-label="Main menu"
              className="flex items-center gap-2 h-8 px-2 rounded-lg border border-border hover:bg-accent transition-colors"
            >
              <UserBadge
                type="currentUser"
                initials={initials}
                username={user?.username}
                size="xs"
              />
              <span className="text-xs font-medium text-card-foreground max-w-[150px] truncate">
                {displayName}
              </span>
            </button>

            {/* Hamburger Menu Dropdown - WAI-ARIA Menu Button pattern */}
            {(showHamburgerMenu || isClosingMenu) && (
              <div
                role="menu"
                aria-label="Main menu"
                tabIndex={-1}
                onKeyDown={handleMenuKeyDown}
                onBlur={handleMenuBlur}
                className={`absolute top-10 right-0 bg-popover rounded-lg shadow-lg border border-border py-1.5 z-50 min-w-48 p-1 ${
                  isClosingMenu ? 'animate-dropdown-reveal-out' : 'animate-dropdown-reveal-in'
                }`}
              >
                {/* Lab Name */}
                {currentLab && (
                  <div className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      <FlaskConical size={16} className="text-muted-foreground" />
                      <span className="text-sm text-secondary-foreground font-medium">
                        {currentLab.name}
                      </span>
                    </div>
                  </div>
                )}

                <div className="h-px bg-border my-1" />

                <div className="px-1">
                  {/* Help */}
                  <HamburgerMenuItem
                    icon={CircleHelp}
                    label="Help"
                    onClick={() => {
                      setShowHelp(true);
                      closeMenu();
                    }}
                    triggerProps={helpTriggerProps}
                  />

                  {/* User Settings */}
                  <HamburgerMenuItem
                    icon={Settings}
                    label={isAdminRole(user?.role) ? 'User Settings' : 'Settings'}
                    onClick={() => {
                      setShowUserSettings(true);
                      closeMenu();
                    }}
                    triggerProps={userSettingsTriggerProps}
                  />

                  {/* Storage Manager - requires lab context */}
                  {hasLab && (
                    <HamburgerMenuItem
                      icon={TankIcon}
                      label="Storage Manager"
                      onClick={() => {
                        setShowStorageManager(true);
                        closeMenu();
                      }}
                      triggerProps={storageManagerTriggerProps}
                    />
                  )}

                  {/* Donor Registry - requires lab context */}
                  {hasLab && (
                    <HamburgerMenuItem
                      icon={BookUser}
                      label="Donor Registry"
                      onClick={() => {
                        donorRegistry.open();
                        closeMenu();
                      }}
                      triggerProps={donorRegistryTriggerProps}
                    />
                  )}

                  {/* Admin Settings - Only show to lab_admin and system_admin */}
                  {isAdminRole(user?.role) && (
                    <HamburgerMenuItem
                      icon={ShieldUser}
                      label="Admin Settings"
                      onClick={() => {
                        setShowAdminPanel(true);
                        closeMenu();
                      }}
                      triggerProps={adminSettingsTriggerProps}
                    />
                  )}
                </div>

                <div className="h-px bg-border my-1" />

                {/* Logout */}
                <div className="px-1">
                  <HamburgerMenuItem
                    icon={LogOut}
                    label="Logout"
                    onClick={() => {
                      handleLogout();
                      closeMenu();
                    }}
                  />
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

      {/* Help Modal */}
      <SuspenseBoundary fallback={<ModalSkeleton size="lg" />} name="HelpModal">
        <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
      </SuspenseBoundary>

      {/* Donor Registry Modal */}
      <SuspenseBoundary fallback={<ModalSkeleton size="xl" />} name="DonorRegistryModal">
        <DonorRegistryModal
          isOpen={donorRegistry.isOpen}
          onClose={donorRegistry.close}
          initialDonorId={donorRegistry.initialDonorId}
          initialIdType={donorRegistry.initialIdType}
        />
      </SuspenseBoundary>
    </header>
  );
}
