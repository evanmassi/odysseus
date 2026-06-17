/**
 * App Header
 *
 * Top navigation bar with contextual tube action toolbar, search, and hamburger menu.
 */

import { useState, lazy, useRef, useCallback } from 'react';

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
  TestTubeDiagonal,
  FlaskConical,
  Biohazard,
  Microscope,
  Package,
  CircleHelp,
  BookUser,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuthStore } from '@domains/authentication';
import { useDonorRegistryStore } from '@domains/donors/stores/donorRegistryStore';
import { SearchPanel } from '@domains/search/ui/components/SearchPanel';
import { useStorageData } from '@domains/storage';
import { useGridSelectionAnalysis } from '@domains/tubes/ui/components/grid/useGridSelectionAnalysis';
import { useUserProfile } from '@domains/users/hooks/useUserProfile';
import OdysseusLogo from '@shared/assets/odysseus-logo-thick.svg?react';
import {
  Button,
  Chip,
  DropdownMenu,
  MenuDivider,
  MenuItem,
  SuspenseBoundary,
  Tooltip,
} from '@shared/ui';
import { OnlineUsersBadgeList } from '@shared/ui/components/badges';
import { UserBadge } from '@shared/ui/components/badges/UserBadge';
import { TankIcon } from '@shared/ui/components/icons/TankIcon';
import { ModalSkeleton } from '@shared/ui/components/loading/ModalSkeleton';
import { createPreloadHook } from '@shared/utils/preloadHelpers';
import { getUserDisplayName, getUserInitials } from '@shared/utils/userDisplayFormatters';

import type { TubeData } from '@domains/tubes/types';
import type { PositionKey } from '@domains/tubes/types/gridSelectionTypes';
import type { LucideIcon } from 'lucide-react';

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

