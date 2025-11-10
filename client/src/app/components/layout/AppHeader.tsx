import { useState, lazy } from 'react';

import { LogOut, UserRound, Menu, Plus, Edit, Trash2, Copy, Scissors, ClipboardPaste, X, Cog } from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { SearchContainer } from '@domains/search/ui/components/SearchContainer';
import odysseusLogo from '@shared/assets/frozen-odysseus-logo.png';
import xcellbioLogo from '@shared/assets/frozen-xcellbio-logo.png';
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
    default: m.AdminSettingsModal
  }))
);

const StorageManagementModal = lazy(() =>
  import('@domains/tubes/ui/components/modals/StorageManagementModal').then(m => ({
    default: m.StorageManagementModal
  }))
);

const UserSettingsModal = lazy(() =>
  import('@domains/authentication/ui/components/UserSettingsModal').then(m => ({
    default: m.UserSettingsModal
  }))
);

// Create preload hooks for anticipatory loading
const useLazyAdminSettings = PreloadHelpers.createHook(
  () => import('@domains/admin')
);

const useLazyStorageManagement = PreloadHelpers.createHook(
  () => import('@domains/tubes/ui/components/modals/StorageManagementModal')
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
    getCopyLabel: () => string;
    getCutLabel: () => string;
    getPasteLabel: () => string;
    selection: {
      hasFilledSelection: boolean;
      isMixed: boolean;
      filledCount: number;
      emptyCount: number;
    };
  };
}

