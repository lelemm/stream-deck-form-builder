import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import path from "path"

// Plugin folder name based on the UUID from manifest.json
const pluginFolderName = 'com.leandro-menezes.formbuilder.sdPlugin'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    // Force bundling of all dependencies to prevent chunk splitting
    include: ['react', 'react-dom', 'react-dom/client']
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/js/main.jsx'),
        pi: resolve(__dirname, 'src/js/pi.jsx'),
        setup: resolve(__dirname, 'src/js/setup.jsx')
      },
      output: {
        entryFileNames: `${pluginFolderName}/js/[name].js`,
        chunkFileNames: `${pluginFolderName}/js/[name]-[hash].js`,
        assetFileNames: `${pluginFolderName}/assets/[name][extname]`,
        format: 'es',
      },
      maxParallelFileOps: 1,
      experimentalMinChunkSize: 0
    },
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000
  },
  define: {
    global: 'globalThis',
  }
})