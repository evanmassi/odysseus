import { create } from 'zustand';

import { logger } from '@infra/logger';

interface ErrorState {
  errors: string[];
}

interface ErrorActions {
  addError: (error: string) => void;
  clearErrors: () => void;
}

interface ErrorStore extends ErrorState, ErrorActions {}

const MAX_STORED_ERRORS = 10;

export const useErrorStore = create<ErrorStore>((set, get) => ({
  errors: [],

  addError: error => {
    const timestamp = new Date().toLocaleTimeString();
    const formattedError = `[${timestamp}] ${error}`;

    const { errors } = get();
    // PITFALL: React dev mode replays a failed render, so one crash fires the window error event twice within the same second.
    if (errors.at(-1) === formattedError) return;
    set({ errors: [...errors, formattedError].slice(-MAX_STORED_ERRORS) });

    logger.error('Odysseus Error', { error });
  },

  clearErrors: () => {
    set({ errors: [] });
  },
}));

window.addEventListener('error', event => {
  useErrorStore
    .getState()
    .addError(`JavaScript Error: ${event.message} at ${event.filename}:${event.lineno}`);
});

window.addEventListener('unhandledrejection', event => {
  useErrorStore.getState().addError(`Unhandled Promise Rejection: ${event.reason}`);
});
