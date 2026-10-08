import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { prefetchSentences } from './data/sentences.ts';
import { requestPersistence } from './db/persist.ts';
import { App } from './ui/App.tsx';
import './ui/styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

// SPEC §4: ask Safari to keep IndexedDB data; non-blocking.
void requestPersistence();
// M3: sentence chunks are loaded lazily; fetch them once in the background for offline use.
prefetchSentences();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
