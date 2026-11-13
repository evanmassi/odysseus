import { useCallback, useState } from 'react';

import { ConsolePanel, ScrollArea } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';

import { useProtocolFileActions } from '../../../hooks/useProtocolFileActions';
import { WorkbenchBlockRail } from '../board/WorkbenchBlockRail';
import { WorkbenchBoard } from '../board/WorkbenchBoard';
import { WorkbenchPageTabs } from '../board/WorkbenchPageTabs';
import { WorkbenchDyeAddDialog } from '../dyes/WorkbenchDyeAddDialog';
import { WorkbenchNameTray } from '../tray/WorkbenchNameTray';

import { WorkbenchFileBar } from './WorkbenchFileBar';
import { WorkbenchTitleBar } from './WorkbenchTitleBar';

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
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <WorkbenchPageTabs />
          <ScrollArea className="min-h-0 flex-1 pr-2">
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
