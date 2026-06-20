import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Wrap content scripts in an IIFE so their top-level vars don't leak to window
// (Chrome doesn't support type="module" for content scripts, so ES module
// scope isolation doesn't apply — without this, two content scripts on the
// same page share the global scope and minified variable names collide.)
function iifeWrapContentScripts() {
  const contentScriptPattern = /content-scripts\//
  return {
    name: 'iife-wrap-content-scripts',
    generateBundle(_, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk' && contentScriptPattern.test(fileName)) {
          chunk.code = `;(function(){\n${chunk.code}\n})();\n`
        }
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), iifeWrapContentScripts()],
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
      },
    },
  },
})
