/**
 * Document Link Modal
 *
 * Add or edit a labeled external document link (manual, SOP, spec sheet) with optional notes.
 */

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { DOCUMENT_TYPE_VALUES, type DocumentType } from '@odysseus/shared-schemas';
import { FileText, Plus, Save } from 'lucide-react';

import { Button, Input, Select, withPlaceholder } from '../../primitives';
import { FIELD_LABEL_COMPACT } from '../inputs/fieldLabelClass';

import { BaseModal } from './BaseModal';
import { DOCUMENT_TYPE_LABELS } from './documentTypeLabels';

export interface DocumentLinkValues {
  label: string;
  url: string;
  notes?: string;
  docType?: DocumentType;
}

interface DocumentLinkModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  initialValues?: DocumentLinkValues;
  isPending?: boolean;
  /** Offers the classification picker. Catalogs that don't persist `docType` leave it off. */
  withDocType?: boolean;
  /** Resolves on success (modal closes) or rejects to keep the modal open for a retry. */
  onSave: (values: DocumentLinkValues) => Promise<void>;
  onClose: () => void;
}

const DOC_TYPE_OPTIONS = withPlaceholder(
  'Unclassified',
  DOCUMENT_TYPE_VALUES.map(value => ({ value, label: DOCUMENT_TYPE_LABELS[value] }))
);

export function DocumentLinkModal({
  isOpen,
  mode,
  initialValues,
  isPending = false,
  withDocType = false,
  onSave,
  onClose,
}: DocumentLinkModalProps) {
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [docType, setDocType] = useState<DocumentType | ''>('');
  const prevIsOpenRef = useRef(isOpen);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setLabel(initialValues?.label ?? '');
      setUrl(initialValues?.url ?? '');
      setNotes(initialValues?.notes ?? '');
      setDocType(initialValues?.docType ?? '');
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialValues]);

  const isEditing = mode === 'edit';
  const canSubmit = !!label.trim() && !!url.trim() && !isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await onSave({
        label: label.trim(),
        url: url.trim(),
        notes: notes.trim() || undefined,
        docType: docType === '' ? undefined : docType,
      });
      onClose();
    } catch {
      // Parent surfaces the error toast; keep the modal open so the user can retry.
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && canSubmit) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      title={isEditing ? 'Edit Document' : 'Add Document'}
      icon={<FileText size={24} />}
      onClose={onClose}
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            isLoading={isPending}
            loadingText={isEditing ? 'Saving...' : 'Adding...'}
            leftIcon={
              isEditing ? <Save className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />
            }
          >
            {isEditing ? 'Save Changes' : 'Add Document'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <label htmlFor="doc-label" className={FIELD_LABEL_COMPACT}>
            Label
          </label>
          <Input
            id="doc-label"
            type="text"
            value={label}
            onValueChange={setLabel}
            onKeyDown={handleKeyDown}
            placeholder="e.g., User Manual"
            maxLength={200}
            fullWidth
          />
        </div>
        <div>
          <label htmlFor="doc-url" className={FIELD_LABEL_COMPACT}>
            URL
          </label>
          <Input
            id="doc-url"
            type="text"
            value={url}
            onValueChange={setUrl}
            onKeyDown={handleKeyDown}
            placeholder="https://..."
            maxLength={2000}
            fullWidth
          />
        </div>
        {withDocType && (
          <div>
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
            <label id="doc-type-label" className={FIELD_LABEL_COMPACT}>
              Type
            </label>
            <Select
              aria-labelledby="doc-type-label"
              options={DOC_TYPE_OPTIONS}
              value={docType}
              onChange={value => setDocType((value as DocumentType | '') ?? '')}
              size="sm"
              fullWidth
            />
          </div>
        )}
        <div>
          <label htmlFor="doc-notes" className={FIELD_LABEL_COMPACT}>
            Notes
          </label>
          <Input
            id="doc-notes"
            type="text"
            value={notes}
            onValueChange={setNotes}
            onKeyDown={handleKeyDown}
            placeholder="Optional"
            maxLength={500}
            fullWidth
          />
        </div>
      </div>
    </BaseModal>
  );
}
