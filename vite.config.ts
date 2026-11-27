import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Every build gets its own version stamp (shown in the app and used by the service worker).
const BUILD = new Date().toISOString().replace(/\D/g, '').slice(0, 12);

/** Writes dist/sw.js from pwa/sw.js with this build's version and app-shell file list. */
function serviceWorker(): Plugin {
  return {
    name: 'afterglow-sw',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = Object.values(bundle);
      const entry = files.filter(f => f.type === 'chunk' && f.isEntry);
      const shell = new Set<string>();
      entry.forEach(f => {
        shell.add(f.fileName);
        if (f.type === 'chunk') f.imports.forEach(i => shell.add(i));
      });
      files.forEach(f => { if (f.fileName.endsWith('.css')) shell.add(f.fileName); });
      const core = ['./', 'index.html', 'manifest.webmanifest', 'icon.svg', 'icons/icon-192.png', 'icons/apple-touch-icon.png', ...shell];
      const source = readFileSync('pwa/sw.js', 'utf8')
        .replace("const VERSION = '__BUILD__';", `const VERSION = '${BUILD}';`)
        .replace('const CORE = __CORE__;', `const CORE = ${JSON.stringify(core)};`);
      if (source.includes('__CORE__;') || source.includes("'__BUILD__'")) this.error('sw.js placeholders not filled');
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  base: '/afterglow/',
  plugins: [react(), tailwindcss(), serviceWorker()],
  define: { __BUILD__: JSON.stringify(BUILD) },
  server: { port: 8766 },
  preview: { port: 8766 },
});
