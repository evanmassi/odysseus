/**
 * Remove Tube Confirmation
 *
 * Single source of truth for the remove-tube confirmation copy, so the grid and
 * editor modals stay consistent for any number of tubes.
 */

interface RemoveTubeConfirmation {
  title: string;
  message: string;
  confirmText: string;
}

export function buildRemoveTubeConfirmation(count: number): RemoveTubeConfirmation {
  const subject = count === 1 ? 'this tube' : `these ${count} tubes`;
  const titleSubject = count === 1 ? 'Tube' : `${count} Tubes`;

  return {
    title: `Remove ${titleSubject}`,
    message: `Are you sure you want to remove ${subject}? This action cannot be undone.`,
    confirmText: 'Remove',
  };
}
