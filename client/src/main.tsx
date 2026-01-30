import { StrictMode } from 'react';

import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { App } from './App';
import { initChunkErrorRecovery } from './app/chunkErrorRecovery';
import './index.css';

// Initialize chunk error recovery before rendering
// Handles stale chunk errors after deployments by auto-refreshing
initChunkErrorRecovery();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
