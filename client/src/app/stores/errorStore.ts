import { create } from 'zustand';

interface ErrorState {
  errors: string[];
}

interface ErrorActions {
  addError: (error: string) => void;
  clearErrors: () => void;
}

interface ErrorStore extends ErrorState, ErrorActions {}

export const useErrorStore = create<ErrorStore>((set, get) => ({
  // State
  errors: [],
  
  // Actions
  addError: (error) => {
    const timestamp = new Date().toLocaleTimeString();
    const formattedError = `[${timestamp}] ${error}`;
    
    const { errors } = get();
    set({ errors: [...errors, formattedError].slice(-10) }); // Keep last 10 errors
    
    console.error('Odysseus Error:', error);
  },
  
  clearErrors: () => {
    set({ errors: [] });
  },
}));

// Global error handlers
window.addEventListener('error', (event) => {
  useErrorStore.getState().addError(`JavaScript Error: ${event.message} at ${event.filename}:${event.lineno}`);
});

window.addEventListener('unhandledrejection', (event) => {
  useErrorStore.getState().addError(`Unhandled Promise Rejection: ${event.reason}`);
});
