/**
 * Shortcuts Tab
 *
 * Keyboard shortcut reference grouped by context: grid, navigator, and global.
 */
import type { ReactNode } from 'react';

import { Globe, Grid3X3, Navigation } from 'lucide-react';

const isMac = navigator.platform.toUpperCase().includes('MAC');
const mod = isMac ? '⌘' : 'Ctrl';

interface Shortcut {
  keys: string;
  action: string;
}

const GRID_SHORTCUTS: Shortcut[] = [
  { keys: '↑ ↓ ← →', action: 'Navigate the grid' },
  { keys: 'Shift + ↑ ↓ ← →', action: 'Extend selection' },
  { keys: 'Space', action: 'Toggle cell selection' },
  { keys: 'Enter', action: 'Open / edit tube(s)' },
  { keys: `${mod}+A`, action: 'Select all' },
  { keys: `${mod}+C`, action: 'Copy' },
  { keys: `${mod}+X`, action: 'Cut' },
  { keys: `${mod}+V`, action: 'Paste' },
  { keys: 'Delete', action: 'Remove selected tube(s)' },
  { keys: 'Shift+L', action: 'Lock / unlock' },
  { keys: 'Shift+S', action: 'Share access' },
  { keys: 'Escape', action: 'Clear selection' },
];

const NAVIGATOR_SHORTCUTS: Shortcut[] = [
  { keys: '↑ ↓', action: 'Move focus up / down' },
  { keys: '← →', action: 'Collapse / expand node' },
  { keys: 'Home / End', action: 'Jump to first / last item' },
  { keys: 'Enter or Space', action: 'Select item' },
  { keys: 'Type a letter', action: 'Jump to matching item' },
];

const GLOBAL_SHORTCUTS: Shortcut[] = [
  { keys: `${mod}+F`, action: 'Focus search' },
  { keys: 'Escape', action: 'Close modal or menu' },
];

function ShortcutGroup({
  title,
  icon,
  shortcuts,
}: {
  title: string;
  icon: ReactNode;
  shortcuts: Shortcut[];
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="text-sm font-semibold text-card-foreground">{title}</h3>
      </div>
      <div className="space-y-1">
        {shortcuts.map(s => (
          <div key={s.keys} className="flex items-center gap-3 py-1 px-2 rounded hover:bg-muted/50">
            <kbd className="text-[11px] font-mono text-secondary-foreground bg-muted px-1.5 py-0.5 rounded border border-border min-w-[100px] text-center flex-shrink-0">
              {s.keys}
            </kbd>
            <span className="text-xs text-muted-foreground">{s.action}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ShortcutsTab() {
  return (
    <div className="grid grid-cols-2 gap-6">
      <ShortcutGroup
        title="Grid"
        icon={<Grid3X3 size={14} className="text-secondary-foreground" />}
        shortcuts={GRID_SHORTCUTS}
      />
      <div className="space-y-6">
        <ShortcutGroup
          title="Navigator"
          icon={<Navigation size={14} className="text-secondary-foreground" />}
          shortcuts={NAVIGATOR_SHORTCUTS}
        />
        <ShortcutGroup
          title="Global"
          icon={<Globe size={14} className="text-secondary-foreground" />}
          shortcuts={GLOBAL_SHORTCUTS}
        />
      </div>
    </div>
  );
}
