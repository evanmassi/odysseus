/**
 * Supply Document Form
 *
 * Inline form for adding a document link (SOP, spec sheet, product page) to a supply product.
 */

import { useState } from 'react';

import { Plus } from 'lucide-react';

import { useAddSupplyDocumentMutation } from '@domains/supplies/hooks/useSupplyMutations';
import { Button, Input } from '@shared/ui';
import { notifications } from '@shared/utils/notifications';

interface SupplyDocumentFormProps {
  productId: string;
  onAdded: () => void;
}

export function SupplyDocumentForm({ productId, onAdded }: SupplyDocumentFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const addMutation = useAddSupplyDocumentMutation();

  const handleSubmit = async () => {
    if (!label.trim() || !url.trim()) return;
    try {
      await addMutation.mutateAsync({
        productId,
        data: { label: label.trim(), url: url.trim(), notes: notes.trim() || undefined },
      });
      notifications.success('Document added');
      setLabel('');
      setUrl('');
      setNotes('');
      setIsOpen(false);
      onAdded();
    } catch {
      notifications.error('Failed to add document');
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        leftIcon={<Plus className="w-3 h-3" />}
      >
        Add Document
      </Button>
    );
  }

  return (
    <div className="space-y-2 p-2 border border-border rounded-md">
      <div>
        <label
          htmlFor="doc-label"
          className="text-xs font-medium text-secondary-foreground block mb-0.5"
        >
          Label *
        </label>
        <Input
          id="doc-label"
          type="text"
          value={label}
          onValueChange={setLabel}
          placeholder="e.g., User Manual"
          fullWidth
          size="sm"
        />
      </div>
      <div>
        <label
          htmlFor="doc-url"
          className="text-xs font-medium text-secondary-foreground block mb-0.5"
        >
          URL *
        </label>
        <Input
          id="doc-url"
          type="text"
          value={url}
          onValueChange={setUrl}
          placeholder="https://..."
          fullWidth
          size="sm"
        />
      </div>
      <div>
        <label
          htmlFor="doc-notes"
          className="text-xs font-medium text-secondary-foreground block mb-0.5"
        >
          Notes
        </label>
        <Input
          id="doc-notes"
          type="text"
          value={notes}
          onValueChange={setNotes}
          placeholder="Optional"
          fullWidth
          size="sm"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={() => setIsOpen(false)}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => void handleSubmit()}
          disabled={!label.trim() || !url.trim()}
          isLoading={addMutation.isPending}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
