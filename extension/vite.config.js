import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup/index.html'),
        'content-scripts/linkedin-job-reader': resolve(__dirname, 'src/content-scripts/linkedin-job-reader.js'),
        'content-scripts/autofill-engine': resolve(__dirname, 'src/content-scripts/autofill-engine.js'),
        'background/service-worker': resolve(__dirname, 'src/background/service-worker.js'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name][extname]',
        format: 'es',
        manualChunks: (id) => {
          // Keep content scripts and service worker self-contained
          if (id.includes('content-scripts') || id.includes('service-worker')) {
            return undefined
          }
        }
      }
    }
  }
})
