/**
 * Application Entry Point
 *
 * Mounts the React app with strict mode, routing, and chunk error recovery.
 */

import { StrictMode } from 'react';

import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { App } from './App';
import { initChunkErrorRecovery } from './app/bootstrap/chunkErrorRecovery';
import './index.css';

// Handles stale chunk errors after deployments by auto-refreshing
initChunkErrorRecovery();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
