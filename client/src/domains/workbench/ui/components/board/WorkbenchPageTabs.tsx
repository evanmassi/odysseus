import { useState } from 'react';

import { Plus, X } from 'lucide-react';

import { Button, ConsolePanel, Tab } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';

import { useWorkbenchStore } from '../../../stores/workbenchStore';
import { BOARD_MARGIN } from '../../../utils/blocks/boardGeometry';
import { focusOnMount } from '../../../utils/dom/focusOnMount';
import { createId } from '../../../utils/ids/createId';

import { WorkbenchTabStrip } from './WorkbenchTabStrip';

const LABEL_TRACKING = '0.08em';
const FIELD_CHROME_PX = 12;
const CARET_ROOM_PX = 2;

function labelFieldWidth(name: string) {
  const chars = Math.max(1, name.length);
  return `calc(${chars} * (1ch + ${LABEL_TRACKING}) + ${FIELD_CHROME_PX + CARET_ROOM_PX}px)`;
}

export function WorkbenchPageTabs() {
  const pages = useWorkbenchStore(state => state.protocol.pages);
  const blocks = useWorkbenchStore(state => state.protocol.blocks);
  const activePageId = useWorkbenchStore(state => state.activePageId);
  const showPage = useWorkbenchStore(state => state.showPage);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const [renamingPageId, setRenamingPageId] = useState<string>();
  const [draftName, setDraftName] = useState('');
  const [deletingPageId, setDeletingPageId] = useState<string>();

  const startRename = (pageId: string, name: string) => {
    setDraftName(name);
    setRenamingPageId(pageId);
  };

  const deletingPage = pages.find(page => page.id === deletingPageId);
  const deletingBlockCount = blocks.filter(block => block.page === deletingPageId).length;

  const addPage = () => {
    const page = { id: createId(), name: `PAGE ${pages.length + 1}`, steps: [] };
    updateProtocol(draft => {
      draft.pages.push(page);
    });
    showPage(page.id);
    startRename(page.id, page.name);
  };

  const finishRename = (pageId: string, name: string) => {
    setRenamingPageId(undefined);
    if (!name.trim()) return;
    updateProtocol(draft => {
      const page = draft.pages.find(candidate => candidate.id === pageId);
      if (page) page.name = name.trim();
    });
  };

  const deletePage = (pageId: string) => {
    setDeletingPageId(undefined);
    const index = pages.findIndex(page => page.id === pageId);
    const neighbor = pages[index - 1] ?? pages[index + 1];
    updateProtocol(draft => {
      draft.blocks = draft.blocks.filter(block => block.page !== pageId);
      draft.pages = draft.pages.filter(page => page.id !== pageId);
    });
    if (pageId === activePageId && neighbor) showPage(neighbor.id);
  };

  const requestDelete = (pageId: string) => {
    const page = pages.find(candidate => candidate.id === pageId);
    const hasContent = !!page?.steps.length || blocks.some(block => block.page === pageId);
    if (hasContent) setDeletingPageId(pageId);
    else deletePage(pageId);
  };

  const canDelete = pages.length > 1;
  const blockWords = deletingBlockCount === 1 ? 'block' : 'blocks';

  return (
    <div style={{ paddingInline: BOARD_MARGIN }}>
      <ConsolePanel className="flex items-stretch">
        <WorkbenchTabStrip
          value={activePageId}
          ids={pages.map(page => page.id)}
          onChange={showPage}
          spacing="snug"
        >
          {pages.map(page =>
            page.id === renamingPageId ? (
              <span key={page.id} className="flex items-center px-3 py-2">
                <input
                  ref={focusOnMount}
                  defaultValue={page.name}
                  aria-label="Page name"
                  spellCheck={false}
                  className="inline-edit-field max-w-none type-name text-label-sm text-foreground"
                  style={{ width: labelFieldWidth(draftName) }}
                  onChange={event => setDraftName(event.currentTarget.value)}
                  onFocus={event => event.currentTarget.select()}
                  onBlur={event => finishRename(page.id, event.currentTarget.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') event.currentTarget.blur();
                    if (event.key === 'Escape') setRenamingPageId(undefined);
                  }}
                />
              </span>
            ) : (
              <span
                key={page.id}
                role="presentation"
                className="group flex"
                onDoubleClick={() => startRename(page.id, page.name)}
                onKeyDown={event => {
                  if (event.key === 'F2') startRename(page.id, page.name);
                }}
              >
                <Tab id={page.id}>
                  <span className="inline-flex items-center gap-1">
                    {page.name || 'Untitled page'}
                    {canDelete && (
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={`Delete the ${page.name} page`}
                        className="invisible inline-flex text-muted-foreground hover:text-danger-text group-focus-within:visible group-hover:visible"
                        onClick={event => {
                          event.stopPropagation();
                          requestDelete(page.id);
                        }}
                        onKeyDown={event => {
                          if (event.key === 'Enter') requestDelete(page.id);
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </span>
                </Tab>
              </span>
            )
          )}
        </WorkbenchTabStrip>
        <span className="flex flex-none items-center border-l border-line-faint px-1">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            onClick={addPage}
          >
            Page
          </Button>
        </span>
        <ConfirmDialog
          isOpen={!!deletingPage}
          variant="danger"
          title="Delete page"
          message={
            deletingBlockCount
              ? `Delete the “${deletingPage?.name}” page and the ${deletingBlockCount} ${blockWords} on it?`
              : `Delete the “${deletingPage?.name}” page and its steps?`
          }
          confirmText="Delete"
          onConfirm={() => deletingPageId && deletePage(deletingPageId)}
          onCancel={() => setDeletingPageId(undefined)}
        />
      </ConsolePanel>
    </div>
  );
}
