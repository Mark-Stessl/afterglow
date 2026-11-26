import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Every build gets its own version stamp (shown in the app, later used by the service worker).
const BUILD = new Date().toISOString().replace(/\D/g, '').slice(0, 12);

export default defineConfig({
  base: '/afterglow/',
  plugins: [react(), tailwindcss()],
  define: { __BUILD__: JSON.stringify(BUILD) },
  server: { port: 8766 },
  preview: { port: 8766 },
});
