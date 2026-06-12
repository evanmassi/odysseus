/**
 * Shortcuts Tab
 *
 * Keyboard shortcut reference grouped by context: grid, navigator, and global.
 */
import { Fragment } from 'react';

import { Kbd } from '@shared/ui';

import { HelpSection } from '../HelpSection';

const isMac = /mac/i.test(navigator.userAgent);
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

function KeyCombo({ keys }: { keys: string }) {
  const parts = keys.split('+').map(p => p.trim());
  return (
    <span className="flex min-w-[124px] flex-shrink-0 items-center gap-1">
      {parts.map((part, i) => (
        <Fragment key={part}>
          {i > 0 && <span className="text-[10px] text-muted-foreground/50">+</span>}
          <Kbd>{part}</Kbd>
        </Fragment>
      ))}
    </span>
  );
}

function ShortcutList({ shortcuts }: { shortcuts: Shortcut[] }) {
  return (
    <div className="space-y-1">
      {shortcuts.map(s => (
        <div
          key={s.keys}
          className="flex items-center gap-3 py-1 px-2 rounded hover:bg-foreground/[0.04]"
        >
          <KeyCombo keys={s.keys} />
          <span className="text-xs text-muted-foreground">{s.action}</span>
        </div>
      ))}
    </div>
  );
}

export function ShortcutsTab() {
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
      <HelpSection id="shortcuts-grid">
        <ShortcutList shortcuts={GRID_SHORTCUTS} />
      </HelpSection>
      <div className="space-y-6">
        <HelpSection id="shortcuts-navigator">
          <ShortcutList shortcuts={NAVIGATOR_SHORTCUTS} />
        </HelpSection>
        <HelpSection id="shortcuts-global">
          <ShortcutList shortcuts={GLOBAL_SHORTCUTS} />
        </HelpSection>
      </div>
    </div>
  );
}
