import { downloadBlob } from '@shared/utils/downloadBlob';

const RECOVERY_KEY = 'odysseus-workbench-recovery';
const HANDLE_DATABASE = 'odysseus-workbench-files';
const HANDLE_STORE = 'handles';
const RECENT_KEY = 'recent';
const CURRENT_KEY = 'current';
const RECENT_LIMIT = 8;
const FILE_TYPES = [
  { description: 'Workbench protocol', accept: { 'application/json': ['.json'] } },
];

type PermissionMode = 'read' | 'readwrite';

export interface ProtocolFileHandle extends FileSystemFileHandle {
  queryPermission: (options: { mode: PermissionMode }) => Promise<PermissionState>;
  requestPermission: (options: { mode: PermissionMode }) => Promise<PermissionState>;
}

interface FilePickerWindow {
  showOpenFilePicker: (options: { types: typeof FILE_TYPES }) => Promise<ProtocolFileHandle[]>;
  showSaveFilePicker: (options: {
    suggestedName: string;
    types: typeof FILE_TYPES;
  }) => Promise<ProtocolFileHandle>;
}

interface RecoveryCopy {
  fileText: string;
  fileName: string;
  isDirty: boolean;
}

const pickerWindow = () => window as unknown as Window & FilePickerWindow;

const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

function openHandleDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(HANDLE_DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(HANDLE_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function runHandleStore<T>(
  mode: IDBTransactionMode,
  act: (store: IDBObjectStore) => IDBRequest<T>
) {
  const database = await openHandleDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(HANDLE_STORE, mode);
    const request = act(transaction.objectStore(HANDLE_STORE));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
  });
}

async function hasPermission(handle: ProtocolFileHandle, mode: PermissionMode) {
  return (
    (await handle.queryPermission({ mode })) === 'granted' ||
    (await handle.requestPermission({ mode })) === 'granted'
  );
}

export class ProtocolFileService {
  static readonly canSaveInPlace = typeof window !== 'undefined' && 'showSaveFilePicker' in window;

  static async pickToOpen(): Promise<ProtocolFileHandle | undefined> {
    try {
      const [handle] = await pickerWindow().showOpenFilePicker({ types: FILE_TYPES });
      return handle;
    } catch (error) {
      if (isAbort(error)) return undefined;
      throw error;
    }
  }

  static async pickToSave(suggestedName: string): Promise<ProtocolFileHandle | undefined> {
    try {
      return await pickerWindow().showSaveFilePicker({ suggestedName, types: FILE_TYPES });
    } catch (error) {
      if (isAbort(error)) return undefined;
      throw error;
    }
  }

  static async read(handle: ProtocolFileHandle): Promise<string | undefined> {
    if (!(await hasPermission(handle, 'read'))) return undefined;
    return (await handle.getFile()).text();
  }

  static async write(handle: ProtocolFileHandle, text: string): Promise<boolean> {
    if (!(await hasPermission(handle, 'readwrite'))) return false;
    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();
    return true;
  }

  static download(fileName: string, text: string): void {
    downloadBlob(new Blob([text], { type: 'application/json' }), fileName);
  }

  static async recentFiles(): Promise<ProtocolFileHandle[]> {
    if (!this.canSaveInPlace) return [];
    return (
      (await runHandleStore<ProtocolFileHandle[] | undefined>('readonly', store =>
        store.get(RECENT_KEY)
      )) ?? []
    );
  }

  static async currentFile(): Promise<ProtocolFileHandle | undefined> {
    if (!this.canSaveInPlace) return undefined;
    return runHandleStore<ProtocolFileHandle | undefined>('readonly', store =>
      store.get(CURRENT_KEY)
    );
  }

  static async remember(handle: ProtocolFileHandle): Promise<ProtocolFileHandle[]> {
    const others: ProtocolFileHandle[] = [];
    for (const recent of await this.recentFiles()) {
      if (!(await recent.isSameEntry(handle))) others.push(recent);
    }
    const recent = [handle, ...others].slice(0, RECENT_LIMIT);
    await runHandleStore('readwrite', store => store.put(recent, RECENT_KEY));
    await runHandleStore('readwrite', store => store.put(handle, CURRENT_KEY));
    return recent;
  }

  static async forgetCurrentFile(): Promise<void> {
    if (!this.canSaveInPlace) return;
    await runHandleStore('readwrite', store => store.delete(CURRENT_KEY));
  }

  static saveRecoveryCopy(copy: RecoveryCopy): void {
    try {
      localStorage.setItem(RECOVERY_KEY, JSON.stringify(copy));
    } catch {
      // PITFALL: a full or blocked localStorage must never interrupt editing; the copy is only a crash net.
    }
  }

  static loadRecoveryCopy(): RecoveryCopy | undefined {
    try {
      const stored = localStorage.getItem(RECOVERY_KEY);
      return stored ? (JSON.parse(stored) as RecoveryCopy) : undefined;
    } catch {
      return undefined;
    }
  }
}
