import { useRef, useState, type ComponentType } from 'react';

import { ChevronDown, ChevronRight, X } from 'lucide-react';

import { ConsolePanel } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';

import { useFitBlockHeight } from '../../../hooks/useFitBlockHeight';
import { useUpdateBlock } from '../../../hooks/useUpdateBlock';
import { useWorkbenchStore } from '../../../stores/workbenchStore';
import { BLOCK_TYPES } from '../../../utils/blocks/blockTypes';
import { focusOnMount } from '../../../utils/dom/focusOnMount';

import { BLOCK_ICONS } from './blockIcons';
import { BLOCK_PANELS } from './blockPanels';
import { WorkbenchBlockPendingPanel } from './WorkbenchBlockPendingPanel';

import type { ProtocolBlock } from '@odysseus/shared-schemas';

export const BLOCK_DRAG_HANDLE = 'workbench-block-handle';

interface WorkbenchBlockShellProps {
  block: ProtocolBlock;
}

const HEADER_BUTTON =
  'inline-flex h-6 w-6 flex-none items-center justify-center text-muted-foreground transition-colors hover:text-foreground';

export function WorkbenchBlockShell({ block }: WorkbenchBlockShellProps) {
  const updateBlock = useUpdateBlock(block);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useFitBlockHeight(block, shellRef, contentRef);
  const blockType = BLOCK_TYPES[block.type];
  const Icon = BLOCK_ICONS[block.type];
  const Panel = BLOCK_PANELS[block.type] as ComponentType<{ block: ProtocolBlock }> | undefined;
  const hasOwnTitle = block.title !== blockType.label;

  const toggleFold = () =>
    updateBlock(draft => {
      if (draft.isCollapsed) {
        draft.isCollapsed = false;
        draft.h = draft.expandedHeight ?? blockType.size[1];
      } else {
        draft.isCollapsed = true;
        draft.expandedHeight = draft.h;
        draft.h = 1;
      }
    });

  const finishRename = (title: string) => {
    setIsRenaming(false);
    updateBlock(draft => {
      draft.title = title.trim() || blockType.label;
    });
  };

  const removeBlock = () => {
    setIsConfirmingRemove(false);
    updateProtocol(draft => {
      draft.blocks = draft.blocks.filter(candidate => candidate.id !== block.id);
    });
  };

  return (
    <div ref={shellRef} className="h-full">
      <ConsolePanel intensity="soft" className="flex h-full min-h-0 flex-col overflow-hidden">
        <div
          className={`${BLOCK_DRAG_HANDLE} flex flex-none cursor-grab items-center gap-2 px-2 py-2`}
        >
          <button
            type="button"
            className={HEADER_BUTTON}
            onClick={toggleFold}
            aria-label={block.isCollapsed ? 'Expand block' : 'Collapse block'}
          >
            {block.isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          <Icon aria-hidden className="h-4 w-4 flex-none text-primary" />
          {isRenaming ? (
            <input
              ref={focusOnMount}
              defaultValue={block.title}
              aria-label="Block title"
              className="min-w-0 flex-1 bg-transparent type-label text-label-md font-semibold text-foreground outline-none"
              onBlur={event => finishRename(event.currentTarget.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') event.currentTarget.blur();
                if (event.key === 'Escape') setIsRenaming(false);
              }}
            />
          ) : (
            <span
              className="min-w-0 flex-1 truncate type-label text-label-md font-semibold text-foreground"
              title="Double-click to rename"
              onDoubleClick={() => setIsRenaming(true)}
            >
              {block.title}
              {hasOwnTitle && (
                <span className="ml-2 font-normal text-muted-foreground">{blockType.label}</span>
              )}
            </span>
          )}
          <button
            type="button"
            className={HEADER_BUTTON}
            onClick={() => setIsConfirmingRemove(true)}
            aria-label="Remove block"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {!block.isCollapsed && (
          <div ref={contentRef} className="min-h-0 flex-1 overflow-auto">
            {Panel ? <Panel block={block} /> : <WorkbenchBlockPendingPanel block={block} />}
          </div>
        )}
        <ConfirmDialog
          isOpen={isConfirmingRemove}
          variant="danger"
          title="Remove block"
          message={`Remove the “${block.title}” block from this page?`}
          confirmText="Remove"
          onConfirm={removeBlock}
          onCancel={() => setIsConfirmingRemove(false)}
        />
      </ConsolePanel>
    </div>
  );
}
