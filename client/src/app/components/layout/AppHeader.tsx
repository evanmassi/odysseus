import { useState, lazy, useRef } from 'react';

import { isAdminRole, getPersonDisplayName, getPersonInitials } from '@odysseus/shared-schemas';
import {
  LogOut,
  Settings,
  ShieldUser,
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
import { useDonorRegistryStore } from '@domains/donors';
import { SearchPanel } from '@domains/search';
import { useStorageData } from '@domains/storage';
import { useUserProfile } from '@domains/users';
import OdysseusLogo from '@shared/assets/odysseus-logo-thick.svg?react';
import { useResolvedTheme } from '@shared/hooks';
import { Divider, DropdownMenu, LazyModalBoundary, MenuDivider, MenuItem } from '@shared/ui';
import { OnlineUsersBadgeList } from '@shared/ui/components/badges';
import { UserBadge } from '@shared/ui/components/badges/UserBadge';
import { TankIcon } from '@shared/ui/components/icons/TankIcon';

import { TubeSelectionToolbar, type GridController } from './TubeSelectionToolbar';

import type { PositionKey } from '@domains/tubes';
import type { TubeData } from '@odysseus/shared-schemas';

const AdminSettingsModal = lazy(() =>
  import('@domains/admin').then(m => ({ default: m.AdminSettingsModal }))
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
const HelpModal = lazy(() => import('@domains/help').then(m => ({ default: m.HelpModal })));
const DonorRegistryModal = lazy(() =>
  import('@domains/donors/ui/components/DonorRegistryModal').then(m => ({
    default: m.DonorRegistryModal,
  }))
);

const SUBMENU_CLOSE_DELAY_MS = 150;

const ROLE_LABELS: Record<string, string> = {
  system_admin: 'System Admin',
  lab_admin: 'Lab Admin',
  user: 'User',
};

interface AppHeaderProps {
  selectedPositions?: Set<PositionKey>;
  onClearSelection?: () => void;
  tubes?: TubeData[];
  gridController?: GridController;
  isViewOnlySpace?: boolean;
}

export function AppHeader({
  selectedPositions = new Set(),
  onClearSelection,
  tubes = [],
  gridController,
  isViewOnlySpace = false,
}: AppHeaderProps) {
  const isDark = useResolvedTheme() === 'dark';
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
    ? getPersonDisplayName({
        username: user.username,
        firstName: profile?.firstName,
        lastName: profile?.lastName,
      })
    : '';
  const initials = user
    ? getPersonInitials({
        username: user.username,
        firstName: profile?.firstName,
        lastName: profile?.lastName,
      })
    : '';

  const donorRegistry = useDonorRegistryStore();
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showStorageManager, setShowStorageManager] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);

  const closeMenu = () => setShowHamburgerMenu(false);

  const handleLogout = () => {
    void logout();
  };

  const routeCrumbs = isBiobankRoute
    ? ['biobank']
    : location.pathname.split('/').filter(Boolean).slice(0, 2);

  return (
    <header
      data-theme="dark"
      className="app-header-bar relative flex h-full items-stretch bg-background"
    >
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
            className="h-7 w-auto text-secondary-foreground drop-shadow-[0_0_4px_color-mix(in_srgb,currentColor_calc(30%_*_var(--lit)),transparent)] transition-[color,filter] duration-200 group-hover:text-foreground group-hover:drop-shadow-icon-bloom-hover [[data-theme=dark]_&]:text-muted-foreground"
            aria-label="Odysseus"
          />
          {hasLab && (
            <>
              {routeCrumbs.flatMap((crumb, i) => [
                <span
                  key={`sep-${i}`}
                  aria-hidden
                  className="font-mono text-data-sm text-foreground/40 transition-colors duration-200 group-hover:text-foreground/70"
                >
                  {'//'}
                </span>,
                <span
                  key={`crumb-${i}`}
                  className="type-label text-label-xs font-medium tracking-label-wide text-primary transition duration-200 group-hover:font-bold group-hover:brightness-125 group-hover:drop-shadow-icon-bloom-hover"
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
                labSubmenuTimeoutRef.current = setTimeout(
                  () => setShowLabSubmenu(false),
                  SUBMENU_CLOSE_DELAY_MS
                );
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
                  <MenuItem
                    icon={Biohazard}
                    label="Reagents"
                    onClick={() => {
                      void navigate('/lab/reagents');
                      setShowSuiteDropdown(false);
                      setShowLabSubmenu(false);
                    }}
                  />
                </div>
              </DropdownMenu>
            </div>
          </div>
        </DropdownMenu>
      </div>

      <div className="flex flex-1 items-center justify-end gap-3 px-4">
        <TubeSelectionToolbar
          selectedPositions={selectedPositions}
          tubes={tubes}
          gridController={gridController}
          isViewOnlySpace={isViewOnlySpace}
          onClearSelection={onClearSelection}
        />

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
            <div className="max-w-[150px] truncate font-display text-body-sm font-medium tracking-[0.04em] text-foreground transition duration-200 group-hover:font-semibold group-hover:drop-shadow-icon-bloom-hover">
              {displayName}
            </div>
            {user?.role && (
              <div className="type-label text-label-2xs font-medium tracking-label-wide text-foreground/70 transition duration-200 group-hover:text-foreground group-hover:drop-shadow-icon-bloom-hover">
                {ROLE_LABELS[user.role] ?? user.role}
              </div>
            )}
          </div>
          <span className="inline-flex text-ownership-user-badge transition duration-200 group-hover:scale-110 group-hover:brightness-110 group-hover:drop-shadow-icon-bloom-hover">
            <UserBadge
              type="currentUser"
              initials={initials}
              username={user?.username}
              size="md"
              showTooltip={false}
            />
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
                  <span
                    className={`type-label text-label-xs font-medium text-foreground ${isDark ? 'phosphor-text' : ''}`}
                  >
                    {currentLab.name}
                  </span>
                </div>
              </div>
              <MenuDivider subtle />
            </>
          )}

          <div>
            <MenuItem
              icon={CircleHelp}
              label="Help"
              onClick={() => {
                setShowHelp(true);
                closeMenu();
              }}
            />

            <MenuItem
              icon={Settings}
              label={isAdminRole(user?.role) ? 'User Settings' : 'Settings'}
              onClick={() => {
                setShowUserSettings(true);
                closeMenu();
              }}
            />

            {hasLab && isBiobankRoute && (
              <MenuItem
                icon={TankIcon}
                label="Storage Manager"
                onClick={() => {
                  setShowStorageManager(true);
                  closeMenu();
                }}
              />
            )}

            {hasLab && isBiobankRoute && (
              <MenuItem
                icon={BookUser}
                label="Donor Registry"
                onClick={() => {
                  donorRegistry.open();
                  closeMenu();
                }}
              />
            )}

            {isAdminRole(user?.role) && (
              <MenuItem
                icon={ShieldUser}
                label="Admin Settings"
                onClick={() => {
                  setShowAdminPanel(true);
                  closeMenu();
                }}
              />
            )}
          </div>

          <MenuDivider subtle />

          <div>
            <MenuItem
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

      <LazyModalBoundary name="StorageManagerModal">
        <StorageManagerModal
          isOpen={showStorageManager}
          onClose={() => setShowStorageManager(false)}
        />
      </LazyModalBoundary>

      <LazyModalBoundary name="AdminSettingsModal">
        <AdminSettingsModal isOpen={showAdminPanel} onClose={() => setShowAdminPanel(false)} />
      </LazyModalBoundary>

      <LazyModalBoundary name="UserSettingsModal">
        <UserSettingsModal isOpen={showUserSettings} onClose={() => setShowUserSettings(false)} />
      </LazyModalBoundary>

      <LazyModalBoundary name="HelpModal">
        <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
      </LazyModalBoundary>

      <LazyModalBoundary name="DonorRegistryModal" size="xl">
        <DonorRegistryModal
          isOpen={donorRegistry.isOpen}
          onClose={donorRegistry.close}
          initialDonorId={donorRegistry.initialDonorId}
          initialIdType={donorRegistry.initialIdType}
        />
      </LazyModalBoundary>
      <Divider tone="primary" className="absolute inset-x-0 bottom-0" />
    </header>
  );
}
