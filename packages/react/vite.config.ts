import { rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'rename-entry-to-ejs',
      apply: 'build',
      async closeBundle() {
        await rename(
          fileURLToPath(new URL('dist/index.html', import.meta.url)),
          fileURLToPath(new URL('dist/index.ejs', import.meta.url)),
        );
      },
    },
  ],
  build: {
    assetsDir: 'static',
  },
});
