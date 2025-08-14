import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './', // ensures relative asset paths
  build: {
    outDir: path.resolve(__dirname, '../server/dist'),
    emptyOutDir: true
  },
  server: {
    port: 5173
  }
});
