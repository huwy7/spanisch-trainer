import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { requestPersistence } from './db/persist.ts';
import { App } from './ui/App.tsx';
import './ui/styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

// SPEC §4: ask Safari to keep IndexedDB data; non-blocking.
void requestPersistence();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
