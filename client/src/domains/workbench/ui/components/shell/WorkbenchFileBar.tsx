import { useRef, useState } from 'react';

import { ChevronDown, FilePlus, FolderOpen, Save } from 'lucide-react';

import { Button, Chip, DropdownMenu, MenuDivider, MenuItem } from '@shared/ui';

import {
  ProtocolFileService,
  type ProtocolFileHandle,
} from '../../../services/ProtocolFileService';
import { selectIsDirty, useWorkbenchStore } from '../../../stores/workbenchStore';
import { experimentId } from '../../../utils/protocolFile/experimentId';

interface WorkbenchFileBarProps {
  recentFiles: readonly ProtocolFileHandle[];
  onNew: () => void;
  onOpenPicker: () => void;
  onOpenRecent: (handle: ProtocolFileHandle) => void;
  onOpenUpload: (file: File) => void;
  onSave: (asNewFile: boolean) => void;
}

export function WorkbenchFileBar({
  recentFiles,
  onNew,
  onOpenPicker,
  onOpenRecent,
  onOpenUpload,
  onSave,
}: WorkbenchFileBarProps) {
  const fileName = useWorkbenchStore(state => state.fileName);
  const isDirty = useWorkbenchStore(selectIsDirty);
  const identifier = useWorkbenchStore(state => experimentId(state.protocol));
  const [isOpenMenuShown, setIsOpenMenuShown] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const suggestedName = `${identifier}.json`;
  const isNamedDifferently = !!fileName && fileName !== suggestedName;

  const openMenuChoice = (act: () => void) => {
    setIsOpenMenuShown(false);
    act();
  };

  const handleOpenClick = () => {
    if (ProtocolFileService.canSaveInPlace) setIsOpenMenuShown(shown => !shown);
    else uploadRef.current?.click();
  };

  return (
    <div className="flex items-center gap-3">
      <span className="min-w-0 truncate font-mono text-data-sm text-foreground" title={fileName}>
        {fileName}
      </span>
      {isDirty ? (
        <Chip color="warning" lit>
          Unsaved changes
        </Chip>
      ) : fileName ? (
        <Chip color="success">Saved</Chip>
      ) : (
        <Chip color="outlined">Not saved to a file</Chip>
      )}
      {isNamedDifferently && (
        <Button
          variant="ghost"
          size="xs"
          title={`Save as ${suggestedName}`}
          onClick={() => onSave(true)}
        >
          Save as new name
        </Button>
      )}
      <span className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<FilePlus className="h-4 w-4" />}
          onClick={onNew}
        >
          New
        </Button>
        <Button
          ref={openButtonRef}
          variant="ghost"
          size="sm"
          leftIcon={<FolderOpen className="h-4 w-4" />}
          rightIcon={
            ProtocolFileService.canSaveInPlace ? <ChevronDown className="h-3.5 w-3.5" /> : undefined
          }
          onClick={handleOpenClick}
        >
          Open
        </Button>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Save className="h-4 w-4" />}
          title="Ctrl+S · Ctrl+Shift+S to save as"
          onClick={() => onSave(false)}
        >
          Save
        </Button>
      </span>
      <DropdownMenu
        isOpen={isOpenMenuShown}
        onClose={() => setIsOpenMenuShown(false)}
        triggerRef={openButtonRef}
        align="end"
      >
        <MenuItem
          icon={FolderOpen}
          label="Open a file…"
          shortcut="Ctrl+O"
          onClick={() => openMenuChoice(onOpenPicker)}
        />
        {recentFiles.length > 0 && <MenuDivider />}
        {recentFiles.map(handle => (
          <MenuItem
            key={handle.name}
            label={handle.name}
            onClick={() => openMenuChoice(() => onOpenRecent(handle))}
          />
        ))}
      </DropdownMenu>
      <input
        ref={uploadRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={event => {
          const [file] = event.currentTarget.files ?? [];
          event.currentTarget.value = '';
          if (file) onOpenUpload(file);
        }}
      />
    </div>
  );
}
