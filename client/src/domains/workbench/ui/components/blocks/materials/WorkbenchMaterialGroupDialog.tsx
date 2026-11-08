import { useState } from 'react';

import { FolderPlus } from 'lucide-react';

import { Button, Input } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays/BaseModal';

import { focusOnMount } from '../../../../utils/dom/focusOnMount';

interface WorkbenchMaterialGroupDialogProps {
  isOpen: boolean;
  onCreate: (label: string) => void;
  onCancel: () => void;
}

export function WorkbenchMaterialGroupDialog({
  isOpen,
  onCreate,
  onCancel,
}: WorkbenchMaterialGroupDialogProps) {
  const [label, setLabel] = useState('');
  const create = () => {
    onCreate(label);
    setLabel('');
  };
  const cancel = () => {
    onCancel();
    setLabel('');
  };

  return (
    <BaseModal
      isOpen={isOpen}
      title="New group"
      icon={<FolderPlus className="h-4 w-4" />}
      size="xs"
      onClose={cancel}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="cancel" size="sm" onClick={cancel}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" disabled={!label.trim()} onClick={create}>
            Add group
          </Button>
        </div>
      }
    >
      <Input
        size="sm"
        fullWidth
        ref={focusOnMount}
        value={label}
        placeholder="Name of the new group"
        aria-label="Name of the new group"
        onValueChange={setLabel}
        onKeyDown={event => {
          if (event.key === 'Enter' && label.trim()) create();
        }}
      />
    </BaseModal>
  );
}