export function AppHeader({
selectedPositions = new Set(),
_onEditTube,
onClearSelection,
tubes = [],
  gridController
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

  const handleLogout = () => {
    // Socket cleanup is now handled centrally by AppBootstrapService
    void logout();
  };

  // Selection analysis for contextual controls
  const selectionAnalysis = (() => {
    if (!selectedPositions || selectedPositions.size === 0 || !tubes) {
      return { hasSelection: false, selectedTubes: [], emptyPositions: new Set(), filledPositions: new Set(), hasEmpty: false, hasFilled: false, isMixed: false };
    }

    const selectedTubes = Array.from(selectedPositions || [])
      .map(key => {
        const { tankId, rackId, boxId, position } = parsePositionKey(key);
        return tubes.find(t =>
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
        return !tubes.find(t =>
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
    <header className="bg-gradient-to-r from-frost to-ice-400 border-b border-ice-400/20 px-4 py-0.5">
      <div className="flex justify-between items-center">
        {/* Far Left: Logos */}
        <div className="flex items-center space-x-4">
          <img
            src={xcellbioLogo}
            alt="XcellBio"
            className="h-8 w-auto opacity-90 drop-shadow-md drop-shadow-[0_0_4px_rgba(255,255,255,0.25)]"
          />
          <img
            src={odysseusLogo}
            alt="Odysseus"
            className="h-8 w-auto opacity-90 scale-x-[1.4] mt-1 drop-shadow-md drop-shadow-[0_0_4px_rgba(255,255,255,0.25)]"
          />
        </div>

        {/* Right Side: Controls + Search + Hamburger */}
        <div className="flex items-center gap-3">
          {/* Compact Single-Row Control Buttons */}
          {selectionAnalysis.hasSelection && gridController && (
            <div className="flex items-center space-x-2">
              {/* Unified Modal Button - Context-aware label, single action (Minty Frost) */}
              <button
                onClick={gridController.openModal}
                className="btn-header-control-compact-edit"
                title={
                  gridController.selection.isMixed
                    ? 'Add tubes to mixed selection (overwrite prompt will appear)'
                    : gridController.selection.hasFilledSelection
                    ? 'Edit selected tube(s)'
                    : 'Add new tube(s) to selected position(s)'
                }
              >
                {gridController.selection.hasFilledSelection && !gridController.selection.isMixed ? (
                  <Edit className="w-3 h-3 mr-1" />
                ) : (
                  <Plus className="w-3 h-3 mr-1" />
                )}
                {gridController.selection.isMixed
                  ? (gridController.selection.emptyCount + gridController.selection.filledCount === 1
                      ? 'Add Tube'
                      : `Add ${gridController.selection.emptyCount + gridController.selection.filledCount} Tubes`)
                  : gridController.selection.hasFilledSelection
                  ? (gridController.selection.filledCount === 1
                      ? 'Edit Tube'
                      : `Edit ${gridController.selection.filledCount} Tubes`)
                  : (gridController.selection.emptyCount === 1
                      ? 'Add Tube'
                      : `Add ${gridController.selection.emptyCount} Tubes`)}
              </button>

              {/* Delete Tube(s) - Only for filled positions */}
              {selectionAnalysis.hasFilled && gridController && (
                <button
                  onClick={gridController.delete}
                  className="btn-header-control-compact-danger"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete {selectionAnalysis.selectedTubes.length === 1 ? 'Tube' : `${selectionAnalysis.selectedTubes.length} Tubes`}
                </button>
              )}

              {/* Separator */}
              {selectionAnalysis.hasFilled && <div className="w-0.5 h-4 bg-white/60 mx-1"></div>}

              {/* Copy/Cut - Only for filled positions */}
              {selectionAnalysis.hasFilled && gridController && (
                <>
                  <button
                  onClick={gridController.copy}
                  className="btn-header-control-compact-copy"
                  >
                  <Copy className="w-3 h-3 mr-1" />
                  {gridController.getCopyLabel()}
                  </button>
                  <button
                  onClick={gridController.cut}
                  className="btn-header-control-compact-cut"
                  >
                  <Scissors className="w-3 h-3 mr-1" />
                  {gridController.getCutLabel()}
                  </button>
                </>
              )}

              {/* Paste - Show when clipboard has data and user has selection (Icy Blue) */}
              {gridController?.canPaste && selectionAnalysis.hasSelection && (
                <button
                onClick={gridController.paste}
                className="btn-header-control-compact-copy"
                >
                <ClipboardPaste className="w-3 h-3 mr-1" />
                {gridController.getPasteLabel()}
                </button>
              )}

              {/* Clear Selection */}
              <button
                onClick={onClearSelection}
                className="btn-header-control-compact-secondary"
              >
                <X className="w-3 h-3 mr-1" />
                Clear
              </button>
            </div>
          )}

          {/* Search Container */}
          <div className="flex-shrink-0">
            <SearchContainer />
          </div>

          {/* Hamburger Menu */}
          <div className="relative">
          <button
            onClick={() => setShowHamburgerMenu(!showHamburgerMenu)}
            className="btn-header-menu text-white"
          >
            <Menu size={20} />
          </button>

          {/* Hamburger Menu Dropdown */}
          {showHamburgerMenu && (
            <div className="absolute top-10 right-0 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 w-auto whitespace-nowrap">
              {/* User Info at Top */}
              {isAuthenticated && user && (
                <>
                  <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100">
                    <div className="flex items-center space-x-2 text-sm">
                      <UserRound size={20} className="text-action-hover" />
                      <span className="text-action-hover font-semibold">{user.username}</span>
                    </div>
                  </div>
                </>
              )}

              {/* User Settings */}
              <button
                {...userSettingsTriggerProps}
                onClick={() => {
                  setShowUserSettings(true);
                  setShowHamburgerMenu(false);
                }}
                className="menu-item"
              >
                <Cog size={20} />
                <span>{user?.role === 'admin' ? 'User Settings' : 'Settings'}</span>
              </button>

              {/* Storage Management */}
              <button
                {...storageManagementTriggerProps}
                onClick={() => {
                  setShowStorageManagement(true);
                  setShowHamburgerMenu(false);
                }}
                className="menu-item"
              >
                <TankIcon size={20} />
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
                  className="menu-item text-danger-hover"
                >
                  <Cog size={20} />
                  <span>Admin Settings</span>
                </button>
              )}

              <hr className="my-0.5" />
              <div className="bg-gray-50">
                <button
                  onClick={() => {
                    handleLogout();
                    setShowHamburgerMenu(false);
                  }}
                  className="menu-item"
                >
                  <LogOut size={20} />
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
        <SuspenseBoundary
          fallback={<ModalSkeleton size="lg" />}
          name="StorageManagementModal"
        >
          <StorageManagementModal
            isOpen={showStorageManagement}
            onClose={() => setShowStorageManagement(false)}
          />
        </SuspenseBoundary>
      )}

      {/* Admin Settings Modal */}
      {showAdminPanel && (
        <SuspenseBoundary
          fallback={<ModalSkeleton size="lg" />}
          name="AdminSettingsModal"
        >
          <AdminSettingsModal
            isOpen={showAdminPanel}
            onClose={() => setShowAdminPanel(false)}
          />
        </SuspenseBoundary>
      )}

      {/* User Settings Modal */}
      {showUserSettings && (
        <SuspenseBoundary
          fallback={<ModalSkeleton size="lg" />}
          name="UserSettingsModal"
        >
          <UserSettingsModal
            isOpen={showUserSettings}
            onClose={() => setShowUserSettings(false)}
          />
        </SuspenseBoundary>
      )}
    </header>
  );
}
