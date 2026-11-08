import { useCallback, useEffect, useState } from 'react';

import { notifications } from '@shared/utils/notifications';

import { ProtocolFileService, type ProtocolFileHandle } from '../services/ProtocolFileService';
import { selectIsDirty, useWorkbenchStore } from '../stores/workbenchStore';
import { blankProtocol } from '../utils/protocolFile/blankProtocol';
import { experimentId } from '../utils/protocolFile/experimentId';
import {
  ProtocolFileError,
  readProtocolFile,
  writeProtocolFile,
} from '../utils/protocolFile/protocolFile';

const RECOVERY_DELAY_MS = 250;

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

function restoreRecoveryCopy() {
  const copy = ProtocolFileService.loadRecoveryCopy();
  if (!copy) return;
  try {
    useWorkbenchStore
      .getState()
      .openProtocol(readProtocolFile(copy.fileText), copy.fileName, !copy.isDirty);
  } catch {
    notifications.warning(
      'The last unsaved copy could not be restored, so a blank protocol is open.'
    );
  }
}

export function useProtocolFileActions(confirmDiscard: () => Promise<boolean>) {
  const [recentFiles, setRecentFiles] = useState<ProtocolFileHandle[]>([]);

  useEffect(() => {
    restoreRecoveryCopy();
    ProtocolFileService.recentFiles()
      .then(setRecentFiles)
      .catch(() => setRecentFiles([]));
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = useWorkbenchStore.subscribe(state => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        ProtocolFileService.saveRecoveryCopy({
          fileText: writeProtocolFile(state.protocol),
          fileName: state.fileName,
          isDirty: selectIsDirty(state),
        });
      }, RECOVERY_DELAY_MS);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const okToDiscard = useCallback(
    () => (selectIsDirty(useWorkbenchStore.getState()) ? confirmDiscard() : Promise.resolve(true)),
    [confirmDiscard]
  );

  const openText = useCallback(
    async (text: string, fileName: string, handle?: ProtocolFileHandle) => {
      let protocol;
      try {
        protocol = readProtocolFile(text);
      } catch (error) {
        notifications.error(
          error instanceof ProtocolFileError ? `${fileName}: ${error.message}` : errorText(error)
        );
        return;
      }
      if (!(await okToDiscard())) return;
      if (handle) setRecentFiles(await ProtocolFileService.remember(handle));
      else await ProtocolFileService.forgetCurrentFile();
      useWorkbenchStore.getState().openProtocol(protocol, fileName);
    },
    [okToDiscard]
  );

  const openHandle = useCallback(
    async (handle: ProtocolFileHandle) => {
      try {
        const text = await ProtocolFileService.read(handle);
        if (text !== undefined) await openText(text, handle.name, handle);
      } catch (error) {
        notifications.error(`Could not open the file: ${errorText(error)}`);
      }
    },
    [openText]
  );

  const openFromPicker = useCallback(async () => {
    try {
      const handle = await ProtocolFileService.pickToOpen();
      if (handle) await openHandle(handle);
    } catch (error) {
      notifications.error(`Could not open the file: ${errorText(error)}`);
    }
  }, [openHandle]);

  const openUpload = useCallback(
    async (file: File) => openText(await file.text(), file.name),
    [openText]
  );

  const startNew = useCallback(async () => {
    if (!(await okToDiscard())) return;
    await ProtocolFileService.forgetCurrentFile();
    useWorkbenchStore.getState().openProtocol(blankProtocol(), '');
  }, [okToDiscard]);

  const save = useCallback(async (asNewFile: boolean) => {
    (document.activeElement as HTMLElement | null)?.blur();
    const { protocol, markSaved } = useWorkbenchStore.getState();
    const suggestedName = `${experimentId(protocol)}.json`;
    if (!ProtocolFileService.canSaveInPlace) {
      ProtocolFileService.download(suggestedName, writeProtocolFile(protocol));
      markSaved(suggestedName);
      return;
    }
    try {
      const current = asNewFile ? undefined : await ProtocolFileService.currentFile();
      const handle = current ?? (await ProtocolFileService.pickToSave(suggestedName));
      if (!handle) return;
      if (!(await ProtocolFileService.write(handle, writeProtocolFile(protocol)))) return;
      markSaved(handle.name);
      if (!current) setRecentFiles(await ProtocolFileService.remember(handle));
    } catch (error) {
      notifications.error(`Could not save: ${errorText(error)}. Try Save as (Ctrl+Shift+S).`);
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 's') {
        event.preventDefault();
        void save(event.shiftKey);
      } else if (key === 'o' && !event.shiftKey && ProtocolFileService.canSaveInPlace) {
        event.preventDefault();
        void openFromPicker();
      }
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (selectIsDirty(useWorkbenchStore.getState())) event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [openFromPicker, save]);

  return { recentFiles, openFromPicker, openHandle, openUpload, startNew, save };
}
