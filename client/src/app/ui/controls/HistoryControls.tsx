import { useState } from 'react';

import { Undo2, Redo2, History, Trash2 } from 'lucide-react';

import { Button, Tooltip } from '@shared/ui';

import type { HistoryAction } from '@shared/types/Clipboard';

interface UndoRedoControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  undoStack: HistoryAction[];
  redoStack: HistoryAction[];
  onUndo: () => void;
  onRedo: () => void;
  onClearHistory: () => void;
  className?: string;
}

export function HistoryControls({
  canUndo,
  canRedo,
  undoStack,
  redoStack,
  onUndo,
  onRedo,
  onClearHistory,
  className = '',
}: UndoRedoControlsProps) {
  const [showHistory, setShowHistory] = useState(false);

  const lastUndoOperation = undoStack[undoStack.length - 1];
  const nextRedoOperation = redoStack[0];

  const formatOperationDescription = (operation: HistoryAction) => {
    const time = new Date(operation.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${operation.description} (${time})`;
  };

  const getOperationIcon = (type: HistoryAction['type']) => {
    switch (type) {
      case 'create':
        return '➕';
      case 'update':
        return '✏️';
      case 'delete':
        return '🗑️';
      case 'bulk-update':
        return '🔄';
      case 'bulk-delete':
        return '🗑️';
      default:
        return '•';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Main controls */}
      <div className="flex items-center space-x-1 bg-card rounded-lg shadow-sm border border-border p-1">
        {/* Undo button */}
        <Tooltip
          content={lastUndoOperation ? `Undo: ${lastUndoOperation.description}` : 'Nothing to undo'}
          side="bottom"
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={onUndo}
            disabled={!canUndo}
            leftIcon={<Undo2 size={14} />}
          >
            <span className="hidden sm:inline">Undo</span>
          </Button>
        </Tooltip>

        {/* Redo button */}
        <Tooltip
          content={nextRedoOperation ? `Redo: ${nextRedoOperation.description}` : 'Nothing to redo'}
          side="bottom"
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={onRedo}
            disabled={!canRedo}
            leftIcon={<Redo2 size={14} />}
          >
            <span className="hidden sm:inline">Redo</span>
          </Button>
        </Tooltip>

        {/* History toggle */}
        <Tooltip content="View operation history" side="bottom">
          <Button
            variant="secondary"
            size="sm"
            iconOnly
            onClick={() => setShowHistory(!showHistory)}
            aria-label="View operation history"
          >
            <History size={14} />
          </Button>
        </Tooltip>

        {/* Clear history */}
        {(undoStack.length > 0 || redoStack.length > 0) && (
          <Tooltip content="Clear operation history" side="bottom">
            <Button
              variant="danger"
              size="sm"
              iconOnly
              onClick={onClearHistory}
              aria-label="Clear operation history"
            >
              <Trash2 size={14} />
            </Button>
          </Tooltip>
        )}
      </div>

      {/* Operation summary */}
      {(canUndo || canRedo) && (
        <div className="mt-1 text-xs text-muted-foreground text-center">
          {canUndo && <span>Next: {lastUndoOperation?.description}</span>}
          {canUndo && canRedo && <span> • </span>}
          {canRedo && <span>Redo: {nextRedoOperation?.description}</span>}
        </div>
      )}

      {/* History dropdown */}
      {showHistory && (
        <div className="absolute top-full left-0 mt-2 bg-popover rounded-lg shadow-lg border border-border p-3 min-w-80 z-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-popover-foreground">Operation History</h3>
            <button
              onClick={() => setShowHistory(false)}
              className="text-muted-foreground hover:text-secondary-foreground"
            >
              ×
            </button>
          </div>

          {undoStack.length === 0 && redoStack.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">No operations in history</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {/* Future operations (redo stack) */}
              {redoStack.map((operation, _index) => (
                <div
                  key={`redo-${operation.id}`}
                  className="flex items-center space-x-3 p-2 rounded bg-info-light border border-info-border"
                >
                  <span className="text-info-text">{getOperationIcon(operation.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-info-bg truncate">
                      {formatOperationDescription(operation)}
                    </div>
                    <div className="text-xs text-info-text">
                      {operation.data.after?.tubes?.length || 0} tube(s) • Will redo
                    </div>
                  </div>
                </div>
              ))}

              {/* Current divider */}
              {redoStack.length > 0 && undoStack.length > 0 && (
                <div className="flex items-center space-x-2 py-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground font-medium">Current State</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}

              {/* Past operations (undo stack) */}
              {undoStack
                .slice()
                .reverse()
                .map((operation, index) => (
                  <div
                    key={`undo-${operation.id}`}
                    className={`flex items-center space-x-3 p-2 rounded ${
                      index === 0
                        ? 'bg-success-light border border-success-border'
                        : 'bg-muted border border-border'
                    }`}
                  >
                    <span className={index === 0 ? 'text-success-text' : 'text-muted-foreground'}>
                      {getOperationIcon(operation.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm truncate ${
                          index === 0 ? 'text-success-bg' : 'text-secondary-foreground'
                        }`}
                      >
                        {formatOperationDescription(operation)}
                      </div>
                      <div
                        className={`text-xs ${index === 0 ? 'text-success-text' : 'text-muted-foreground'}`}
                      >
                        {operation.data.after?.tubes?.length || 0} tube(s)
                        {index === 0 && ' • Last operation'}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* History actions */}
          {(undoStack.length > 0 || redoStack.length > 0) && (
            <div className="mt-3 pt-3 border-t border-border">
              <Button
                variant="danger"
                size="sm"
                fullWidth
                onClick={() => {
                  onClearHistory();
                  setShowHistory(false);
                }}
                leftIcon={<Trash2 size={14} />}
              >
                Clear All History
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
