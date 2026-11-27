import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { startSync } from './data/sync';
import { registerServiceWorker } from './pwa';
import { startNewsChecks } from './news';

startSync();
registerServiceWorker();
startNewsChecks();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