const ROLE_LABELS: Record<string, string> = {
  system_admin: 'System Admin',
  lab_admin: 'Lab Admin',
  user: 'User',
};

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
      className="group relative z-10 w-full flex items-center gap-3 py-2 px-3 font-mono text-[12px] tracking-[0.04em] text-secondary-foreground hover:bg-[repeating-linear-gradient(to_bottom,hsl(var(--scanline))_0,hsl(var(--scanline))_1px,transparent_1px,transparent_3px),linear-gradient(90deg,hsl(var(--primary)/0.12),hsl(var(--primary)/0.07)_55%,transparent_100%)] hover:shadow-[inset_2px_0_0_hsl(var(--primary)/0.55)] hover:text-foreground transition-colors"
    >
      <span className={isAnimating ? 'animate-icon-pop' : ''}>
        <Icon
          size={16}
          className="text-muted-foreground transition-colors group-hover:text-foreground"
        />
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
  const location = useLocation();
  const navigate = useNavigate();
  const isBiobankRoute = !location.pathname.startsWith('/lab');
  const [showSuiteDropdown, setShowSuiteDropdown] = useState(false);
  const [showLabSubmenu, setShowLabSubmenu] = useState(false);
  const suiteButtonRef = useRef<HTMLButtonElement>(null);
  const labSubmenuTriggerRef = useRef<HTMLDivElement>(null);
  const labSubmenuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);

  const closeMenu = () => setShowHamburgerMenu(false);

  const handleLogout = () => {
    // Socket cleanup is now handled centrally by AppBootstrapService
    void logout();
  };

  const selectionAnalysis = useGridSelectionAnalysis(selectedPositions, tubes);

  const routeCrumbs = isBiobankRoute
    ? ['biobank']
    : location.pathname.split('/').filter(Boolean).slice(0, 2);

  return (
    <header className="relative flex h-full items-stretch bg-background after:absolute after:inset-x-0 after:bottom-0 after:h-px after:content-[''] after:[background:linear-gradient(90deg,transparent_0%,hsl(var(--primary)/0.20)_10%,hsl(var(--primary)/0.20)_90%,transparent_100%)] after:[box-shadow:0_0_8px_hsl(var(--primary)/0.14),0_0_18px_hsl(var(--primary)/0.06)]">
      <div className="relative flex items-center px-4">
        <button
          ref={suiteButtonRef}
          type="button"
          onClick={() => hasLab && setShowSuiteDropdown(prev => !prev)}
          className="group flex items-center gap-2.5"
          aria-haspopup="menu"
          aria-expanded={showSuiteDropdown}
          aria-label="Switch management suite"
        >
          <OdysseusLogo
            className="h-7 w-auto text-secondary-foreground dark:drop-shadow-[0_0_4px_color-mix(in_srgb,currentColor_30%,transparent)] transition-[color,filter] duration-200 group-hover:text-foreground group-hover:drop-shadow-icon-bloom-hover [[data-theme=dark]_&]:text-muted-foreground"
            aria-label="Odysseus"
          />
          {hasLab && (
            <>
              {routeCrumbs.flatMap((crumb, i) => [
                <span
                  key={`sep-${i}`}
                  aria-hidden
                  className="font-mono text-[12px] text-foreground/40 transition-colors duration-200 group-hover:text-foreground/70"
                >
                  {'//'}
                </span>,
                <span
                  key={`crumb-${i}`}
                  className="font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-primary transition duration-200 group-hover:drop-shadow-icon-bloom-hover"
                >
                  {crumb}
                </span>,
              ])}
              <ChevronDown
                size={12}
                className="text-muted-foreground transition duration-200 group-hover:text-foreground group-hover:drop-shadow-icon-bloom-hover"
              />
            </>
          )}
        </button>

        <DropdownMenu
          isOpen={showSuiteDropdown}
          onClose={() => {
            setShowSuiteDropdown(false);
            setShowLabSubmenu(false);
          }}
          triggerRef={suiteButtonRef}
          align="start"
          motion="slide-down"
          aria-label="Switch management suite"
          className="top-full mt-1 min-w-[200px]"
        >
          <div>
            <MenuItem
              icon={TestTubeDiagonal}
              label="Biobank"
              onClick={() => {
                void navigate('/');
                setShowSuiteDropdown(false);
              }}
            />

            <div
              ref={labSubmenuTriggerRef}
              className="relative"
              onMouseEnter={() => {
                if (labSubmenuTimeoutRef.current) {
                  clearTimeout(labSubmenuTimeoutRef.current);
                  labSubmenuTimeoutRef.current = null;
                }
                setShowLabSubmenu(true);
              }}
              onMouseLeave={() => {
                labSubmenuTimeoutRef.current = setTimeout(() => setShowLabSubmenu(false), 150);
              }}
            >
              <MenuItem icon={FlaskConical} label="Lab Management">
                <ChevronRight size={14} className="text-muted-foreground ml-3" />
              </MenuItem>

              <DropdownMenu
                isOpen={showLabSubmenu}
                onClose={() => setShowLabSubmenu(false)}
                triggerRef={labSubmenuTriggerRef}
                align="start"
                motion="slide-right"
                aria-label="Lab management options"
                className="left-full top-0 ml-1 min-w-[160px]"
              >
                <div className="relative z-10">
                  <MenuItem
                    icon={Microscope}
                    label="Equipment"
                    onClick={() => {
                      void navigate('/lab/equipment');
                      setShowSuiteDropdown(false);
                      setShowLabSubmenu(false);
                    }}
                  />
                  <MenuItem
                    icon={Package}
                    label="Supplies"
                    onClick={() => {
                      void navigate('/lab/supplies');
                      setShowSuiteDropdown(false);
                      setShowLabSubmenu(false);
                    }}
                  />
                  <MenuItem icon={Biohazard} label="Reagents" disabled />
                </div>
              </DropdownMenu>
            </div>
          </div>
        </DropdownMenu>
      </div>

      <div className="flex flex-1 items-center justify-end gap-3 px-4">
        {selectionAnalysis.hasSelection && gridController && (
          <div className="flex items-center space-x-1">
            {gridController && (
              <>
                {selectedPositions.size > 1 && (
                  <Chip size="sm" color="default" leftIcon={<TestTubeDiagonal />} className="mr-2">
                    {selectedPositions.size} selected
                  </Chip>
                )}

                {/* View-only mode shows actions in a banner on the grid instead. */}
                {!isViewOnlySpace && (
                  <>
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
                                  {gridController.selection.isUnlocking ? 'Unlocking...' : 'Unlock'}
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

                {/* Clear stays visible even in view-only mode. */}
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

        <OnlineUsersBadgeList />

        {hasLab && isBiobankRoute && (
          <div className="flex-shrink-0">
            <SearchPanel />
          </div>
        )}
      </div>

      <div className="relative flex items-center border-l border-line-soft px-4">
        <button
          ref={hamburgerButtonRef}
          type="button"
          onClick={() => setShowHamburgerMenu(prev => !prev)}
          aria-haspopup="menu"
          aria-expanded={showHamburgerMenu}
          aria-label="Main menu"
          className="group flex items-center gap-3"
        >
          <div className="text-right leading-tight">
            <div className="max-w-[150px] truncate font-display text-[14px] font-medium tracking-[0.04em] text-foreground transition duration-200 group-hover:drop-shadow-icon-bloom-hover">
              {displayName}
            </div>
            {user?.role && (
              <div className="font-mono text-[9.5px] font-medium uppercase tracking-[0.20em] text-foreground/70 transition duration-200 group-hover:text-foreground group-hover:drop-shadow-icon-bloom-hover">
                {ROLE_LABELS[user.role] ?? user.role}
              </div>
            )}
          </div>
          <span className="inline-flex text-ownership-user-badge transition duration-200 group-hover:drop-shadow-icon-bloom-hover">
            <UserBadge type="currentUser" initials={initials} username={user?.username} size="md" />
          </span>
        </button>

        <DropdownMenu
          isOpen={showHamburgerMenu}
          onClose={closeMenu}
          triggerRef={hamburgerButtonRef}
          align="end"
          motion="slide-down"
          aria-label="Main menu"
          className="top-full mt-1 min-w-48"
        >
          {currentLab && (
            <>
              <div>
                <div className="relative z-10 flex items-center gap-3 px-3 py-2">
                  <FlaskConical size={16} className="text-primary/70" />
                  <span className="phosphor-text font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-foreground">
                    {currentLab.name}
                  </span>
                </div>
              </div>
              <MenuDivider subtle />
            </>
          )}

          <div>
            <HamburgerMenuItem
              icon={CircleHelp}
              label="Help"
              onClick={() => {
                setShowHelp(true);
                closeMenu();
              }}
              triggerProps={helpTriggerProps}
            />

            <HamburgerMenuItem
              icon={Settings}
              label={isAdminRole(user?.role) ? 'User Settings' : 'Settings'}
              onClick={() => {
                setShowUserSettings(true);
                closeMenu();
              }}
              triggerProps={userSettingsTriggerProps}
            />

            {hasLab && isBiobankRoute && (
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

            {hasLab && isBiobankRoute && (
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

          <MenuDivider subtle />

          <div>
            <HamburgerMenuItem
              icon={LogOut}
              label="Logout"
              onClick={() => {
                handleLogout();
                closeMenu();
              }}
            />
          </div>
        </DropdownMenu>
      </div>

      <SuspenseBoundary fallback={<ModalSkeleton size="lg" />} name="StorageManagerModal">
        <StorageManagerModal
          isOpen={showStorageManager}
          onClose={() => setShowStorageManager(false)}
        />
      </SuspenseBoundary>

      <SuspenseBoundary fallback={<ModalSkeleton size="lg" />} name="AdminSettingsModal">
        <AdminSettingsModal isOpen={showAdminPanel} onClose={() => setShowAdminPanel(false)} />
      </SuspenseBoundary>

      <SuspenseBoundary fallback={<ModalSkeleton size="lg" />} name="UserSettingsModal">
        <UserSettingsModal isOpen={showUserSettings} onClose={() => setShowUserSettings(false)} />
      </SuspenseBoundary>

      <SuspenseBoundary fallback={<ModalSkeleton size="lg" />} name="HelpModal">
        <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
      </SuspenseBoundary>

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
