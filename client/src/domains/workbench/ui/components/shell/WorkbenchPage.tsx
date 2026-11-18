import { useCallback, useState, type ComponentProps } from 'react';

import { ConsolePanel, Divider, ScrollArea } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';

import { useProtocolFileActions } from '../../../hooks/useProtocolFileActions';
import { useUndoShortcuts } from '../../../hooks/useUndoShortcuts';
import { WorkbenchBlockRail } from '../board/WorkbenchBlockRail';
import { WorkbenchBoard } from '../board/WorkbenchBoard';
import { WorkbenchPageTabs } from '../board/WorkbenchPageTabs';
import { WorkbenchDyeAddDialog } from '../dyes/WorkbenchDyeAddDialog';
import { WorkbenchNameTray } from '../tray/WorkbenchNameTray';

import { WorkbenchFileBar } from './WorkbenchFileBar';
import { WorkbenchTitleBar } from './WorkbenchTitleBar';

const BOARD_SCROLL_OPTIONS: ComponentProps<typeof ScrollArea>['options'] = {
  update: { elementEvents: [['.react-grid-layout', 'transitionend']] },
};

export function WorkbenchPage() {
  const [resolveDiscard, setResolveDiscard] = useState<(isConfirmed: boolean) => void>();

  const confirmDiscard = useCallback(
    () => new Promise<boolean>(resolve => setResolveDiscard(() => resolve)),
    []
  );

  const answerDiscard = (isConfirmed: boolean) => {
    resolveDiscard?.(isConfirmed);
    setResolveDiscard(undefined);
  };

  const { recentFiles, openFromPicker, openHandle, openUpload, startNew, save } =
    useProtocolFileActions(confirmDiscard);
  useUndoShortcuts();

  return (
    <div className="flex min-h-0 flex-1 gap-4 px-4 pb-4 pt-3">
      <ScrollArea className="w-56 flex-none">
        <ConsolePanel intensity="soft" className="py-3">
          <WorkbenchBlockRail />
        </ConsolePanel>
      </ScrollArea>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <WorkbenchTitleBar onSaveUnderId={() => void save(true)} />
          </div>
          <WorkbenchFileBar
            recentFiles={recentFiles}
            onNew={() => void startNew()}
            onOpenPicker={() => void openFromPicker()}
            onOpenRecent={handle => void openHandle(handle)}
            onOpenUpload={file => void openUpload(file)}
            onSave={asNewFile => void save(asNewFile)}
          />
        </div>
        <Divider tone="neutral" className="my-1" />
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="pr-2">
            <WorkbenchPageTabs />
          </div>
          <ScrollArea className="min-h-0 flex-1 pr-2" options={BOARD_SCROLL_OPTIONS}>
            <WorkbenchBoard />
          </ScrollArea>
        </div>
      </main>
      <WorkbenchNameTray />
      <WorkbenchDyeAddDialog />
      <ConfirmDialog
        isOpen={!!resolveDiscard}
        variant="warning"
        title="Unsaved changes"
        message="This protocol has unsaved changes. Discard them?"
        confirmText="Discard"
        onConfirm={() => answerDiscard(true)}
        onCancel={() => answerDiscard(false)}
      />
    </div>
  );
}
