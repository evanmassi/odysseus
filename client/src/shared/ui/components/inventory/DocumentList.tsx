/**
 * Document List
 *
 * Linked documents on a catalog item: type chip, label, notes, and admin edit/remove.
 */

import { Edit, ExternalLink, Trash2 } from 'lucide-react';

import { Button, Tooltip } from '@shared/ui';
import { DOCUMENT_TYPE_LABELS } from '@shared/ui/components/overlays/documentTypeLabels';
import { Chip } from '@shared/ui/primitives/chip/Chip';

import type { DocumentType } from '@odysseus/shared-schemas';

interface DisplayDocument {
  id: string;
  label: string;
  url: string;
  notes?: string;
  docType?: DocumentType;
}

// Generic over the document rather than taking a union: the three catalogs keep separate
// document types on purpose, and onEdit hands the caller its own back for the edit modal.
interface DocumentListProps<T extends DisplayDocument> {
  documents: T[];
  isAdmin: boolean;
  /** Suppresses removal only; editing stays available. */
  isRemoveLocked?: boolean;
  onEdit: (doc: T) => void;
  onRemove: (docId: string) => void;
}

export function DocumentList<T extends DisplayDocument>({
  documents,
  isAdmin,
  isRemoveLocked = false,
  onEdit,
  onRemove,
}: DocumentListProps<T>) {
  if (documents.length === 0) {
    return <p className="text-caption italic text-muted-foreground">No documents</p>;
  }

  return (
    <div className="space-y-1.5">
      {documents.map(doc => (
        <div key={doc.id}>
          <div className="flex items-center justify-between text-body-sm">
            <div className="flex min-w-0 items-center gap-2.5">
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-w-0 items-center gap-1 text-primary hover:underline"
              >
                <span className="truncate">{doc.label}</span>
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
              </a>
              {doc.docType && (
                <Chip color="default" size="xs" className="flex-shrink-0">
                  {DOCUMENT_TYPE_LABELS[doc.docType]}
                </Chip>
              )}
            </div>
            {isAdmin && (
              <div className="flex items-center gap-0.5">
                <Tooltip content="Edit" side="bottom">
                  <Button variant="ghost" size="xs" iconOnly onClick={() => onEdit(doc)}>
                    <Edit className="h-3 w-3" />
                  </Button>
                </Tooltip>
                {!isRemoveLocked && (
                  <Tooltip content="Remove" side="bottom">
                    <Button
                      variant="ghost-danger"
                      size="xs"
                      iconOnly
                      onClick={() => onRemove(doc.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </Tooltip>
                )}
              </div>
            )}
          </div>
          {doc.notes && <p className="mt-0.5 text-caption text-muted-foreground">{doc.notes}</p>}
        </div>
      ))}
    </div>
  );
}
