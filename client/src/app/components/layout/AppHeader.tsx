import { useState, lazy, useEffect, useRef } from 'react';

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
} from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { SearchContainer } from '@domains/search/ui/components/SearchContainer';
import odysseusLogo from '@shared/assets/odysseus-logo.svg';
import { parsePositionKey, type PositionKey } from '@shared/types/grid';
import { SuspenseBoundary } from '@shared/ui';
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

const StorageManagementModal = lazy(() =>
  import('@domains/storage/ui/components/modals/StorageManagementModal').then(m => ({
    default: m.StorageManagementModal,
  }))
);

const UserSettingsModal = lazy(() =>
  import('@domains/authentication/ui/components/UserSettingsModal').then(m => ({
    default: m.UserSettingsModal,
  }))
);

// Create preload hooks for anticipatory loading
const useLazyAdminSettings = PreloadHelpers.createHook(() => import('@domains/admin'));

const useLazyStorageManagement = PreloadHelpers.createHook(
  () => import('@domains/storage/ui/components/modals/StorageManagementModal')
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

  // Lazy loading hooks for modal preloading
  const { triggerProps: adminSettingsTriggerProps } = useLazyAdminSettings();
  const { triggerProps: storageManagementTriggerProps } = useLazyStorageManagement();
  const { triggerProps: userSettingsTriggerProps } = useLazyUserSettings();

  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showStorageManagement, setShowStorageManagement] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);

  // Ref for hamburger menu to detect outside clicks
  const hamburgerMenuRef = useRef<HTMLDivElement>(null);

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
    <header className="bg-white px-4 h-full flex items-center">
      <div className="flex justify-between items-center w-full">
        {/* Far Left: Logo */}
        <div className="flex items-center">
          <img src={odysseusLogo} alt="Odysseus" className="h-8 w-auto" />
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
                    <span className="text-slate-400 text-xs mr-2">
                      [{selectedPositions.size} selected]
                    </span>
                  )}

                  {/* Action buttons - hidden in view-only mode (banner shows on grid instead) */}
                  {!isViewOnlySpace && (
                    <>
                      {/* Section 1: Add/Edit */}
                      <button
                        onClick={gridController.openModal}
                        className="btn-header-ghost"
                        title={
                          gridController.selection.isMixed
                            ? 'Add tubes to mixed selection (overwrite prompt will appear)'
                            : gridController.selection.hasFilledSelection
                              ? 'Edit selected tube(s)'
                              : 'Add new tube(s) to selected position(s)'
                        }
                      >
                        {gridController.selection.hasFilledSelection &&
                        !gridController.selection.isMixed ? (
                          <Edit className="w-3 h-3 mr-1" />
                        ) : (
                          <Plus className="w-3 h-3 mr-1" />
                        )}
                        {gridController.selection.hasFilledSelection &&
                        !gridController.selection.isMixed
                          ? 'Edit'
                          : 'Add'}
                      </button>

                      {/* Section 2: Copy, Cut, Paste */}
                      {(selectionAnalysis.hasFilled || gridController?.canPaste) && (
                        <>
                          {selectionAnalysis.hasFilled && (
                            <>
                              <button
                                onClick={gridController.copy}
                                className="btn-header-ghost"
                                title="Copy selected tube(s)"
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                Copy
                              </button>
                              <button
                                onClick={gridController.cut}
                                className="btn-header-ghost"
                                title="Cut selected tube(s)"
                              >
                                <Scissors className="w-3 h-3 mr-1" />
                                Cut
                              </button>
                            </>
                          )}
                          {gridController?.canPaste && selectionAnalysis.hasSelection && (
                            <button
                              onClick={gridController.paste}
                              className="btn-header-ghost"
                              title="Paste tube(s)"
                            >
                              <ClipboardPaste className="w-3 h-3 mr-1" />
                              Paste
                            </button>
                          )}
                        </>
                      )}

                      {/* Section 3: Delete */}
                      {selectionAnalysis.hasFilled && (
                        <>
                          <div className="w-px h-4 bg-slate-300 mx-0.5"></div>
                          <button
                            onClick={gridController.delete}
                            className="btn-header-ghost-danger"
                            title="Delete selected tube(s)"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </button>
                        </>
                      )}

                      {/* Section 4: Lock, Unlock, Share */}
                      {selectionAnalysis.hasFilled &&
                        ((gridController.selection.lockableCount ?? 0) > 0 ||
                          (gridController.selection.unlockableCount ?? 0) > 0 ||
                          (gridController.selection.sharableCount ?? 0) > 0) && (
                          <>
                            <div className="w-px h-4 bg-slate-300 mx-0.5"></div>
                            {(gridController.selection.lockableCount ?? 0) > 0 &&
                              gridController.lock && (
                                <button
                                  onClick={gridController.lock}
                                  className="btn-header-ghost"
                                  title="Lock selected tube(s)"
                                >
                                  <Lock className="w-3 h-3 mr-1" />
                                  Lock
                                </button>
                              )}
                            {(gridController.selection.unlockableCount ?? 0) > 0 &&
                              gridController.unlock && (
                                <button
                                  onClick={gridController.unlock}
                                  disabled={gridController.selection.isUnlocking}
                                  className="btn-header-ghost disabled:opacity-50"
                                  title="Unlock selected tube(s)"
                                >
                                  <Unlock className="w-3 h-3 mr-1" />
                                  {gridController.selection.isUnlocking ? 'Unlocking...' : 'Unlock'}
                                </button>
                              )}
                            {(gridController.selection.sharableCount ?? 0) > 0 &&
                              gridController.shareAccess && (
                                <button
                                  onClick={gridController.shareAccess}
                                  className="btn-header-ghost"
                                  title="Share access to locked tube(s)"
                                >
                                  <Share2 className="w-3 h-3 mr-1" />
                                  Share
                                </button>
                              )}
                          </>
                        )}
                    </>
                  )}

                  {/* Section 5: Clear (always last, visible even in view-only mode) */}
                  {!isViewOnlySpace && <div className="w-px h-4 bg-slate-300 mx-0.5"></div>}
                  <button
                    onClick={onClearSelection}
                    className="btn-header-ghost"
                    title="Clear selection"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Clear
                  </button>
                </>
              )}
            </div>
          )}

          {/* Search Container */}
          <div className="flex-shrink-0">
            <SearchContainer />
          </div>

          {/* Hamburger Menu */}
          <div className="relative" ref={hamburgerMenuRef}>
            <button
              onClick={() => setShowHamburgerMenu(!showHamburgerMenu)}
              className="btn-header-ghost p-1.5"
            >
              <Menu size={20} />
            </button>

            {/* Hamburger Menu Dropdown - Windows 11 style like context menu */}
            {showHamburgerMenu && (
              <div className="absolute top-10 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1.5 z-50 min-w-48">
                {/* User Info at Top */}
                {isAuthenticated && user && (
                  <div className="px-3 py-2 mb-1">
                    <div className="flex items-center gap-3">
                      <UserRound size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-700 font-medium">{user.username}</span>
                    </div>
                  </div>
                )}

                <div className="h-px bg-gray-200 my-1" />

                {/* User Settings */}
                <div className="px-1">
                  <button
                    {...userSettingsTriggerProps}
                    onClick={() => {
                      setShowUserSettings(true);
                      setShowHamburgerMenu(false);
                    }}
                    className="w-full flex items-center gap-3 py-2 px-3 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Settings size={16} className="text-gray-400" />
                    <span>{user?.role === 'admin' ? 'User Settings' : 'Settings'}</span>
                  </button>

                  {/* Storage Management */}
                  <button
                    {...storageManagementTriggerProps}
                    onClick={() => {
                      setShowStorageManagement(true);
                      setShowHamburgerMenu(false);
                    }}
                    className="w-full flex items-center gap-3 py-2 px-3 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <TankIcon size={16} className="text-gray-400" />
                    <span>Manage Storage</span>
                  </button>

                  {/* Admin Settings - Only show to admins */}
                  {user?.role === 'admin' && (
                    <button
                      {...adminSettingsTriggerProps}
                      onClick={() => {
                        setShowAdminPanel(true);
                        setShowHamburgerMenu(false);
                      }}
                      className="w-full flex items-center gap-3 py-2 px-3 rounded-md text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <ShieldUser size={16} className="text-gray-400" />
                      <span>Admin Settings</span>
                    </button>
                  )}
                </div>

                <div className="h-px bg-gray-200 my-1" />

                {/* Logout */}
                <div className="px-1">
                  <button
                    onClick={() => {
                      handleLogout();
                      setShowHamburgerMenu(false);
                    }}
                    className="w-full flex items-center gap-3 py-2 px-3 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <LogOut size={16} className="text-gray-400" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Storage Management Modal */}
      {showStorageManagement && (
        <SuspenseBoundary fallback={<ModalSkeleton size="lg" />} name="StorageManagementModal">
          <StorageManagementModal
            isOpen={showStorageManagement}
            onClose={() => setShowStorageManagement(false)}
          />
        </SuspenseBoundary>
      )}

      {/* Admin Settings Modal */}
      {showAdminPanel && (
        <SuspenseBoundary fallback={<ModalSkeleton size="lg" />} name="AdminSettingsModal">
          <AdminSettingsModal isOpen={showAdminPanel} onClose={() => setShowAdminPanel(false)} />
        </SuspenseBoundary>
      )}

      {/* User Settings Modal */}
      {showUserSettings && (
        <SuspenseBoundary fallback={<ModalSkeleton size="lg" />} name="UserSettingsModal">
          <UserSettingsModal isOpen={showUserSettings} onClose={() => setShowUserSettings(false)} />
        </SuspenseBoundary>
      )}
    </header>
  );
}
